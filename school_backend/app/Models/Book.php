<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
class Book extends Model {
    use HasFactory;
    protected $fillable = ['class_id','title','isbn','code','price','stock_quantity','low_stock_threshold','is_active','subject','publisher','quantity_text','serial_number','category','price_missing','book_list_id','position'];
    protected $casts = ['price'=>'float','stock_quantity'=>'integer','low_stock_threshold'=>'integer','is_active'=>'boolean','price_missing'=>'boolean','position'=>'integer'];
    public function bookList(){ return $this->belongsTo(BookList::class); }
    public function packages(){ return $this->belongsToMany(BookPackage::class, 'book_package_items')->withPivot('quantity'); }
    public function movements(){ return $this->hasMany(BookStockMovement::class); }
}
