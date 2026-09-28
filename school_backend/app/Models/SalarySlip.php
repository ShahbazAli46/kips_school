<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SalarySlip extends Model
{
    use HasFactory;

    protected $fillable = [
        'teacher_id',
        'month',
        'total_amount',
        'attendance_percentage',
        'permitted_off_days',
        'taken_off_days',
        'bonus',
        'previous_arrears',
        'advance_deducted',
        'payable_salary',
        'total_paid',
        'payment_status',
        'status',
        'needs_recalculation',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'attendance_percentage' => 'decimal:2',
        'permitted_off_days' => 'integer',
        'taken_off_days' => 'integer',
        'bonus' => 'decimal:2',
        'previous_arrears' => 'decimal:2',
        'advance_deducted' => 'decimal:2',
        'payable_salary'          => 'decimal:2',
        'total_paid'              => 'decimal:2',
        'needs_recalculation'     => 'boolean',
    ];

    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function items()
    {
        return $this->hasMany(SalarySlipItem::class);
    }

    public function payments()
    {
        return $this->hasMany(SalaryPayment::class);
    }
}
