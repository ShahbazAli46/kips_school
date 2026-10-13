<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\SendStaffReceivingWhatsAppJob;
use App\Models\AcademicSession;
use App\Models\FeePayment;
use App\Models\FeePaymentItem;
use App\Models\StaffStudentReceiving;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class StaffStudentReceivingController extends Controller
{
    /**
     * List all student receivings.
     * Super Admin / Accountant can view all with filtering.
     * Non-admin staff (Teachers) view only their own collections.
     */
    public function index(Request $request)
    {
        $user = auth()->user();
        $isSuperAdminOrAccountant = in_array((int)$user->role_id, [1, 5]);

        $query = StaffStudentReceiving::with([
            'student:id,name,father_name,roll_number,class_id,section_id,contact_number,emergency_contact,father_cell',
            'student.academyClass:id,name',
            'student.section:id,name',
            'staff:id,name,role_id,designation_id',
            'staff.designation:id,name',
            'adminReceiver:id,name',
            'feePayment:id,payment_date,amount_paid'
        ]);

        if (!$isSuperAdminOrAccountant) {
            // Staff members only see their own collections
            $query->where('staff_id', $user->id);
        } else {
            // Super Admin filters
            if ($request->filled('staff_id')) {
                $query->where('staff_id', $request->input('staff_id'));
            }
        }

        // Status filter
        if ($request->filled('status') && $request->input('status') !== 'all') {
            $query->where('status', $request->input('status'));
        }

        // Class filter
        if ($request->filled('class_id')) {
            $classId = $request->input('class_id');
            $query->whereHas('student', function ($q) use ($classId) {
                $q->where('class_id', $classId);
            });
        }

        // Student filter
        if ($request->filled('student_id')) {
            $query->where('student_id', $request->input('student_id'));
        }

        // Date range
        if ($request->filled('date_from')) {
            $query->whereDate('received_date', '>=', $request->input('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->whereDate('received_date', '<=', $request->input('date_to'));
        }

        // Search text
        if ($request->filled('search')) {
            $search = trim($request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('receipt_no', 'LIKE', "%{$search}%")
                  ->orWhere('description', 'LIKE', "%{$search}%")
                  ->orWhereHas('student', function ($sq) use ($search) {
                      $sq->where('name', 'LIKE', "%{$search}%")
                         ->orWhere('roll_number', 'LIKE', "%{$search}%")
                         ->orWhere('father_name', 'LIKE', "%{$search}%");
                  })
                  ->orWhereHas('staff', function ($tq) use ($search) {
                      $tq->where('name', 'LIKE', "%{$search}%");
                  });
            });
        }

        // Summary Statistics (calculated fast from indexed table)
        $statsBase = StaffStudentReceiving::query();
        if (!$isSuperAdminOrAccountant) {
            $statsBase->where('staff_id', $user->id);
        } elseif ($request->filled('staff_id')) {
            $statsBase->where('staff_id', $request->input('staff_id'));
        }

        $totalPendingAmount = (float) (clone $statsBase)->where('status', 'pending_handover')->sum('amount');
        $pendingCount       = (int) (clone $statsBase)->where('status', 'pending_handover')->count();
        $totalReceivedToday = (float) (clone $statsBase)->where('status', 'received_by_admin')->whereDate('admin_received_at', now()->format('Y-m-d'))->sum('amount');
        $totalCleared       = (float) (clone $statsBase)->where('status', 'received_by_admin')->sum('amount');
        $totalAllTime       = (float) (clone $statsBase)->sum('amount');
        $staffHoldingCount  = $isSuperAdminOrAccountant
            ? (int) StaffStudentReceiving::where('status', 'pending_handover')->distinct('staff_id')->count('staff_id')
            : 0;

        $perPage = (int) $request->input('per_page', 25);
        $receivings = $query->orderBy('received_date', 'desc')
                            ->orderBy('id', 'desc')
                            ->paginate($perPage);

        return response()->json([
            'data'       => $receivings->items(),
            'pagination' => [
                'current_page' => $receivings->currentPage(),
                'last_page'    => $receivings->lastPage(),
                'per_page'     => $receivings->perPage(),
                'total'        => $receivings->total(),
            ],
            'stats'      => [
                'total_pending_amount' => $totalPendingAmount,
                'pending_count'        => $pendingCount,
                'total_received_today' => $totalReceivedToday,
                'total_cleared'        => $totalCleared,
                'total_all_time'       => $totalAllTime,
                'staff_holding_count'  => $staffHoldingCount,
                'is_admin'             => $isSuperAdminOrAccountant,
            ],
        ]);
    }

    /**
     * Receive amount from a student for any reason.
     * Can be performed by Super Admin, Teachers, or any authorized staff member.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'student_id'     => 'required|exists:users,id',
            'amount'         => 'required|numeric|min:1',
            'description'    => 'required|string|max:500',
            'payment_method' => 'nullable|string|in:cash,online,easypaisa,jazzcash,bank_transfer',
            'received_date'  => 'nullable|date',
            'staff_id'       => 'nullable|exists:users,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = auth()->user();
        $isSuperAdmin = ((int)$user->role_id === 1);

        // Determine who the receiving staff member is
        $staffId = $user->id;
        if ($isSuperAdmin && $request->filled('staff_id')) {
            $staffId = (int) $request->input('staff_id');
        }

        $receivedDate = $request->input('received_date') ?: now()->format('Y-m-d');
        $activeSession = AcademicSession::getActiveSession();

        $student = User::with(['academyClass', 'section'])->findOrFail($request->input('student_id'));
        $parentPhone = $student->contact_number ?: ($student->emergency_contact ?: ($student->father_cell ?? null));

        DB::beginTransaction();
        try {
            $receiptNo = StaffStudentReceiving::generateReceiptNo();

            // If collected directly by Super Admin as the office receiver,
            // it can be directly marked as received by admin & added to Daily Receivings!
            $directlyReceivedByAdmin = ($isSuperAdmin && $staffId === $user->id);

            $status = $directlyReceivedByAdmin ? 'received_by_admin' : 'pending_handover';
            $adminReceivedBy = $directlyReceivedByAdmin ? $user->id : null;
            $adminReceivedAt = $directlyReceivedByAdmin ? now() : null;

            $receiving = StaffStudentReceiving::create([
                'receipt_no'          => $receiptNo,
                'student_id'          => $student->id,
                'staff_id'            => $staffId,
                'academic_session_id' => $activeSession?->id,
                'amount'              => $request->input('amount'),
                'description'         => trim($request->input('description')),
                'payment_method'      => $request->input('payment_method') ?: 'cash',
                'received_date'       => $receivedDate,
                'status'              => $status,
                'admin_received_by'   => $adminReceivedBy,
                'admin_received_at'   => $adminReceivedAt,
                'admin_notes'         => $directlyReceivedByAdmin ? 'Directly received at Admin Office' : null,
                'parent_phone'        => $parentPhone,
                'whatsapp_status'     => 'pending',
            ]);

            // If directly received by Super Admin, immediately enter into Daily Receivings (FeePayment)
            if ($directlyReceivedByAdmin) {
                $paymentMonth = Carbon::parse($receivedDate)->format('Y-m');
                $feePayment = FeePayment::create([
                    'student_id'      => $student->id,
                    'month'           => $paymentMonth,
                    'amount_paid'     => $receiving->amount,
                    'discount_amount' => 0,
                    'payment_date'    => $receivedDate,
                    'payer_name'      => $student->name,
                    'received_by'     => $user->id,
                ]);

                FeePaymentItem::create([
                    'fee_payment_id'      => $feePayment->id,
                    'student_fee_item_id' => null,
                    'head_key'            => 'staff_receiving_' . $receiving->id,
                    'head_name'           => $receiving->description,
                    'amount_paid'         => $receiving->amount,
                    'discount_applied'    => 0,
                    'month'               => $paymentMonth,
                ]);

                $receiving->fee_payment_id = $feePayment->id;
                $receiving->save();
            }

            DB::commit();

            // Dispatch WhatsApp notification to student's parent
            SendStaffReceivingWhatsAppJob::dispatch($receiving->id);

            $receiving->load([
                'student.academyClass',
                'student.section',
                'staff.designation',
                'adminReceiver',
            ]);

            return response()->json([
                'message'   => 'Amount received successfully!',
                'receiving' => $receiving,
            ], 201);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to record student receiving: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Super Admin acknowledges and receives amount from staff member.
     * This marks the receiving as cleared from staff member's possession
     * and automatically creates a record in Daily Receivings (FeePayment).
     */
    public function receive(Request $request, $id)
    {
        $user = auth()->user();
        if (!in_array((int)$user->role_id, [1, 5])) {
            return response()->json(['message' => 'Only Super Admin or Accountant can receive amounts.'], 403);
        }

        $receiving = StaffStudentReceiving::with(['student', 'staff'])->findOrFail($id);

        if ($receiving->status === 'received_by_admin') {
            return response()->json([
                'message'   => 'This amount has already been received and cleared by admin.',
                'receiving' => $receiving,
            ]);
        }

        DB::beginTransaction();
        try {
            $paymentMonth = Carbon::parse($receiving->received_date)->format('Y-m');

            // 1. Create official FeePayment record so it appears in Daily Receivings & Master Ledger
            $feePayment = FeePayment::create([
                'student_id'      => $receiving->student_id,
                'month'           => $paymentMonth,
                'amount_paid'     => $receiving->amount,
                'discount_amount' => 0,
                'payment_date'    => now()->format('Y-m-d'),
                'payer_name'      => $receiving->student?->name ?: 'Student',
                'received_by'     => $user->id,
            ]);

            // 2. Create item breakdown for Daily Receivings
            FeePaymentItem::create([
                'fee_payment_id'      => $feePayment->id,
                'student_fee_item_id' => null,
                'head_key'            => 'staff_receiving_' . $receiving->id,
                'head_name'           => $receiving->description . ' (via ' . ($receiving->staff?->name ?? 'Staff') . ')',
                'amount_paid'         => $receiving->amount,
                'discount_applied'    => 0,
                'month'               => $paymentMonth,
            ]);

            // 3. Mark staff receiving as received & cleared by admin
            $receiving->status            = 'received_by_admin';
            $receiving->admin_received_by = $user->id;
            $receiving->admin_received_at = now();
            $receiving->admin_notes       = $request->input('notes') ?: 'Handed over by ' . ($receiving->staff?->name ?? 'Staff');
            $receiving->fee_payment_id    = $feePayment->id;
            $receiving->save();

            DB::commit();

            $receiving->load([
                'student.academyClass',
                'student.section',
                'staff.designation',
                'adminReceiver',
                'feePayment',
            ]);

            return response()->json([
                'message'   => "Successfully received Rs. " . number_format((float)$receiving->amount) . " from {$receiving->staff?->name}! Added to Daily Receivings.",
                'receiving' => $receiving,
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to process handover: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Batch receive multiple pending amounts from staff member(s).
     */
    public function batchReceive(Request $request)
    {
        $user = auth()->user();
        if (!in_array((int)$user->role_id, [1, 5])) {
            return response()->json(['message' => 'Only Super Admin or Accountant can receive amounts.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'ids'   => 'required|array|min:1',
            'ids.*' => 'exists:staff_student_receivings,id',
            'notes' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $ids = $request->input('ids');
        $pendingRecords = StaffStudentReceiving::with(['student', 'staff'])
            ->whereIn('id', $ids)
            ->where('status', 'pending_handover')
            ->get();

        if ($pendingRecords->isEmpty()) {
            return response()->json(['message' => 'No pending handover records found for the selected items.'], 400);
        }

        DB::beginTransaction();
        try {
            $totalClearedAmount = 0;
            $clearedCount = 0;

            foreach ($pendingRecords as $rec) {
                $paymentMonth = Carbon::parse($rec->received_date)->format('Y-m');

                // Create FeePayment record
                $feePayment = FeePayment::create([
                    'student_id'      => $rec->student_id,
                    'month'           => $paymentMonth,
                    'amount_paid'     => $rec->amount,
                    'discount_amount' => 0,
                    'payment_date'    => now()->format('Y-m-d'),
                    'payer_name'      => $rec->student?->name ?: 'Student',
                    'received_by'     => $user->id,
                ]);

                FeePaymentItem::create([
                    'fee_payment_id'      => $feePayment->id,
                    'student_fee_item_id' => null,
                    'head_key'            => 'staff_receiving_' . $rec->id,
                    'head_name'           => $rec->description . ' (via ' . ($rec->staff?->name ?? 'Staff') . ')',
                    'amount_paid'         => $rec->amount,
                    'discount_applied'    => 0,
                    'month'               => $paymentMonth,
                ]);

                $rec->status            = 'received_by_admin';
                $rec->admin_received_by = $user->id;
                $rec->admin_received_at = now();
                $rec->admin_notes       = $request->input('notes') ?: 'Batch handover received by ' . $user->name;
                $rec->fee_payment_id    = $feePayment->id;
                $rec->save();

                $totalClearedAmount += (float) $rec->amount;
                $clearedCount++;
            }

            DB::commit();

            return response()->json([
                'message'              => "Successfully received and cleared {$clearedCount} collections totaling Rs. " . number_format($totalClearedAmount) . " into Daily Receivings!",
                'cleared_count'        => $clearedCount,
                'total_cleared_amount' => $totalClearedAmount,
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to process batch receiving: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Resend parent WhatsApp payment notification.
     */
    public function resendWhatsApp($id)
    {
        $receiving = StaffStudentReceiving::findOrFail($id);
        SendStaffReceivingWhatsAppJob::dispatch($receiving->id);

        return response()->json([
            'message' => 'WhatsApp receipt notification dispatched for sending.',
        ]);
    }

    /**
     * Search students across all classes for easy autocomplete/selection.
     */
    public function studentsSearch(Request $request)
    {
        $q = trim($request->input('q', ''));
        $classId = $request->input('class_id');
        $sectionId = $request->input('section_id');

        $query = User::where('role_id', 3) // student role
            ->where('is_active', true)
            ->with(['academyClass:id,name', 'section:id,name'])
            ->select([
                'id',
                'name',
                'father_name',
                'roll_number',
                'class_id',
                'section_id',
                'contact_number',
                'emergency_contact',
                'father_cell',
                'image'
            ]);

        if ($classId) {
            $query->where('class_id', $classId);
        }
        if ($sectionId) {
            $query->where('section_id', $sectionId);
        }

        if ($q !== '') {
            $query->where(function ($sub) use ($q) {
                $sub->where('name', 'LIKE', "%{$q}%")
                    ->orWhere('roll_number', 'LIKE', "%{$q}%")
                    ->orWhere('father_name', 'LIKE', "%{$q}%")
                    ->orWhere('contact_number', 'LIKE', "%{$q}%")
                    ->orWhere('father_cell', 'LIKE', "%{$q}%");
            });
        }

        $students = $query->limit(50)->get();

        return response()->json($students);
    }

    /**
     * Get list of staff members for filtering.
     */
    public function staffList()
    {
        $staff = User::whereIn('role_id', [1, 2, 5, 6]) // super admin, teacher, accountant, attendance-manager
            ->where('is_active', true)
            ->with('designation:id,name')
            ->select('id', 'name', 'role_id', 'designation_id')
            ->orderBy('name', 'asc')
            ->get();

        return response()->json($staff);
    }
}
