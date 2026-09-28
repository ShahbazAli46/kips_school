<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class StudentExtraCharge extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid',
        'student_id',
        'extra_charge_item_id',
        'student_fee_item_id',
        'fee_payment_id',
        'title',
        'category',
        'charge_type',
        'unit_price',
        'quantity',
        'total_amount',
        'paid_amount',
        'balance_amount',
        'payment_status',
        'payment_method',
        'paid_at',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'unit_price' => 'float',
        'quantity' => 'integer',
        'total_amount' => 'float',
        'paid_amount' => 'float',
        'balance_amount' => 'float',
        'paid_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
        });
    }

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function item()
    {
        return $this->belongsTo(ExtraChargeItem::class, 'extra_charge_item_id');
    }

    public function studentFeeItem()
    {
        return $this->belongsTo(StudentFeeItem::class, 'student_fee_item_id');
    }

    public function feePayment()
    {
        return $this->belongsTo(FeePayment::class, 'fee_payment_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
