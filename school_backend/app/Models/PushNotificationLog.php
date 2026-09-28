<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PushNotificationLog extends Model
{
    use HasFactory;

    protected $table = 'push_notification_logs';

    protected $fillable = [
        'title',
        'body',
        'channel_id',
        'screen',
        'target_type',
        'target_id',
        'recipient_count',
        'success_count',
        'failure_count',
        'sender_id',
        'data',
    ];

    protected function casts(): array
    {
        return [
            'data' => 'array',
            'recipient_count' => 'integer',
            'success_count' => 'integer',
            'failure_count' => 'integer',
        ];
    }

    public function sender()
    {
        return $this->belongsTo(User::class, 'sender_id');
    }
}
