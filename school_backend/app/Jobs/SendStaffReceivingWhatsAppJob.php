<?php

namespace App\Jobs;

use App\Models\StaffStudentReceiving;
use App\Services\WhatsAppGatewayService;
use Carbon\Carbon;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class SendStaffReceivingWhatsAppJob implements ShouldQueue
{
    use Queueable;

    protected int $receivingId;

    /**
     * Create a new job instance.
     */
    public function __construct(int $receivingId)
    {
        $this->receivingId = $receivingId;
    }

    /**
     * Execute the job.
     */
    public function handle(WhatsAppGatewayService $whatsAppService): void
    {
        try {
            $receiving = StaffStudentReceiving::with([
                'student.academyClass',
                'student.section',
                'staff',
            ])->find($this->receivingId);

            if (!$receiving || !$receiving->student) {
                Log::warning("[Staff Receiving WhatsApp] Receiving record #{$this->receivingId} not found.");
                return;
            }

            $student = $receiving->student;
            $phone = $student->contact_number ?: ($student->emergency_contact ?: ($student->father_cell ?? null));

            if (!$phone) {
                $receiving->update([
                    'whatsapp_status' => 'no_phone',
                    'whatsapp_error'  => 'No valid contact phone number found for student/parent.',
                ]);
                Log::info("[Staff Receiving WhatsApp] Student #{$student->id} ({$student->name}) has no contact number.");
                return;
            }

            $stName = $student->name ?? 'Student';
            $fatherName = $student->father_name ?: 'Guardian';
            $className = $student->academyClass?->name ?? 'N/A';
            if (!empty($student->section?->name)) {
                $className .= " ({$student->section->name})";
            }
            $rollNo = $student->roll_number ?: ("KIPS-" . str_pad($student->id, 4, "0", STR_PAD_LEFT));
            $formattedAmount = number_format((float)$receiving->amount);
            $paymentDate = Carbon::parse($receiving->received_date)->format('d M Y');
            $collectorName = $receiving->staff?->name ?? 'School Staff';
            $paymentMethod = ucfirst($receiving->payment_method ?? 'cash');

            $message = "🏫 *KIPS SCHOOL CHUNIAN CAMPUS*\n";
            $message .= "🧾 *PAYMENT RECEIPT ACKNOWLEDGEMENT*\n\n";
            $message .= "Dear *{$fatherName}*,\n";
            $message .= "We gratefully acknowledge receipt of payment for student *{$stName}*.\n\n";
            $message .= "📌 *Receipt Details:*\n";
            $message .= "• *Receipt No:* `{$receiving->receipt_no}`\n";
            $message .= "• *Student:* {$stName} (Roll No: {$rollNo})\n";
            $message .= "• *Class / Section:* {$className}\n";
            $message .= "• *Amount Received:* *Rs. {$formattedAmount}* ({$paymentMethod})\n";
            $message .= "• *Purpose / Reason:* {$receiving->description}\n";
            $message .= "• *Date:* {$paymentDate}\n";
            $message .= "• *Received By:* {$collectorName}\n\n";
            $message .= "If you have any questions, please contact the school administration office.\n\n";
            $message .= "🌟 *Kips School Chunian Campus*\n";
            $message .= "_Topper's First Choice_";

            $result = $whatsAppService->sendTextMessage($phone, $message, true, 'high');

            if (!empty($result['success']) || !empty($result['message_id']) || !empty($result['status'])) {
                $receiving->update([
                    'parent_phone'        => $phone,
                    'whatsapp_status'     => 'sent',
                    'whatsapp_message_id' => $result['message_id'] ?? ($result['id'] ?? null),
                    'whatsapp_sent_at'    => now(),
                    'whatsapp_error'      => null,
                ]);
                Log::info("[Staff Receiving WhatsApp] Sent receipt #{$receiving->receipt_no} to {$phone}");
            } else {
                $errorMsg = $result['error'] ?? 'WhatsApp gateway returned unsuccessful status.';
                $receiving->update([
                    'parent_phone'    => $phone,
                    'whatsapp_status' => 'failed',
                    'whatsapp_error'  => is_string($errorMsg) ? $errorMsg : json_encode($errorMsg),
                ]);
                Log::error("[Staff Receiving WhatsApp] Failed to send receipt #{$receiving->receipt_no} to {$phone}: " . json_encode($result));
            }
        } catch (\Throwable $e) {
            Log::error("[Staff Receiving WhatsApp Job Exception] #{$this->receivingId}: " . $e->getMessage());
            StaffStudentReceiving::where('id', $this->receivingId)->update([
                'whatsapp_status' => 'failed',
                'whatsapp_error'  => $e->getMessage(),
            ]);
        }
    }
}
