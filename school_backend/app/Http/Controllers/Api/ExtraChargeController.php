<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicSession;
use App\Models\ExtraChargeItem;
use App\Models\PosPayment;
use App\Models\StudentExtraCharge;
use App\Models\StudentFeeItem;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ExtraChargeController extends Controller
{
    /**
     * Get summary statistics for dashboard.
     */
    public function getStats()
    {
        $currentMonth = now()->format('Y-m');

        $totalStockItems = ExtraChargeItem::where('item_type', 'stock_based')->where('is_active', true)->count();
        $lowStockItems = ExtraChargeItem::where('item_type', 'stock_based')
            ->where('is_active', true)
            ->whereColumn('stock_quantity', '<=', 'low_stock_threshold')
            ->count();

        $monthSalesQuery = StudentExtraCharge::whereRaw("DATE_FORMAT(created_at, '%Y-%m') = ?", [$currentMonth]);
        $totalBilledThisMonth = (float) $monthSalesQuery->sum('total_amount');
        $totalPaidThisMonth = (float) $monthSalesQuery->sum('paid_amount');
        $totalPendingAllTime = (float) StudentExtraCharge::whereIn('payment_status', ['unpaid', 'billed_to_voucher', 'partial'])->sum('balance_amount');

        return response()->json([
            'total_stock_items' => $totalStockItems,
            'low_stock_items' => $lowStockItems,
            'billed_this_month' => $totalBilledThisMonth,
            'paid_this_month' => $totalPaidThisMonth,
            'pending_balance' => $totalPendingAllTime,
        ]);
    }

    /**
     * List catalog items (Stationery, Uniforms, Books, Fines, Trips catalog).
     */
    public function getItems(Request $request)
    {
        $query = ExtraChargeItem::query();

        if ($request->has('category') && $request->category !== 'all') {
            $query->where('category', $request->category);
        }

        if ($request->has('item_type') && $request->item_type !== 'all') {
            $query->where('item_type', $request->item_type);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $items = $query->orderByRaw("
            CASE 
                WHEN item_type = 'stock_based' AND stock_quantity <= low_stock_threshold THEN 0
                WHEN item_type = 'stock_based' THEN 1
                ELSE 2
            END ASC,
            stock_quantity ASC,
            name ASC
        ")->get();

        return response()->json($items);
    }

    /**
     * Store a new catalog item (Super Admin only).
     */
    public function storeItem(Request $request)
    {
        if (auth()->check() && (int) auth()->user()->role_id !== 1) {
            return response()->json(['message' => 'Forbidden: Only Super Admin can create charge items or catalog heads.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:150',
            'code' => 'nullable|string|max:50|unique:extra_charge_items,code',
            'category' => 'required|in:stationery,uniform,books,fine,trip,event,id_card,other',
            'item_type' => 'required|in:stock_based,ad_hoc',
            'unit_price' => 'required|numeric|min:0',
            'stock_quantity' => 'nullable|integer|min:0',
            'low_stock_threshold' => 'nullable|integer|min:0',
            'description' => 'nullable|string|max:500',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        if ($data['item_type'] === 'ad_hoc') {
            $data['stock_quantity'] = 0;
        }

        $item = ExtraChargeItem::create($data);

        return response()->json([
            'message' => 'Item added successfully',
            'item' => $item,
        ], 201);
    }

    /**
     * Update an existing catalog item (Super Admin only).
     */
    public function updateItem(Request $request, $id)
    {
        if (auth()->check() && (int) auth()->user()->role_id !== 1) {
            return response()->json(['message' => 'Forbidden: Only Super Admin can edit charge items.'], 403);
        }

        $item = ExtraChargeItem::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:150',
            'code' => 'nullable|string|max:50|unique:extra_charge_items,code,' . $id,
            'category' => 'sometimes|required|in:stationery,uniform,books,fine,trip,event,id_card,other',
            'item_type' => 'sometimes|required|in:stock_based,ad_hoc',
            'unit_price' => 'sometimes|required|numeric|min:0',
            'stock_quantity' => 'nullable|integer|min:0',
            'low_stock_threshold' => 'nullable|integer|min:0',
            'description' => 'nullable|string|max:500',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $item->update($validator->validated());

        return response()->json([
            'message' => 'Item updated successfully',
            'item' => $item,
        ]);
    }

    /**
     * Quick Stock adjustment (+ add stock) (Super Admin only).
     */
    public function adjustStock(Request $request, $id)
    {
        if (auth()->check() && (int) auth()->user()->role_id !== 1) {
            return response()->json(['message' => 'Forbidden: Only Super Admin can adjust stock directly.'], 403);
        }

        $item = ExtraChargeItem::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'adjustment_qty' => 'required|integer',
            'reason' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $newQty = max(0, $item->stock_quantity + (int)$request->adjustment_qty);
        $item->stock_quantity = $newQty;
        $item->save();

        return response()->json([
            'message' => 'Stock adjusted successfully',
            'item' => $item,
        ]);
    }

    /**
     * Delete / Deactivate item (Super Admin only).
     */
    public function deleteItem($id)
    {
        if (auth()->check() && (int) auth()->user()->role_id !== 1) {
            return response()->json(['message' => 'Forbidden: Only Super Admin can delete charge items.'], 403);
        }

        $item = ExtraChargeItem::findOrFail($id);

        // Check if item has transaction records
        if ($item->studentCharges()->exists()) {
            $item->is_active = false;
            $item->save();
            return response()->json(['message' => 'Item has existing sales records and was marked inactive.']);
        }

        $item->delete();
        return response()->json(['message' => 'Item deleted successfully.']);
    }

    /**
     * Get count of students for a class and optional section.
     */
    public function getTargetCount(Request $request)
    {
        $query = User::where('role_id', 3)->where('is_active', true);
        if ($request->filled('class_id') && $request->class_id !== 'all') {
            $query->where('class_id', $request->class_id);
        }
        if ($request->filled('section_id') && $request->section_id !== 'all') {
            $query->where('section_id', $request->section_id);
        }
        return response()->json([
            'count' => $query->count()
        ]);
    }

    /**
     * Point-of-Sale / Issue Extra Charge to Student(s), Class, or Section.
     */
    public function issueCharge(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'student_ids' => 'nullable|array',
            'student_ids.*' => 'exists:users,id',
            'class_id' => 'nullable',
            'section_id' => 'nullable',
            'extra_charge_item_id' => 'nullable|exists:extra_charge_items,id',
            'title' => 'required|string|max:200',
            'category' => 'nullable|string|max:50',
            'charge_type' => 'nullable|in:stock_based,ad_hoc',
            'unit_price' => 'required|numeric|min:0',
            'quantity' => 'nullable|integer|min:1',
            'payment_option' => 'nullable|in:pay_now,bill_to_voucher',
            'payment_method' => 'nullable|in:cash,voucher,online,bank,waived',
            'notes' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $studentIds = $request->input('student_ids', []);
        if (empty($studentIds) && $request->filled('class_id')) {
            $studentQuery = User::where('role_id', 3)->where('is_active', true);
            if ($request->class_id !== 'all') {
                $studentQuery->where('class_id', $request->class_id);
            }
            if ($request->filled('section_id') && $request->section_id !== 'all') {
                $studentQuery->where('section_id', $request->section_id);
            }
            $studentIds = $studentQuery->pluck('id')->toArray();
        }

        if (empty($studentIds)) {
            return response()->json([
                'message' => 'No active students found in the selected class/section.',
            ], 422);
        }

        $studentsCount = count($studentIds);
        $chargeItemId = $request->input('extra_charge_item_id');
        $chargeType = $request->input('charge_type', 'ad_hoc');
        $quantity = (int)$request->input('quantity', 1);
        $unitPrice = (float)$request->input('unit_price', 0);
        $totalAmountPerStudent = $unitPrice * $quantity;
        $paymentOption = $request->input('payment_option', 'bill_to_voucher');
        $paymentMethod = $paymentOption === 'pay_now' ? ($request->input('payment_method') ?: 'cash') : 'voucher';
        $title = trim($request->input('title'));
        $category = $request->input('category', 'ad_hoc');
        $notes = $request->input('notes');

        $catalogItem = null;
        if ($chargeItemId) {
            $catalogItem = ExtraChargeItem::find($chargeItemId);
        }

        // If stock-based item, check inventory
        if ($catalogItem && $catalogItem->item_type === 'stock_based') {
            $requiredTotalQty = $quantity * $studentsCount;
            if ($catalogItem->stock_quantity < $requiredTotalQty) {
                return response()->json([
                    'message' => "Insufficient stock! Available: {$catalogItem->stock_quantity}, Required: {$requiredTotalQty}",
                ], 422);
            }
        }

        $createdRecords = [];
        $activeSession = AcademicSession::getActiveSession();
        $currentMonthStr = now()->format('Y-m');

        DB::beginTransaction();
        try {
            // Deduct stock if stock-based
            if ($catalogItem && $catalogItem->item_type === 'stock_based') {
                $catalogItem->decrement('stock_quantity', $quantity * $studentsCount);
            }

            foreach ($studentIds as $studentId) {
                $student = User::find($studentId);
                if (!$student) continue;

                $feeItem = null;
                $feePayment = null;

                if ($paymentOption === 'pay_now') {
                    // 1. Create a cleared student_fee_item record (billing trail for the student)
                    $feeItem = StudentFeeItem::create([
                        'student_id' => $student->id,
                        'academic_session_id' => $activeSession?->id,
                        'head_key' => 'extra_charge_' . time() . '_' . rand(100, 999),
                        'head_name' => $title . ($quantity > 1 ? " (Qty: {$quantity})" : ""),
                        'head_type' => $category === 'fine' ? 'fine' : 'one_time',
                        'actual_amount' => $totalAmountPerStudent,
                        'discount_amount' => 0,
                        'payable_amount' => $totalAmountPerStudent,
                        'paid_amount' => $totalAmountPerStudent,
                        'balance_amount' => 0,
                    ]);

                    // Create Extra Charge transaction record
                    $charge = StudentExtraCharge::create([
                        'student_id' => $student->id,
                        'extra_charge_item_id' => $catalogItem?->id,
                        'student_fee_item_id' => $feeItem->id,
                        'fee_payment_id' => null,
                        'title' => $title,
                        'category' => $category,
                        'charge_type' => $chargeType,
                        'unit_price' => $unitPrice,
                        'quantity' => $quantity,
                        'total_amount' => $totalAmountPerStudent,
                        'paid_amount' => $totalAmountPerStudent,
                        'balance_amount' => 0,
                        'payment_status' => 'paid',
                        'payment_method' => $paymentMethod,
                        'paid_at' => now(),
                        'notes' => $notes,
                        'created_by' => auth()->id(),
                    ]);

                    // Record collection in the separate POS received ledger (NOT fee_payments)
                    $posPayment = PosPayment::create([
                        'category' => 'extra',
                        'student_id' => $student->id,
                        'month' => $currentMonthStr,
                        'amount_paid' => $totalAmountPerStudent,
                        'payment_date' => now()->format('Y-m-d'),
                        'payer_name' => $student->name,
                        'payment_method' => $paymentMethod,
                        'description' => $title . ($quantity > 1 ? " (Qty: {$quantity})" : ""),
                        'student_fee_item_id' => $feeItem->id,
                        'student_extra_charge_id' => $charge->id,
                        'received_by' => auth()->id(),
                    ]);
                    $charge->pos_payment_id = $posPayment->id;
                    $charge->save();

                    $createdRecords[] = $charge;

                } else {
                    // 2. Bill to Voucher / Pay Later -> Creates an unpaid debit head in StudentFeeItem
                    $feeItem = StudentFeeItem::create([
                        'student_id' => $student->id,
                        'academic_session_id' => $activeSession?->id,
                        'head_key' => 'extra_charge_' . time() . '_' . $student->id . '_' . rand(100, 999),
                        'head_name' => $title . ($quantity > 1 ? " (Qty: {$quantity})" : ""),
                        'head_type' => $category === 'fine' ? 'fine' : 'one_time',
                        'actual_amount' => $totalAmountPerStudent,
                        'discount_amount' => 0,
                        'payable_amount' => $totalAmountPerStudent,
                        'paid_amount' => 0,
                        'balance_amount' => $totalAmountPerStudent,
                    ]);

                    // Create Extra Charge transaction record
                    $charge = StudentExtraCharge::create([
                        'student_id' => $student->id,
                        'extra_charge_item_id' => $catalogItem?->id,
                        'student_fee_item_id' => $feeItem->id,
                        'fee_payment_id' => null,
                        'title' => $title,
                        'category' => $category,
                        'charge_type' => $chargeType,
                        'unit_price' => $unitPrice,
                        'quantity' => $quantity,
                        'total_amount' => $totalAmountPerStudent,
                        'paid_amount' => 0,
                        'balance_amount' => $totalAmountPerStudent,
                        'payment_status' => 'billed_to_voucher',
                        'payment_method' => 'voucher',
                        'paid_at' => null,
                        'notes' => $notes,
                        'created_by' => auth()->id(),
                    ]);

                    $createdRecords[] = $charge;
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Extra charge(s) processed successfully!',
                'count' => count($createdRecords),
                'records' => $createdRecords,
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to issue extra charge: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Sales / Billing History Log with filters.
     */
    public function getSalesLog(Request $request)
    {
        $query = StudentExtraCharge::with([
            'student:id,uuid,name,father_name,roll_number,class_id,section_id',
            'student.academyClass:id,name',
            'student.section:id,name',
            'item:id,name,category,code',
            'creator:id,name',
        ]);

        if ($request->filled('student_id')) {
            $query->where('student_id', $request->student_id);
        }

        if ($request->filled('class_id')) {
            $query->whereHas('student', function ($q) use ($request) {
                $q->where('class_id', $request->class_id);
            });
        }

        if ($request->filled('section_id')) {
            $query->whereHas('student', function ($q) use ($request) {
                $q->where('section_id', $request->section_id);
            });
        }

        if ($request->filled('payment_status') && $request->payment_status !== 'all') {
            $query->where('payment_status', $request->payment_status);
        }

        if ($request->filled('item_id') && $request->item_id !== 'all') {
            $query->where('extra_charge_item_id', $request->item_id);
        }

        if ($request->filled('category') && $request->category !== 'all') {
            $query->where('category', $request->category);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('notes', 'like', "%{$search}%")
                  ->orWhereHas('student', function ($sq) use ($search) {
                      $sq->where('name', 'like', "%{$search}%")
                         ->orWhere('roll_number', 'like', "%{$search}%")
                         ->orWhere('father_name', 'like', "%{$search}%");
                  });
            });
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $perPage = (int) $request->input('per_page', 25);
        $logs = $query->orderBy('id', 'desc')->paginate($perPage);

        return response()->json($logs);
    }

    /**
     * Mark an unpaid extra charge as paid at counter.
     */
    public function collectChargePayment(Request $request, $id)
    {
        $charge = StudentExtraCharge::with(['student', 'studentFeeItem'])->findOrFail($id);

        if ($charge->payment_status === 'paid') {
            return response()->json(['message' => 'Charge is already fully paid.'], 400);
        }

        $validator = Validator::make($request->all(), [
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => 'nullable|in:cash,online,bank',
            'notes' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $amount = (float)$request->amount;
        $paymentMethod = $request->payment_method ?: 'cash';
        $currentMonthStr = now()->format('Y-m');

        DB::beginTransaction();
        try {
            // Create POS payment record (separate Books/Extra received ledger, NOT in fee_payments)
            $posPayment = PosPayment::create([
                'category' => 'extra',
                'student_id' => $charge->student_id,
                'month' => $currentMonthStr,
                'amount_paid' => $amount,
                'payment_date' => now()->format('Y-m-d'),
                'payer_name' => $charge->student?->name,
                'payment_method' => $paymentMethod,
                'description' => $charge->title,
                'student_fee_item_id' => $charge->student_fee_item_id,
                'student_extra_charge_id' => $charge->id,
                'received_by' => auth()->id(),
            ]);

            // Update linked student fee item
            if ($charge->studentFeeItem) {
                $charge->studentFeeItem->paid_amount += $amount;
                $charge->studentFeeItem->balance_amount = max(0, $charge->studentFeeItem->payable_amount - $charge->studentFeeItem->paid_amount);
                $charge->studentFeeItem->save();
            }

            // Update charge record
            $charge->paid_amount += $amount;
            $charge->balance_amount = max(0, $charge->total_amount - $charge->paid_amount);
            $charge->payment_status = $charge->balance_amount <= 0 ? 'paid' : 'partial';
            $charge->payment_method = $paymentMethod;
            $charge->pos_payment_id = $posPayment->id;
            $charge->paid_at = now();
            $charge->save();

            DB::commit();

            return response()->json([
                'message' => 'Payment collected successfully!',
                'charge' => $charge,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Payment failed: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Void or cancel an unpaid charge (Super Admin only).
     */
    public function voidCharge($id)
    {
        if (auth()->check() && (int) auth()->user()->role_id !== 1) {
            return response()->json(['message' => 'Forbidden: Only Super Admin can void extra charges.'], 403);
        }

        $charge = StudentExtraCharge::with(['item', 'studentFeeItem'])->findOrFail($id);

        if ($charge->payment_status === 'paid') {
            return response()->json(['message' => 'Paid charges cannot be voided directly.'], 400);
        }

        DB::beginTransaction();
        try {
            // Restore inventory stock if stock-based
            if ($charge->item && $charge->item->item_type === 'stock_based') {
                $charge->item->increment('stock_quantity', $charge->quantity);
            }

            // Delete linked fee item
            if ($charge->studentFeeItem) {
                $charge->studentFeeItem->delete();
            }

            $charge->delete();

            DB::commit();

            return response()->json(['message' => 'Charge has been voided and inventory stock restored.']);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to void charge: ' . $e->getMessage()], 500);
        }
    }
}
