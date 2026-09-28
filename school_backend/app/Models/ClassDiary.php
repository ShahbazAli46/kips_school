<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ClassDiary extends Model
{
    use HasFactory;

    protected $table = 'class_diaries';

    protected $fillable = [
        'teacher_id',
        'class_id',
        'section_id',
        'subject_id',
        'diary_date',
        'content',
    ];

    protected $casts = [
        'diary_date' => 'date:Y-m-d',
    ];

    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function academyClass()
    {
        return $this->belongsTo(AcademyClass::class, 'class_id');
    }

    public function section()
    {
        return $this->belongsTo(Section::class, 'section_id');
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class, 'subject_id');
    }
}
