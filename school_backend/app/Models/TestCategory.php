<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TestCategory extends Model
{
    protected $fillable = [
        'name',
        'type',
        'short_name',
    ];

    public function testSeries()
    {
        return $this->hasMany(TestSeries::class);
    }
}
