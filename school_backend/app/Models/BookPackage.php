<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class BookPackage extends Model {
    protected $fillable = ['class_id','name','price','is_active'];
    protected $casts = ['price'=>'float','is_active'=>'boolean'];
    public function books(){ return $this->belongsToMany(Book::class, 'book_package_items')->withPivot('quantity'); }
}
