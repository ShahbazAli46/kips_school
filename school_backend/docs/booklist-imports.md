# Booklist imports

Super Admin endpoints (authenticated with Sanctum):

- `POST /api/books/import/preview`: multipart `file`, maximum 10 MB. Returns `token`, `title`, `session_label`, `class_name`, `notes: string[]`, `rows`, and `warnings: string[]`.
- `POST /api/books/import/confirm`: JSON `{token, class_id, title, session_label, notes, rows}`. Extra preview fields are accepted. Returns `{message, imported_count, already_imported, list}` with 201 for creation. Returns 422 with a `class_id` validation error if the class already has an uploaded booklist, regardless of file or session.

Rows contain `serial_number`, `subject`, `title`, `publisher` (including specifications), `quantity_text`, `category`, and `price` (number or null). Parser output also includes source position/page/line information where available. Category is free text. All rows are editable before confirmation; at most 500 rows are allowed. Title is required, up to 200 characters. Prices are nonnegative, up to 99,999,999.99 with at most two decimal places.

PDF uses Smalot text coordinates and requires searchable table headings including Title, Publisher and Quantity. Scanned PDFs need OCR first. The supplied Nursery 2026–27 layout has explicit merged-cell reconstruction; other merged subjects are inferred with a review warning. PDF limit: 50 pages.

DOCX uses ZIP/XML parsing with external entities prohibited. Legacy DOC uses macOS `/usr/bin/textutil` or Linux `antiword` at `/usr/bin/antiword` or `/usr/local/bin/antiword`, with a 20-second timeout and bounded output. Servers without a converter return instructions to save as DOCX; conversion failures never produce a successful empty preview. Install `antiword` on Linux deployments to enable legacy DOC uploads.

XLSX/CSV use FastExcel. Binary XLS uses PhpSpreadsheet; formulas are not calculated. Spreadsheets allow up to 10 sheets, 5,000 source rows total and 100 columns. CSV recognizes comma, semicolon or tab delimiters from its first line. Documents require recognized table headings; unrelated paragraphs remain in retained raw text.

DOCX/XLSX ZIP limits: 2,000 entries, 40 MB total expansion, 16 MB per entry, 200:1 ratio for entries larger than 1 MB. Extracted text is limited to 2 MB.

Previews expire after 24 hours and are bound to their creator, encrypted server-side metadata, and a SHA-256-verified source. Original files and encrypted previews live under `storage/app/private/booklist-imports`; paths and raw parsing payloads are hidden from API serialization. Files remain retained after import for source preservation and retry handling. Unconfirmed expired files require an operational retention policy; no automatic deletion is configured.

Confirm atomically creates a list and its books. A class row lock serializes imports for the same class; any existing booklist causes the import to be rejected without changing books or stock. The source hash + class + trimmed session also has a database uniqueness constraint. Duplicate titles remain separate by list position. Source text and original parsed data remain retained even after preview edits. `GET /api/books/catalog` includes `lists` metadata and book fields including `book_list_id`/`position`.

Rows also include editable `stock_quantity` (Current Stock). PDF, Word and spreadsheet imports recognize Current Stock, Stock, Stock Quantity, Stock Qty, Opening Stock, Available Stock, Stock On Hand and On Hand headings. Missing stock defaults to zero; required quantity text never initializes stock. Stock must be a whole number from 0 to 2,147,483,647. Positive imported stock creates a stock-in audit movement in the same transaction. Duplicate imports retain existing records and stock, rather than resetting inventory. A null price becomes price zero with `price_missing=true`, blocking both direct and package sales. An explicit price on book update clears the missing flag, including an intentionally supplied zero. Manual book creation and updates accept subject, publisher, quantity text, serial number and category.

Apply `2026_10_17_000002_add_book_list_imports.php` after the existing books migration, against a verified local database only. The implementation itself does not run migrations.

For file-only inspection without HTTP or database access, require `vendor/autoload.php` and call `(new App\Services\BookListParser())->parse($absolutePath, 'pdf')`. Returned data includes `raw_text`, metadata, rows and warnings.
