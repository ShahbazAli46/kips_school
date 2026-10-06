<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\SendFeeVoucherWhatsAppBatchJob;
use App\Models\AcademicSession;
use App\Models\AppSetting;
use App\Models\User;
use App\Services\WhatsAppGatewayService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class FeeVoucherController extends Controller
{
    /**
     * Normalize a phone number for family grouping.
     */
    private function normalizePhoneNumber(?string $phone): string
    {
        if (empty($phone)) return 'no-phone';
        $digits = preg_replace('/\D+/', '', $phone);
        if (str_starts_with($digits, '92') && strlen($digits) === 12) {
            $digits = '0' . substr($digits, 2);
        }
        if (strlen($digits) === 10 && str_starts_with($digits, '3')) {
            $digits = '0' . $digits;
        }
        return !empty($digits) ? $digits : 'no-phone';
    }

    /**
     * Compute fee breakdown for a single student for a target month.
     */
    private function calculateStudentVoucher(User $student, string $targetMonthStr, Carbon $sessionStart, Carbon $targetCarbon, string $monthFormatted): array
    {
        $start = $student->getEffectiveEnrollmentStart($sessionStart);
        $monthlyFee = (float)($student->monthly_fee ?: 0);

        // Helper to extract tuition-only amount paid and discount from a collection of FeePayments
        $getTuitionPaidAndDiscount = function ($payments) {
            $paid = 0.0;
            $discount = 0.0;

            foreach ($payments as $p) {
                if ($p->relationLoaded('items') && $p->items->isNotEmpty()) {
                    // Check if payment has tuition fee head specifically
                    $tuitionItems = $p->items->where('head_key', 'tuition_fee');
                    if ($tuitionItems->isNotEmpty()) {
                        $paid += (float)$tuitionItems->sum('amount_paid');
                        $discount += (float)$tuitionItems->sum('discount_applied');
                    }
                } else {
                    // Legacy payments without itemized breakdown
                    // Check if this payment was created for a standalone POS extra charge
                    $isExtraCharge = $p->relationLoaded('studentExtraCharge')
                        ? (bool)$p->studentExtraCharge
                        : \App\Models\StudentExtraCharge::where('fee_payment_id', $p->id)->exists();

                    if (!$isExtraCharge) {
                        $paid += (float)$p->amount_paid;
                        $discount += (float)$p->discount_amount;
                    }
                }
            }

            return [$paid, $discount];
        };

        $priorMonthItems = [];
        $previousTuitionArrears = 0;
        $priorMonthsCount = 0;

        // If target month is before admission month, no tuition fees apply for that pre-admission period
        if ($targetCarbon->lt($start)) {
            $monthlyFee = 0;
            $currentMonthNetDue = 0;
            $previousTuitionArrears = 0;
            $currentMonthPaid = 0;
            $currentMonthDiscount = 0;
        } else {
            // Current Month Payments & Discounts for Tuition Fee
            $currentMonthPayments = $student->feePayments->where('month', $targetMonthStr);
            [$currentMonthPaid, $currentMonthDiscount] = $getTuitionPaidAndDiscount($currentMonthPayments);
            $currentMonthNetDue = max(0, $monthlyFee - ($currentMonthPaid + $currentMonthDiscount));

            // Prior Months (from admission month up to month before targetMonthStr)
            if ($start->lt($targetCarbon)) {
                $curr = $start->copy();
                while ($curr->lt($targetCarbon)) {
                    $mStr = $curr->format('Y-m');
                    $mPayments = $student->feePayments->where('month', $mStr);
                    [$mPaid, $mDiscount] = $getTuitionPaidAndDiscount($mPayments);
                    $mNetDue = max(0, $monthlyFee - ($mPaid + $mDiscount));

                    if ($mNetDue > 0) {
                        $priorMonthItems[] = [
                            'label' => "Tuition Fee (" . $curr->format('M Y') . ")",
                            'amount' => $mNetDue,
                            'head_key' => 'tuition_fee',
                        ];
                        $previousTuitionArrears += $mNetDue;
                    }
                    $priorMonthsCount++;
                    $curr->addMonth();
                }
            }
        }

        // Unpaid non-monthly Fee Heads (Admission Fee, Security Fee, ID Card, Board Reg, Exam Charges, etc.)
        $unpaidHeads = [];
        $unpaidOneTimeBalance = 0;
        if ($student->relationLoaded('feeItems') || $student->feeItems) {
            foreach ($student->feeItems as $fi) {
                if ($fi->head_key !== 'tuition_fee' && (float)$fi->balance_amount > 0) {
                    $unpaidHeads[] = [
                        'label' => $fi->head_name . ' (Unpaid)',
                        'head_key' => $fi->head_key,
                        'amount' => (float)$fi->balance_amount,
                    ];
                    $unpaidOneTimeBalance += (float)$fi->balance_amount;
                }
            }
        } elseif ($student->pending_amount > 0) {
            $unpaidOneTimeBalance = (float)$student->pending_amount;
            $unpaidHeads[] = [
                'label' => 'Admission Balance / Old Arrears',
                'head_key' => 'pending_amount',
                'amount' => $unpaidOneTimeBalance,
            ];
        }

        $previousArrears = $previousTuitionArrears + $unpaidOneTimeBalance;
        $totalPayable = $currentMonthNetDue + $previousArrears;
        $grossPayable = $monthlyFee + $previousArrears;

        // Construct itemized fee items list for this voucher (Only items with amount to get from student)
        $feeItems = [];

        if ($totalPayable > 0) {
            // 1. Prior Months Tuition Fees (in chronological order)
            if (!empty($priorMonthItems)) {
                if (count($priorMonthItems) <= 4) {
                    foreach ($priorMonthItems as $pItem) {
                        $feeItems[] = $pItem;
                    }
                } else {
                    $priorEnd = (clone $targetCarbon)->subMonth();
                    $feeItems[] = [
                        'label' => "Tuition Arrears (" . $start->format('M Y') . " – " . $priorEnd->format('M Y') . ")",
                        'amount' => $previousTuitionArrears,
                        'head_key' => 'tuition_fee',
                    ];
                }
            }

            // 2. Current Month Tuition Fee (only if there is net due to collect)
            if ($currentMonthNetDue > 0) {
                $feeItems[] = [
                    'label' => "Tuition Fee ({$monthFormatted})",
                    'amount' => $currentMonthNetDue,
                    'head_key' => 'tuition_fee',
                ];
            }

            // 3. Unpaid non-monthly heads & extra charges
            foreach ($unpaidHeads as $uh) {
                $feeItems[] = [
                    'label' => $uh['label'],
                    'amount' => $uh['amount'],
                    'head_key' => $uh['head_key'] ?? 'unknown',
                ];
            }
        } else {
            // Fully paid voucher (Receipt / Zero Balance mode)
            if ($monthlyFee > 0) {
                $feeItems[] = ['label' => "Tuition Fee ({$monthFormatted})", 'amount' => $monthlyFee, 'head_key' => 'tuition_fee'];
            }

            if ($currentMonthPaid > 0) {
                $feeItems[] = ['label' => 'Amount Paid', 'amount' => -$currentMonthPaid];
            }

            if ($currentMonthDiscount > 0) {
                $feeItems[] = ['label' => 'Discount', 'amount' => -$currentMonthDiscount];
            }
        }

        $status = 'Unpaid';
        if ($totalPayable <= 0) {
            $status = 'Paid';
        } elseif ($currentMonthPaid > 0 || $currentMonthDiscount > 0) {
            $status = 'Partial';
        }

        return [
            'student_id' => $student->id,
            'uuid' => $student->uuid,
            'roll_number' => $student->roll_number ?: "KIPS-" . date('Y') . "-" . str_pad($student->id, 3, '0', STR_PAD_LEFT),
            'name' => $student->name,
            'father_name' => $student->father_name ?: "—",
            'contact_number' => $student->contact_number ?: "—",
            'normalized_phone' => $this->normalizePhoneNumber($student->contact_number),
            'class_id' => $student->class_id,
            'class_name' => $student->academyClass ? $student->academyClass->name : "—",
            'section_id' => $student->section_id,
            'section_name' => $student->section ? $student->section->name : "",
            'major_id' => $student->major_id,
            'major_name' => $student->major ? $student->major->name : "",
            'image' => $student->image,
            'monthly_fee' => $monthlyFee,
            'current_month_paid' => $currentMonthPaid,
            'current_month_discount' => $currentMonthDiscount,
            'current_month_net_due' => $currentMonthNetDue,
            'previous_arrears' => $previousArrears,
            'unpaid_one_time_balance' => $unpaidOneTimeBalance,
            'total_payable' => $totalPayable,
            'gross_payable' => $grossPayable,
            'status' => $status,
            'fee_items' => $feeItems,
        ];
    }

    /**
     * Compute and retrieve raw vouchers dataset.
     */
    private function getVouchersData(Request $request): array
    {
        $currentMonthStr = Carbon::now()->format('Y-m');
        $rawMonth = $request->input('month', $currentMonthStr);
        // Ensure voucher calculates at least up to the current billing month so vouchers printed today collect all dues up to date
        $targetMonthStr = ($rawMonth < $currentMonthStr) ? $currentMonthStr : $rawMonth;
        $voucherType = $request->input('type', 'family'); // 'individual' or 'family'
        $dueDate = $request->input('due_date', Carbon::parse($targetMonthStr . '-10')->format('Y-m-d'));

        $activeSession = AcademicSession::getActiveSession();
        $sessionStartDate = $activeSession ? $activeSession->start_date : '2020-01-01';
        $sessionStart = Carbon::parse($sessionStartDate)->startOfMonth();
        $startMonthStr = $sessionStart->format('Y-m');

        $targetCarbon = Carbon::createFromFormat('Y-m', $targetMonthStr)->startOfMonth();
        $monthFormatted = $targetCarbon->format('M Y');
        $monthName = $targetCarbon->format('F Y');
        $monthKey = str_replace('-', '', $targetMonthStr);

        $query = User::with([
            'academyClass:id,name',
            'section:id,name',
            'major:id,name',
            'feeItems',
            'feePayments' => function ($q) {
                $q->with(['items', 'studentExtraCharge'])
                  ->select('id', 'student_id', 'month', 'amount_paid', 'discount_amount', 'payment_date');
            }
        ])
        ->where('role_id', 3)
        ->where('is_active', true);

        if ($request->filled('class_id')) {
            $query->where('class_id', $request->input('class_id'));
        }

        if ($request->filled('section_id')) {
            $query->where('section_id', $request->input('section_id'));
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('father_name', 'like', "%{$search}%")
                  ->orWhere('contact_number', 'like', "%{$search}%")
                  ->orWhere('roll_number', 'like', "%{$search}%");
            });
        }

        $students = $query->orderBy('class_id', 'asc')
            ->orderBy('name', 'asc')
            ->get();

        // Calculate voucher data for each student
        $calculatedStudents = $students->map(function ($student) use ($targetMonthStr, $sessionStart, $targetCarbon, $monthFormatted) {
            return $this->calculateStudentVoucher($student, $targetMonthStr, $sessionStart, $targetCarbon, $monthFormatted);
        });

        // Filter only unpaid if requested
        if ($request->boolean('only_unpaid')) {
            $calculatedStudents = $calculatedStudents->filter(fn($s) => $s['total_payable'] > 0);
        }

        $footerInstructions = \App\Models\AppSetting::get('voucher_footer_instructions', $this->getDefaultFooterInstructions());
        $signatureImage = \App\Models\AppSetting::get('voucher_signature_image', null);

        $frontendUrl = rtrim(config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000')), '/');

        // Individual Student Vouchers (1 voucher per student)
        $individualVouchers = $calculatedStudents->values()->map(function ($item) use ($targetMonthStr, $monthName, $monthKey, $dueDate, $footerInstructions, $signatureImage) {
            $voucherNumber = "KIPS-VCH-{$monthKey}-" . str_pad($item['student_id'], 4, '0', STR_PAD_LEFT);
            $pdfUrl = url("/api/public/vouchers/pdf?voucher_no=" . urlencode($voucherNumber));
            return array_merge($item, [
                'voucher_number' => $voucherNumber,
                'voucher_type' => 'individual',
                'target_month' => $targetMonthStr,
                'month_name' => $monthName,
                'due_date' => $dueDate,
                'footer_instructions' => $footerInstructions,
                'signature_image' => $signatureImage,
                'verification_url' => $pdfUrl,
                'pdf_url' => $pdfUrl,
                'is_paid' => ($item['total_payable'] <= 0),
            ]);
        });

        $summary = [
            'total_vouchers' => $individualVouchers->count(),
            'total_students' => $individualVouchers->count(),
            'total_current_fees' => $individualVouchers->sum('monthly_fee'),
            'total_previous_arrears' => $individualVouchers->sum('previous_arrears'),
            'grand_total_payable' => $individualVouchers->sum('total_payable'),
            'paid_count' => $individualVouchers->where('status', 'Paid')->count(),
            'unpaid_count' => $individualVouchers->where('status', 'Unpaid')->count(),
        ];

        return [
            'type' => 'individual',
            'target_month' => $targetMonthStr,
            'month_name' => $monthName,
            'due_date' => $dueDate,
            'footer_instructions' => $footerInstructions,
            'signature_image' => $signatureImage,
            'summary' => $summary,
            'vouchers' => $individualVouchers->values()->all(),
        ];
    }

    /**
     * Generate QR code Data URI for a given payload string.
     */
    public function generateQrCodeDataUri(string $content): string
    {
        try {
            $options = new \chillerlan\QRCode\QROptions([
                'scale' => 6,
                'imageBase64' => true,
            ]);

            return (new \chillerlan\QRCode\QRCode($options))->render($content);
        } catch (\Throwable $e) {
            Log::warning("[QR Code Generation Warning] " . $e->getMessage());
            try {
                return (new \chillerlan\QRCode\QRCode)->render($content);
            } catch (\Throwable $ex) {
                return '';
            }
        }
    }

    /**
     * Resolve single voucher data from request for public verification & PDF generation.
     */
    public function resolveVoucherFromRequest(Request $request): ?array
    {
        $rawVoucherNo = trim((string)$request->input('voucher_no', ''));
        $studentId = $request->input('student_id');
        $rawMonth = $request->input('month');
        $uuid = $request->input('uuid');
        $rollNumber = $request->input('roll_number');

        $parsedMonth = null;
        $parsedStudentId = null;

        // Try extracting month & student ID from voucher number formats
        // Format 1: KIPS-VCH-202610-1606 or KIPS-VCH-202610-0001
        if (preg_match('/KIPS-VCH-(\d{4})(\d{2})-(\d+)/i', $rawVoucherNo, $matches)) {
            $parsedMonth = "{$matches[1]}-{$matches[2]}";
            $parsedStudentId = (int)$matches[3];
        } elseif (preg_match('/KIPS-VCH-(\d+)/i', $rawVoucherNo, $matches)) {
            $parsedStudentId = (int)$matches[1];
        } elseif (preg_match('/^(\d{4})(\d{2})-(\d+)$/', $rawVoucherNo, $matches)) {
            $parsedMonth = "{$matches[1]}-{$matches[2]}";
            $parsedStudentId = (int)$matches[3];
        }

        $finalStudentId = $studentId ?: $parsedStudentId;
        $currentMonthStr = Carbon::now()->format('Y-m');
        $targetMonthStr = $rawMonth ?: ($parsedMonth ?: $currentMonthStr);

        // Find student
        $student = null;
        $query = User::with([
            'academyClass:id,name',
            'section:id,name',
            'major:id,name',
            'feeItems',
            'feePayments' => function ($q) {
                $q->with(['items', 'studentExtraCharge', 'receiver:id,name'])
                  ->orderBy('payment_date', 'desc');
            }
        ])->where('role_id', 3);

        if ($finalStudentId) {
            $student = (clone $query)->find($finalStudentId);
        }

        if (!$student && !empty($uuid)) {
            $student = (clone $query)->where('uuid', $uuid)->first();
        }

        if (!$student && !empty($rollNumber)) {
            $student = (clone $query)->where('roll_number', $rollNumber)->first();
        }

        if (!$student && !empty($rawVoucherNo)) {
            // Also attempt to check if rawVoucherNo is just student roll or ID
            $student = (clone $query)->where('roll_number', $rawVoucherNo)
                ->orWhere('id', is_numeric($rawVoucherNo) ? (int)$rawVoucherNo : 0)
                ->first();
        }

        if (!$student) {
            return null;
        }

        $activeSession = AcademicSession::getActiveSession();
        $sessionStartDate = $activeSession ? $activeSession->start_date : '2020-01-01';
        $sessionStart = Carbon::parse($sessionStartDate)->startOfMonth();

        $targetCarbon = Carbon::createFromFormat('Y-m', $targetMonthStr)->startOfMonth();
        $monthFormatted = $targetCarbon->format('M Y');
        $monthName = $targetCarbon->format('F Y');
        $monthKey = str_replace('-', '', $targetMonthStr);

        $calculated = $this->calculateStudentVoucher($student, $targetMonthStr, $sessionStart, $targetCarbon, $monthFormatted);

        $voucherNumber = $rawVoucherNo ?: "KIPS-VCH-{$monthKey}-" . str_pad($student->id, 4, '0', STR_PAD_LEFT);
        $dueDate = $request->input('due_date', Carbon::parse($targetMonthStr . '-10')->format('Y-m-d'));
        $footerInstructions = AppSetting::get('voucher_footer_instructions', $this->getDefaultFooterInstructions());
        $signatureImage = AppSetting::get('voucher_signature_image', null);

        // Get student's payment history for this target month and recent payments
        $targetMonthPayments = $student->feePayments->where('month', $targetMonthStr)->values()->map(function ($p) {
            return [
                'id' => $p->id,
                'amount_paid' => (float)$p->amount_paid,
                'discount_amount' => (float)$p->discount_amount,
                'payment_date' => $p->payment_date ? Carbon::parse($p->payment_date)->format('Y-m-d') : null,
                'received_by' => $p->receiver ? $p->receiver->name : 'Accounts Desk',
                'payer_name' => $p->payer_name,
                'installment_number' => $p->installment_number,
            ];
        });

        // Direct PDF URL for QR code and instant download
        $pdfUrl = url("/api/public/vouchers/pdf?voucher_no=" . urlencode($voucherNumber));

        // Generate QR code Data URI with direct PDF URL
        $qrCodeDataUri = $this->generateQrCodeDataUri($pdfUrl);

        $isPaid = ($calculated['total_payable'] <= 0);

        return array_merge($calculated, [
            'voucher_number' => $voucherNumber,
            'voucher_type' => 'individual',
            'target_month' => $targetMonthStr,
            'month_name' => $monthName,
            'due_date' => $dueDate,
            'footer_instructions' => $footerInstructions,
            'signature_image' => $signatureImage,
            'verification_url' => $pdfUrl,
            'pdf_url' => $pdfUrl,
            'qr_code_data_uri' => $qrCodeDataUri,
            'is_paid' => $isPaid,
            'payment_records' => $targetMonthPayments,
            'all_payments_count' => $student->feePayments->count(),
            'total_lifetime_paid' => (float)$student->total_paid,
        ]);
    }

    /**
     * Public Unauthenticated Voucher Verification endpoint.
     * GET /api/public/vouchers/verify
     */
    public function publicVerify(Request $request)
    {
        $voucher = $this->resolveVoucherFromRequest($request);

        if (!$voucher) {
            return response()->json([
                'success' => false,
                'message' => 'Voucher not found or student record does not exist.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'voucher' => $voucher,
            'status' => $voucher['status'],
            'is_paid' => $voucher['is_paid'],
            'total_payable' => $voucher['total_payable'],
            'verification_url' => $voucher['verification_url'],
            'pdf_url' => url("/api/public/vouchers/pdf?voucher_no=" . urlencode($voucher['voucher_number'])),
        ]);
    }

    /**
     * Public Unauthenticated Voucher PDF Streaming endpoint.
     * GET /api/public/vouchers/pdf
     */
    public function publicPdf(Request $request)
    {
        $voucher = $this->resolveVoucherFromRequest($request);

        if (!$voucher) {
            return response()->json([
                'success' => false,
                'message' => 'Voucher not found or student record does not exist.',
            ], 404);
        }

        try {
            $pdf = Pdf::loadView('pdf.fee-voucher', ['voucher' => $voucher])
                ->setPaper('a4', 'landscape');

            $fileName = "Fee_Voucher_{$voucher['voucher_number']}.pdf";

            if ($request->boolean('download')) {
                return $pdf->download($fileName);
            }

            return $pdf->stream($fileName);
        } catch (\Throwable $e) {
            Log::error("[Public Voucher PDF Error] " . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate PDF: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Public Unauthenticated Voucher QR Code direct image.
     * GET /api/public/vouchers/qr
     */
    public function publicQrCode(Request $request)
    {
        $voucher = $this->resolveVoucherFromRequest($request);
        $content = $voucher['verification_url'] ?? $request->input('url', config('app.url'));

        try {
            $options = new \chillerlan\QRCode\QROptions([
                'scale' => 5,
                'imageBase64' => false,
            ]);

            $rawSvg = (new \chillerlan\QRCode\QRCode($options))->render($content);

            return response($rawSvg, 200, [
                'Content-Type' => 'image/svg+xml',
                'Cache-Control' => 'public, max-age=86400',
            ]);
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get default standard voucher footer instructions HTML.
     */
    public function getDefaultFooterInstructions(): string
    {
        return '<p><strong>PAYMENT INSTRUCTIONS:</strong></p>'
            . '<ul>'
            . '<li><strong>1BILL ONLINE:</strong> Pay via 1Bill Consumer #: <strong>{consumer_no}</strong> across all Pakistani Banking &amp; Wallet Apps (EasyPaisa, JazzCash, Nayapay, SadaPay).</li>'
            . '<li><strong>BANK COUNTER:</strong> Payable at any United Bank Limited (UBL) Branch nationwide. (A/C: Quality Brands (Pvt) Ltd).</li>'
            . '<li><strong>LATE SURCHARGE:</strong> Late fee surcharge of Rs. 50/day applicable strictly after due date.</li>'
            . '<li><strong>HELPLINE:</strong> 0300 39 39 581</li>'
            . '</ul>';
    }

    /**
     * Get voucher settings.
     * GET /api/fees/vouchers/settings
     */
    public function getSettings()
    {
        $instructions = AppSetting::get('voucher_footer_instructions', $this->getDefaultFooterInstructions());
        $signatureImage = AppSetting::get('voucher_signature_image', null);

        return response()->json([
            'voucher_footer_instructions' => $instructions,
            'default_instructions' => $this->getDefaultFooterInstructions(),
            'voucher_signature_image' => $signatureImage,
        ]);
    }

    /**
     * Update voucher settings (footer instructions and/or signature image).
     * POST /api/fees/vouchers/settings
     */
    public function updateSettings(Request $request)
    {
        $request->validate([
            'voucher_footer_instructions' => 'nullable|string',
            'voucher_signature_image' => 'nullable',
            'signature' => 'nullable|file|image|mimes:png,jpg,jpeg,webp,svg|max:5120',
            'remove_signature' => 'nullable',
        ]);

        $footerUpdated = false;
        $signatureUpdated = false;
        $content = null;
        $signatureUrl = AppSetting::get('voucher_signature_image', null);

        // 1. Update instructions if sent
        if ($request->has('voucher_footer_instructions')) {
            $content = $request->input('voucher_footer_instructions');
            if ($content === null || trim($content) === '') {
                $content = $this->getDefaultFooterInstructions();
            }
            AppSetting::set('voucher_footer_instructions', $content);
            $footerUpdated = true;
        }

        // 2. Remove signature if requested
        if ($request->boolean('remove_signature') || $request->input('voucher_signature_image') === '__remove__') {
            AppSetting::set('voucher_signature_image', null);
            $signatureUrl = null;
            $signatureUpdated = true;
        }
        // 3. Upload signature file (multipart/form-data)
        elseif ($request->hasFile('signature') || $request->hasFile('voucher_signature_image')) {
            $file = $request->file('signature') ?: $request->file('voucher_signature_image');
            $filename = 'signature_' . time() . '_' . Str::random(8) . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('signatures', $filename, 'public');
            $signatureUrl = asset('storage/' . $path);
            AppSetting::set('voucher_signature_image', $signatureUrl);
            $signatureUpdated = true;
        }
        // 4. Raw base64 Data URI or string URL
        elseif ($request->filled('voucher_signature_image')) {
            $rawSig = $request->input('voucher_signature_image');
            if (is_string($rawSig) && (str_starts_with($rawSig, 'data:image/') || str_starts_with($rawSig, 'http') || str_starts_with($rawSig, '/storage/'))) {
                AppSetting::set('voucher_signature_image', $rawSig);
                $signatureUrl = $rawSig;
                $signatureUpdated = true;
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Voucher settings updated successfully.',
            'voucher_footer_instructions' => $content ?? AppSetting::get('voucher_footer_instructions', $this->getDefaultFooterInstructions()),
            'voucher_signature_image' => $signatureUrl,
        ]);
    }

    /**
     * Get list of vouchers.
     * GET /api/fees/vouchers
     */
    public function index(Request $request)
    {
        return response()->json($this->getVouchersData($request));
    }

    /**
     * Send Fee Vouchers via WhatsApp (PDF format).
     * POST /api/fees/vouchers/send-whatsapp
     */
    public function sendWhatsApp(Request $request, WhatsAppGatewayService $whatsAppService)
    {
        $dataset = $this->getVouchersData($request);
        $vouchers = $dataset['vouchers'] ?? [];
        $voucherType = $dataset['type'] ?? 'family';
        $targetMonthStr = $dataset['target_month'] ?? date('Y-m');

        // Filter by selected keys if specified
        $selectedKeys = $request->input('selected_keys', []);
        if (!empty($selectedKeys)) {
            $keysSet = array_flip((array)$selectedKeys);
            $vouchers = array_values(array_filter($vouchers, function ($v) use ($keysSet) {
                $key = $v['voucher_number'] ?? (string)($v['student_id'] ?? '');
                return isset($keysSet[$key]);
            }));
        }

        // Only send vouchers with valid phone and pending amount > 0
        $eligibleVouchers = array_values(array_filter($vouchers, function ($v) {
            $phone = $v['phone_number'] ?? ($v['contact_number'] ?? null);
            return !empty($phone) && $phone !== 'no-phone' && ($v['total_payable'] ?? 0) > 0;
        }));

        if (empty($eligibleVouchers)) {
            return response()->json([
                'success' => false,
                'message' => 'No eligible vouchers with valid contact numbers and payable dues found.',
                'total_eligible' => 0
            ], 422);
        }

        $isSync = $request->boolean('sync') || count($eligibleVouchers) === 1;

        // Synchronous single send (instant response for 1 voucher)
        if ($isSync) {
            $v = $eligibleVouchers[0];
            $recipientPhone = $v['phone_number'] ?? ($v['contact_number'] ?? '');
            $voucherNo = $v['voucher_number'] ?? 'KIPS-VCH';
            $guardianName = $v['father_name'] ?? ($v['name'] ?? 'Guardian');
            $monthName = $v['month_name'] ?? date('F Y');
            $dueDate = $v['due_date'] ?? date('Y-m-10');
            $totalPayable = number_format($v['total_payable'] ?? 0);

            try {
                $pdf = Pdf::loadView('pdf.fee-voucher', ['voucher' => $v])
                    ->setPaper('a4', 'landscape');
                $base64Pdf = base64_encode($pdf->output());
                unset($pdf);

                $stName = $v['name'] ?? 'Student';
                $stClass = $v['class_name'] ?? 'Class';
                $studentsSummary = "👤 *طالب علم / Student:* {$stName} ({$stClass})\n";

                $caption = "📢 *KIPS SCHOOL CHUNIAN CAMPUS*\n"
                    . "*فیس واؤچر / Official Fee Voucher*\n\n"
                    . "محترم والدین / سرپرست،\n"
                    . "ماہ *{$monthName}* کا فیس واؤچر بذریعہ PDF منسلک ہے۔ برائے مہربانی مقررہ تاریخ سے قبل فیس جمع کروائیں۔\n\n"
                    . "👤 *سرپرست / Guardian:* {$guardianName}\n"
                    . "🔢 *واؤچر نمبر / Voucher No:* {$voucherNo}\n"
                    . $studentsSummary
                    . "💰 *کل واجب الادا رقم / Total Payable:* Rs. {$totalPayable}\n"
                    . "📅 *آخری تاریخ / Due Date:* {$dueDate}\n\n"
                    . "⚠️ *نوٹ:* برائے مہربانی تاریخ گزرنے سے قبل فیس جمع کروا کر رسید حاصل کریں۔\n\n"
                    . "📞 *Helpline:* 0300 39 39 581\n"
                    . "🌐 *Portal:* https://kips.edu.pk";

                $fileName = "Fee_Voucher_{$voucherNo}.pdf";
                $result = $whatsAppService->sendPdfDocument($recipientPhone, $base64Pdf, $fileName, $caption, true, 'high');

                if (isset($result['success']) && !$result['success']) {
                    return response()->json([
                        'success' => false,
                        'message' => 'WhatsApp gateway error: ' . ($result['error'] ?? 'Delivery failed.'),
                        'result'  => $result,
                    ], 502);
                }

                return response()->json([
                    'success' => true,
                    'message' => "Fee voucher PDF dispatched via WhatsApp to {$guardianName} ({$recipientPhone}).",
                    'mode' => 'sync',
                    'result' => $result,
                ]);
            } catch (\Throwable $e) {
                Log::error("[WhatsApp Single Voucher Error] " . $e->getMessage());
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to generate or send PDF: ' . $e->getMessage()
                ], 500);
            }
        }

        // Asynchronous Queue Batch for multiple vouchers
        SendFeeVoucherWhatsAppBatchJob::dispatch($eligibleVouchers, $voucherType, $targetMonthStr);

        return response()->json([
            'success' => true,
            'message' => "WhatsApp PDF batch job queued successfully for " . count($eligibleVouchers) . " recipients. Vouchers will be generated and dispatched with safe spacing in the background.",
            'mode' => 'queued',
            'total_recipients' => count($eligibleVouchers),
        ]);
    }
}
