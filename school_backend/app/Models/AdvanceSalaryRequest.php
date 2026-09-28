<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AdvanceSalaryRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'teacher_id',
        'amount',
        'reason',
        'deduction_month',
        'status',
        'admin_notes',
        'payment_method',
        'action_by',
        'paid_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'paid_at' => 'datetime',
    ];

    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function actionBy()
    {
        return $this->belongsTo(User::class, 'action_by');
    }
}
