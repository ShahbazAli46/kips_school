<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StaffBfSettlement extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'amount',
        'settlement_date',
        'payment_method',
        'notes',
        'is_resignation',
        'settled_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'settlement_date' => 'date',
        'is_resignation' => 'boolean',
    ];

    public function staff()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function settledBy()
    {
        return $this->belongsTo(User::class, 'settled_by');
    }
}
