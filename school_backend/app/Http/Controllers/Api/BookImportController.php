<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BookList;
use App\Services\BookListParser;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class BookImportController extends Controller
{
    private function disk()
    {
        // An explicit private disk avoids FILESYSTEM_DISK=public or a database cache driver.
        return Storage::build([
            'driver' => 'local',
            'root' => storage_path('app/private/booklist-imports'),
            'visibility' => 'private',
            'throw' => true,
        ]);
    }

    public function preview(Request $request, BookListParser $parser)
    {
        abort_unless((int) $request->user()->role_id === 1, 403, 'Only Super Admin can import booklists.');
        $request->validate([
            'file' => 'required|file|max:10240|extensions:pdf,docx,doc,xlsx,xls,csv',
        ]);
        $file = $request->file('file');
        $extension = strtolower($file->getClientOriginalExtension());
        $id = (string) Str::uuid();
        $disk = $this->disk();
        $path = $disk->putFileAs($id, $file, 'source.'.$extension);
        try {
            $parsed = $parser->parse($disk->path($path), $extension);
        } catch (ValidationException $e) {
            // Failed previews have no retained token or list referencing their files.
            $disk->delete($path);
            throw $e;
        } catch (\Throwable $e) {
            $disk->delete($path);
            report($e);
            throw ValidationException::withMessages(['file' => 'The document could not be read. Check its format, remove password protection, or save it as DOCX/XLSX/CSV and try again.']);
        }
        $expires = now()->addDay()->timestamp;
        $payload = [
            'creator' => (int) $request->user()->id,
            'expires' => $expires,
            'source_path' => $path,
            'source_hash' => hash_file('sha256', $disk->path($path)),
            'source_filename' => mb_substr(basename(str_replace('\\', '/', $file->getClientOriginalName())), 0, 255),
            'parsed' => $parsed,
        ];
        $disk->put($id.'/preview.json', Crypt::encryptString(json_encode($payload, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE)));
        $token = Crypt::encryptString(json_encode([
            'id' => $id, 'creator' => $payload['creator'], 'expires' => $expires,
        ], JSON_THROW_ON_ERROR));
        return response()->json([
            'token' => $token,
            'title' => $parsed['title'],
            'session_label' => $parsed['session_label'],
            'class_name' => $parsed['class_name'],
            'notes' => $parsed['notes'],
            'rows' => $parsed['rows'],
            'warnings' => $parsed['warnings'],
        ]);
    }

    public function confirm(Request $request)
    {
        abort_unless((int) $request->user()->role_id === 1, 403, 'Only Super Admin can import booklists.');
        // Authenticate the server-side preview before validation performs any database existence query.
        $request->validate(['token' => 'required|string|max:8192']);
        $disk = $this->disk();
        try {
            $token = json_decode(Crypt::decryptString($request->string('token')->toString()), true, 32, JSON_THROW_ON_ERROR);
            if (!is_array($token) || !Str::isUuid($token['id'] ?? '')
                || ($token['creator'] ?? null) !== (int) $request->user()->id
                || ($token['expires'] ?? 0) < now()->timestamp) {
                throw new \UnexpectedValueException();
            }
            $payload = json_decode(Crypt::decryptString($disk->get($token['id'].'/preview.json')), true, 64, JSON_THROW_ON_ERROR);
            if (($payload['creator'] ?? null) !== $token['creator'] || ($payload['expires'] ?? null) !== $token['expires']
                || !preg_match('~^'.preg_quote($token['id'], '~').'/source\.(pdf|docx|doc|xlsx|xls|csv)$~D', $payload['source_path'] ?? '')
                || !$disk->exists($payload['source_path'])
                || !hash_equals($payload['source_hash'], hash_file('sha256', $disk->path($payload['source_path'])))) {
                throw new \UnexpectedValueException();
            }
        } catch (DecryptException | \JsonException | \UnexpectedValueException | \League\Flysystem\UnableToReadFile $e) {
            throw ValidationException::withMessages(['token' => 'This preview is invalid, expired, or belongs to another user. Upload the file again.']);
        }

        $data = $request->validate([
            'class_id' => 'required|integer|exists:classes,id',
            'title' => 'required|string|max:200',
            'session_label' => 'nullable|string|max:100',
            'notes' => 'present|array|max:100',
            'notes.*' => 'required|string|max:5000',
            'rows' => 'required|array|min:1|max:500',
            'rows.*' => 'required|array',
            'rows.*.title' => 'required|string|max:200',
            'rows.*.subject' => 'nullable|string|max:2000',
            'rows.*.publisher' => 'nullable|string|max:4000',
            'rows.*.quantity_text' => 'nullable|string|max:1000',
            'rows.*.serial_number' => 'nullable|string|max:50',
            'rows.*.category' => 'nullable|string|max:100',
            'rows.*.price' => 'present|nullable|numeric|min:0|max:99999999.99|decimal:0,2',
            'rows.*.stock_quantity' => 'sometimes|required|integer|min:0|max:2147483647',
        ]);
        $session = trim($data['session_label'] ?? '');
        $list = DB::transaction(function () use ($data, $session, $payload, $request) {
            // Database uniqueness handles retries AND concurrent confirms, even across app servers.
            $list = BookList::firstOrCreate([
                'source_hash' => $payload['source_hash'],
                'class_id' => $data['class_id'],
                'session_label' => $session,
            ], [
                'title' => $data['title'],
                'notes' => array_values($data['notes']),
                'source_filename' => $payload['source_filename'],
                'source_path' => 'booklist-imports/'.$payload['source_path'],
                'raw_text' => $payload['parsed']['raw_text'],
                'source_metadata' => $payload['parsed'],
                'created_by' => $request->user()->id,
            ]);
            if ($list->wasRecentlyCreated) {
                foreach (array_values($data['rows']) as $position => $row) {
                    $missing = $row['price'] === null;
                    $stock = (int) ($row['stock_quantity'] ?? 0);
                    $book = $list->books()->create([
                        'class_id' => $data['class_id'],
                        'title' => $row['title'],
                        'subject' => $row['subject'] ?? null,
                        'publisher' => $row['publisher'] ?? null,
                        'quantity_text' => $row['quantity_text'] ?? null,
                        'serial_number' => $row['serial_number'] ?? null,
                        'category' => $row['category'] ?? 'book',
                        'price' => $missing ? 0 : $row['price'],
                        'price_missing' => $missing,
                        'stock_quantity' => $stock,
                        'position' => $position + 1,
                    ]);
                    if ($stock > 0) {
                        $book->movements()->create([
                            'quantity' => $stock,
                            'movement_type' => 'stock_in',
                            'reference_type' => 'book_lists',
                            'reference_id' => $list->id,
                            'notes' => 'Opening stock from booklist import',
                            'created_by' => $request->user()->id,
                        ]);
                    }
                }
            }
            return $list;
        });
        $created = $list->wasRecentlyCreated;
        $list->loadCount('books');
        return response()->json([
            'message' => $created ? 'Booklist imported.' : 'This source was already imported for the selected class and session.',
            'imported_count' => $created ? $list->books_count : 0,
            'already_imported' => !$created,
            'list' => $list,
        ], $created ? 201 : 200);
    }
}
