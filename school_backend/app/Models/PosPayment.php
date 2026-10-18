<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Cash collected at the shop counters — Book store sales and Extra Charges POS.
 * Kept OUT of fee_payments so books/extra money never mixes with the
 * academic Fee Received ledgers; lives in its own POS received ledgers.
 */
class PosPayment extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'category',
        'month',
        'amount_paid',
        'discount_amount',
        'payment_date',
        'payer_name',
        'payment_method',
        'description',
        'student_fee_item_id',
        'student_extra_charge_id',
        'staff_receiving_id',
        'received_by',
    ];

    protected $casts = [
        'amount_paid'     => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'payment_date'    => 'date',
    ];

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function receiver()
    {
        return $this->belongsTo(User::class, 'received_by');
    }

    public function studentFeeItem()
    {
        return $this->belongsTo(StudentFeeItem::class, 'student_fee_item_id');
    }

    public function studentExtraCharge()
    {
        return $this->belongsTo(StudentExtraCharge::class, 'student_extra_charge_id');
    }

    public function staffReceiving()
    {
        return $this->belongsTo(StaffStudentReceiving::class, 'staff_receiving_id');
    }

    public function scopeCategory($query, string $category)
    {
        return $query->where('category', $category);
    }
}
