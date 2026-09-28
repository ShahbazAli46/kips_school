<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TestSeries extends Model
{
    protected $fillable = [
        'test_category_id',
        'academic_session_id',
        'name',
    ];

    public function category()
    {
        return $this->belongsTo(TestCategory::class, 'test_category_id');
    }

    public function academicSession()
    {
        return $this->belongsTo(AcademicSession::class);
    }

    public function tests()
    {
        return $this->hasMany(Test::class);
    }
}
