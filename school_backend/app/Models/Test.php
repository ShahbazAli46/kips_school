<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Test extends Model
{
    protected $fillable = [
        'test_category_id',
        'academic_session_id',
        'academy_class_id',
        'section_id',
        'major_id',
        'subject_id',
        'title',
        'date',
        'total_marks',
        'passing_marks',
        'syllabus',
        'syllabus_english',
        'syllabus_urdu',
    ];

    public function test_category()
    {
        return $this->belongsTo(TestCategory::class);
    }

    public function academic_session()
    {
        return $this->belongsTo(AcademicSession::class);
    }

    public function academyClass()
    {
        return $this->belongsTo(AcademyClass::class);
    }

    public function section()
    {
        return $this->belongsTo(Section::class);
    }

    public function major()
    {
        return $this->belongsTo(Major::class);
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    public function marks()
    {
        return $this->hasMany(TestMark::class);
    }
}
