<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\TeacherAssignment;
use App\Models\StudentSubjectEnrollment;
use App\Models\FeePayment;
use App\Models\SalarySlip;
use App\Models\SalarySlipItem;
use App\Models\SalaryPayment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SalaryController extends Controller
{
    /**
     * Get all generated salary slips for a given month
     */
    public function index(Request $request)
    {
        $month = $request->query('month', date('Y-m'));

        $slips = SalarySlip::with(['teacher:id,name', 'items.subject:id,name', 'items.academyClass:id,name', 'items.major:id,name', 'items.section:id,name', 'items.student:id,name,class_id,section_id', 'items.student.academyClass:id,name', 'items.student.section:id,name', 'payments'])
            ->where('month', $month)
            ->get();

        foreach ($slips as $slip) {
            // Re-sync total_paid and payment_status from actual payments in database
            $actualPaid = (float) $slip->payments->sum('amount_paid');
            if (abs((float)$slip->total_paid - $actualPaid) > 0.005) {
                $slip->total_paid = $actualPaid;
                if ($actualPaid <= 0) {
                    $slip->payment_status = 'unpaid';
                } elseif ($actualPaid < (float)$slip->payable_salary) {
                    $slip->payment_status = 'partial';
                } else {
                    $slip->payment_status = 'paid';
                }
                $slip->save();
            }

            if ($slip->teacher) {
                $allSlips = SalarySlip::with('payments')->where('teacher_id', $slip->teacher_id)->get();
                $cumulativeNet = 0;
                $cumulativePaid = 0;
                foreach ($allSlips as $s) {
                    $extraOffs = max(0, $s->taken_off_days - $s->permitted_off_days);
                    $dailyRate = $s->total_amount / 30;
                    $deduction = $extraOffs * $dailyRate;
                    $monthlyNet = max(0, (float)$s->total_amount - $deduction - (float)$s->bf_deduction) + (float)$s->bonus - (float)$s->advance_deducted;
                    
                    $cumulativeNet += $monthlyNet;
                    $cumulativePaid += (float)$s->payments->sum('amount_paid');
                }
                $balance = $cumulativeNet - $cumulativePaid;
                $slip->teacher->advance_balance = $balance < 0 ? abs($balance) : 0;
                $slip->teacher->arrears_balance = $balance > 0 ? $balance : 0;
            }
        }

        return response()->json($slips);
    }

    /**
     * Get a specific salary slip
     */
    public function show($id)
    {
        $slip = SalarySlip::with(['teacher:id,name', 'items.subject:id,name', 'items.academyClass:id,name', 'items.major:id,name', 'items.section:id,name', 'items.student:id,name,class_id,section_id', 'items.student.academyClass:id,name', 'items.student.section:id,name', 'payments'])
            ->findOrFail($id);

        $this->syncSlipAdvances($slip);

        return response()->json($slip);
    }

    /**
     * Generate or Regenerate salary slips for a specific month
     */
    public function generate(Request $request)
    {
        $request->validate([
            'month' => 'required|string|size:7' // YYYY-MM
        ]);

        $month = $request->month;

        // Find all teachers
        $teachers = User::where('role_id', 2)->where('is_active', true)->get();

        DB::beginTransaction();
        try {
            // Get existing slips for this month to update them instead of deleting
            $existingSlips = SalarySlip::with('payments')->where('month', $month)->get()->keyBy('teacher_id');
            $processedTeacherIds = [];

            // Pre-fetch all tuition fee payments for the month, summing tuition fee payments per student
            $feePayments = \App\Models\FeePaymentItem::where('fee_payment_items.month', $month)
                ->where('fee_payment_items.head_key', 'tuition_fee')
                ->join('fee_payments', 'fee_payments.id', '=', 'fee_payment_items.fee_payment_id')
                ->selectRaw('fee_payments.student_id, SUM(fee_payment_items.amount_paid) as total_paid')
                ->groupBy('fee_payments.student_id')
                ->pluck('total_paid', 'student_id');

            // For any legacy payments without fee_payment_items
            $legacyPayments = FeePayment::where('month', $month)
                ->whereDoesntHave('items')
                ->whereDoesntHave('studentExtraCharge')
                ->selectRaw('student_id, SUM(amount_paid) as total_paid')
                ->groupBy('student_id')
                ->pluck('total_paid', 'student_id');

            foreach ($legacyPayments as $stId => $amt) {
                $feePayments[$stId] = (float)($feePayments[$stId] ?? 0) + (float)$amt;
            }

            // Find effective enrollments for all students for this month
            // Since we carry forward, we need the LATEST enrollment per student per subject <= month
            $rawEnrollments = DB::select("
                WITH RankedEnrollments AS (
                    SELECT 
                        sse.id, sse.student_id, sse.subject_id, sse.percentage, sse.month, sse.is_active,
                        u.class_id, u.major_id, u.section_id,
                        ROW_NUMBER() OVER(PARTITION BY sse.student_id, sse.subject_id ORDER BY sse.month DESC) as rn
                    FROM student_subject_enrollments sse
                    JOIN users u ON sse.student_id = u.id
                    WHERE sse.month <= ? 
                      AND u.deleted_at IS NULL 
                      AND u.is_active = 1
                )
                SELECT * FROM RankedEnrollments WHERE rn = 1 AND is_active = 1
            ", [$month]);

            $activeEnrollments = collect($rawEnrollments);

            // Group enrollments by student to know how many active subjects they have
            $studentActiveSubjectCount = $activeEnrollments->groupBy('student_id')->map(function($enrollments) {
                return $enrollments->count();
            });

            $includePreviousArrears = $request->has('include_previous_arrears') 
                ? filter_var($request->include_previous_arrears, FILTER_VALIDATE_BOOLEAN) 
                : true;
            $defaultBfPercentage = $request->filled('bf_percentage')
                ? (float) $request->bf_percentage
                : null;

            $startOfMonth = \Carbon\Carbon::parse($month . '-01')->startOfMonth();
            $endOfMonth = \Carbon\Carbon::parse($month . '-01')->endOfMonth();

            $approvedLeaves = \App\Models\TeacherLeave::where('status', 'approved')
                ->where(function($query) use ($startOfMonth, $endOfMonth) {
                    $query->whereBetween('start_date', [$startOfMonth, $endOfMonth])
                          ->orWhereBetween('end_date', [$startOfMonth, $endOfMonth])
                          ->orWhere(function($q) use ($startOfMonth, $endOfMonth) {
                              $q->where('start_date', '<', $startOfMonth)
                                ->where('end_date', '>', $endOfMonth);
                          });
                })->get();

            $teacherApprovedLeaveDays = [];
            foreach ($approvedLeaves as $leave) {
                $leaveStart = \Carbon\Carbon::parse($leave->start_date);
                $leaveEnd = \Carbon\Carbon::parse($leave->end_date);
                
                $overlapStart = $leaveStart->max($startOfMonth);
                $overlapEnd = $leaveEnd->min($endOfMonth);
                
                if ($overlapStart->lte($overlapEnd)) {
                    $days = $overlapStart->diffInDays($overlapEnd) + 1;
                    $teacherId = $leave->teacher_id;
                    if (!isset($teacherApprovedLeaveDays[$teacherId])) {
                        $teacherApprovedLeaveDays[$teacherId] = 0;
                    }
                    $teacherApprovedLeaveDays[$teacherId] += $days;
                }
            }

            foreach ($teachers as $teacher) {
                // Check if teacher joined after the requested month
                $teacherJoinMonth = $teacher->joining_date 
                    ? substr($teacher->joining_date, 0, 7) 
                    : ($teacher->created_at ? $teacher->created_at->format('Y-m') : null);

                if ($teacherJoinMonth && $month < $teacherJoinMonth) {
                    // Do not generate salary slip for months prior to joining!
                    continue;
                }

                // Get teacher's assignments
                $assignments = TeacherAssignment::where('teacher_id', $teacher->id)->get();
                
                $slipItems = [];
                $totalAmount = 0;

                // If teacher has a flat monthly salary (no subject assignments needed)
                if ($teacher->monthly_salary && (float)$teacher->monthly_salary > 0) {
                    $slipItems[] = [
                        'subject_id'                    => null,
                        'class_id'                      => null,
                        'major_id'                      => null,
                        'section_id'                    => null,
                        'payment_type'                  => 'fixed',
                        'fixed_amount'                  => (float)$teacher->monthly_salary,
                        'student_id'                    => null,
                        'student_fee_paid'              => null,
                        'student_active_subjects_count' => null,
                        'subject_share'                 => null,
                        'percentage'                    => null,
                        'teacher_cut'                   => (float)$teacher->monthly_salary,
                    ];
                    $totalAmount += (float)$teacher->monthly_salary;
                }

                // Process assignment-based earnings (fixed per assignment or percentage of student fees)
                foreach ($assignments as $assignment) {
                    if ($assignment->payment_type === 'fixed') {
                        $slipItems[] = [
                            'subject_id' => $assignment->subject_id,
                            'class_id' => $assignment->class_id,
                            'major_id' => $assignment->major_id,
                            'section_id' => $assignment->section_id,
                            'payment_type' => 'fixed',
                            'fixed_amount' => $assignment->fixed_amount,
                            'student_id' => null,
                            'student_fee_paid' => null,
                            'student_active_subjects_count' => null,
                            'subject_share' => null,
                            'percentage' => null,
                            'teacher_cut' => $assignment->fixed_amount,
                        ];
                        $totalAmount += $assignment->fixed_amount;
                    } else {
                        // Percentage based
                        // Find all students enrolled matching this assignment
                        $teacherEnrollments = $activeEnrollments
                            ->where('subject_id', $assignment->subject_id)
                            ->filter(function($enrollment) use ($assignment) {
                                $matchClass = !$assignment->class_id || $enrollment->class_id == $assignment->class_id;
                                $matchMajor = !$assignment->major_id || $enrollment->major_id == $assignment->major_id;
                                $matchSection = !$assignment->section_id || $enrollment->section_id == $assignment->section_id;
                                return $matchClass && $matchMajor && $matchSection;
                            });

                        foreach ($teacherEnrollments as $enrollment) {
                            $studentId = $enrollment->student_id;
                            // Use the pre-aggregated total (all installments summed)
                            $feePaid = (float)($feePayments->get($studentId) ?? 0);
                            $activeCount = $studentActiveSubjectCount->get($studentId, 1);
                            
                            $subjectShare = $activeCount > 0 ? ($feePaid / $activeCount) : 0;
                            $percentage = (float)$enrollment->percentage;
                            
                            $teacherCut = $subjectShare * ($percentage / 100);

                            $slipItems[] = [
                                'subject_id' => $assignment->subject_id,
                                'class_id' => $assignment->class_id,
                                'major_id' => $assignment->major_id,
                                'section_id' => $assignment->section_id,
                                'payment_type' => 'percentage',
                                'fixed_amount' => null,
                                'student_id' => $studentId,
                                'student_fee_paid' => $feePaid, // total of all installments for the month
                                'student_active_subjects_count' => $activeCount,
                                'subject_share' => $subjectShare,
                                'percentage' => $percentage,
                                'teacher_cut' => $teacherCut,
                            ];
                            $totalAmount += $teacherCut;
                        }
                    }
                }

                // Skip teachers with no earnings at all (no monthly salary and no assignments)
                if (count($slipItems) === 0) continue;


                    $previousBalance = 0;
                    if ($includePreviousArrears) {
                        $previousSlips = SalarySlip::where('teacher_id', $teacher->id)->where('month', '<', $month)->get();
                        $cumulativeNet = 0;
                        $cumulativePaid = 0;
                        foreach ($previousSlips as $s) {
                            $extraOffs = max(0, $s->taken_off_days - $s->permitted_off_days);
                            $dailyRate = $s->total_amount / 30;
                            $deduction = $extraOffs * $dailyRate;
                            $monthlyNet = max(0, (float)$s->total_amount - $deduction - (float)$s->bf_deduction) + (float)$s->bonus - (float)$s->advance_deducted;
                            
                            $cumulativeNet += $monthlyNet;
                            $cumulativePaid += (float)$s->total_paid;
                        }
                        $previousBalance = $cumulativeNet - $cumulativePaid;
                    }

                    $arrears = 0;
                    $advanceDeducted = 0;
                    $payableSalary = $totalAmount;

                    if ($previousBalance > 0) {
                        $arrears = $previousBalance;
                        $payableSalary += $arrears;
                    } elseif ($previousBalance < 0) {
                        $advance = abs($previousBalance);
                        $advanceDeducted = min($totalAmount, $advance);
                        $payableSalary -= $advanceDeducted;
                    }

                    // Include approved/paid advance requests scheduled specifically for this deduction month
                    $explicitAdvances = (float) \App\Models\AdvanceSalaryRequest::where('teacher_id', $teacher->id)
                        ->where('deduction_month', $month)
                        ->where('status', 'paid')
                        ->sum('amount');

                    $advanceDeducted += $explicitAdvances;
                    $payableSalary = max(0, $payableSalary - $explicitAdvances);

                    $existingSlip = $existingSlips->get($teacher->id);
                    
                    if ($existingSlip) {
                        $effectiveBfPercentage = $defaultBfPercentage !== null
                            ? $defaultBfPercentage
                            : (float)($existingSlip->bf_percentage ?? $teacher->bf_percentage ?? 0);
                        $bfDeduction = round(($totalAmount * $effectiveBfPercentage) / 100, 2);
                        
                        $extraOffs = max(0, $existingSlip->taken_off_days - $existingSlip->permitted_off_days);
                        $dailyRate = $totalAmount / 30;
                        $deduction = $extraOffs * $dailyRate;
                        
                        $payableSalary = max(0, $payableSalary - $bfDeduction - $deduction) + (float)$existingSlip->bonus;

                        // Ensure we don't overwrite total_paid
                        $totalPaid = (float)($existingSlip->total_paid ?? 0);
                        $paymentStatus = 'unpaid';
                        if ($totalPaid > 0 && $totalPaid < $payableSalary) {
                            $paymentStatus = 'partial';
                        } elseif ($totalPaid >= $payableSalary) {
                            $paymentStatus = 'paid';
                        }

                        $existingSlip->update([
                            'total_amount' => $totalAmount,
                            'previous_arrears' => $arrears,
                            'advance_deducted' => $advanceDeducted,
                            'bf_percentage' => $effectiveBfPercentage,
                            'bf_deduction' => $bfDeduction,
                            'payable_salary' => $payableSalary,
                            'payment_status' => $paymentStatus,
                            // we do not touch status, bonus, taken_off_days etc.
                        ]);
                        $slipId = $existingSlip->id;
                        
                        // Delete old items so we can insert fresh ones
                        SalarySlipItem::where('salary_slip_id', $slipId)->delete();
                    } else {
                        $teacherBfPercentage = $defaultBfPercentage !== null
                            ? $defaultBfPercentage
                            : (float)($teacher->bf_percentage ?? 0);
                        $bfDeduction = round(($totalAmount * $teacherBfPercentage) / 100, 2);

                        $approvedOffDays = $teacherApprovedLeaveDays[$teacher->id] ?? 0;
                        $dailyRate = $totalAmount / 30;
                        $deduction = $approvedOffDays * $dailyRate;
                        
                        $finalPayable = max(0, $payableSalary - $deduction - $bfDeduction);
                        
                        $slip = SalarySlip::create([
                            'teacher_id' => $teacher->id,
                            'month' => $month,
                            'total_amount' => $totalAmount,
                            'attendance_percentage' => max(0, 100 - ($approvedOffDays * (100 / 30))),
                            'bonus' => 0,
                            'previous_arrears' => $arrears,
                            'advance_deducted' => $advanceDeducted,
                            'bf_percentage' => $teacherBfPercentage,
                            'bf_deduction' => $bfDeduction,
                            'payable_salary' => $finalPayable,
                            'total_paid' => 0,
                            'payment_status' => 'unpaid',
                            'status' => 'final',
                            'taken_off_days' => $approvedOffDays,
                            'permitted_off_days' => 0,
                        ]);
                        $slipId = $slip->id;
                    }

                    // Attach slip_id to items
                    $slipItems = array_map(function($item) use ($slipId) {
                        $item['salary_slip_id'] = $slipId;
                        $item['created_at'] = now();
                        $item['updated_at'] = now();
                        return $item;
                    }, $slipItems);

                    SalarySlipItem::insert($slipItems);
                    $processedTeacherIds[] = $teacher->id;
            }

            // Cleanup any slips that were not processed this run, but only if they have no payments
            foreach ($existingSlips as $tId => $slip) {
                if (!in_array($tId, $processedTeacherIds) && ($slip->status === 'draft' || $slip->status === 'final')) {
                    if ($slip->payments->isEmpty()) {
                        $slip->delete();
                    } else {
                        // They have payments but no assignments generated. Zero out the amount.
                        $slip->update([
                            'total_amount' => 0,
                            'payable_salary' => 0 + $slip->previous_arrears - $slip->advance_deducted,
                        ]);
                        SalarySlipItem::where('salary_slip_id', $slip->id)->delete();
                    }
                }
            }

            // Reset needs_recalculation for all slips of this month — they are now fresh
            \App\Models\SalarySlip::where('month', $month)
                ->update(['needs_recalculation' => false]);

            DB::commit();

            return response()->json(['message' => 'Salaries generated successfully!']);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error generating salaries: ' . $e->getMessage()], 500);
        }
    }

    public function emailSlip($id)
    {
        $slip = SalarySlip::with(['teacher', 'items.subject', 'items.academyClass', 'items.major', 'items.section', 'items.student.academyClass', 'items.student.section', 'payments'])
            ->findOrFail($id);

        if (!$slip->teacher->email) {
            return response()->json(['message' => 'Teacher has no email address'], 400);
        }

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('emails.salary-slip-pdf', [
            'slip' => $slip
        ]);

        \Illuminate\Support\Facades\Mail::to($slip->teacher->email)->send(new \App\Mail\SalarySlipMail($slip, $pdf->output()));

        return response()->json(['message' => 'Salary slip emailed successfully']);
    }

    /**
     * Update salary slip (Adjust attendance and bonus)
     */
    public function update(Request $request, $id)
    {
        $request->validate([
            'permitted_off_days' => 'required|integer|min:0',
            'taken_off_days' => 'required|integer|min:0',
            'bonus' => 'required|numeric|min:0',
            'bf_percentage' => 'nullable|numeric|min:0|max:100',
            'status' => 'nullable|string|in:draft,final,approved',
        ]);

        $slip = SalarySlip::findOrFail($id);
        
        $slip->permitted_off_days = $request->permitted_off_days;
        $slip->taken_off_days = $request->taken_off_days;
        $slip->bonus = $request->bonus;

        if ($request->has('bf_percentage')) {
            $slip->bf_percentage = (float) $request->bf_percentage;
            $slip->bf_deduction = round(((float)$slip->total_amount * $slip->bf_percentage) / 100, 2);
        }
        
        // Calculate deduction based on 30-day month
        $extraOffDays = max(0, $request->taken_off_days - $request->permitted_off_days);
        $dailyRate = $slip->total_amount / 30;
        $deduction = $extraOffDays * $dailyRate;
        $bfDeduction = (float) ($slip->bf_deduction ?? 0);
        $slip->payable_salary = max(0, $slip->total_amount - $deduction - $bfDeduction) + $request->bonus + $slip->previous_arrears - $slip->advance_deducted;
        
        // Calculate attendance percentage for reference (max 100, min 0)
        $slip->attendance_percentage = max(0, 100 - ($extraOffDays * (100 / 30)));
        
        if ($request->has('status')) {
            $slip->status = $request->status;
        }

        $totalPaid = (float)($slip->total_paid ?? 0);
        if ($totalPaid <= 0) {
            $slip->payment_status = 'unpaid';
        } elseif ($totalPaid < $slip->payable_salary) {
            $slip->payment_status = 'partial';
        } else {
            $slip->payment_status = 'paid';
        }

        $slip->save();

        return response()->json(['message' => 'Salary adjusted successfully', 'slip' => $slip]);
    }

    /**
     * Add a payment installment to the salary slip
     */
    public function addPayment(Request $request, $id)
    {
        $request->validate([
            'amount_paid' => 'required|numeric|min:1',
            'payment_date' => 'required|date',
            'payment_method' => 'required|string',
            'notes' => 'nullable|string',
        ]);

        $slip = SalarySlip::findOrFail($id);

        $payment = SalaryPayment::create([
            'salary_slip_id' => $slip->id,
            'amount_paid' => $request->amount_paid,
            'payment_date' => $request->payment_date,
            'payment_method' => $request->payment_method,
            'notes' => $request->notes,
            'created_by' => auth()->id(),
        ]);

        $oldTotalPaid = $slip->total_paid;
        $oldExcess = max(0, $oldTotalPaid - $slip->payable_salary);
        
        $newTotalPaid = $slip->payments()->sum('amount_paid');
        $slip->total_paid = $newTotalPaid;

        $newExcess = max(0, $newTotalPaid - $slip->payable_salary);
        $advanceToAdd = $newExcess - $oldExcess;

        if ($advanceToAdd > 0) {
            $teacher = $slip->teacher;
            $teacher->advance_balance += $advanceToAdd;
            $teacher->save();
        }

        if ($newTotalPaid >= $slip->payable_salary) {
            $slip->payment_status = 'paid';
        } elseif ($newTotalPaid > 0) {
            $slip->payment_status = 'partial';
        } else {
            $slip->payment_status = 'unpaid';
        }

        $slip->save();

        try {
            app(\App\Services\FcmService::class)->sendToUser(
                $slip->teacher_id,
                "Salary Payment Received",
                "A salary payment of Rs " . number_format($payment->amount_paid) . " for {$slip->month} has been recorded.",
                [
                    'slip_id' => (string)$slip->id,
                    'amount_paid' => (string)$payment->amount_paid,
                    'payment_status' => $slip->payment_status,
                ],
                'salaries_channel',
                'teacher_salary_detail',
                (string)$slip->id
            );
        } catch (\Throwable $e) {
            // Ignore push failure
        }

        return response()->json(['message' => 'Payment recorded successfully', 'slip' => $slip, 'payment' => $payment]);
    }

    /**
     * Get salary slips for the authenticated teacher
     */
    public function getTeacherSlips(Request $request)
    {
        $teacherId = auth()->id();
        
        $slips = SalarySlip::where('teacher_id', $teacherId)
            ->orderBy('month', 'desc')
            ->get([
                'id',
                'teacher_id',
                'month',
                'total_amount',
                'attendance_percentage',
                'permitted_off_days',
                'taken_off_days',
                'bonus',
                'previous_arrears',
                'advance_deducted',
                'payable_salary',
                'total_paid',
                'payment_status',
                'status',
                'created_at'
            ]);

        return response()->json($slips);
    }

    /**
     * Get detailed salary slip for the authenticated teacher
     */
    public function getTeacherSlipDetail($id)
    {
        $teacherId = auth()->id();
        
        $slip = SalarySlip::with([
            'teacher:id,name,email,qualification',
            'items.subject:id,name',
            'items.academyClass:id,name',
            'items.major:id,name',
            'items.section:id,name',
            'items.student:id,name,class_id,section_id',
            'items.student.academyClass:id,name',
            'items.student.section:id,name',
            'payments'
        ])
        ->where('teacher_id', $teacherId)
        ->findOrFail($id);

        $this->syncSlipAdvances($slip);

        return response()->json($slip);
    }

    protected function syncSlipAdvances(SalarySlip $slip)
    {
        $monthAdvances = (float) \App\Models\AdvanceSalaryRequest::where('teacher_id', $slip->teacher_id)
            ->where('deduction_month', $slip->month)
            ->where('status', 'paid')
            ->sum('amount');

        if (abs((float)$slip->advance_deducted - $monthAdvances) > 0.005) {
            $slip->advance_deducted = $monthAdvances;
            $extraOffDays = max(0, $slip->taken_off_days - $slip->permitted_off_days);
            $dailyRate = $slip->total_amount / 30;
            $deduction = $extraOffDays * $dailyRate;
            $bfDeduction = (float) ($slip->bf_deduction ?? 0);
            $slip->payable_salary = max(0, (float)$slip->total_amount - $deduction - $bfDeduction) + (float)$slip->bonus + (float)$slip->previous_arrears - (float)$slip->advance_deducted;
            
            $totalPaid = (float)($slip->total_paid ?? 0);
            if ($totalPaid <= 0) {
                $slip->payment_status = 'unpaid';
            } elseif ($totalPaid < $slip->payable_salary) {
                $slip->payment_status = 'partial';
            } else {
                $slip->payment_status = 'paid';
            }
            $slip->save();
        }
    }
}
