<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StaffSalaryAdjustment extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'type', // 'increment', 'decrement'
        'amount',
        'previous_salary',
        'new_salary',
        'effective_date',
        'reason',
        'created_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'previous_salary' => 'decimal:2',
        'new_salary' => 'decimal:2',
        'effective_date' => 'date',
    ];

    public function staff()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
