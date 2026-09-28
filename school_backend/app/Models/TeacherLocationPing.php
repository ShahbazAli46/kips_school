<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TeacherLocationPing extends Model
{
    use HasFactory;

    protected $table = 'teacher_location_pings';

    protected $fillable = [
        'teacher_id',
        'date',
        'latitude',
        'longitude',
        'accuracy',
        'distance_meters',
        'is_inside_geofence',
        'device_info',
        'battery_level',
        'recorded_at',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'latitude' => 'float',
            'longitude' => 'float',
            'accuracy' => 'float',
            'distance_meters' => 'float',
            'is_inside_geofence' => 'boolean',
            'battery_level' => 'integer',
            'recorded_at' => 'datetime',
        ];
    }

    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }
}
