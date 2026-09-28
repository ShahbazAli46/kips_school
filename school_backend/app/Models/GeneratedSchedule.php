<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GeneratedSchedule extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'class_name',
        'session_name',
        'settings',
        'subjects',
        'holidays',
        'schedule',
        'created_by',
    ];

    protected $casts = [
        'settings' => 'array',
        'subjects' => 'array',
        'holidays' => 'array',
        'schedule' => 'array',
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
