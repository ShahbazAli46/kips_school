<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AppSetting extends Model
{
    protected $fillable = ['key', 'value'];

    public static function get(string $key, $default = null)
    {
        $setting = static::where('key', $key)->first();
        return $setting ? $setting->value : $default;
    }

    public static function set(string $key, $value): void
    {
        static::updateOrCreate(
            ['key' => $key],
            ['value' => (string) $value]
        );
    }

    public static function isWhatsAppAbsentNotificationEnabled(): bool
    {
        return filter_var(static::get('whatsapp_absent_notification_enabled', false), FILTER_VALIDATE_BOOLEAN);
    }

    public static function getAttentionThresholds(): array
    {
        $raw = static::get('attention_seeker_thresholds');
        if ($raw) {
            $decoded = json_decode($raw, true);
            if (is_array($decoded) && isset($decoded['top_threshold'], $decoded['attention_threshold'])) {
                return [
                    'top_threshold' => (float) $decoded['top_threshold'],
                    'attention_threshold' => (float) $decoded['attention_threshold'],
                ];
            }
        }
        return [
            'top_threshold' => 75.0,
            'attention_threshold' => 50.0,
        ];
    }

    public static function setAttentionThresholds(float $top, float $att): array
    {
        if ($top <= 0 || $top > 100) $top = 75.0;
        if ($att <= 0 || $att >= 100) $att = 50.0;
        if ($top <= $att) $top = $att + 5;

        $data = [
            'top_threshold' => $top,
            'attention_threshold' => $att,
        ];

        static::set('attention_seeker_thresholds', json_encode($data));
        return $data;
    }

    public static function getAllFormatted(): array
    {
        return [
            'status' => static::get('app_status', 'active'),
            'maintenance_title' => static::get('maintenance_title', 'App Under Maintenance'),
            'maintenance_message' => static::get('maintenance_message', 'We are currently upgrading our servers. Please try again soon.'),
            'min_version' => static::get('min_version', '1.0.0'),
            'latest_version' => static::get('latest_version', '1.0.0'),
            'update_url' => static::get('update_url', 'https://usachunian.com'),
            'whatsapp_absent_notification_enabled' => static::isWhatsAppAbsentNotificationEnabled(),
            'attention_thresholds' => static::getAttentionThresholds(),
        ];
    }
}
