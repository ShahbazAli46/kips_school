<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TestMark extends Model
{
    protected $fillable = [
        'test_id',
        'student_id',
        'obtained_marks',
        'grade',
        'is_absent',
        'remarks',
    ];

    protected $casts = [
        'obtained_marks' => 'float',
        'is_absent' => 'boolean',
    ];

    public function test()
    {
        return $this->belongsTo(Test::class);
    }

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    protected static function booted()
    {
        static::saving(function ($testMark) {
            if ($testMark->is_absent || $testMark->obtained_marks === null) {
                $testMark->grade = null;
                return;
            }

            // Calculate grade automatically if total marks exist
            if ($testMark->test && $testMark->test->total_marks > 0) {
                $percentage = ($testMark->obtained_marks / $testMark->test->total_marks) * 100;
                
                if ($percentage >= 80) {
                    $testMark->grade = 'A+';
                } elseif ($percentage >= 70) {
                    $testMark->grade = 'A';
                } elseif ($percentage >= 60) {
                    $testMark->grade = 'B';
                } elseif ($percentage >= 50) {
                    $testMark->grade = 'C';
                } elseif ($percentage >= 40) {
                    $testMark->grade = 'D';
                } else {
                    $testMark->grade = 'F';
                }
            }
        });
    }
}
