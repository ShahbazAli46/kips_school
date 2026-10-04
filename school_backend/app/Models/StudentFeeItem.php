<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StudentFeeItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'academic_session_id',
        'head_key',
        'head_name',
        'head_type',
        'actual_amount',
        'discount_amount',
        'payable_amount',
        'paid_amount',
        'balance_amount',
    ];

    protected $casts = [
        'actual_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'payable_amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'balance_amount' => 'decimal:2',
    ];



    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function academicSession()
    {
        return $this->belongsTo(AcademicSession::class, 'academic_session_id');
    }

    public function paymentItems()
    {
        return $this->hasMany(FeePaymentItem::class, 'student_fee_item_id');
    }

    /**
     * Standard list of all 15 school fee heads with meta info.
     */
    public static function getStandardFeeHeads(): array
    {
        return [
            'registration_fee' => ['name' => 'Registration Fee', 'type' => 'one_time'],
            'adm_fee' => ['name' => 'Admission Fee', 'type' => 'one_time'],
            'security_fee' => ['name' => 'Security Fee', 'type' => 'one_time'],
            'tuition_fee' => ['name' => 'Tuition Fee', 'type' => 'monthly'],
            'lms_charges' => ['name' => 'LMS Charges', 'type' => 'monthly'],
            'ac_charges' => ['name' => 'AC Charges', 'type' => 'monthly'],
            'library_charges' => ['name' => 'Library Charges', 'type' => 'annual'],
            'lim_charges' => ['name' => 'LIM Charges', 'type' => 'monthly'],
            'fine' => ['name' => 'Fine', 'type' => 'fine'],
            'lab_charges' => ['name' => 'Lab Charges', 'type' => 'monthly'],
            'exam_charges' => ['name' => 'Exam Charges', 'type' => 'annual'],
            'id_card_charges' => ['name' => 'ID Card Charges', 'type' => 'one_time'],
            'service_charges' => ['name' => 'Service Charges', 'type' => 'monthly'],
            'brd_reg_charges' => ['name' => 'Board Reg Charges', 'type' => 'one_time'],
            'brd_adm_charges' => ['name' => 'Board Adm Charges', 'type' => 'one_time'],
            'r_and_t_charges' => ['name' => 'R & T Charges', 'type' => 'annual'],
            'arrears' => ['name' => 'Previous Arrears', 'type' => 'one_time'],
        ];
    }
}
