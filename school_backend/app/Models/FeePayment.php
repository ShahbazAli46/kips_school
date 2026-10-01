<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class FeePayment extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'month',
        'amount_paid',
        'discount_amount',
        'payment_date',
        'received_by',
        'payer_name',
        'installment_number',
    ];

    protected $casts = [
        'amount_paid'         => 'decimal:2',
        'discount_amount'     => 'decimal:2',
        'payment_date'        => 'date',
        'installment_number'  => 'integer',
    ];



    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function receiver()
    {
        return $this->belongsTo(User::class, 'received_by');
    }

    public function items()
    {
        return $this->hasMany(FeePaymentItem::class, 'fee_payment_id');
    }

    public function studentExtraCharge()
    {
        return $this->hasOne(StudentExtraCharge::class, 'fee_payment_id');
    }

    protected static function booted()
    {
        // Before creating, auto-assign installment_number for this student+month
        static::creating(function ($feePayment) {
            $max = static::where('student_id', $feePayment->student_id)
                ->where('month', $feePayment->month)
                ->max('installment_number');

            $feePayment->installment_number = ($max ?? 0) + 1;
        });

        static::saved(function ($feePayment) {
            \Illuminate\Support\Facades\Cache::increment('students_cache_version');
            $feePayment->updateStudentTotalPaid();
            $feePayment->markSalarySlipsStale();
        });

        static::deleted(function ($feePayment) {
            \Illuminate\Support\Facades\Cache::increment('students_cache_version');
            $feePayment->updateStudentTotalPaid();
            $feePayment->markSalarySlipsStale();
        });
    }

    public function updateStudentTotalPaid()
    {
        $totalPaid     = static::where('student_id', $this->student_id)->sum('amount_paid');
        $totalDiscount = static::where('student_id', $this->student_id)->sum('discount_amount');

        $this->student()->update([
            'total_paid'     => $totalPaid,
            'total_discount' => $totalDiscount,
        ]);
    }

    /**
     * Mark all salary slips for this payment's month as needing recalculation.
     * This is lightweight (a single UPDATE) and fires asynchronously after the
     * fee transaction is already committed – no slowdown for the admin.
     */
    public function markSalarySlipsStale()
    {
        SalarySlip::where('month', $this->month)
            ->where('needs_recalculation', false)
            ->update(['needs_recalculation' => true]);
    }
}
