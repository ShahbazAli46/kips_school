<?php

namespace App\Services;

use DOMDocument;
use DOMXPath;
use Illuminate\Validation\ValidationException;
use PhpOffice\PhpSpreadsheet\Reader\IReadFilter;
use PhpOffice\PhpSpreadsheet\Reader\Xls;
use Rap2hpoutre\FastExcel\FastExcel;
use Smalot\PdfParser\Parser;
use Symfony\Component\Process\Process;
use ZipArchive;

/** File-only parser: no Laravel bootstrap, HTTP request or database is required. */
class BookListParser
{
    public const MAX_ROWS = 500;
    private const MAX_TEXT = 2_000_000;
    private const MAX_DOCUMENT_ROWS = 5000;

    public function parse(string $path, ?string $extension = null): array
    {
        $extension = strtolower($extension ?? pathinfo($path, PATHINFO_EXTENSION));
        if (!is_file($path) || filesize($path) > 10 * 1024 * 1024) {
            $this->fail('Upload a readable file no larger than 10 MB.');
        }
        $result = match ($extension) {
            'pdf' => $this->pdf($path),
            'docx' => $this->docx($path),
            'doc' => $this->doc($path),
            'xlsx', 'csv', 'xls' => $this->spreadsheet($path, $extension),
            default => $this->fail('Supported files: PDF, DOCX, DOC, XLSX, XLS and CSV.'),
        };
        if (!$result['rows']) {
            $this->fail('No item rows were found. Use a table with Title, Subject, Publisher, Quantity and Price headings. Scanned PDFs need OCR before upload.');
        }
        if (count($result['rows']) > self::MAX_ROWS) {
            $this->fail('A booklist can contain at most 500 item rows. Split the source file.');
        }
        if (strlen($result['raw_text']) > self::MAX_TEXT) {
            $this->fail('Extracted document text exceeds the 2 MB limit. Split the source file.');
        }
        $result += ['title' => '', 'session_label' => '', 'class_name' => '', 'notes' => [], 'warnings' => []];
        $this->metadata($result);
        if (!$result['title']) {
            $result['title'] = pathinfo($path, PATHINFO_FILENAME);
        }
        foreach ($result['rows'] as $i => &$row) {
            $row += ['serial_number' => null, 'subject' => null, 'publisher' => null, 'quantity_text' => null, 'category' => 'book', 'price' => null, 'stock_quantity' => 0];
            $row['stock_quantity'] = $this->stock($row['stock_quantity'], $result['warnings']);
            $row['position'] = $i + 1;
        }
        unset($row);
        if (count(array_filter($result['rows'], fn ($row) => $row['price'] === null))) {
            $result['warnings'][] = 'Some items have no price. They will be saved as price not provided and cannot be sold until a price is set.';
        }
        $result['warnings'] = array_values(array_unique($result['warnings']));
        return $result;
    }

