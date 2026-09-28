<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TeacherLeave extends Model
{
    use HasFactory;

    protected $fillable = [
        'teacher_id',
        'start_date',
        'end_date',
        'reason',
        'status',
        'admin_notes',
    ];

    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }
}
