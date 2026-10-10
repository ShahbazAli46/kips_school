<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\SalarySlip;
use App\Models\SalaryPayment;
use App\Models\AdvanceSalaryRequest;
use App\Models\StaffSalaryAdjustment;
use App\Models\StaffBfSettlement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class StaffLedgerController extends Controller
{
    /**
     * Get complete financial ledger, BF accumulation, and salary adjustment history for a staff member.
     */
    public function getLedger($id, Request $request)
    {
        $staff = User::with(['designation', 'salaryAdjustments.createdBy:id,name', 'bfSettlements.settledBy:id,name'])
            ->findOrFail($id);

        if ($staff->role_id !== 2) {
            return response()->json(['message' => 'User is not a staff member'], 400);
        }

        // 1. Fetch all Salary Slips with payments
        $slips = SalarySlip::with('payments')
            ->where('teacher_id', $staff->id)
            ->orderBy('month', 'asc')
            ->get();

        // 2. Fetch all paid Advance Requests
        $advances = AdvanceSalaryRequest::where('teacher_id', $staff->id)
            ->where('status', 'paid')
            ->orderBy('created_at', 'asc')
            ->get();

        // 3. Fetch BF settlements
        $settlements = StaffBfSettlement::where('user_id', $staff->id)
            ->orderBy('settlement_date', 'asc')
            ->get();

        // 4. Calculate Summaries
        $totalEarned = (float) $slips->sum('payable_salary');
        $totalPaid = 0.0;
        foreach ($slips as $s) {
            $totalPaid += (float) $s->payments->sum('amount_paid');
        }
        $salaryBalance = $totalEarned - $totalPaid;

        $totalBfAccumulated = (float) $slips->sum('bf_deduction');
        $totalBfSettled = (float) $settlements->sum('amount');
        $netBfBalance = max(0, $totalBfAccumulated - $totalBfSettled);

        $totalAdvanceTaken = (float) $advances->sum('amount');
        $totalAdvanceDeducted = (float) $slips->sum('advance_deducted');
        $remainingAdvance = max(0, $totalAdvanceTaken - $totalAdvanceDeducted);

        // 5. Construct unified chronological transactions
        $transactions = collect();

        // Add Salary Slips as Credits (Salary earned by staff)
        foreach ($slips as $slip) {
            $date = Carbon::parse($slip->month . '-01')->endOfMonth()->format('Y-m-d');
            $gross = (float) $slip->total_amount;
            $bonus = (float) $slip->bonus;
            $leaveDed = 0.0;
            if ($slip->taken_off_days > $slip->permitted_off_days) {
                $leaveDed = round(($slip->taken_off_days - $slip->permitted_off_days) * ($gross / 30), 2);
            }
            $advanceDed = (float) $slip->advance_deducted;
            $bfDed = (float) $slip->bf_deduction;
            $net = (float) $slip->payable_salary;

            $transactions->push([
                'id' => 'slip_' . $slip->id,
                'raw_date' => $date,
                'date' => Carbon::parse($date)->format('M d, Y'),
                'type' => 'Salary Generated',
                'category' => 'salary',
                'reference' => 'Slip #' . $slip->id . ' (' . $slip->month . ')',
                'description' => "Salary for {$slip->month} (Base: Rs " . number_format($gross) . 
                    ($leaveDed > 0 ? ", Leaves Ded: -Rs " . number_format($leaveDed) : "") .
                    ($bonus > 0 ? ", Bonus: +Rs " . number_format($bonus) : "") .
                    ($advanceDed > 0 ? ", Advance Ded: -Rs " . number_format($advanceDed) : "") .
                    ($bfDed > 0 ? ", BF Ded ({$slip->bf_percentage}%): -Rs " . number_format($bfDed) : "") . ")",
                'gross_amount' => $gross,
                'credit' => $net, // Money owed to staff
                'debit' => 0,
                'bf_credit' => $bfDed, // Contributed to BF
                'bf_debit' => 0,
                'status' => $slip->payment_status,
                'timestamp' => strtotime($date . ' 12:00:00'),
            ]);

            // Add each payment made towards this slip as a Debit (Money paid to staff)
            foreach ($slip->payments as $payment) {
                $pDate = $payment->payment_date ? Carbon::parse($payment->payment_date)->format('Y-m-d') : Carbon::parse($payment->created_at)->format('Y-m-d');
                $transactions->push([
                    'id' => 'pay_' . $payment->id,
                    'raw_date' => $pDate,
                    'date' => Carbon::parse($pDate)->format('M d, Y'),
                    'type' => 'Salary Payment',
                    'category' => 'payment',
                    'reference' => 'Voucher #' . $payment->id . ' (Slip #' . $slip->id . ')',
                    'description' => "Salary payment received via {$payment->payment_method}" . ($payment->notes ? " — " . $payment->notes : ""),
                    'credit' => 0,
                    'debit' => (float) $payment->amount_paid,
                    'bf_credit' => 0,
                    'bf_debit' => 0,
                    'status' => 'completed',
                    'payment_method' => $payment->payment_method,
                    'timestamp' => strtotime($pDate . ' 15:00:00'),
                ]);
            }
        }

        // Add BF Settlements (Resignation collection / payout of BF fund)
        foreach ($settlements as $settlement) {
            $sDate = Carbon::parse($settlement->settlement_date)->format('Y-m-d');
            $transactions->push([
                'id' => 'bf_settle_' . $settlement->id,
                'raw_date' => $sDate,
                'date' => Carbon::parse($sDate)->format('M d, Y'),
                'type' => 'BF Settlement / Resignation Payout',
                'category' => 'bf_settlement',
                'reference' => 'BF Payout #' . $settlement->id,
                'description' => "Benevolent Fund disbursed to staff member upon resignation via {$settlement->payment_method}" . 
                    ($settlement->notes ? " — " . $settlement->notes : ""),
                'credit' => 0,
                'debit' => (float) $settlement->amount,
                'bf_credit' => 0,
                'bf_debit' => (float) $settlement->amount, // Payout removes from BF
                'status' => 'settled',
                'payment_method' => $settlement->payment_method,
                'timestamp' => strtotime($sDate . ' 16:00:00'),
            ]);
        }

        // Sort chronologically and calculate running balance
        $sortedTransactions = $transactions->sortBy('timestamp')->values();
        $runningSalaryBalance = 0.0;
        $runningBfBalance = 0.0;

        $processedTransactions = $sortedTransactions->map(function ($item) use (&$runningSalaryBalance, &$runningBfBalance) {
            if ($item['category'] === 'salary') {
                $runningSalaryBalance += (float) $item['credit'];
                $runningBfBalance += (float) $item['bf_credit'];
            } elseif ($item['category'] === 'payment') {
                $runningSalaryBalance -= (float) $item['debit'];
            } elseif ($item['category'] === 'bf_settlement') {
                $runningBfBalance -= (float) $item['bf_debit'];
            }

            $item['running_salary_balance'] = $runningSalaryBalance;
            $item['running_bf_balance'] = $runningBfBalance;
            return $item;
        });

        // 6. Dedicated Benevolent Fund (BF) Ledger items
        $bfLedger = collect();
        foreach ($slips->where('bf_deduction', '>', 0) as $slip) {
            $date = Carbon::parse($slip->month . '-01')->endOfMonth()->format('Y-m-d');
            $bfLedger->push([
                'id' => 'bf_slip_' . $slip->id,
                'date' => Carbon::parse($date)->format('M d, Y'),
                'type' => 'Monthly BF Deduction',
                'reference' => $slip->month,
                'base_salary' => (float) $slip->total_amount,
                'percentage' => (float) $slip->bf_percentage,
                'deduction_amount' => (float) $slip->bf_deduction,
                'payout_amount' => 0,
                'description' => "Deducted {$slip->bf_percentage}% from monthly salary ({$slip->month})",
                'timestamp' => strtotime($date . ' 12:00:00'),
            ]);
        }
        foreach ($settlements as $settlement) {
            $sDate = Carbon::parse($settlement->settlement_date)->format('Y-m-d');
            $bfLedger->push([
                'id' => 'bf_payout_' . $settlement->id,
                'date' => Carbon::parse($sDate)->format('M d, Y'),
                'type' => 'BF Resignation Collection / Payout',
                'reference' => 'Settlement #' . $settlement->id,
                'base_salary' => 0,
                'percentage' => 0,
                'deduction_amount' => 0,
                'payout_amount' => (float) $settlement->amount,
                'description' => "BF collected/settled via {$settlement->payment_method}" . ($settlement->notes ? ": " . $settlement->notes : ""),
                'timestamp' => strtotime($sDate . ' 16:00:00'),
            ]);
        }

        $sortedBfLedger = $bfLedger->sortBy('timestamp')->values();
        $runningBf = 0.0;
        $processedBfLedger = $sortedBfLedger->map(function ($item) use (&$runningBf) {
            $runningBf += $item['deduction_amount'] - $item['payout_amount'];
            $item['running_bf_balance'] = $runningBf;
            return $item;
        });

        return response()->json([
            'staff' => [
                'id' => $staff->id,
                'name' => $staff->name,
                'email' => $staff->email,
                'contact_number' => $staff->contact_number,
                'designation' => $staff->designation ? $staff->designation->name : 'Staff Member',
                'monthly_salary' => (float) ($staff->monthly_salary ?? 0),
                'bf_percentage' => (float) ($staff->bf_percentage ?? 0),
                'joining_date' => $staff->joining_date,
                'resignation_date' => $staff->resignation_date,
                'resignation_remarks' => $staff->resignation_remarks,
                'qualification' => $staff->qualification,
                'father_name' => $staff->father_name,
                'image' => $staff->image,
                'signature' => $staff->signature,
                'is_active' => (bool) $staff->is_active,
            ],
            'summary' => [
                'monthly_salary' => (float) ($staff->monthly_salary ?? 0),
                'total_salary_earned' => $totalEarned,
                'total_salary_paid' => $totalPaid,
                'salary_balance' => $salaryBalance, // Positive = Pending payable to staff
                'total_bf_accumulated' => $totalBfAccumulated,
                'total_bf_settled' => $totalBfSettled,
                'net_bf_balance' => $netBfBalance, // Ready to collect upon resignation
                'total_advance_taken' => $totalAdvanceTaken,
                'total_advance_deducted' => $totalAdvanceDeducted,
                'remaining_advance' => $remainingAdvance,
            ],
            'ledger' => $processedTransactions->values(), // Chronological: older date values first, then later
            'bf_ledger' => $processedBfLedger->values(),
            'adjustments' => $staff->salaryAdjustments()->orderBy('effective_date', 'asc')->orderBy('id', 'asc')->get(),
            'settlements' => $staff->bfSettlements()->orderBy('settlement_date', 'asc')->orderBy('id', 'asc')->get(),
        ]);
    }

    /**
     * Store salary increment or decrement for a staff member.
     */
    public function storeSalaryAdjustment($id, Request $request)
    {
        $request->validate([
            'type' => 'required|in:increment,decrement',
            'amount' => 'required|numeric|min:0.01',
            'effective_date' => 'required|date',
            'reason' => 'nullable|string|max:500',
        ]);

        $staff = User::findOrFail($id);
        if ($staff->role_id !== 2) {
            return response()->json(['message' => 'User is not a staff member'], 400);
        }

        $previousSalary = (float) ($staff->monthly_salary ?? 0);
        $amount = (float) $request->amount;
        $type = $request->type;

        $newSalary = $type === 'increment' 
            ? $previousSalary + $amount 
            : max(0, $previousSalary - $amount);

        DB::beginTransaction();
        try {
            $adjustment = StaffSalaryAdjustment::create([
                'user_id' => $staff->id,
                'type' => $type,
                'amount' => $amount,
                'previous_salary' => $previousSalary,
                'new_salary' => $newSalary,
                'effective_date' => $request->effective_date,
                'reason' => $request->reason,
                'created_by' => auth()->id(),
            ]);

            $staff->monthly_salary = $newSalary;
            $staff->save();

            DB::commit();

            return response()->json([
                'message' => 'Salary ' . ($type === 'increment' ? 'increment' : 'decrement') . ' recorded successfully!',
                'adjustment' => $adjustment,
                'new_monthly_salary' => $newSalary,
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to record salary adjustment: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Get all salary adjustments history for staff member.
     */
    public function getSalaryAdjustments($id)
    {
        $staff = User::findOrFail($id);
        $adjustments = StaffSalaryAdjustment::with('createdBy:id,name')
            ->where('user_id', $staff->id)
            ->orderBy('effective_date', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        return response()->json($adjustments);
    }

    /**
     * Store Benevolent Fund (BF) Settlement / Resignation collection.
     */
    public function storeBfSettlement($id, Request $request)
    {
        $request->validate([
            'amount' => 'required|numeric|min:1',
            'settlement_date' => 'required|date',
            'payment_method' => 'required|string|max:50',
            'notes' => 'nullable|string|max:500',
            'is_resignation' => 'nullable|boolean',
            'mark_as_resigned' => 'nullable|boolean',
        ]);

        $staff = User::findOrFail($id);
        if ($staff->role_id !== 2) {
            return response()->json(['message' => 'User is not a staff member'], 400);
        }

        // Calculate current BF balance
        $totalBfAccumulated = (float) SalarySlip::where('teacher_id', $staff->id)->sum('bf_deduction');
        $totalBfSettled = (float) StaffBfSettlement::where('user_id', $staff->id)->sum('amount');
        $availableBf = max(0, $totalBfAccumulated - $totalBfSettled);

        $amount = (float) $request->amount;
        if ($amount > $availableBf) {
            return response()->json([
                'message' => "Settlement amount (Rs " . number_format($amount) . ") exceeds available BF pool (Rs " . number_format($availableBf) . ")."
            ], 422);
        }

        DB::beginTransaction();
        try {
            $settlement = StaffBfSettlement::create([
                'user_id' => $staff->id,
                'amount' => $amount,
                'settlement_date' => $request->settlement_date,
                'payment_method' => $request->payment_method,
                'notes' => $request->notes,
                'is_resignation' => $request->boolean('is_resignation', true),
                'settled_by' => auth()->id(),
            ]);

            if ($request->boolean('mark_as_resigned')) {
                $staff->is_active = false;
                $staff->resignation_date = $request->settlement_date;
                $staff->resignation_remarks = $request->notes;
                $staff->save();
            }

            DB::commit();

            return response()->json([
                'message' => 'Benevolent Fund (BF) settlement recorded successfully!',
                'settlement' => $settlement,
                'remaining_bf_balance' => max(0, $availableBf - $amount),
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to record BF settlement: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Delete / revert a salary adjustment.
     */
    public function deleteSalaryAdjustment($id, $adjustmentId)
    {
        $adjustment = StaffSalaryAdjustment::where('user_id', $id)->findOrFail($adjustmentId);
        $staff = User::findOrFail($id);

        // Revert monthly salary to previous_salary
        $staff->monthly_salary = $adjustment->previous_salary;
        $staff->save();

        $adjustment->delete();

        return response()->json(['message' => 'Salary adjustment deleted and previous salary restored.', 'current_salary' => $staff->monthly_salary]);
    }

    /**
     * Delete / revert a BF settlement.
     */
    public function deleteBfSettlement($id, $settlementId)
    {
        $settlement = StaffBfSettlement::where('user_id', $id)->findOrFail($settlementId);
        $settlement->delete();

        return response()->json(['message' => 'BF settlement deleted successfully.']);
    }
}