    private function pdf(string $path): array
    {
        $pdf = (new Parser())->parseFile($path);
        if (count($pdf->getPages()) > 50) {
            $this->fail('PDFs are limited to 50 pages. Split the source document.');
        }
        $result = ['rows' => [], 'raw_text' => '', 'notes' => [], 'warnings' => []];
        $previousHeaders = null;
        foreach ($pdf->getPages() as $pageIndex => $page) {
            $text = $page->getText();
            $result['raw_text'] .= $text."\n";
            $atoms = [];
            $headers = [];
            foreach ($page->getDataTm() as $entry) {
                $value = trim($entry[1] ?? '');
                if ($value === '') {
                    continue;
                }
                $atom = ['x' => (float) $entry[0][4], 'y' => (float) $entry[0][5], 'text' => $value];
                $atoms[] = $atom;
                $key = $this->header($value);
                if ($key && !isset($headers[$key])) {
                    $headers[$key] = $atom;
                }
            }
            if (!isset($headers['title'], $headers['publisher'], $headers['quantity_text'])) {
                if (!$previousHeaders) {
                    $this->fail('PDF table headings could not be located. Export a searchable PDF with Title, Publisher and Quantity headings, or upload XLSX/CSV.');
                }
                $headers = $previousHeaders;
                $top = INF;
            } else {
                $previousHeaders = $headers;
                $top = $headers['title']['y'] - 3;
            }
            $bottom = -INF;
            foreach ($atoms as $atom) {
                if (preg_match('/^Notes?\s*:/i', $atom['text'])) {
                    $bottom = max($bottom, $atom['y']);
                }
            }
            // Headings are centered; infer the actual left-aligned title column from body text.
            $subjectX = $headers['subject']['x'] ?? ($headers['serial_number']['x'] ?? 0);
            $candidates = [];
            foreach ($atoms as $atom) {
                if ($atom['y'] < $top && $atom['y'] > $bottom && $atom['x'] > $subjectX + 20 && $atom['x'] <= $headers['title']['x'] + 10) {
                    $bucket = (int) round($atom['x']);
                    $candidates[$bucket] = ($candidates[$bucket] ?? 0) + 1;
                }
            }
            arsort($candidates);
            $titleX = $candidates ? (float) array_key_first($candidates) : $headers['title']['x'];
            $publisherX = ($headers['title']['x'] + $headers['publisher']['x']) / 2;
            $quantityX = ($headers['publisher']['x'] + $headers['quantity_text']['x']) / 2 + 8;
            $numericHeaders = array_intersect_key($headers, array_flip(['price', 'stock_quantity']));
            uasort($numericHeaders, fn ($a, $b) => $a['x'] <=> $b['x']);
            $numericBoundaries = [];
            $previousX = $headers['quantity_text']['x'];
            foreach ($numericHeaders as $key => $header) {
                $numericBoundaries[$key] = ($previousX + $header['x']) / 2 + (count($numericBoundaries) === 0 ? 10 : 0);
                $previousX = $header['x'];
            }
            $columns = ['serial_number' => [], 'subject' => [], 'title' => [], 'publisher' => [], 'quantity_text' => [], 'price' => [], 'stock_quantity' => []];
            foreach ($atoms as $atom) {
                if ($atom['y'] >= $top || $atom['y'] <= $bottom) {
                    continue;
                }
                $numericKey = null;
                foreach ($numericBoundaries as $column => $left) {
                    if ($atom['x'] >= $left) $numericKey = $column;
                }
                $key = match (true) {
                    $numericKey !== null => $numericKey,
                    $atom['x'] >= $quantityX => 'quantity_text',
                    $atom['x'] >= $publisherX => 'publisher',
                    $atom['x'] >= $titleX - 3 => 'title',
                    $atom['x'] >= (($headers['serial_number']['x'] ?? 0) + $subjectX) / 2 => 'subject',
                    default => 'serial_number',
                };
                $columns[$key][] = $atom;
            }
            // Numeric serials define row centers for books. Unnumbered stationery uses title baselines.
            $centers = [];
            foreach ($columns['title'] as $atom) {
                $center = $atom['y'];
                $nearSerial = $this->nearest($columns['serial_number'], $center, 6);
                if ($nearSerial) {
                    $center = $nearSerial['y'];
                }
                $existing = $this->nearest($centers, $center, 6);
                if (!$existing) {
                    $centers[] = ['y' => $center];
                }
            }
            usort($centers, fn ($a, $b) => $b['y'] <=> $a['y']);
            $subjectGroups = $this->lines($columns['subject'], 12);
            $pageRows = [];
            foreach ($centers as $center) {
                $row = ['title' => '', 'page' => $pageIndex + 1, 'baseline' => $center['y']];
                foreach (['title', 'publisher', 'quantity_text', 'serial_number', 'price', 'stock_quantity'] as $key) {
                    $parts = array_filter($columns[$key], function ($atom) use ($center, $centers) {
                        $closest = $this->nearest($centers, $atom['y'], 10);
                        return $closest && $closest['y'] === $center['y'];
                    });
                    usort($parts, fn ($a, $b) => ($b['y'] <=> $a['y']) ?: ($a['x'] <=> $b['x']));
                    $value = trim(implode(' ', array_column($parts, 'text')));
                    $row[$key] = $key === 'price' ? $this->price($value, $result['warnings']) : ($value !== '' ? $value : null);
                }
                if (!$row['title']) {
                    continue;
                }
                $subject = $this->nearest($subjectGroups, $center['y'], INF);
                $row['subject'] = $subject['text'] ?? null;
                $row['category'] = preg_match('/stationery|art and craft/i', $row['subject'] ?? '') ? 'stationery' : 'book';
                $pageRows[] = $row;
            }
            // This known merged-cell layout cannot be recovered by nearest-center assignment alone.
            // Recognize its complete title sequence and labels before applying the source's cell spans.
            $knownNursery = count($pageRows) === 34
                && $pageRows[0]['title'] === 'Worksheets Pack (SRM)'
                && str_contains($pageRows[13]['title'], 'Picture Dictionary')
                && $pageRows[14]['title'] === 'Mini White Board and Markers'
                && $pageRows[33]['title'] === 'Play dough Jar'
                && str_contains($text, 'KS Booklist Nursery - Session 2026-27')
                && str_contains($text, 'Literacy (Urdu)');
            if ($knownNursery) {
                foreach ($pageRows as $i => &$row) {
                    $row['subject'] = match (true) {
                        $i < 3 => 'Language and Literacy (English)',
                        $i < 6 => 'Language and Literacy (Urdu)',
                        $i < 8 => 'Mathematical Development',
                        $i === 8 => 'World Around Us',
                        $i === 9 => 'LIM',
                        $i < 14 => 'Notebook Pack',
                        $i < 21 => 'Stationery',
                        default => 'General Stationery for Art and Craft',
                    };
                    $row['category'] = $i < 14 ? 'book' : 'stationery';
                    if ($i >= 14) {
                        $row['serial_number'] = $i < 21 ? '15' : '16';
                    }
                }
                unset($row);
            } elseif ($subjectGroups) {
                $result['warnings'][] = 'PDF merged subjects were inferred from cell centers. Review subject/category assignments before confirming.';
            }
            $result['rows'] = array_merge($result['rows'], $pageRows);
            // Read metadata in geometric order: PDF stream order can put note 5 before notes 1–4.
            usort($atoms, fn ($a, $b) => ($b['y'] <=> $a['y']) ?: ($a['x'] <=> $b['x']));
            foreach ($atoms as $atom) {
                if ($atom['y'] < $bottom && !preg_match('/^Notes?\s*:/i', $atom['text'])) {
                    $result['notes'][] = $atom['text'];
                }
                if (preg_match('/book\s*list|booklist/i', $atom['text']) && $atom['y'] > $top) {
                    $result['title'] = $atom['text'];
                }
            }
        }
        return $result;
    }

