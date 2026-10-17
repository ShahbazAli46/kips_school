<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class BookStockMovement extends Model {
    protected $fillable = ['book_id','quantity','movement_type','reference_type','reference_id','notes','created_by'];
    public function book(){ return $this->belongsTo(Book::class); }
    public function creator(){ return $this->belongsTo(User::class, 'created_by'); }
}
