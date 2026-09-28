<?php

namespace App\Jobs;

use App\Models\FeePayment;
use App\Models\AcademicSession;
use App\Models\StudentFeeItem;
use App\Services\WhatsAppGatewayService;
use Carbon\Carbon;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class SendFeeReceiptWhatsAppJob implements ShouldQueue
{
    use Queueable;

    protected FeePayment $payment;

    /**
     * Create a new job instance.
     */
    public function __construct(FeePayment $payment)
    {
        $this->payment = $payment;
    }

    /**
     * Execute the job.
     */
    public function handle(WhatsAppGatewayService $whatsAppService): void
    {
        try {
            $this->payment->loadMissing([
                'student.academyClass',
                'student.section',
                'student.major',
                'receiver',
                'items'
            ]);

            $student = $this->payment->student;
            if (!$student) {
                return;
            }

            $phone = $student->contact_number ?: ($student->emergency_contact ?: ($student->father_cell ?? null));
            if (!$phone) {
                Log::info("[Fee Receipt WhatsApp] Student #{$student->id} ({$student->name}) has no valid contact phone number.");
                return;
            }

            $stName = $student->name ?? 'Student';
            $fatherName = $student->father_name ?: ($this->payment->payer_name ?: 'Guardian');
            $className = $student->academyClass?->name ?? 'N/A';
            if (!empty($student->section?->name)) {
                $className .= " ({$student->section->name})";
            }
            $rollNo = $student->roll_number ? $student->roll_number : ("KIPS-" . str_pad($student->id, 4, "0", STR_PAD_LEFT));
            $formattedPaid = number_format((float)$this->payment->amount_paid);
            $formattedDiscount = number_format((float)($this->payment->discount_amount ?? 0));
            $paymentDate = Carbon::parse($this->payment->payment_date)->format('d M Y');
            
            $monthCarbon = Carbon::createFromFormat('Y-m', $this->payment->month);
            $monthFormatted = $monthCarbon->format('F Y');
            $receiptNo = 'REC-' . str_replace('-', '', $this->payment->month) . '-' . str_pad($this->payment->id, 4, '0', STR_PAD_LEFT);
            $receiverName = $this->payment->receiver?->name ?? 'Accounts Office';

            // Calculate current remaining balance for student
            $remainingBalance = null;
            try {
                $activeSession = AcademicSession::getActiveSession();
                $startDate = $activeSession ? $activeSession->start_date : '2020-01-01';
                $sessionStart = Carbon::parse($startDate)->startOfMonth();
                $targetCarbon = $monthCarbon->copy()->startOfMonth();

                $monthlyFee = (float)($student->monthly_fee ?: 0);
                $allPayments = FeePayment::with('items')
                    ->where('student_id', $student->id)
                    ->where('month', '>=', $sessionStart->format('Y-m'))
                    ->get();

                $studentCreated = Carbon::parse($student->created_at);
                $start = ($studentCreated->gt($sessionStart) ? $studentCreated : $sessionStart)->copy()->startOfMonth();
                $monthsEnrolled = $start->diffInMonths($targetCarbon) + 1;
                $totalTuitionDue = $monthsEnrolled * $monthlyFee;

                $totalTuitionPaid = 0;
                $totalTuitionDisc = 0;
                foreach ($allPayments as $p) {
                    $pItems = $p->items;
                    $nonTuition = (float)$pItems->whereNotNull('student_fee_item_id')->sum('amount_paid');
                    $totalTuitionPaid += max(0, (float)$p->amount_paid - $nonTuition);
                    $totalTuitionDisc += (float)$p->discount_amount;
                }
                $tuitionBal = max(0, $totalTuitionDue - ($totalTuitionPaid + $totalTuitionDisc));

                $studentFeeItems = StudentFeeItem::where('student_id', $student->id)
                    ->where('head_key', '!=', 'tuition_fee')
                    ->get();
                $unpaidExtra = (float)$studentFeeItems->sum('balance_amount');

                $remainingBalance = $tuitionBal + $unpaidExtra;
            } catch (\Throwable $e) {
                Log::warning("[Fee Receipt WhatsApp Balance Calc] " . $e->getMessage());
            }

            $itemLines = "";
            if ($this->payment->relationLoaded('items') && $this->payment->items->isNotEmpty()) {
                foreach ($this->payment->items as $item) {
                    $itemLines .= "  • " . ($item->head_name ?: $item->head_key) . ": Rs " . number_format((float)$item->amount_paid) . "\n";
                }
            }

            $message = "📢 *KIPS SCHOOL CHUNIAN CAMPUS*\n"
                . "*فیس رسید / Official Fee Receipt*\n\n"
                . "محترم والدین / سرپرست،\n"
                . "طالب علم کی ادا کردہ فیس موصول ہو گئی ہے۔ شکریہ!\n\n"
                . "👤 *طالب علم / Student:* {$stName}\n"
                . "👨‍👦 *سرپرست / Guardian:* {$fatherName}\n"
                . "🔢 *رول نمبر / Roll No:* {$rollNo}\n"
                . "🏫 *کلاس / Class:* {$className}\n"
                . "📅 *فیس کا مہینہ / Fee Month:* {$monthFormatted}\n"
                . "💰 *وصول شدہ رقم / Amount Paid:* Rs {$formattedPaid}\n";

            if ((float)$this->payment->discount_amount > 0) {
                $message .= "🏷️ *رعایت / Discount:* Rs {$formattedDiscount}\n";
            }

            if (!empty($itemLines)) {
                $message .= "\n📋 *تفصیلات / Fee Particulars:*\n" . $itemLines;
            }

            if ($remainingBalance !== null) {
                $formattedRemaining = number_format(max(0, $remainingBalance));
                $message .= "\n💳 *بقایا واجب الادا / Remaining Balance:* Rs {$formattedRemaining}\n";
            }

            $message .= "\n🧾 *رسید نمبر / Receipt No:* {$receiptNo}\n"
                . "📅 *تاریخ / Date:* {$paymentDate}\n"
                . "👤 *وصول کنندہ / Received By:* {$receiverName}\n\n"
                . "📞 *Helpline:* 0300 39 39 581\n"
                . "🌐 *Portal:* https://kips.edu.pk";

            $res = $whatsAppService->sendTextMessage($phone, $message, true, 'high');

            Log::info("[Fee Receipt WhatsApp] Dispatched receipt to {$phone} for student {$stName}: " . json_encode($res));

        } catch (\Throwable $e) {
            Log::error("[Fee Receipt WhatsApp Error] " . $e->getMessage());
        }
    }
}