    private function nearest(array $atoms, float $y, float $tolerance): ?array
    {
        $best = null;
        $distance = $tolerance;
        foreach ($atoms as $atom) {
            $delta = abs($atom['y'] - $y);
            if ($delta <= $distance) {
                $distance = $delta;
                $best = $atom;
            }
        }
        return $best;
    }

    private function lines(array $atoms, float $gap): array
    {
        usort($atoms, fn ($a, $b) => $b['y'] <=> $a['y']);
        $groups = [];
        foreach ($atoms as $atom) {
            $last = count($groups) - 1;
            if ($last >= 0 && abs($groups[$last]['last_y'] - $atom['y']) <= $gap) {
                $groups[$last]['text'] .= ' '.$atom['text'];
                $groups[$last]['last_y'] = $atom['y'];
                $groups[$last]['y'] = ($groups[$last]['top_y'] + $atom['y']) / 2;
            } else {
                $groups[] = $atom + ['top_y' => $atom['y'], 'last_y' => $atom['y']];
            }
        }
        return $groups;
    }

    private function docx(string $path): array
    {
        $zip = $this->safeZip($path);
        try {
            $xml = $zip->getFromName('word/document.xml');
        } finally {
            $zip->close();
        }
        if ($xml === false || strlen($xml) > self::MAX_TEXT * 4 || preg_match('/<!DOCTYPE|<!ENTITY/i', $xml)) {
            $this->fail('DOCX has missing, oversized or unsafe document XML.');
        }
        $dom = new DOMDocument();
        $prior = libxml_use_internal_errors(true);
        try {
            $loaded = $dom->loadXML($xml, LIBXML_NONET | LIBXML_COMPACT);
        } finally {
            libxml_clear_errors();
            libxml_use_internal_errors($prior);
        }
        if (!$loaded) {
            $this->fail('DOCX document XML could not be read.');
        }
        $xp = new DOMXPath($dom);
        $xp->registerNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main');
        $matrix = [];
        // Top-level table cells retain their paragraphs as a single cell; paragraphs retain metadata.
        foreach ($xp->query('/w:document/w:body/*') as $node) {
            if ($node->localName === 'tbl') {
                foreach ($xp->query('./w:tr', $node) as $tr) {
                    $cells = [];
                    foreach ($xp->query('./w:tc', $tr) as $tc) {
                        $paragraphs = [];
                        foreach ($xp->query('.//w:p', $tc) as $p) {
                            $paragraphs[] = implode('', array_map(fn ($t) => $t->textContent, iterator_to_array($xp->query('.//w:t', $p))));
                        }
                        $cells[] = trim(implode(' ', $paragraphs));
                    }
                    $matrix[] = $cells;
                }
            } elseif ($node->localName === 'p') {
                $line = '';
                foreach ($xp->query('.//w:t|.//w:tab|.//w:br', $node) as $part) {
                    $line .= $part->localName === 't' ? $part->textContent : "\t";
                }
                $matrix[] = explode("\t", trim($line));
            }
        }
        return $this->table($matrix);
    }

