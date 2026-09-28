<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SalarySlipItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'salary_slip_id',
        'subject_id',
        'class_id',
        'major_id',
        'section_id',
        'payment_type',
        'fixed_amount',
        'student_id',
        'student_fee_paid',
        'student_active_subjects_count',
        'subject_share',
        'percentage',
        'teacher_cut',
    ];

    protected $casts = [
        'fixed_amount' => 'decimal:2',
        'student_fee_paid' => 'decimal:2',
        'subject_share' => 'decimal:2',
        'percentage' => 'decimal:2',
        'teacher_cut' => 'decimal:2',
    ];

    public function salarySlip()
    {
        return $this->belongsTo(SalarySlip::class);
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function academyClass()
    {
        return $this->belongsTo(AcademyClass::class, 'class_id');
    }

    public function major()
    {
        return $this->belongsTo(Major::class, 'major_id');
    }

    public function section()
    {
        return $this->belongsTo(Section::class, 'section_id');
    }
}
