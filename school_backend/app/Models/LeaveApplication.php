<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LeaveApplication extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'start_date',
        'end_date',
        'remarks',
        'status',
    ];

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }
}