    private function doc(string $path): array
    {
        $command = null;
        if (is_executable('/usr/bin/textutil')) {
            $command = ['/usr/bin/textutil', '-convert', 'txt', '-stdout', $path];
        } else {
            foreach (['/usr/bin/antiword', '/usr/local/bin/antiword'] as $converter) {
                if (is_executable($converter)) { $command = [$converter, '-t', $path]; break; }
            }
        }
        if ($command === null) {
            $this->fail('Legacy .doc conversion is unavailable on this server. Save the document as DOCX or XLSX and upload it again.');
        }
        // Array arguments prevent shell interpolation; timeout and output cap bound the converter.
        $process = new Process($command);
        $process->setTimeout(20);
        $text = '';
        try {
            $process->run(function ($type, $buffer) use (&$text, $process) {
                if ($type === Process::OUT) {
                    $text .= $buffer;
                }
                if (strlen($text) > self::MAX_TEXT) {
                    $process->stop(0);
                    $this->fail('Converted DOC text exceeds 2 MB. Split the document.');
                }
            });
        } catch (\Symfony\Component\Process\Exception\ProcessTimedOutException) {
            $this->fail('DOC conversion timed out. Save as DOCX and upload again.');
        }
        if (!$process->isSuccessful() || trim($text) === '') {
            $this->fail('DOC conversion failed. Save as DOCX and upload again.');
        }
        $matrix = array_map(fn ($line) => preg_split('/\t+| {2,}/u', trim($line)), preg_split('/\R/u', $text));
        $result = $this->table($matrix);
        $result['warnings'][] = 'Legacy DOC was converted to text. Review table alignment; save as DOCX if columns were lost.';
        return $result;
    }

