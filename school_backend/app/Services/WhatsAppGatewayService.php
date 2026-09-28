<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsAppGatewayService
{
    protected string $baseUrl;
    protected ?string $apiKey;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('services.whatsapp_gateway.base_url', env('WHATSAPP_GATEWAY_URL', 'http://13.60.50.153')), '/');
        $this->apiKey = config('services.whatsapp_gateway.api_key', env('WHATSAPP_GATEWAY_API_KEY', ''));
    }

    /**
     * Standardize Pakistani & international phone numbers.
     * Converts: "03001234567", "+92 300 1234567", "0300-1234567" -> "923001234567"
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

        if (str_starts_with($clean, '03') && strlen($clean) === 11) {
            return '92' . substr($clean, 1);
        }

        if (str_starts_with($clean, '3') && strlen($clean) === 10) {
            return '92' . $clean;
        }

        if (str_starts_with($clean, '9203') && strlen($clean) === 13) {
            return '92' . substr($clean, 3);
        }

        return $clean;
    }

    /**
     * Build HTTP client with x-api-key authentication.
     */
    protected function client()
    {
        return Http::withHeaders([
            'x-api-key'    => $this->apiKey,
            'Content-Type' => 'application/json',
        ])->timeout(15);
    }

    /**
     * Send plain text WhatsApp message.
     */
    public function sendTextMessage(string $phone, string $message, bool $sync = true, string $priority = 'high'): array
    {
        $formattedPhone = $this->formatPhoneNumber($phone);
        if (!$formattedPhone) {
            return [
                'success' => false,
                'error'   => 'Invalid recipient phone number.',
            ];
        }

        try {
            $url = "{$this->baseUrl}/api/v1/send";
            $response = $this->client()->post($url, [
                'number'   => $formattedPhone,
                'message'  => $message,
                'sync'     => $sync,
                'priority' => $priority,
            ]);

            if ($response->successful()) {
                return $response->json();
            }

            Log::error('[WhatsAppGatewayService] Failed to send text message', [
                'status'   => $response->status(),
                'response' => $response->body(),
                'phone'    => $formattedPhone,
            ]);

            return [
                'success' => false,
                'error'   => $response->body(),
            ];
        } catch (\Throwable $e) {
            Log::error('[WhatsAppGatewayService] Error sending text: ' . $e->getMessage());
            return [
                'success' => false,
                'error'   => $e->getMessage(),
            ];
        }
    }

    /**
     * Send PDF document to WhatsApp.
     *
     * @param string $phone Recipient phone number
     * @param string $base64Pdf Raw or Data URI base64 PDF string
     * @param string $fileName File name displayed to user (e.g. Absence_Notice.pdf)
     * @param string $caption WhatsApp message caption
     * @param bool $sync Whether to dispatch synchronously without anti-ban delay
     * @param string $priority 'high', 'urgent', or 'normal'
     */
    public function sendPdfDocument(string $phone, string $base64Pdf, string $fileName = 'document.pdf', string $caption = '', bool $sync = true, string $priority = 'high'): array
    {
        $formattedPhone = $this->formatPhoneNumber($phone);
        if (!$formattedPhone) {
            return [
                'success' => false,
                'error'   => 'Invalid recipient phone number.',
            ];
        }

        // Ensure data URI format if raw base64 is passed
        $mediaPayload = $base64Pdf;
        if (!str_starts_with($mediaPayload, 'data:')) {
            $mediaPayload = 'data:application/pdf;base64,' . $mediaPayload;
        }

        try {
            $url = "{$this->baseUrl}/api/v1/send-media";
            $response = $this->client()->post($url, [
                'number'   => $formattedPhone,
                'media'    => $mediaPayload,
                'filename' => $fileName,
                'caption'  => $caption,
                'sync'     => $sync,
                'priority' => $priority,
            ]);

            if ($response->successful()) {
                return $response->json();
            }

            Log::error('[WhatsAppGatewayService] Failed to send media/PDF', [
                'status'   => $response->status(),
                'response' => $response->body(),
                'phone'    => $formattedPhone,
            ]);

            return [
                'success' => false,
                'error'   => $response->body(),
            ];
        } catch (\Throwable $e) {
            Log::error('[WhatsAppGatewayService] Error sending PDF: ' . $e->getMessage());
            return [
                'success' => false,
                'error'   => $e->getMessage(),
            ];
        }
    }

    /**
     * Check credit balance and gateway health status.
     */
    public function checkBalance(): array
    {
        try {
            $url = "{$this->baseUrl}/api/v1/balance";
            $response = $this->client()->get($url);

            if ($response->successful()) {
                return $response->json();
            }

            return [
                'success' => false,
                'error'   => $response->body(),
                'status'  => 'offline',
            ];
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'error'   => $e->getMessage(),
                'status'  => 'unreachable',
            ];
        }
    }
}
