<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\{AcademicSession,AcademyClass,Book,BookList,BookPackage,BookStockMovement,FeePayment,FeePaymentItem,StaffStudentReceiving,StudentFeeItem,User};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class BookController extends Controller {
    public function catalog(Request $r){
        $includeInactive=(int)auth()->user()->role_id===1 && ($r->boolean('all') || $r->boolean('include_inactive'));
        $books=Book::query()->when(!$includeInactive,fn($q)=>$q->where('is_active',true))->when($r->class_id,fn($q,$v)=>$q->where('class_id',$v))->orderBy('title')->get();
        $packages=BookPackage::with('books')->when(!$includeInactive,fn($q)=>$q->where('is_active',true))->when($r->class_id,fn($q,$v)=>$q->where('class_id',$v))->get();
        $lists=BookList::withCount('books')->when($r->class_id,fn($q,$v)=>$q->where('class_id',$v))->latest()->get();
        return response()->json(['books'=>$books,'packages'=>$packages,'lists'=>$lists,'classes'=>AcademyClass::orderBy('name')->get(['id','name'])]);
    }
    public function storeBook(Request $r){
        if((int)auth()->user()->role_id!==1)return response()->json(['message'=>'Only Super Admin can manage books.'],403);
        $v=Validator::make($r->all(),['class_id'=>'nullable|integer|exists:classes,id','title'=>'required|string|max:200','isbn'=>'nullable|string|max:50','code'=>'nullable|string|max:50|unique:books,code','price'=>'required|numeric|min:0|max:99999999.99','stock_quantity'=>'nullable|integer|min:0','low_stock_threshold'=>'nullable|integer|min:0','subject'=>'nullable|string|max:2000','publisher'=>'nullable|string|max:4000','quantity_text'=>'nullable|string|max:1000','serial_number'=>'nullable|string|max:50','category'=>'nullable|string|max:100','price_missing'=>'sometimes|required|boolean']);
        if($v->fails())return response()->json(['errors'=>$v->errors()],422); $b=Book::create($v->validated());
        if($b->stock_quantity)BookStockMovement::create(['book_id'=>$b->id,'quantity'=>$b->stock_quantity,'movement_type'=>'stock_in','created_by'=>auth()->id(),'notes'=>'Opening stock']);
        return response()->json($b,201);
    }
    public function updateBook(Request $r,Book $book){
        if((int)auth()->user()->role_id!==1)return response()->json(['message'=>'Only Super Admin can manage books.'],403);
        $data=$r->validate([
            'title'=>'sometimes|required|string|max:200',
            'class_id'=>'nullable|integer|exists:classes,id',
            'price'=>'sometimes|required|numeric|min:0',
            'code'=>['nullable','string','max:50',Rule::unique('books','code')->ignore($book->id)],
            'isbn'=>'nullable|string|max:50',
            'low_stock_threshold'=>'sometimes|required|integer|min:0',
            'is_active'=>'sometimes|required|boolean',
            'stock_quantity'=>'prohibited',
            'subject'=>'nullable|string|max:2000',
            'publisher'=>'nullable|string|max:4000',
            'quantity_text'=>'nullable|string|max:1000',
            'serial_number'=>'nullable|string|max:50',
            'category'=>'nullable|string|max:100',
            'price_missing'=>'sometimes|required|boolean',
        ]);
        if(array_key_exists('price',$data))$data['price_missing']=false;
        elseif(($data['price_missing']??false))$data['price']=0;
        $book->update($data);
        return response()->json($book);
    }
    public function stockIn(Request $r,Book $book){
        if((int)auth()->user()->role_id!==1)return response()->json(['message'=>'Only Super Admin can adjust stock.'],403);
        $v=Validator::make($r->all(),['quantity'=>'required|integer|min:1','notes'=>'nullable|string|max:255']); if($v->fails())return response()->json(['errors'=>$v->errors()],422);
        DB::transaction(function()use($book,$r){$book->increment('stock_quantity',(int)$r->quantity);BookStockMovement::create(['book_id'=>$book->id,'quantity'=>$r->quantity,'movement_type'=>'stock_in','created_by'=>auth()->id(),'notes'=>$r->notes]);}); return response()->json($book->fresh());
    }
    public function storePackage(Request $r){
        if((int)auth()->user()->role_id!==1)return response()->json(['message'=>'Only Super Admin can manage packages.'],403);
        $data=$r->validate([
            'class_id'=>'required|integer|exists:classes,id',
            'name'=>['required','string','max:150',Rule::unique('book_packages','name')->where('class_id',$r->input('class_id'))],
            'price'=>'nullable|numeric|min:0',
            'items'=>'required|array|min:1',
            'items.*.book_id'=>['required','integer','distinct',Rule::exists('books','id')->where(fn($q)=>$q->where('is_active',true)->where(fn($class)=>$class->where('class_id',$r->input('class_id'))->orWhereNull('class_id')))],
            'items.*.quantity'=>'required|integer|min:1',
        ]);
        $p=DB::transaction(function()use($data){$p=BookPackage::create(collect($data)->only(['class_id','name','price'])->all());foreach($data['items'] as $i)$p->books()->attach($i['book_id'],['quantity'=>$i['quantity']]);return $p->load('books');}); return response()->json($p,201);
    }
    public function movements(Book $book){ return response()->json($book->movements()->with('creator:id,name')->latest()->paginate(50)); }
    public function ledger(Request $r){
        $items=StudentFeeItem::query()->where('head_key','like','books\_%')
            ->when($r->class_id,fn($q,$v)=>$q->whereHas('student',fn($s)=>$s->where('class_id',$v)));
        if($r->status==='paid')$items->where('balance_amount','<=',0.001);
        elseif($r->status==='unpaid')$items->where('balance_amount','>',0.001)->where('paid_amount','<=',0.001);
        elseif($r->status==='partial')$items->where('balance_amount','>',0.001)->where('paid_amount','>',0.001);
        $rows=$items->with('student:id,name,roll_number,class_id','student.academyClass:id,name')->latest()->limit(1000)->get();
        $data=$rows->map(function($i){
            $balance=(float)$i->balance_amount; $paid=(float)$i->paid_amount;
            return ['id'=>$i->id,
                'student_name'=>$i->student?->name??'Unknown student','roll_number'=>$i->student?->roll_number,
                'class_id'=>$i->student?->class_id,'class_name'=>$i->student?->academyClass?->name,
                'date'=>$i->created_at,'item'=>$i->head_name,'amount'=>$i->payable_amount,
                'paid_amount'=>$i->paid_amount,'balance_amount'=>$i->balance_amount,
                'status'=>$balance<=0.001?'paid':($paid>0.001?'partial':'unpaid')];
        });
        return response()->json([
            'data'=>$data,
            'classes'=>AcademyClass::orderBy('name')->get(['id','name']),
            'totals'=>['count'=>$data->count(),'amount'=>(float)$data->sum('amount'),'paid'=>(float)$data->sum('paid_amount'),'unpaid'=>(float)$data->sum('balance_amount')],
        ]);
    }
    public function sell(Request $r){
        $r->validate(['student_id'=>['required','integer',Rule::exists('users','id')->where('role_id',3)->where('is_active',true)->whereNull('deleted_at')],'items'=>'nullable|array','items.*.book_id'=>'required|integer|exists:books,id','items.*.quantity'=>'required|integer|min:1','package_id'=>['nullable','integer',Rule::exists('book_packages','id')->where('is_active',true)],'payment_option'=>'required|in:voucher,cash','payment_method'=>'nullable|in:cash,online,bank']);
        $sale=null; $total=0; DB::transaction(function()use(&$sale,&$total,$r){
            $student=User::where('role_id',3)->where('is_active',true)->find($r->student_id);
            if(!$student)throw ValidationException::withMessages(['student_id'=>'Select an active student.']);
            $items=collect($r->items ?: []);
            if($r->package_id && $items->isEmpty()){
                $package=BookPackage::with('books')->where('is_active',true)->find($r->package_id);
                if(!$package)throw ValidationException::withMessages(['package_id'=>'Select an active package.']);
                $items=$package->books->map(fn($b)=>['book_id'=>$b->id,'quantity'=>$b->pivot->quantity]);
            }
            if($items->isEmpty())throw ValidationException::withMessages(['items'=>'Select books or a package.']);
            $items=$items->groupBy('book_id')->map(fn($lines,$bookId)=>['book_id'=>(int)$bookId,'quantity'=>$lines->sum('quantity')])->values();
            $books=Book::whereIn('id',$items->pluck('book_id'))->orderBy('id')->lockForUpdate()->get()->keyBy('id');
            foreach($items as $i){
                $b=$books->get($i['book_id']);
                if(!$b || !$b->is_active)throw ValidationException::withMessages(['items'=>'Selected books must be active.']);
                if($b->price_missing)throw ValidationException::withMessages(['items'=>"Set a price for {$b->title} before selling it."]);
                if($b->stock_quantity<$i['quantity'])throw ValidationException::withMessages(['items'=>"Insufficient stock for {$b->title}."]);
                $total += $b->price*$i['quantity'];
            }
            $session=AcademicSession::getActiveSession();
            if($r->payment_option==='voucher'){
                if($items->count()>4){
                    $feeItem=StudentFeeItem::create([
                        'student_id'=>$student->id,
                        'academic_session_id'=>$session?->id,
                        'head_key'=>'books_'.(string)\Illuminate\Support\Str::uuid(),
                        'head_name'=>'Books ('.$items->count().' titles, '.$items->sum('quantity').' copies)',
                        'head_type'=>'one_time',
                        'actual_amount'=>$total,
                        'discount_amount'=>0,
                        'payable_amount'=>$total,
                        'paid_amount'=>0,
                        'balance_amount'=>$total,
                    ]);
                    foreach($items as $i){
                        $book=$books[$i['book_id']];
                        $book->decrement('stock_quantity',$i['quantity']);
                        BookStockMovement::create([
                            'book_id'=>$book->id,
                            'quantity'=>-$i['quantity'],
                            'movement_type'=>'sale',
                            'reference_type'=>'student_fee_items',
                            'reference_id'=>$feeItem->id,
                            'notes'=>json_encode(['title'=>$book->title,'unit_price'=>$book->price,'quantity'=>$i['quantity'],'amount'=>round($book->price*$i['quantity'],2)],JSON_UNESCAPED_UNICODE),
                            'created_by'=>auth()->id(),
                        ]);
                    }
                    $sale=['fee_item_id'=>$feeItem->id,'fee_item_ids'=>[$feeItem->id],'status'=>'billed_to_voucher'];
                    return;
                }
                $feeItemIds=[];
                foreach($items as $i){
                    $book=$books[$i['book_id']];
                    $amount=round($book->price*$i['quantity'],2);
                    $suffix=' (Qty: '.$i['quantity'].')';
                    $label=mb_strimwidth($book->title,0,100-mb_strlen($suffix),'…').$suffix;
                    $feeItem=StudentFeeItem::create([
                        'student_id'=>$student->id,
                        'academic_session_id'=>$session?->id,
                        'head_key'=>'books_'.(string)\Illuminate\Support\Str::uuid(),
                        'head_name'=>$label,
                        'head_type'=>'one_time',
                        'actual_amount'=>$amount,
                        'discount_amount'=>0,
                        'payable_amount'=>$amount,
                        'paid_amount'=>0,
                        'balance_amount'=>$amount,
                    ]);
                    $book->decrement('stock_quantity',$i['quantity']);
                    BookStockMovement::create([
                        'book_id'=>$book->id,
                        'quantity'=>-$i['quantity'],
                        'movement_type'=>'sale',
                        'reference_type'=>'student_fee_items',
                        'reference_id'=>$feeItem->id,
                        'created_by'=>auth()->id(),
                    ]);
                    $feeItemIds[]=$feeItem->id;
                }
                $sale=['fee_item_id'=>$feeItemIds[0],'fee_item_ids'=>$feeItemIds,'status'=>'billed_to_voucher'];
                return;
            }
            $head='Books - '.now()->format('Y-m-d H:i'); $feeItem=StudentFeeItem::create(['student_id'=>$student->id,'academic_session_id'=>$session?->id,'head_key'=>'books_'.uniqid(),'head_name'=>$head,'head_type'=>'one_time','actual_amount'=>$total,'payable_amount'=>$total,'paid_amount'=>$total,'balance_amount'=>0]);
            foreach($items as $i){$b=$books[$i['book_id']];$b->decrement('stock_quantity',$i['quantity']);BookStockMovement::create(['book_id'=>$b->id,'quantity'=>-$i['quantity'],'movement_type'=>'sale','reference_type'=>'student_fee_items','reference_id'=>$feeItem->id,'created_by'=>auth()->id()]);}
            $user=auth()->user(); $direct=(int)$user->role_id===1; $receiving=StaffStudentReceiving::create(['receipt_no'=>StaffStudentReceiving::generateReceiptNo(),'student_id'=>$student->id,'staff_id'=>$user->id,'academic_session_id'=>$session?->id,'amount'=>$total,'description'=>$head,'payment_method'=>$r->payment_method?:'cash','received_date'=>now()->toDateString(),'status'=>$direct?'received_by_admin':'pending_handover','admin_received_by'=>$direct?$user->id:null,'admin_received_at'=>$direct?now():null]);
            if($direct){$p=FeePayment::create(['student_id'=>$student->id,'month'=>now()->format('Y-m'),'amount_paid'=>$total,'discount_amount'=>0,'payment_date'=>now()->toDateString(),'payer_name'=>$student->name,'received_by'=>$user->id]);FeePaymentItem::create(['fee_payment_id'=>$p->id,'student_fee_item_id'=>$feeItem->id,'head_key'=>$feeItem->head_key,'head_name'=>$head,'amount_paid'=>$total,'discount_applied'=>0,'month'=>now()->format('Y-m')]);$receiving->fee_payment_id=$p->id;$receiving->save();}$sale=['fee_item_id'=>$feeItem->id,'receiving_id'=>$receiving->id,'status'=>$receiving->status];
        }); return response()->json(['message'=>'Book sale recorded.','total'=>$total,'sale'=>$sale],201);
    }
}
