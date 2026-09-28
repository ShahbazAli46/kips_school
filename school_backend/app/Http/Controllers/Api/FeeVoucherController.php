<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\SendFeeVoucherWhatsAppBatchJob;
use App\Models\AcademicSession;
use App\Models\User;
use App\Services\WhatsAppGatewayService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

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
        $studentCreated = Carbon::parse($student->created_at)->startOfMonth();
        $start = $studentCreated->gt($sessionStart) ? $studentCreated : $sessionStart;

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

        // Current Month Payments & Discounts for Tuition Fee
        $currentMonthPayments = $student->feePayments->where('month', $targetMonthStr);
        [$currentMonthPaid, $currentMonthDiscount] = $getTuitionPaidAndDiscount($currentMonthPayments);
        $currentMonthNetDue = max(0, $monthlyFee - ($currentMonthPaid + $currentMonthDiscount));

        // Prior Months Tuition Arrears (Months prior to targetMonthStr)
        $previousTuitionArrears = 0;
        if ($start->lt($targetCarbon)) {
            $priorMonthsCount = $start->diffInMonths($targetCarbon);
            $priorFeesDue = ($priorMonthsCount * $monthlyFee);

            $priorPayments = $student->feePayments->filter(fn($p) => $p->month < $targetMonthStr);
            [$priorPaid, $priorDiscount] = $getTuitionPaidAndDiscount($priorPayments);

            $previousTuitionArrears = max(0, $priorFeesDue - ($priorPaid + $priorDiscount));
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
            // 1. Current Month Tuition Fee (only if there is net due to collect)
            if ($currentMonthNetDue > 0) {
                $feeItems[] = [
                    'label' => "Tuition Fee ({$monthFormatted})",
                    'amount' => $currentMonthNetDue,
                    'head_key' => 'tuition_fee',
                ];
            }

            // 2. Unpaid non-monthly heads & extra charges
            foreach ($unpaidHeads as $uh) {
                $feeItems[] = [
                    'label' => $uh['label'],
                    'amount' => $uh['amount'],
                    'head_key' => $uh['head_key'] ?? 'unknown',
                ];
            }

            // 3. Previous Tuition Arrears
            if ($previousTuitionArrears > 0) {
                $feeItems[] = [
                    'label' => 'Previous Tuition Arrears',
                    'amount' => $previousTuitionArrears,
                    'head_key' => 'tuition_fee',
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
        $targetMonthStr = $request->input('month', Carbon::now()->format('Y-m'));
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
            'feePayments' => function ($q) use ($startMonthStr) {
                $q->where('month', '>=', $startMonthStr)
                  ->with(['items', 'studentExtraCharge'])
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

        // Individual Student Vouchers (1 voucher per student)
        $individualVouchers = $calculatedStudents->values()->map(function ($item) use ($targetMonthStr, $monthName, $monthKey, $dueDate) {
            $voucherNumber = "KIPS-VCH-{$monthKey}-" . str_pad($item['student_id'], 4, '0', STR_PAD_LEFT);
            return array_merge($item, [
                'voucher_number' => $voucherNumber,
                'voucher_type' => 'individual',
                'target_month' => $targetMonthStr,
                'month_name' => $monthName,
                'due_date' => $dueDate,
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
            'summary' => $summary,
            'vouchers' => $individualVouchers->values()->all(),
        ];
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
