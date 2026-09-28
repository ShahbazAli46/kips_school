<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AcademicSession extends Model
{
    protected $fillable = [
        'name',
        'start_date',
        'end_date',
        'is_active',
    ];

    public function testSeries()
    {
        return $this->hasMany(TestSeries::class);
    }

    public static function getActiveSession()
    {
        $attributes = \Illuminate\Support\Facades\Cache::rememberForever('active_academic_session_attrs', function () {
            $session = static::where('is_active', true)->first();
            return $session ? $session->getAttributes() : null;
        });

        if ($attributes) {
            $model = new static();
            $model->setRawAttributes($attributes, true);
            $model->exists = true;
            return $model;
        }

        return null;
    }

    protected static function booted()
    {
        static::saved(function ($session) {
            \Illuminate\Support\Facades\Cache::forget('active_academic_session_attrs');
        });

        static::deleted(function ($session) {
            \Illuminate\Support\Facades\Cache::forget('active_academic_session_attrs');
        });
    }
}
