<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MemoryImage extends Model
{
    use HasFactory;

    protected $fillable = [
        'memory_id',
        'image_path',
        'caption',
    ];

    public function memory()
    {
        return $this->belongsTo(Memory::class, 'memory_id');
    }
}
