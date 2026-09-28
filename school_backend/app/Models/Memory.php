<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Memory extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'description',
        'type',
        'date',
    ];

    protected $casts = [
        'date' => 'date',
    ];

    public function images()
    {
        return $this->hasMany(MemoryImage::class, 'memory_id');
    }
}
