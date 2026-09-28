<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StudentSessionEnrollment extends Model
{
    protected $fillable = [
        'student_id',
        'academic_session_id',
        'class_id',
        'section_id',
        'major_id',
        'roll_number',
        'monthly_fee',
    ];

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function academicSession()
    {
        return $this->belongsTo(AcademicSession::class);
    }

    public function academyClass()
    {
        return $this->belongsTo(AcademyClass::class, 'class_id');
    }

    public function section()
    {
        return $this->belongsTo(Section::class);
    }

    public function major()
    {
        return $this->belongsTo(Major::class);
    }
}
