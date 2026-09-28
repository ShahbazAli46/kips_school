<?php

namespace App\Services;

use App\Models\FcmToken;
use App\Models\PushNotificationLog;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FcmService
{
    protected string $projectId;
    protected ?string $credentialsPath;
    protected ?string $clientEmail;
    protected ?string $privateKey;

    public function __construct()
    {
        $this->projectId = config('firebase.project_id', 'umaracademy-4e95f');
        $this->credentialsPath = config('firebase.credentials_path');
        $this->clientEmail = config('firebase.client_email');
        $this->privateKey = config('firebase.private_key');
    }

    /**
     * Send push notification to a single FCM device token.
     */
    public function sendToToken(
        string $token,
        string $title,
        string $body,
        array $data = [],
        string $channelId = 'general_channel',
        ?string $screen = null,
        ?string $extraId = null
    ): array {
        $accessToken = $this->getAccessToken();
        if (!$accessToken) {
            Log::warning('[FCM] Push skipped: Firebase credentials not configured or access token could not be generated.');
            return ['success' => false, 'error' => 'Firebase credentials not configured'];
        }

        // Build data dictionary (all string key-values)
        $stringData = array_map(fn($v) => is_scalar($v) ? (string) $v : json_encode($v), $data);
        $stringData['title'] = $title;
        $stringData['body'] = $body;
        $stringData['channel_id'] = $channelId;
        if ($screen) $stringData['screen'] = $screen;
        if ($extraId) $stringData['extra_id'] = $extraId;

        $payload = [
            'message' => [
                'token' => $token,
                'notification' => [
                    'title' => $title,
                    'body' => $body,
                ],
                'data' => $stringData,
                'android' => [
                    'priority' => 'HIGH',
                    'notification' => [
                        'channel_id' => $channelId,
                        'sound' => 'default',
                        'default_sound' => true,
                        'default_vibrate_timings' => true,
                    ],
                ],
            ],
        ];

        try {
            $url = "https://fcm.googleapis.com/v1/projects/{$this->projectId}/messages:send";
            $response = Http::withToken($accessToken)
                ->withHeaders(['Content-Type' => 'application/json; UTF-8'])
                ->post($url, $payload);

            if ($response->successful()) {
                FcmToken::where('token', $token)->update(['last_used_at' => now()]);
                return ['success' => true, 'response' => $response->json()];
            }

            $errorBody = $response->json();
            $errorCode = $errorBody['error']['details'][0]['errorCode'] ?? $errorBody['error']['status'] ?? null;

            // Delete dead / expired tokens
            if (in_array($errorCode, ['UNREGISTERED', 'NOT_FOUND', 'INVALID_ARGUMENT']) || $response->status() === 404) {
                Log::info("[FCM] Removing stale or unregistered token: {$token}");
                FcmToken::where('token', $token)->delete();
            }

            Log::warning("[FCM] Send failed ({$response->status()}): " . json_encode($errorBody));
            return ['success' => false, 'error' => $errorBody];
        } catch (\Throwable $e) {
            Log::error("[FCM] Error sending message: " . $e->getMessage());
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Send push notification to a specific user (all registered devices).
     */
    public function sendToUser(
        User|int $user,
        string $title,
        string $body,
        array $data = [],
        string $channelId = 'general_channel',
        ?string $screen = null,
        ?string $extraId = null
    ): array {
        $userId = $user instanceof User ? $user->id : $user;

        // Create In-App Notification entry
        try {
            \App\Models\UserNotification::create([
                'user_id' => $userId,
                'title' => $title,
                'body' => $body,
                'type' => $data['type'] ?? 'general',
                'channel_id' => $channelId,
                'screen' => $screen,
                'extra_id' => $extraId,
                'student_name' => $data['student_name'] ?? null,
                'data' => $data,
            ]);
        } catch (\Throwable $e) {
            Log::error('[FCM] Error saving UserNotification: ' . $e->getMessage());
        }

        $tokens = FcmToken::where('user_id', $userId)->pluck('token')->toArray();

        if (empty($tokens)) {
            return ['recipient_count' => 0, 'success_count' => 0, 'failure_count' => 0];
        }

        $success = 0;
        $failure = 0;

        foreach ($tokens as $token) {
            $result = $this->sendToToken($token, $title, $body, $data, $channelId, $screen, $extraId);
            if ($result['success']) {
                $success++;
            } else {
                $failure++;
            }
        }

        return [
            'recipient_count' => count($tokens),
            'success_count' => $success,
            'failure_count' => $failure,
        ];
    }

    /**
     * Send push notification to multiple users.
     */
    public function sendToUsers(
        iterable $userIds,
        string $title,
        string $body,
        array $data = [],
        string $channelId = 'general_channel',
        ?string $screen = null,
        ?string $extraId = null,
        ?int $senderId = null
    ): array {
        $ids = is_array($userIds) ? $userIds : iterator_to_array($userIds);

        // Bulk insert in-app notifications
        try {
            $now = now();
            $records = array_map(fn($uid) => [
                'user_id' => $uid,
                'title' => $title,
                'body' => $body,
                'type' => $data['type'] ?? 'general',
                'channel_id' => $channelId,
                'screen' => $screen,
                'extra_id' => $extraId,
                'student_name' => $data['student_name'] ?? null,
                'data' => json_encode($data),
                'created_at' => $now,
                'updated_at' => $now,
            ], $ids);

            \App\Models\UserNotification::insert($records);
        } catch (\Throwable $e) {
            Log::error('[FCM] Bulk in-app notification insert error: ' . $e->getMessage());
        }

        $tokens = FcmToken::whereIn('user_id', $ids)->pluck('token')->toArray();

        $success = 0;
        $failure = 0;

        foreach ($tokens as $token) {
            $result = $this->sendToToken($token, $title, $body, $data, $channelId, $screen, $extraId);
            if ($result['success']) {
                $success++;
            } else {
                $failure++;
            }
        }

        $log = PushNotificationLog::create([
            'title' => $title,
            'body' => $body,
            'channel_id' => $channelId,
            'screen' => $screen,
            'target_type' => 'user',
            'target_id' => count($ids) === 1 ? (string) $ids[0] : 'multiple',
            'recipient_count' => count($tokens),
            'success_count' => $success,
            'failure_count' => $failure,
            'sender_id' => $senderId,
            'data' => $data,
        ]);

        return [
            'log' => $log,
            'recipient_count' => count($tokens),
            'success_count' => $success,
            'failure_count' => $failure,
        ];
    }

    /**
     * Send push notification to all users of a specific Role (e.g. 2 = Teachers, 3 = Students/Parents).
     */
    public function sendToRole(
        int|string $roleId,
        string $title,
        string $body,
        array $data = [],
        string $channelId = 'general_channel',
        ?string $screen = null,
        ?string $extraId = null,
        ?int $senderId = null
    ): array {
        $userIds = User::where('role_id', $roleId)->pluck('id')->toArray();
        return $this->sendToUsers($userIds, $title, $body, $data, $channelId, $screen, $extraId, $senderId);
    }

    /**
     * Broadcast push notification to all registered devices.
     */
    public function sendBroadcast(
        string $title,
        string $body,
        array $data = [],
        string $channelId = 'general_channel',
        ?string $screen = null,
        ?string $extraId = null,
        ?int $senderId = null
    ): array {
        $tokens = FcmToken::pluck('token')->toArray();

        $success = 0;
        $failure = 0;

        foreach ($tokens as $token) {
            $result = $this->sendToToken($token, $title, $body, $data, $channelId, $screen, $extraId);
            if ($result['success']) {
                $success++;
            } else {
                $failure++;
            }
        }

        $log = PushNotificationLog::create([
            'title' => $title,
            'body' => $body,
            'channel_id' => $channelId,
            'screen' => $screen,
            'target_type' => 'all',
            'target_id' => 'all',
            'recipient_count' => count($tokens),
            'success_count' => $success,
            'failure_count' => $failure,
            'sender_id' => $senderId,
            'data' => $data,
        ]);

        return [
            'log' => $log,
            'recipient_count' => count($tokens),
            'success_count' => $success,
            'failure_count' => $failure,
        ];
    }

    /**
     * Generate or fetch cached Google OAuth2 Access Token for FCM HTTP v1.
     */
    protected function getAccessToken(): ?string
    {
        return Cache::remember('fcm_http_v1_access_token', 3000, function () {
            $credentials = $this->loadServiceAccountCredentials();
            if (!$credentials) {
                return null;
            }

            $clientEmail = $credentials['client_email'] ?? null;
            $privateKey = $credentials['private_key'] ?? null;

            if (!$clientEmail || !$privateKey) {
                return null;
            }

            // Generate RS256 JWT
            $now = time();
            $header = ['alg' => 'RS256', 'typ' => 'JWT'];
            $claimSet = [
                'iss' => $clientEmail,
                'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
                'aud' => 'https://oauth2.googleapis.com/token',
                'exp' => $now + 3600,
                'iat' => $now,
            ];

            $encodedHeader = rtrim(strtr(base64_encode(json_encode($header)), '+/', '-_'), '=');
            $encodedClaimSet = rtrim(strtr(base64_encode(json_encode($claimSet)), '+/', '-_'), '=');
            $signatureInput = "{$encodedHeader}.{$encodedClaimSet}";

            $signature = '';
            $pkey = openssl_pkey_get_private($privateKey);
            if (!$pkey) {
                Log::error('[FCM] Invalid private key in Firebase credentials.');
                return null;
            }

            if (!openssl_sign($signatureInput, $signature, $pkey, OPENSSL_ALGO_SHA256)) {
                Log::error('[FCM] Failed to sign JWT with private key.');
                return null;
            }

            $encodedSignature = rtrim(strtr(base64_encode($signature), '+/', '-_'), '=');
            $jwt = "{$signatureInput}.{$encodedSignature}";

            // Exchange JWT for OAuth2 Access Token
            $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => $jwt,
            ]);

            if ($response->successful()) {
                return $response->json('access_token');
            }

            Log::error('[FCM] OAuth2 token exchange error: ' . $response->body());
            return null;
        });
    }

    /**
     * Load service account credentials from file or .env.
     */
    protected function loadServiceAccountCredentials(): ?array
    {
        // 1. Direct env vars
        if (!empty($this->clientEmail) && !empty($this->privateKey)) {
            return [
                'client_email' => $this->clientEmail,
                'private_key' => str_replace('\n', "\n", $this->privateKey),
                'project_id' => $this->projectId,
            ];
        }

        // 2. Credentials file
        if (!empty($this->credentialsPath) && file_exists($this->credentialsPath)) {
            $json = json_decode(file_get_contents($this->credentialsPath), true);
            if (is_array($json) && !empty($json['client_email']) && !empty($json['private_key'])) {
                if (!empty($json['project_id'])) {
                    $this->projectId = $json['project_id'];
                }
                return $json;
            }
        }

        return null;
    }
}
