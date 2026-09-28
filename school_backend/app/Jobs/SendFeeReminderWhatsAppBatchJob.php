<?php

namespace App\Jobs;

use App\Models\AppSetting;
use App\Models\User;
use App\Services\WhatsAppGatewayService;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendFeeReminderWhatsAppBatchJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $timeout = 7200;

    protected array $studentIds;
    protected ?string $billingMonth;
    protected int $startIndex;

    /**
     * @param array $studentIds List of student IDs with pending fees
     * @param string|null $billingMonth Optional specific billing month (YYYY-MM)
     * @param int $startIndex Pointer for resuming after breaks
     */
    public function __construct(array $studentIds, ?string $billingMonth = null, int $startIndex = 0)
    {
        $this->studentIds = array_values($studentIds);
        $this->billingMonth = $billingMonth ?: date("Y-m");
        $this->startIndex = $startIndex;
    }

    public function handle(WhatsAppGatewayService $whatsAppService): void
    {
        $totalStudents = count($this->studentIds);
        if ($totalStudents === 0 || $this->startIndex >= $totalStudents) {
            return;
        }

        Log::info("[WhatsApp Fee Reminder Job] Starting batch for {$totalStudents} defaulters from index {$this->startIndex} for month {$this->billingMonth}.");

        $batchSentCount = 0;
        $maxPerBatch = 100;
        $activeSession = \App\Models\AcademicSession::getActiveSession();
        $startDate = $activeSession ? $activeSession->start_date : "2020-01-01";
        $startMonthStr = Carbon::parse($startDate)->format("Y-m");
        $formattedMonth = Carbon::parse($this->billingMonth . "-01")->format("F Y");

        for ($i = $this->startIndex; $i < $totalStudents; $i++) {
            $studentId = $this->studentIds[$i];
            
            $student = User::with(["academyClass", "section", "major"])
                ->withSum(["feePayments as total_paid" => function($q) use ($startMonthStr) {
                    $q->where("month", ">=", $startMonthStr);
                }], "amount_paid")
                ->withSum(["feePayments as total_discount" => function($q) use ($startMonthStr) {
                    $q->where("month", ">=", $startMonthStr);
                }], "discount_amount")
                ->selectRaw("
                    users.*,
                    (TIMESTAMPDIFF(MONTH, DATE_FORMAT(GREATEST(created_at, ?), \"%Y-%m-01\"), DATE_FORMAT(CURDATE(), \"%Y-%m-01\")) + 1) as total_months
                ", [$startDate])
                ->find($studentId);

            if ($student) {
                $phone = $student->contact_number ?: $student->emergency_contact;
                $monthlyFee = (float) ($student->monthly_fee ?? 0);
                $totalMonths = (int) ($student->total_months ?? 1);
                $totalExpected = $monthlyFee * $totalMonths;
                $totalPaid = (float) ($student->total_paid ?? 0);
                $totalDiscount = (float) ($student->total_discount ?? 0);
                $balance = $totalExpected - ($totalPaid + $totalDiscount);

                // Only send if there is actually a pending balance > 0 and phone exists
                if ($phone && $balance > 0) {
                    try {
                        $className = $student->academyClass?->name ?? "N/A";
                        if (!empty($student->section?->name)) {
                            $className .= " - Section " . $student->section->name;
                        }
                        $rollNo = $student->roll_number ? $student->roll_number : ("KIPS-" . str_pad($student->id, 4, "0", STR_PAD_LEFT));

                        $formattedFee = number_format($monthlyFee);
                        $formattedBalance = number_format($balance);

                        $message = "📢 *KIPS SCHOOL CHUNIAN CAMPUS*\n"
                            . "*فیس کی ادائیگی کی یاد دہانی | Fee Due Notice*\n\n"
                            . "محترم والدین / سرپرست،\n"
                            . "امید ہے آپ خیریت سے ہوں گے۔ برائے مہربانی اپنے بچے کی واجب الادا اکیڈمی فیس کی تفصیلات ملاحظہ فرمائیں:\n\n"
                            . "👤 *طالب علم / Student:* {$student->name}\n"
                            . "🔢 *رول نمبر / Roll No:* {$rollNo}\n"
                            . "📚 *کلاس / Class:* {$className}\n"
                            . "💰 *ماہانہ فیس / Monthly Fee:* Rs {$formattedFee}\n"
                            . "💳 *کل واجب الادا رقم / Pending Balance:* Rs {$formattedBalance}\n"
                            . "📅 *مہینہ / Billing Month:* {$formattedMonth}\n\n"
                            . "⚠️ *گزارش:* برائے مہربانی کسی بھی تعطل سے بچنے کے لیے واجب الادا فیس جلد از جلد اکیڈمی آفس میں جمع کروائیں۔ شکریہ!\n\n"
                            . "📞 *Helpline:* 0300 39 39 581\n"
                            . "🌐 *Portal:* https://usachunian.com";

                        $result = $whatsAppService->sendTextMessage($phone, $message);

                        Log::info("[WhatsApp Fee Reminder Job] Sent to {$student->name} ({$phone}) [Item " . ($i + 1) . "/{$totalStudents}]", [
                            "response" => $result
                        ]);

                        $batchSentCount++;
                    } catch (\Throwable $e) {
                        Log::error("[WhatsApp Fee Reminder Job Error] Student ID {$studentId}: " . $e->getMessage());
                    }
                }
            }

            $isLastItem = ($i === $totalStudents - 1);

            if ($batchSentCount >= $maxPerBatch && !$isLastItem) {
                $nextIndex = $i + 1;
                Log::info("[WhatsApp Fee Reminder Job] Reached 100 messages limit. 5-min break before index {$nextIndex}.");
                self::dispatch($this->studentIds, $this->billingMonth, $nextIndex)->delay(now()->addMinutes(5));
                return;
            }

            if (!$isLastItem) {
                $sleepSeconds = rand(12, 22);
                Log::info("[WhatsApp Fee Reminder Job] Waiting {$sleepSeconds}s before next message...");
                sleep($sleepSeconds);
            }
        }

        Log::info("[WhatsApp Fee Reminder Job] Completed batch processing for month {$this->billingMonth}.");
    }
}
