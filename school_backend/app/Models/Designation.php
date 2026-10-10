<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Designation extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * Users associated with this designation.
     */
    public function users()
    {
        return $this->hasMany(User::class, 'designation_id');
    }

    /**
     * Teachers/Staff members associated with this designation.
     */
    public function teachers()
    {
        return $this->hasMany(User::class, 'designation_id')->where('role_id', 2);
    }
}
