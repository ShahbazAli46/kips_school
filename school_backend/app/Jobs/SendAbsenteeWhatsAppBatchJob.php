<?php

namespace App\Jobs;

use App\Models\AppSetting;
use App\Models\User;
use App\Services\WhatsAppGatewayService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendAbsenteeWhatsAppBatchJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of seconds the job can run before timing out.
     */
    public $timeout = 7200;

    protected array $studentIds;
    protected string $date;
    protected int $startIndex;

    /**
     * Create a new job instance.
     *
     * @param array $studentIds List of absent student IDs
     * @param string $date Date of attendance (YYYY-MM-DD)
     * @param int $startIndex Pointer for resuming after breaks
     */
    public function __construct(array $studentIds, string $date, int $startIndex = 0)
    {
        $this->studentIds = array_values($studentIds);
        $this->date = $date;
        $this->startIndex = $startIndex;
    }

    /**
     * Execute the job.
     */
    public function handle(WhatsAppGatewayService $whatsAppService): void
    {
        // Check if WhatsApp absent notification is enabled in Super Admin settings
        if (!AppSetting::isWhatsAppAbsentNotificationEnabled()) {
            Log::info("[WhatsApp Absentee Job] Skipped: Setting is disabled in Super Admin controls.");
            return;
        }

        $totalStudents = count($this->studentIds);
        if ($totalStudents === 0 || $this->startIndex >= $totalStudents) {
            return;
        }

        Log::info("[WhatsApp Absentee Job] Starting batch for {$totalStudents} absent students from index {$this->startIndex} on date {$this->date}.");

        $batchSentCount = 0;
        $maxPerBatch = 100;
        $formattedDate = date("d M, Y (l)", strtotime($this->date));

        for ($i = $this->startIndex; $i < $totalStudents; $i++) {
            $studentId = $this->studentIds[$i];
            $student = User::with(["academyClass", "section", "major"])->find($studentId);

            if ($student) {
                $phone = $student->contact_number ?: $student->emergency_contact;

                if ($phone) {
                    try {
                        $className = $student->academyClass?->name ?? "N/A";
                        if (!empty($student->section?->name)) {
                            $className .= " - Section " . $student->section->name;
                        }
                        $rollNo = $student->roll_number ? $student->roll_number : ("KIPS-" . str_pad($student->id, 4, "0", STR_PAD_LEFT));

                        $message = "📢 *KIPS SCHOOL CHUNIAN CAMPUS*\n"
                            . "*غیر حاضری کی اطلاع | Student Absence Alert*\n\n"
                            . "محترم والدین / سرپرست،\n"
                            . "اطلاع دی جاتی ہے کہ آپ کا بچہ آج اکیڈمی سے غیر حاضر ہے۔\n\n"
                            . "👤 *طالب علم / Student:* {$student->name}\n"
                            . "🔢 *رول نمبر / Roll No:* {$rollNo}\n"
                            . "📚 *کلاس / Class:* {$className}\n"
                            . "📅 *تاریخ / Date:* {$formattedDate}\n\n"
                            . "⚠️ باقاعدہ حاضری طالب علم کے تعلیمی تسلسل اور شاندار نتائج کے لیے لازمی ہے۔ اگر چھٹی کی کوئی پیشگی درخواست نہیں تھی تو براہ کرم اکیڈمی انتظامیہ سے رابطہ کریں۔\n\n"
                            . "📞 *Helpline:* 0300 39 39 581\n"
                            . "🌐 *Portal:* https://usachunian.com";

                        $result = $whatsAppService->sendTextMessage($phone, $message);

                        Log::info("[WhatsApp Absentee Job] Sent text to {$student->name} ({$phone}) [Item " . ($i + 1) . "/{$totalStudents}]", [
                            "response" => $result
                        ]);

                        $batchSentCount++;
                    } catch (\Throwable $e) {
                        Log::error("[WhatsApp Absentee Job Error] Student ID {$studentId}: " . $e->getMessage());
                    }
                }
            }

            $isLastItem = ($i === $totalStudents - 1);

            // If we reached 100 messages in this batch and more items remain:
            if ($batchSentCount >= $maxPerBatch && !$isLastItem) {
                $nextIndex = $i + 1;
                Log::info("[WhatsApp Absentee Job] Reached 100 messages limit. Taking a 5-minute break before resuming at index {$nextIndex}.");

                // Re-dispatch job to resume from nextIndex after 5 minutes (300 seconds)
                self::dispatch($this->studentIds, $this->date, $nextIndex)->delay(now()->addMinutes(5));
                return;
            }

            // Anti-ban random gap between messages (12 to 22 seconds)
            if (!$isLastItem) {
                $sleepSeconds = rand(12, 22);
                Log::info("[WhatsApp Absentee Job] Waiting {$sleepSeconds}s before next message...");
                sleep($sleepSeconds);
            }
        }

        Log::info("[WhatsApp Absentee Job] Completed batch processing for date {$this->date}.");
    }
}
