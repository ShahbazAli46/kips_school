<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Announcement extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'date',
        'details',
        'image',
        'attachment',
        'attachment_name',
        'target_type',
        'class_id',
        'student_id'
    ];

    public function targetClass()
    {
        return $this->belongsTo(AcademyClass::class, 'class_id');
    }

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }
}
