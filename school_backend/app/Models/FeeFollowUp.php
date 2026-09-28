<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FeeFollowUp extends Model
{
    protected $fillable = ['student_id', 'created_by', 'promise_date', 'next_promise_date', 'comments'];

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
