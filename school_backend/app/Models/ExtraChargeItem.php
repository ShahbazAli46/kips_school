<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ExtraChargeItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'category',
        'item_type',
        'unit_price',
        'stock_quantity',
        'low_stock_threshold',
        'description',
        'is_active',
    ];

    protected $casts = [
        'unit_price' => 'float',
        'stock_quantity' => 'integer',
        'low_stock_threshold' => 'integer',
        'is_active' => 'boolean',
    ];

    public function studentCharges()
    {
        return $this->hasMany(StudentExtraCharge::class, 'extra_charge_item_id');
    }
}
