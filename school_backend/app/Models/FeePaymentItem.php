<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FeePaymentItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'fee_payment_id',
        'student_fee_item_id',
        'head_key',
        'head_name',
        'amount_paid',
        'discount_applied',
        'month',
    ];

    protected $casts = [
        'amount_paid' => 'decimal:2',
        'discount_applied' => 'decimal:2',
    ];

    public function feePayment()
    {
        return $this->belongsTo(FeePayment::class, 'fee_payment_id');
    }

    public function studentFeeItem()
    {
        return $this->belongsTo(StudentFeeItem::class, 'student_fee_item_id');
    }
}