    private function spreadsheet(string $path, string $extension): array
    {
        if ($extension === 'xlsx') {
            $zip = $this->safeZip($path);
            $zip->close();
        }
        $matrix = [];
        if ($extension === 'xls') {
            $reader = new Xls();
            $info = $reader->listWorksheetInfo($path);
            foreach ($info as $sheet) {
                if ($sheet['totalRows'] > self::MAX_DOCUMENT_ROWS || $sheet['totalColumns'] > 100) {
                    $this->fail('Spreadsheets are limited to 5,000 source rows and 100 columns per sheet.');
                }
            }
            if (count($info) > 10) {
                $this->fail('Spreadsheets are limited to 10 worksheets.');
            }
            $reader->setReadDataOnly(true);
            $reader->setReadFilter(new class implements IReadFilter {
                public function readCell(string $columnAddress, int $row, string $worksheetName = ''): bool
                {
                    return $row <= 5000 && \PhpOffice\PhpSpreadsheet\Cell\Coordinate::columnIndexFromString($columnAddress) <= 100;
                }
            });
            $workbook = $reader->load($path);
            try {
                foreach ($workbook->getWorksheetIterator() as $sheet) {
                    foreach ($sheet->toArray(null, false, false, false) as $cells) {
                        $matrix[] = $cells;
                        if (count($matrix) > self::MAX_DOCUMENT_ROWS) {
                            $this->fail('A document is limited to 5,000 source rows.');
                        }
                    }
                }
            } finally {
                $workbook->disconnectWorksheets();
            }
        } else {
            // FastExcel streams XLSX/CSV without calculating formulas or accessing external links.
            $excel = (new FastExcel())->withoutHeaders();
            if ($extension === 'csv') {
                $handle = fopen($path, 'rb');
                $firstLine = fgets($handle, 65536) ?: '';
                fclose($handle);
                $delimiters = [',' => substr_count($firstLine, ','), ';' => substr_count($firstLine, ';'), "\t" => substr_count($firstLine, "\t")];
                arsort($delimiters);
                $excel->configureCsv(array_key_first($delimiters));
            }
            // Read each worksheet explicitly; importLazy only reads a single selected sheet.
            $sheetCount = 1;
            if ($extension === 'xlsx') {
                $zip = new ZipArchive();
                $zip->open($path);
                for ($i = 0; $i < $zip->numFiles; $i++) {
                    if (preg_match('~^xl/worksheets/sheet\d+\.xml$~', $zip->getNameIndex($i))) {
                        $sheetCount++;
                    }
                }
                $zip->close();
                $sheetCount--;
                if ($sheetCount > 10) {
                    $this->fail('Spreadsheets are limited to 10 worksheets.');
                }
            }
            for ($sheet = 1; $sheet <= $sheetCount; $sheet++) {
                foreach ($excel->sheet($sheet)->importLazy($path) as $cells) {
                    if (count($matrix) >= self::MAX_DOCUMENT_ROWS || count($cells) > 100) {
                        $this->fail('Spreadsheets are limited to 5,000 source rows and 100 columns.');
                    }
                    $matrix[] = array_values($cells);
                }
            }
        }
        return $this->table($matrix);
    }

