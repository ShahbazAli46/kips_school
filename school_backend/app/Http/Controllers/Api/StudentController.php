<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class StudentController extends Controller
{
    public function index(Request $request)
    {
        $roleId = $request->user()?->role_id ?? 0;
        $queryParams = $request->all();
        ksort($queryParams);
        $version = Cache::get('students_cache_version', 1);
        $cacheKey = "students_v{$version}_" . md5(json_encode($queryParams) . "_role_{$roleId}");

        $data = Cache::remember($cacheKey, 86400, function () use ($request, $roleId) {
            $targetMonth = $request->query('month', date('Y-m'));
            $query = User::with(['academyClass:id,name', 'major:id,name', 'section:id,name'])
                ->select('users.*')
                ->selectSub(function ($q) use ($targetMonth) {
                    $q->from('student_subject_enrollments as sse')
                        ->selectRaw('COUNT(*)')
                        ->whereColumn('sse.student_id', 'users.id')
                        ->where('sse.is_active', true)
                        ->where('sse.month', function ($sub) use ($targetMonth) {
                            $sub->from('student_subject_enrollments as sse2')
                                ->selectRaw('COALESCE(MAX(month), ?)', [$targetMonth])
                                ->whereColumn('sse2.student_id', 'users.id')
                                ->where('sse2.month', '<=', $targetMonth);
                        });
                }, 'enrolled_subjects_count')
                ->selectSub(function ($q) {
                    $q->from('fee_payments')
                        ->selectRaw('COALESCE(SUM(amount_paid), 0)')
                        ->whereColumn('fee_payments.student_id', 'users.id');
                }, 'total_received')
                ->selectSub(function ($q) {
                    $q->from('student_fee_items')
                        ->selectRaw('COALESCE(SUM(balance_amount), 0)')
                        ->whereColumn('student_fee_items.student_id', 'users.id');
                }, 'total_receivable')
                ->where('role_id', 3);

            if ($request->has('search') && !empty($request->search)) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%")
                      ->orWhere('father_name', 'like', "%{$search}%")
                      ->orWhere('student_cnic', 'like', "%{$search}%")
                      ->orWhere('roll_number', 'like', "%{$search}%")
                      ->orWhere('erp_reg', 'like', "%{$search}%")
                      ->orWhere('remarks', 'like', "%{$search}%")
                      ->orWhere('contact_number', 'like', "%{$search}%");
                });
            }

            if ($request->has('class_id') && !empty($request->class_id)) {
                $query->where('class_id', $request->class_id);
            }

            if ($request->has('major_id') && !empty($request->major_id)) {
                $query->where('major_id', $request->major_id);
            }

            if ($request->has('section_id') && !empty($request->section_id)) {
                $query->where('section_id', $request->section_id);
            }

            if ($request->has('gender') && !empty($request->gender)) {
                $query->where('gender', $request->gender);
            }

            if ($request->has('all') && $request->all === 'true') {
                $results = $query->orderByRaw('CASE WHEN roll_number IS NULL THEN 1 ELSE 0 END')
                    ->orderBy('class_id', 'asc')
                    ->orderByRaw('CAST(roll_number AS UNSIGNED) ASC')
                    ->orderBy('name', 'asc')
                    ->get();

                if ($roleId == 5) {
                    $results->makeHidden(['monthly_fee', 'pending_amount', 'total_paid']);
                }

                return $results->toArray();
            }

            $students = $query->orderByRaw('CASE WHEN roll_number IS NULL THEN 1 ELSE 0 END')
                ->orderBy('class_id', 'asc')
                ->orderByRaw('CAST(roll_number AS UNSIGNED) ASC')
                ->orderBy('name', 'asc')
                ->paginate($request->input('per_page', 100));

            if ($roleId == 5) {
                $students->getCollection()->transform(function ($student) {
                    $student->makeHidden(['monthly_fee', 'pending_amount', 'total_paid']);
                    return $student;
                });
            }

            return $students->toArray();
        });

        return response()->json($data);
    }

    public function show($id)
    {
        $student = User::with(['academyClass:id,name', 'major:id,name', 'section:id,name', 'academicSession:id,name', 'feeItems'])
            ->where('role_id', 3)
            ->findOrFail($id);

        return response()->json($student);
    }

    public function store(Request $request)
    {
        $isOfficeAdmin = $request->user() && $request->user()->role_id == 5;
        if ($isOfficeAdmin) {
            return response()->json(['message' => 'Forbidden: Office Admin does not have permission to add students.'], 403);
        }

        $request->validate([
            // Personal Data
            'name' => 'required|string|max:100',
            'email' => ['nullable', 'email', 'max:100'],
            'student_cnic' => 'nullable|string|max:30',
            'erp_reg' => 'nullable|string|max:100',
            'dob' => 'required|date',
            'father_name' => 'required|string|max:100',
            'father_cnic' => 'nullable|string|max:30',
            'father_cell' => 'nullable|string|max:30',
            'contact_number' => 'nullable|string|max:30',
            'gender' => 'required|string|in:male,female,other,Male,Female,Other',
            'current_address' => 'nullable|string',
            'remarks' => 'nullable|string',

            // Admission Stream
            'stream_type' => 'nullable|string|max:50',
            'class_id' => 'required|exists:classes,id',
            'section_id' => 'required|exists:sections,id',
            'major_id' => 'nullable|exists:majors,id',
            'academic_session_id' => 'required|exists:academic_sessions,id',
            'test_marks' => 'nullable|numeric|min:0',
            'obtained_marks' => 'nullable|numeric|min:0',
            'admission_month' => 'required|string|max:10',

            // Financial & Discounts
            'monthly_fee' => 'nullable|numeric|min:0',
            'pending_amount' => 'nullable|numeric|min:0',
            'amount_received_at_admission' => 'nullable|numeric|min:0',
            'total_admission_payable' => 'nullable|numeric|min:0',
            'admission_balance' => 'nullable|numeric|min:0',
            'is_prospectus_sold' => 'nullable|boolean',
            'is_marks_based_discount' => 'nullable|boolean',
            'is_discretionary_discount' => 'nullable|boolean',
            'is_policy_discount' => 'nullable|boolean',
            'selected_months_tf' => 'nullable|string',
            'tuition_fee_per_policy' => 'nullable|numeric',
            'discretionary_discount_reason' => 'nullable|string',
            'discretionary_discount_amount' => 'nullable|numeric',
            'policy_discount_type' => 'nullable|string',
            'policy_discount_amount' => 'nullable|numeric',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:2048',
            'is_active' => 'boolean'
        ]);

        $data = $request->except(['image', 'fee_structure']);
        $data['role_id'] = 3;
        $data['gender'] = strtolower($request->input('gender', 'male'));
        $data['password'] = Hash::make('password123'); // Default student password
        $data['is_active'] = $request->boolean('is_active', true);

        // Fallback contact number
        if (empty($data['contact_number']) && !empty($data['father_cell'])) {
            $data['contact_number'] = $data['father_cell'];
        }

        // Fallback email if not provided
        if (empty($data['email'])) {
            $cleanedName = preg_replace('/[^a-zA-Z0-9]/', '', strtolower($data['name']));
            $data['email'] = ($cleanedName ?: 'student') . '_' . time() . '_' . rand(100, 999) . '@kips.edu.pk';
        }

        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('students', 'public');
            $data['image'] = $path;
        }

        $sessionId = $request->input('academic_session_id');
        if ($sessionId && !empty($data['class_id'])) {
            $maxRoll = \App\Models\StudentSessionEnrollment::where('academic_session_id', $sessionId)
                ->where('class_id', $data['class_id'])
                ->max(\Illuminate\Support\Facades\DB::raw('CAST(roll_number AS UNSIGNED)'));
            $data['roll_number'] = $maxRoll ? $maxRoll + 1 : 1;
        }

        // Parse fee structure
        $feeStructureInput = $request->input('fee_structure');
        if (is_string($feeStructureInput)) {
            $feeStructureInput = json_decode($feeStructureInput, true) ?: [];
        }

        // Calculate tuition fee / monthly fee if fee structure is provided
        if (isset($feeStructureInput['tuition_fee']['payable'])) {
            $data['monthly_fee'] = (float)$feeStructureInput['tuition_fee']['payable'];
        }

        $student = User::create($data);

        // Create student session enrollment
        if ($sessionId) {
            \App\Models\StudentSessionEnrollment::create([
                'student_id' => $student->id,
                'academic_session_id' => $sessionId,
                'class_id' => $data['class_id'] ?? null,
                'major_id' => $data['major_id'] ?? null,
                'section_id' => $data['section_id'] ?? null,
                'monthly_fee' => $data['monthly_fee'] ?? 0,
                'roll_number' => $data['roll_number'],
            ]);
        }

        // Save 15 Fee Heads into student_fee_items
        $standardHeads = \App\Models\StudentFeeItem::getStandardFeeHeads();
        $createdFeeItems = [];

        foreach ($standardHeads as $key => $meta) {
            $headActual = 0;
            $headDiscount = 0;
            $headPayable = 0;

            if (isset($feeStructureInput[$key])) {
                $headActual = (float)($feeStructureInput[$key]['actual'] ?? 0);
                $headDiscount = (float)($feeStructureInput[$key]['discount'] ?? 0);
                $headPayable = max(0, $headActual - $headDiscount);
            } elseif ($request->has("fee_{$key}_actual")) {
                $headActual = (float)$request->input("fee_{$key}_actual", 0);
                $headDiscount = (float)$request->input("fee_{$key}_discount", 0);
                $headPayable = max(0, $headActual - $headDiscount);
            } elseif ($key === 'tuition_fee' && !empty($data['monthly_fee'])) {
                $headActual = (float)$data['monthly_fee'];
                $headPayable = (float)$data['monthly_fee'];
            }

            $item = \App\Models\StudentFeeItem::create([
                'student_id' => $student->id,
                'academic_session_id' => $sessionId,
                'head_key' => $key,
                'head_name' => $meta['name'],
                'head_type' => $meta['type'],
                'actual_amount' => $headActual,
                'discount_amount' => $headDiscount,
                'payable_amount' => $headPayable,
                'paid_amount' => 0,
                'balance_amount' => $headPayable,
            ]);

            $createdFeeItems[$key] = $item;
        }

        // Record Initial Admission Payment if received > 0
        $amtReceived = (float)$request->input('amount_received_at_admission', 0);
        if ($amtReceived > 0) {
            $admissionMonth = $request->input('admission_month', date('Y-m'));
            if (strlen($admissionMonth) > 7) {
                $admissionMonth = substr($admissionMonth, 0, 7);
            }

            $payment = \App\Models\FeePayment::create([
                'student_id' => $student->id,
                'month' => $admissionMonth,
                'amount_paid' => $amtReceived,
                'discount_amount' => (float)$request->input('total_discount_amount', 0),
                'payment_date' => now()->format('Y-m-d'),
                'received_by' => auth()->id(),
                'payer_name' => $student->father_name ?: $student->name,
            ]);

            // Allocate received payment across fee heads in prioritized sequence
            $remainingPayment = $amtReceived;
            $allocationOrder = [
                'adm_fee', 'security_fee', 'id_card_charges', 'brd_reg_charges', 'brd_adm_charges',
                'tuition_fee', 'lms_charges', 'ac_charges', 'lab_charges', 'library_charges',
                'exam_charges', 'service_charges', 'lim_charges', 'r_and_t_charges', 'fine'
            ];

            foreach ($allocationOrder as $headKey) {
                if ($remainingPayment <= 0) break;
                if (!isset($createdFeeItems[$headKey])) continue;

                $item = $createdFeeItems[$headKey];
                $headDue = (float)$item->payable_amount;
                if ($headDue <= 0) continue;

                $allocated = min($remainingPayment, $headDue);
                $remainingPayment -= $allocated;

                $item->paid_amount = $allocated;
                $item->balance_amount = max(0, $headDue - $allocated);
                $item->save();

                \App\Models\FeePaymentItem::create([
                    'fee_payment_id' => $payment->id,
                    'student_fee_item_id' => $item->id,
                    'head_key' => $headKey,
                    'head_name' => $item->head_name,
                    'amount_paid' => $allocated,
                    'discount_applied' => $item->discount_amount,
                    'month' => $admissionMonth,
                ]);
            }
        }
        
        // Recalculate pending_amount to strictly be the sum of one-time non-tuition fees
        $student->pending_amount = \App\Models\StudentFeeItem::where('student_id', $student->id)
            ->where('head_key', '!=', 'tuition_fee')
            ->sum('payable_amount');
        $student->save();

        return response()->json($student->load(['academyClass:id,name', 'major:id,name', 'section:id,name', 'feeItems']), 201);
    }

    public function update(Request $request, User $student)
    {
        if ($student->role_id !== 3) {
            return response()->json(['message' => 'User is not a student'], 400);
        }

        $isOfficeAdmin = $request->user() && $request->user()->role_id == 5;

        $request->validate([
            'name' => 'required|string|max:100',
            'email' => ['nullable', 'email', 'max:100'],
            'student_cnic' => 'nullable|string|max:30',
            'erp_reg' => 'nullable|string|max:100',
            'dob' => 'nullable|date',
            'father_name' => 'required|string|max:100',
            'father_cnic' => 'nullable|string|max:30',
            'father_cell' => 'nullable|string|max:30',
            'contact_number' => 'nullable|string|max:30',
            'gender' => 'required|string|in:male,female,other,Male,Female,Other',
            'current_address' => 'nullable|string',
            'remarks' => 'nullable|string',
            'stream_type' => 'nullable|string|max:50',
            'class_id' => 'required|exists:classes,id',
            'major_id' => 'nullable|exists:majors,id',
            'section_id' => 'required|exists:sections,id',
            'academic_session_id' => 'required|exists:academic_sessions,id',
            'test_marks' => 'nullable|numeric|min:0',
            'obtained_marks' => 'nullable|numeric|min:0',
            'admission_month' => 'nullable|string|max:10',
            'monthly_fee' => $isOfficeAdmin ? 'nullable|numeric|min:0' : 'nullable|numeric|min:0',
            'pending_amount' => $isOfficeAdmin ? 'nullable|numeric|min:0' : 'nullable|numeric|min:0',
            'amount_received_at_admission' => 'nullable|numeric|min:0',
            'total_admission_payable' => 'nullable|numeric|min:0',
            'admission_balance' => 'nullable|numeric|min:0',
            'is_prospectus_sold' => 'nullable|boolean',
            'is_marks_based_discount' => 'nullable|boolean',
            'is_discretionary_discount' => 'nullable|boolean',
            'is_policy_discount' => 'nullable|boolean',
            'selected_months_tf' => 'nullable|string',
            'tuition_fee_per_policy' => 'nullable|numeric',
            'discretionary_discount_reason' => 'nullable|string',
            'discretionary_discount_amount' => 'nullable|numeric',
            'policy_discount_type' => 'nullable|string',
            'policy_discount_amount' => 'nullable|numeric',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:2048',
            'is_active' => 'boolean'
        ]);

        $data = $request->except(['image', 'fee_structure']);
        $data['gender'] = strtolower($request->input('gender', 'male'));
        $data['is_active'] = $request->boolean('is_active', true);
        if ($isOfficeAdmin) {
            unset($data['monthly_fee'], $data['pending_amount']);
        }

        if ($request->hasFile('image')) {
            if ($student->image) {
                Storage::disk('public')->delete($student->image);
            }
            $path = $request->file('image')->store('students', 'public');
            $data['image'] = $path;
        }

        // Parse fee structure if passed
        $feeStructureInput = $request->input('fee_structure');
        if (is_string($feeStructureInput)) {
            $feeStructureInput = json_decode($feeStructureInput, true) ?: [];
        }

        if (isset($feeStructureInput['tuition_fee']['payable']) && !$isOfficeAdmin) {
            $data['monthly_fee'] = (float)$feeStructureInput['tuition_fee']['payable'];
        }

        $student->update($data);

        // Update selected enrollment
        $sessionId = $request->input('academic_session_id');
        if ($sessionId) {
            $enrollment = \App\Models\StudentSessionEnrollment::firstOrCreate(
                ['student_id' => $student->id, 'academic_session_id' => $sessionId]
            );

            $newRollNumber = $enrollment->roll_number ?: $student->roll_number;
            if ($enrollment->class_id != $request->input('class_id') && !empty($request->input('class_id'))) {
                $maxRoll = \App\Models\StudentSessionEnrollment::where('academic_session_id', $sessionId)
                    ->where('class_id', $request->input('class_id'))
                    ->max(\Illuminate\Support\Facades\DB::raw('CAST(roll_number AS UNSIGNED)'));
                $newRollNumber = $maxRoll ? $maxRoll + 1 : 1;
                $student->update(['roll_number' => $newRollNumber]);
            }

            $enrollmentUpdates = [
                'class_id' => $request->input('class_id'),
                'major_id' => $request->input('major_id'),
                'section_id' => $request->input('section_id'),
                'roll_number' => $newRollNumber,
            ];
            if (!$isOfficeAdmin && $request->has('monthly_fee')) {
                $enrollmentUpdates['monthly_fee'] = $request->input('monthly_fee');
            }

            $enrollment->update($enrollmentUpdates);
        }

        // Update fee items if provided
        if (!empty($feeStructureInput) && !$isOfficeAdmin) {
            $standardHeads = \App\Models\StudentFeeItem::getStandardFeeHeads();
            foreach ($standardHeads as $key => $meta) {
                if (isset($feeStructureInput[$key])) {
                    $actual = (float)($feeStructureInput[$key]['actual'] ?? 0);
                    $discount = (float)($feeStructureInput[$key]['discount'] ?? 0);
                    $payable = max(0, $actual - $discount);

                    $item = \App\Models\StudentFeeItem::firstOrNew([
                        'student_id' => $student->id,
                        'head_key' => $key,
                    ]);

                    $item->academic_session_id = $sessionId;
                    $item->head_name = $meta['name'];
                    $item->head_type = $meta['type'];
                    $item->actual_amount = $actual;
                    $item->discount_amount = $discount;
                    $item->payable_amount = $payable;
                    $item->balance_amount = max(0, $payable - (float)$item->paid_amount);
                    $item->save();
                }
            }
        }

        if (!empty($feeStructureInput) && !$isOfficeAdmin) {
            $student->pending_amount = \App\Models\StudentFeeItem::where('student_id', $student->id)
                ->where('head_key', '!=', 'tuition_fee')
                ->sum('payable_amount');
            $student->save();
        }

        if ($isOfficeAdmin) {
            $student->makeHidden(['monthly_fee', 'pending_amount', 'total_paid']);
        }

        return response()->json($student->load(['academyClass:id,name', 'major:id,name', 'section:id,name', 'feeItems']));
    }

    /**
     * Toggle the active status of a student.
     */
    public function toggleStatus(User $student)
    {
        if ($student->role_id !== 3) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $student->is_active = !$student->is_active;
        $student->save();

        return response()->json([
            'message' => 'Student status updated successfully.',
            'is_active' => $student->is_active
        ]);
    }

    public function destroy(Request $request, User $student)
    {
        if ($request->user() && $request->user()->role_id == 5) {
            return response()->json(['message' => 'Forbidden: Office Admin does not have permission to delete students.'], 403);
        }

        if ($student->role_id !== 3) {
            return response()->json(['message' => 'User is not a student'], 400);
        }

        if ($student->image) {
            Storage::disk('public')->delete($student->image);
        }
        
        $student->delete();
        return response()->json(['message' => 'Student deleted successfully']);
    }

    /**
     * Promote multiple students to a new class.
     */
    public function promote(Request $request)
    {
        $request->validate([
            'student_ids' => 'required|array',
            'student_ids.*' => 'exists:users,id',
            'new_class_id' => 'nullable|exists:classes,id',
            'new_major_id' => 'nullable|exists:majors,id',
            'new_section_id' => 'nullable|exists:sections,id',
            'new_session_id' => 'nullable|exists:academic_sessions,id',
        ]);

        $updates = [];
        if ($request->filled('new_class_id')) {
            $updates['class_id'] = $request->new_class_id;
        }
        if ($request->filled('new_major_id')) {
            $updates['major_id'] = $request->new_major_id;
        }
        if ($request->filled('new_section_id')) {
            $updates['section_id'] = $request->new_section_id;
        }
        if ($request->filled('new_session_id')) {
            $updates['academic_session_id'] = $request->new_session_id;
        }

        if (empty($updates)) {
            return response()->json(['message' => 'Nothing to update.'], 400);
        }

        User::whereIn('id', $request->student_ids)
            ->where('role_id', 3)
            ->update($updates);

        $targetSessionId = $request->new_session_id ?? (\App\Models\AcademicSession::getActiveSession()->id ?? null);
        
        if ($targetSessionId) {
            foreach ($request->student_ids as $studentId) {
                // Determine if we need a new roll number for the target session
                $enrollmentUpdates = $updates;
                if (isset($updates['class_id'])) {
                    $maxRoll = \App\Models\StudentSessionEnrollment::where('academic_session_id', $targetSessionId)
                        ->where('class_id', $updates['class_id'])
                        ->max(\Illuminate\Support\Facades\DB::raw('CAST(roll_number AS UNSIGNED)'));
                    $enrollmentUpdates['roll_number'] = $maxRoll ? $maxRoll + 1 : 1;
                    
                    // Update user's roll_number cache
                    User::where('id', $studentId)->update(['roll_number' => $enrollmentUpdates['roll_number']]);
                }

                \App\Models\StudentSessionEnrollment::updateOrCreate(
                    ['student_id' => $studentId, 'academic_session_id' => $targetSessionId],
                    $enrollmentUpdates
                );
            }
        }

        return response()->json([
            'message' => count($request->student_ids) . ' students successfully updated!',
        ]);
    }

    /**
     * Delete multiple students (Soft Delete).
     */
    public function bulkDelete(Request $request)
    {
        if ($request->user() && $request->user()->role_id == 5) {
            return response()->json(['message' => 'Forbidden: Office Admin does not have permission to delete students.'], 403);
        }

        $request->validate([
            'student_ids' => 'required|array',
            'student_ids.*' => 'exists:users,id',
        ]);

        User::whereIn('id', $request->student_ids)
            ->where('role_id', 3)
            ->delete(); // Soft deletes thanks to trait

        return response()->json([
            'message' => count($request->student_ids) . ' students successfully deleted!',
        ]);
    }

    /**
     * Get trashed students.
     */
    public function trashed()
    {
        $students = User::onlyTrashed()
            ->where('role_id', 3)
            ->with(['academyClass', 'major'])
            ->orderBy('deleted_at', 'desc')
            ->get();
            
        return response()->json($students);
    }

    /**
     * Restore a trashed student.
     */
    public function restore($id)
    {
        $student = User::onlyTrashed()->where('role_id', 3)->findOrFail($id);
        $student->restore();

        return response()->json([
            'message' => 'Student restored successfully!',
        ]);
    }
}
