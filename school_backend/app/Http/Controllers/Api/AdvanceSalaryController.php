<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdvanceSalaryRequest;
use App\Models\SalarySlip;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdvanceSalaryController extends Controller
{
    /**
     * Teacher: Get my advance salary requests & current balance summary
     */
    public function myRequests(Request $request)
    {
        $teacher = auth()->user();

        // Calculate real-time cumulative balance from all slips
        $allSlips = SalarySlip::where('teacher_id', $teacher->id)->get();
        $cumulativeNet = 0;
        $cumulativePaid = 0;
        foreach ($allSlips as $s) {
            $extraOffs = max(0, $s->taken_off_days - $s->permitted_off_days);
            $dailyRate = $s->total_amount / 30;
            $deduction = $extraOffs * $dailyRate;
            $monthlyNet = max(0, (float)$s->total_amount - $deduction) + (float)$s->bonus - (float)$s->advance_deducted;
            
            $cumulativeNet += $monthlyNet;
            $cumulativePaid += (float)$s->total_paid;
        }
        $balance = $cumulativeNet - $cumulativePaid;
        $advanceBalance = $balance < 0 ? abs($balance) : (float)($teacher->advance_balance ?? 0);
        $arrearsBalance = $balance > 0 ? $balance : 0;

        $month = $request->query('month'); // e.g. "2026-08" or "all" or null

        $query = AdvanceSalaryRequest::where('teacher_id', $teacher->id);

        if ($month && $month !== 'all') {
            $query->where('deduction_month', $month);
        }

        $requests = $query->orderBy('created_at', 'desc')->get();

        // Month-specific stats
        $activeMonth = ($month && $month !== 'all') ? $month : now()->format('Y-m');

        $monthAdvanceDeducted = (float) AdvanceSalaryRequest::where('teacher_id', $teacher->id)
            ->where('deduction_month', $activeMonth)
            ->where('status', 'paid')
            ->sum('amount');

        $monthPending = (float) AdvanceSalaryRequest::where('teacher_id', $teacher->id)
            ->where('deduction_month', $activeMonth)
            ->where('status', 'pending')
            ->sum('amount');

        // List of months whose salary is already paid
        $paidMonths = SalarySlip::where('teacher_id', $teacher->id)
            ->where('payment_status', 'paid')
            ->pluck('month')
            ->toArray();

        return response()->json([
            'month'                  => $month ?: $activeMonth,
            'advance_balance'        => $advanceBalance,
            'arrears_balance'        => $arrearsBalance,
            'month_advance_deducted' => $monthAdvanceDeducted,
            'month_pending'          => $monthPending,
            'paid_months'            => $paidMonths,
            'requests'               => $requests
        ]);
    }

    /**
     * Teacher: Submit a new advance salary request
     */
    public function store(Request $request)
    {
        $request->validate([
            'amount'          => 'required|numeric|min:100',
            'reason'          => 'required|string|min:5|max:1000',
            'deduction_month' => 'nullable|string|size:7', // YYYY-MM
        ]);

        $teacherId = auth()->id();

        // Check if there is already a pending request
        $hasPending = AdvanceSalaryRequest::where('teacher_id', $teacherId)
            ->where('status', 'pending')
            ->exists();

        if ($hasPending) {
            return response()->json([
                'message' => 'You already have a pending advance request. Please wait for admin review.'
            ], 422);
        }

        $deductionMonth = $request->deduction_month ?: date('Y-m');

        // Check if the requested month's salary is already fully paid
        $slipForMonth = SalarySlip::where('teacher_id', $teacherId)
            ->where('month', $deductionMonth)
            ->first();

        if ($slipForMonth && $slipForMonth->payment_status === 'paid') {
            return response()->json([
                'message' => 'Salary for ' . $deductionMonth . ' is already paid. You cannot request an advance for a completed month.'
            ], 422);
        }

        $advance = AdvanceSalaryRequest::create([
            'teacher_id'      => $teacherId,
            'amount'          => $request->amount,
            'reason'          => $request->reason,
            'deduction_month' => $deductionMonth,
            'status'          => 'pending',
        ]);

        try {
            $teacher = auth()->user();
            app(\App\Services\FcmService::class)->sendToRole(
                1,
                'New Advance Salary Request',
                "{$teacher->name} requested Rs " . number_format($advance->amount) . " advance salary.",
                ['advance_id' => (string)$advance->id],
                'salaries_channel'
            );
        } catch (\Throwable $e) {
            // Push notification error should not block request submission
        }

        return response()->json([
            'message' => 'Advance salary request submitted successfully.',
            'request' => $advance
        ], 201);
    }

    /**
     * Admin: List all advance salary requests
     */
    public function index(Request $request)
    {
        $query = AdvanceSalaryRequest::with([
            'teacher:id,name,contact_number,monthly_salary,advance_balance',
            'actionBy:id,name'
        ])->orderBy('created_at', 'desc');

        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->has('month') && !empty($request->month)) {
            $query->where('deduction_month', $request->month);
        }

        return response()->json($query->get());
    }

    /**
     * Admin: Update status (Approve, Disburse/Pay, Reject)
     */
    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status'          => 'required|string|in:pending,approved,paid,rejected',
            'admin_notes'     => 'nullable|string|max:1000',
            'payment_method'  => 'nullable|string|max:50',
        ]);

        $advance = AdvanceSalaryRequest::findOrFail($id);

        DB::beginTransaction();
        try {
            $advance->status = $request->status;
            $advance->admin_notes = $request->admin_notes;
            $advance->action_by = auth()->id();

            if ($request->status === 'paid') {
                $advance->paid_at = now();
                $advance->payment_method = $request->payment_method ?: 'Cash';
            }

            $advance->save();

            if ($request->status === 'paid') {
                // Add to teacher's advance balance
                $teacher = User::find($advance->teacher_id);
                if ($teacher) {
                    $teacher->advance_balance += (float)$advance->amount;
                    $teacher->save();
                }

                // Sync advances to the teacher's salary slip for this specific deduction month
                $targetMonth = $advance->deduction_month ?: now()->format('Y-m');
                $slip = SalarySlip::where('teacher_id', $advance->teacher_id)
                    ->where('month', $targetMonth)
                    ->first();

                if ($slip) {
                    $monthAdvances = (float) AdvanceSalaryRequest::where('teacher_id', $advance->teacher_id)
                        ->where('deduction_month', $targetMonth)
                        ->where('status', 'paid')
                        ->sum('amount');

                    $slip->advance_deducted = $monthAdvances;
                    
                    $extraOffDays = max(0, $slip->taken_off_days - $slip->permitted_off_days);
                    $dailyRate = $slip->total_amount / 30;
                    $deduction = $extraOffDays * $dailyRate;
                    $slip->payable_salary = max(0, (float)$slip->total_amount - $deduction) + (float)$slip->bonus + (float)$slip->previous_arrears - (float)$slip->advance_deducted;
                    
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

            DB::commit();

            try {
                $statusFormatted = ucfirst($advance->status);
                app(\App\Services\FcmService::class)->sendToUser(
                    $advance->teacher_id,
                    "Advance Salary {$statusFormatted}",
                    "Your advance salary request for Rs " . number_format($advance->amount) . " has been {$advance->status}.",
                    [
                        'advance_id' => (string)$advance->id,
                        'status' => $advance->status
                    ],
                    'salaries_channel',
                    'teacher_advance_salary'
                );
            } catch (\Throwable $e) {
                // Ignore push failures
            }

            return response()->json([
                'message' => 'Advance request updated successfully.',
                'request' => $advance
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error updating request: ' . $e->getMessage()], 500);
        }
    }
}