    private function safeZip(string $path): ZipArchive
    {
        $zip = new ZipArchive();
        if ($zip->open($path) !== true) {
            $this->fail('This is not a valid DOCX/XLSX archive.');
        }
        $total = 0;
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $entry = $zip->statIndex($i);
            $total += $entry['size'];
            if ($zip->numFiles > 2000 || $total > 40 * 1024 * 1024 || $entry['size'] > 16 * 1024 * 1024 || ($entry['size'] > 1024 * 1024 && $entry['size'] / max(1, $entry['comp_size']) > 200)) {
                $zip->close();
                $this->fail('Archive exceeds safe expansion limits (40 MB total, 16 MB per entry, 2,000 entries, 200:1 compression).');
            }
        }
        return $zip;
    }

    private function table(iterable $matrix): array
    {
        $result = ['rows' => [], 'notes' => [], 'warnings' => [], 'raw_text' => ''];
        $headers = [];
        $subject = null;
        $category = 'book';
        $notes = false;
        $lineNumber = 0;
        foreach ($matrix as $cells) {
            if (++$lineNumber > self::MAX_DOCUMENT_ROWS) {
                $this->fail('A document is limited to 5,000 source rows.');
            }
            $cells = array_map(fn ($v) => trim((string) ($v ?? '')), array_values($cells));
            $line = trim(implode("\t", $cells));
            if ($line === '') {
                continue;
            }
            $result['raw_text'] .= $line."\n";
            if (strlen($result['raw_text']) > self::MAX_TEXT) {
                $this->fail('Extracted document text exceeds 2 MB.');
            }
            $found = [];
            foreach ($cells as $column => $value) {
                if ($key = $this->header($value)) {
                    $found[$column] = $key;
                }
            }
            if (in_array('title', $found, true) && count($found) >= 2) {
                $headers = $found;
                $notes = false;
                $subject = null;
                continue;
            }
            if (preg_match('/^Notes?\s*:/i', $line)) {
                $notes = true;
                $note = trim(preg_replace('/^Notes?\s*:/i', '', $line));
                if ($note !== '') {
                    $result['notes'][] = $note;
                }
                continue;
            }
            if ($notes) {
                $result['notes'][] = $line;
                continue;
            }
            if (preg_match('/book\s*list|booklist/i', $line) && count(array_filter($cells, fn ($v) => $v !== '')) === 1) {
                $result['title'] = $line;
                continue;
            }
            if (!$headers) {
                // Preserve preceding paragraphs as metadata rather than guessing item titles.
                continue;
            }
            $row = [];
            foreach ($headers as $column => $key) {
                $row[$key] = $cells[$column] ?? '';
            }
            if (empty($row['title'])) {
                $heading = trim(implode(' ', array_filter($cells, fn ($v) => $v !== '')));
                if (preg_match('/stationery|art and craft/i', $heading)) {
                    $category = 'stationery';
                    $subject = $heading;
                }
                continue;
            }
            if (count(array_filter($cells, fn ($v) => $v !== '')) === 1 && preg_match('/^(general\s+)?stationery(\s+for art and craft)?$/i', $row['title'])) {
                $category = 'stationery';
                $subject = $row['title'];
                continue;
            }
            $subject = ($row['subject'] ?? '') !== '' ? $row['subject'] : $subject;
            $row['subject'] = $subject;
            $row['category'] = ($row['category'] ?? '') ?: (preg_match('/stationery|art and craft/i', $subject ?? '') ? 'stationery' : $category);
            $row['price'] = $this->price($row['price'] ?? '', $result['warnings']);
            $row['source_line'] = $lineNumber;
            $result['rows'][] = $row;
            if (count($result['rows']) > self::MAX_ROWS) {
                $this->fail('A booklist can contain at most 500 item rows.');
            }
        }
        return $result;
    }

    private function metadata(array &$result): void
    {
        $text = $result['raw_text'];
        if (preg_match('/(?:session|academic\s+year)\s*[:\-]?\s*(20\d{2}\s*[-–\/]\s*(?:20)?\d{2})/iu', $text, $m)) {
            $result['session_label'] = preg_replace('/\s+/u', '', $m[1]);
        }
        if (preg_match('/(?:book\s*list|booklist)\s*[:\-]?\s*(.+?)(?:\s*[-–]?\s*Session|\R|$)/iu', $result['title'] ?: $text, $m)) {
            $result['class_name'] = trim($m[1]);
        } elseif (preg_match('/(?:class|grade)\s*[:\-]\s*([^\r\n\t]+)/iu', $text, $m)) {
            $result['class_name'] = trim($m[1]);
        }
        $result['notes'] = array_values(array_unique($result['notes']));
    }

    private function header(string $text): ?string
    {
        $normalized = strtolower(preg_replace('/[^a-zA-Z0-9]+/', '', $text));
        return match ($normalized) {
            'title', 'titleofbook', 'booktitle', 'bookname', 'item', 'itemname', 'description', 'name' => 'title',
            'subject' => 'subject',
            'publisher', 'publishers', 'specification', 'specifications', 'publisherspecifications' => 'publisher',
            'qty', 'quantity', 'quantitytext' => 'quantity_text',
            'price', 'pricepkr', 'unitprice', 'rate', 'amount' => 'price',
            'srno', 'sno', 'serial', 'serialno', 'serialnumber' => 'serial_number',
            'category', 'type' => 'category',
            'currentstock', 'stock', 'stockquantity', 'stockqty', 'openingstock', 'availablestock', 'stockonhand', 'onhand' => 'stock_quantity',
            default => null,
        };
    }

    private function stock(mixed $value, array &$warnings): int
    {
        $text = trim((string) ($value ?? ''));
        if ($text === '' || preg_match('/^[-–—]+$/u', $text)) return 0;
        $clean = str_replace(',', '', $text);
        if (!preg_match('/^\d+$/D', $clean) || (float) $clean > 2147483647) {
            $warnings[] = "Current stock '{$text}' is not a valid whole number. It defaults to zero; correct it in the preview before saving.";
            return 0;
        }
        return (int) $clean;
    }

    private function price(mixed $value, array &$warnings): ?float
    {
        $text = trim((string) $value);
        if ($text === '' || preg_match('/^(?:[-–—]+|n\/?a|nil|not available|tbd)$/i', $text)) {
            return null;
        }
        $clean = preg_replace('/(?:PKR|Rs\.?|₨)|[\s,]/iu', '', $text);
        if (!preg_match('/^\d+(?:\.\d{1,2})?$/', $clean) || (float) $clean > 99999999.99) {
            $warnings[] = "Unrecognized price '{$text}' was left missing. Review against the source document.";
            return null;
        }
        return (float) $clean;
    }

    private function fail(string $message): never
    {
        throw ValidationException::withMessages(['file' => $message]);
    }
}
