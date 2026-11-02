<?php

namespace App\Console\Commands;

use App\Models\BookList;
use App\Services\BookListParser;
use Illuminate\Console\Command;

class RepairUrduBookTitles extends Command
{
    protected $signature = 'books:repair-urdu-titles {--apply : Write the corrected titles; without this flag the command only previews changes}';
    protected $description = 'Repair Urdu book titles using the original retained booklist files';

    public function handle(BookListParser $parser): int
    {
        $apply = (bool) $this->option('apply');
        $changed = 0;
        $skipped = 0;

        foreach (BookList::with('books')->orderBy('id')->get() as $list) {
            $path = storage_path('app/private/'.$list->source_path);
            if (!is_file($path)) {
                $this->warn("Booklist {$list->id}: source file is missing; skipped.");
                $skipped++;
                continue;
            }

            try {
                $parsed = $parser->parse($path, strtolower(pathinfo($path, PATHINFO_EXTENSION)));
            } catch (\Throwable $e) {
                $this->warn("Booklist {$list->id}: could not parse source file; skipped.");
                $skipped++;
                continue;
            }

            foreach ($list->books as $book) {
                if (!preg_match('/\p{Arabic}/u', (string) $book->title)) {
                    continue;
                }

                $sourceRow = $parsed['rows'][$book->position - 1] ?? null;
                $corrected = trim((string) ($sourceRow['title'] ?? ''));
                if (!$sourceRow || $corrected === '' || $corrected === $book->title) {
                    continue;
                }

                $this->line(sprintf(
                    '%s book %d: %s -> %s',
                    $apply ? 'Updating' : 'Would update',
                    $book->id,
                    json_encode($book->title, JSON_UNESCAPED_UNICODE),
                    json_encode($corrected, JSON_UNESCAPED_UNICODE),
                ));

                if ($apply) {
                    $book->update(['title' => $corrected]);
                }
                $changed++;
            }
        }

        $verb = $apply ? 'Updated' : 'Found';
        $this->info("{$verb} {$changed} Urdu book title(s). Skipped {$skipped} booklist(s).");
        if (!$apply && $changed > 0) {
            $this->comment('Run again with --apply after reviewing the preview to save these changes.');
        }

        return self::SUCCESS;
    }
}
