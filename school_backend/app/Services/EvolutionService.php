<?php

namespace App\Services;

use App\Models\FeePayment;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class EvolutionService
{
    protected string $baseUrl;
    protected ?string $apiKey;
    protected string $instance;

    public function __construct()
    {
        $this->baseUrl  = rtrim(config('services.evolution.url', env('EVOLUTION_API_URL', 'http://localhost:8080')), '/');
        $this->apiKey   = config('services.evolution.api_key', env('EVOLUTION_API_KEY', ''));
        $this->instance = config('services.evolution.instance', env('EVOLUTION_INSTANCE', 'umar_academy'));
    }

    /**
     * Build standard HTTP request headers with API key.
     */
    protected function client()
    {
        return Http::withHeaders([
            'apikey'       => $this->apiKey,
            'Content-Type' => 'application/json',
        ])->timeout(15);
    }

    /**
     * Standardize and format phone numbers.
     * Converts:
     *   "03001234567"     -> "923001234567"
     *   "+92 300 1234567" -> "923001234567"
     *   "0300-1234567"    -> "923001234567"
     */
    public function formatPhoneNumber(?string $phone): ?string
    {
        if (empty($phone)) {
            return null;
        }

        $clean = preg_replace('/[^0-9]/', '', $phone);

        if (empty($clean)) {
            return null;
        }

        // Handle Pakistan local format (starts with 03) -> replace leading 0 with 92
        if (str_starts_with($clean, '03') && strlen($clean) === 11) {
            return '92' . substr($clean, 1);
        }

        // Handle Pakistan without leading zero (starts with 3, 10 digits)
        if (str_starts_with($clean, '3') && strlen($clean) === 10) {
            return '92' . $clean;
        }

        // Handle numbers already with 9203... -> normalize to 923...
        if (str_starts_with($clean, '9203') && strlen($clean) === 13) {
            return '92' . substr($clean, 3);
        }

        return $clean;
    }

    /**
     * Send a plain text WhatsApp message.
     */
    public function sendTextMessage(string $phone, string $message): array
    {
        $formattedPhone = $this->formatPhoneNumber($phone);
        if (!$formattedPhone) {
            return [
                'success' => false,
                'message' => 'Invalid phone number provided.',
            ];
        }

        try {
            $response = $this->client()->post("{$this->baseUrl}/send/text", [
                'number' => $formattedPhone,
                'text'   => $message,
            ]);

            if ($response->successful()) {
                return [
                    'success' => true,
                    'data'    => $response->json(),
                ];
            }

            Log::error('[EvolutionService] Failed to send text message', [
                'status'   => $response->status(),
                'response' => $response->body(),
                'phone'    => $formattedPhone,
            ]);

            return [
                'success' => false,
                'status'  => $response->status(),
                'message' => $response->body(),
            ];
        } catch (\Throwable $e) {
            Log::error('[EvolutionService] Exception sending text message', [
                'error' => $e->getMessage(),
                'phone' => $formattedPhone,
            ]);

            return [
                'success' => false,
                'message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Send a media message (Document/PDF, Image, Audio, Video).
     */
    public function sendMediaMessage(
        string $phone,
        string $mediaUrl,
        string $caption = '',
        string $mediaType = 'document',
        ?string $fileName = null
    ): array {
        $formattedPhone = $this->formatPhoneNumber($phone);
        if (!$formattedPhone) {
            return [
                'success' => false,
                'message' => 'Invalid phone number provided.',
            ];
        }

        try {
            $payload = [
                'number'   => $formattedPhone,
                'url'      => $mediaUrl,
                'type'     => $mediaType,
                'caption'  => $caption,
            ];

            if ($fileName) {
                $payload['filename'] = $fileName;
            }

            $response = $this->client()->post("{$this->baseUrl}/send/media", $payload);

            if ($response->successful()) {
                return [
                    'success' => true,
                    'data'    => $response->json(),
                ];
            }

            Log::error('[EvolutionService] Failed to send media message', [
                'status'   => $response->status(),
                'response' => $response->body(),
                'phone'    => $formattedPhone,
            ]);

            return [
                'success' => false,
                'status'  => $response->status(),
                'message' => $response->body(),
            ];
        } catch (\Throwable $e) {
            Log::error('[EvolutionService] Exception sending media message', [
                'error' => $e->getMessage(),
                'phone' => $formattedPhone,
            ]);

            return [
                'success' => false,
                'message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Send Base64 encoded PDF document.
     */
    public function sendPdfBase64(string $phone, string $base64Pdf, string $fileName = 'document.pdf', string $caption = ''): array
    {
        // Strip data URI prefix if present for raw base64 string
        if (str_contains($base64Pdf, ',')) {
            $base64Pdf = explode(',', $base64Pdf)[1];
        }

        return $this->sendMediaMessage(
            phone: $phone,
            mediaUrl: $base64Pdf,
            caption: $caption,
            mediaType: 'document',
            fileName: $fileName
        );
    }

    /**
     * Check the connection status of the instance.
     */
    public function getInstanceStatus(): array
    {
        try {
            $response = $this->client()->get("{$this->baseUrl}/instance/status");

            return [
                'success' => $response->successful(),
                'status'  => $response->status(),
                'data'    => $response->json(),
            ];
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Fetch QR code for pairing WhatsApp.
     */
    public function getQrCode(): array
    {
        try {
            $response = $this->client()->get("{$this->baseUrl}/instance/qr");

            return [
                'success' => $response->successful(),
                'status'  => $response->status(),
                'data'    => $response->json(),
            ];
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'message' => $e->getMessage(),
            ];
        }
    }

    // =========================================================================
    // Domain-Specific Notification Helpers (Kips School Chunian Campus)
    // =========================================================================

    public function sendAttendanceAbsentAlert(User $student, string $date): array
    {
        $phone = $student->contact_number ?: $student->emergency_contact;
        if (!$phone) {
            return ['success' => false, 'message' => 'No contact number available for student.'];
        }

        $formattedDate = date('d M, Y', strtotime($date));
        $message = "📢 *Kips School Chunian Campus - Attendance Alert*\n\n"
            . "Dear Parent/Guardian,\n"
            . "Please be informed that your child *{$student->name}* (Roll No: *{$student->roll_number}*) was marked *ABSENT* on *{$formattedDate}*.\n\n"
            . "If this was an informed leave, please disregard this notice. For queries, contact the administration.";

        return $this->sendTextMessage($phone, $message);
    }

    public function sendFeeReceipt(User $student, FeePayment $payment): array
    {
        $phone = $student->contact_number ?: $student->emergency_contact;
        if (!$phone) {
            return ['success' => false, 'message' => 'No contact number available for student.'];
        }

        $paidAmount = number_format((float) ($payment->paid_amount ?? $payment->amount ?? 0), 2);
        $paymentDate = date('d M, Y', strtotime($payment->payment_date ?? now()));

        $message = "💳 *Kips School Chunian Campus - Fee Payment Receipt*\n\n"
            . "Dear Parent,\n"
            . "We have received a fee payment for *{$student->name}*.\n\n"
            . "• *Amount Paid:* Rs. {$paidAmount}\n"
            . "• *Payment Date:* {$paymentDate}\n"
            . "• *Receipt / Voucher #:* {$payment->id}\n\n"
            . "Thank you for the timely payment!";

        return $this->sendTextMessage($phone, $message);
    }

    public function sendFeeReminder(User $student, ?float $pendingAmount = null): array
    {
        $phone = $student->contact_number ?: $student->emergency_contact;
        if (!$phone) {
            return ['success' => false, 'message' => 'No contact number available for student.'];
        }

        $due = $pendingAmount !== null ? $pendingAmount : (float) ($student->pending_amount ?? $student->monthly_fee ?? 0);
        $formattedDue = number_format($due, 2);

        $message = "⚠️ *Kips School Chunian Campus - Fee Reminder*\n\n"
            . "Dear Parent/Guardian,\n"
            . "This is a friendly reminder regarding the pending fee for *{$student->name}* (Roll No: *{$student->roll_number}*).\n\n"
            . "• *Pending Balance:* Rs. {$formattedDue}\n\n"
            . "Kindly clear the outstanding dues at your earliest convenience. Thank you!";

        return $this->sendTextMessage($phone, $message);
    }

    public function sendTestResultAlert(User $student, string $testTitle, string $subjectName, float $obtainedMarks, float $totalMarks): array
    {
        $phone = $student->contact_number ?: $student->emergency_contact;
        if (!$phone) {
            return ['success' => false, 'message' => 'No contact number available for student.'];
        }

        $percentage = $totalMarks > 0 ? round(($obtainedMarks / $totalMarks) * 100, 1) : 0;

        $message = "📊 *Kips School Chunian Campus - Test Result*\n\n"
            . "Student: *{$student->name}* (Roll No: *{$student->roll_number}*)\n"
            . "Test: *{$testTitle}*\n"
            . "Subject: *{$subjectName}*\n\n"
            . "• *Obtained Marks:* {$obtainedMarks} / {$totalMarks}\n"
            . "• *Percentage:* {$percentage}%\n\n"
            . "Keep encouraging your child for continuous improvement!";

        return $this->sendTextMessage($phone, $message);
    }
}
