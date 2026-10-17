<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BookList extends Model
{
    protected $fillable = [
        'title', 'class_id', 'session_label', 'notes', 'source_filename',
        'source_path', 'source_hash', 'raw_text', 'source_metadata', 'created_by',
    ];

    protected $casts = ['notes' => 'array', 'source_metadata' => 'array'];

    // Never expose private storage locations or the full parsing payload in the catalog.
    protected $hidden = ['source_path', 'raw_text', 'source_metadata'];

    public function books()
    {
        return $this->hasMany(Book::class)->orderBy('position');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
