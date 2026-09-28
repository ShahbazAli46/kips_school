<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class LedgerController extends Controller
{
    public function index(Request $request)
    {
        $startDate = null;
        $endDate = null;

        if ($request->filled('month_year')) {
            $parts = explode('-', $request->month_year);
            if (count($parts) === 2) {
                $startDate = Carbon::createFromDate($parts[0], $parts[1], 1)->startOfMonth();
                $endDate = $startDate->copy()->endOfMonth();
            }
        }

        $transactions = collect();

        // 1. Fee Payments (Credits)
        $feesQuery = DB::table('fee_payments')
            ->join('users as students', 'fee_payments.student_id', '=', 'students.id')
            ->leftJoin('users as receivers', 'fee_payments.received_by', '=', 'receivers.id')
            ->select(
                'fee_payments.id',
                'fee_payments.payment_date as date',
                'fee_payments.amount_paid as amount',
                'students.name as party_name',
                'receivers.name as recorded_by',
                'fee_payments.month as description_note'
            );

        if ($startDate && $endDate) {
            $feesQuery->whereBetween('fee_payments.payment_date', [$startDate, $endDate]);
        }

        $fees = $feesQuery->get()->map(function ($item) {
            return [
                'id' => 'fee_' . $item->id,
                'date' => $item->date,
                'type' => 'Fee',
                'transaction_type' => 'Credit',
                'amount' => (float) $item->amount,
                'party_name' => $item->party_name,
                'description' => 'Fee collection for ' . $item->description_note,
                'recorded_by' => $item->recorded_by ?? 'System',
                'timestamp' => strtotime($item->date),
            ];
        });
        $transactions = $transactions->concat($fees);

        // 2. Expenses (Debits)
        $expensesQuery = DB::table('expenses')
            ->leftJoin('expense_categories', 'expenses.expense_category_id', '=', 'expense_categories.id')
            ->leftJoin('users as recorders', 'expenses.recorded_by', '=', 'recorders.id')
            ->select(
                'expenses.id',
                'expenses.expense_date as date',
                'expenses.amount',
                'expense_categories.name as party_name',
                'expenses.title as description_note',
                'recorders.name as recorded_by'
            )
            ->whereNull('expenses.deleted_at');

        if ($startDate && $endDate) {
            $expensesQuery->whereBetween('expenses.expense_date', [$startDate, $endDate]);
        }

        $expenses = $expensesQuery->get()->map(function ($item) {
            return [
                'id' => 'exp_' . $item->id,
                'date' => $item->date,
                'type' => 'Expense',
                'transaction_type' => 'Debit',
                'amount' => (float) $item->amount,
                'party_name' => $item->party_name ?? 'Uncategorized',
                'description' => $item->description_note,
                'recorded_by' => $item->recorded_by ?? 'System',
                'timestamp' => strtotime($item->date),
            ];
        });
        $transactions = $transactions->concat($expenses);

        // 3. Salary Payments (Debits)
        $salariesQuery = DB::table('salary_payments')
            ->join('salary_slips', 'salary_payments.salary_slip_id', '=', 'salary_slips.id')
            ->join('users as teachers', 'salary_slips.teacher_id', '=', 'teachers.id')
            ->leftJoin('users as creators', 'salary_payments.created_by', '=', 'creators.id')
            ->select(
                'salary_payments.id',
                'salary_payments.payment_date as date',
                'salary_payments.amount_paid as amount',
                'teachers.name as party_name',
                'salary_slips.month as description_note',
                'creators.name as recorded_by'
            );

        if ($startDate && $endDate) {
            $salariesQuery->whereBetween('salary_payments.payment_date', [$startDate, $endDate]);
        }

        $salaries = $salariesQuery->get()->map(function ($item) {
            return [
                'id' => 'sal_' . $item->id,
                'date' => $item->date,
                'type' => 'Salary',
                'transaction_type' => 'Debit',
                'amount' => (float) $item->amount,
                'party_name' => $item->party_name,
                'description' => 'Salary payment for ' . $item->description_note,
                'recorded_by' => $item->recorded_by ?? 'System',
                'timestamp' => strtotime($item->date),
            ];
        });
        $transactions = $transactions->concat($salaries);

        // 4. Advance Salary Disbursed (Debits)
        $advancesQuery = DB::table('advance_salary_requests')
            ->join('users as teachers', 'advance_salary_requests.teacher_id', '=', 'teachers.id')
            ->leftJoin('users as action_users', 'advance_salary_requests.action_by', '=', 'action_users.id')
            ->where('advance_salary_requests.status', 'paid')
            ->select(
                'advance_salary_requests.id',
                DB::raw('COALESCE(advance_salary_requests.paid_at, advance_salary_requests.created_at) as date'),
                'advance_salary_requests.amount',
                'teachers.name as party_name',
                'advance_salary_requests.payment_method',
                'advance_salary_requests.reason',
                'advance_salary_requests.deduction_month',
                'action_users.name as recorded_by'
            );

        if ($startDate && $endDate) {
            $advancesQuery->whereBetween(
                DB::raw('COALESCE(advance_salary_requests.paid_at, advance_salary_requests.created_at)'),
                [$startDate, $endDate]
            );
        }

        $advances = $advancesQuery->get()->map(function ($item) {
            $note = 'Advance salary disbursed (' . ($item->payment_method ?: 'Cash') . ')';
            if ($item->deduction_month) {
                $note .= ' [Deduct in: ' . $item->deduction_month . ']';
            }
            if (!empty($item->reason)) {
                $note .= ' - ' . $item->reason;
            }
            return [
                'id' => 'adv_' . $item->id,
                'date' => $item->date,
                'type' => 'Advance Salary',
                'transaction_type' => 'Debit',
                'amount' => (float) $item->amount,
                'party_name' => $item->party_name,
                'description' => $note,
                'recorded_by' => $item->recorded_by ?? 'Admin',
                'timestamp' => strtotime($item->date),
            ];
        });
        $transactions = $transactions->concat($advances);

        // Sort by timestamp asc (so running balance makes sense from top to bottom)
        $sortedTransactions = $transactions->sortBy('timestamp')->values()->all();

        return response()->json([
            'data' => $sortedTransactions
        ]);
    }

    public function financialReport(Request $request)
    {
        $request->validate([
            'start_date' => 'required|string',
            'end_date' => 'required|string',
        ]);

        $start = Carbon::parse($request->input('start_date'))->startOfMonth();
        $end = Carbon::parse($request->input('end_date'))->endOfMonth();

        // 1. Fee Payments (Credits)
        $fees = DB::table('fee_payments')
            ->where('payment_date', '<=', $end)
            ->select('payment_date as date', 'amount_paid as amount', 'month')
            ->get()
            ->map(function ($item) {
                return [
                    'date' => $item->date,
                    'type' => 'Credit',
                    'amount' => (float) $item->amount,
                    'month' => $item->month,
                ];
            });

        // 2. Expenses (Debits)
        $expenses = DB::table('expenses')
            ->whereNull('deleted_at')
            ->where('expense_date', '<=', $end)
            ->select('expense_date as date', 'amount')
            ->get()
            ->map(function ($item) {
                return [
                    'date' => $item->date,
                    'type' => 'Debit',
                    'amount' => (float) $item->amount,
                    'month' => substr($item->date, 0, 7),
                ];
            });

        // 3. Salary Payments (Debits)
        $salaries = DB::table('salary_payments')
            ->join('salary_slips', 'salary_payments.salary_slip_id', '=', 'salary_slips.id')
            ->where('salary_payments.payment_date', '<=', $end)
            ->select('salary_payments.payment_date as date', 'salary_payments.amount_paid as amount', 'salary_slips.month')
            ->get()
            ->map(function ($item) {
                return [
                    'date' => $item->date,
                    'type' => 'Debit',
                    'amount' => (float) $item->amount,
                    'month' => $item->month,
                ];
            });

        // 4. Advance Salary Payments (Debits)
        $advances = DB::table('advance_salary_requests')
            ->where('advance_salary_requests.status', 'paid')
            ->where(DB::raw('COALESCE(paid_at, created_at)'), '<=', $end)
            ->select(
                DB::raw('COALESCE(paid_at, created_at) as date'),
                'amount',
                'deduction_month as month'
            )
            ->get()
            ->map(function ($item) {
                return [
                    'date' => $item->date,
                    'type' => 'Debit',
                    'amount' => (float) $item->amount,
                    'month' => $item->month ?: substr($item->date, 0, 7),
                ];
            });

        $transactions = collect()->concat($fees)->concat($expenses)->concat($salaries)->concat($advances);
        $sorted = $transactions->sortBy('date')->values();

        $runningBalance = 0;
        $monthEndBalances = [];
        $monthIncomes = [];
        $monthExpenses = [];

        foreach ($sorted as $tx) {
            $month = Carbon::parse($tx['date'])->format('Y-m');
            if ($tx['type'] === 'Credit') {
                $runningBalance += $tx['amount'];
                $monthIncomes[$month] = ($monthIncomes[$month] ?? 0) + $tx['amount'];
            } else {
                $runningBalance -= $tx['amount'];
                $monthExpenses[$month] = ($monthExpenses[$month] ?? 0) + $tx['amount'];
            }
            $monthEndBalances[$month] = $runningBalance;
        }

        // We want to walk month-by-month from the first transaction's month (or start month, whichever is earlier) up to $end.
        $firstTx = $sorted->first();
        $minMonth = $firstTx ? Carbon::parse($firstTx['date'])->startOfMonth() : $start->copy();
        if ($minMonth->gt($start)) {
            $minMonth = $start->copy();
        }

        $current = $minMonth->copy();
        $lastBalance = 0;
        $report = [];

        while ($current->lte($end)) {
            $monthStr = $current->format('Y-m');
            if (array_key_exists($monthStr, $monthEndBalances)) {
                $lastBalance = $monthEndBalances[$monthStr];
            }

            if ($current->gte($start)) {
                $income = $monthIncomes[$monthStr] ?? 0;
                $expense = $monthExpenses[$monthStr] ?? 0;
                $report[] = [
                    'month' => $monthStr,
                    'month_name' => $current->format('F Y'),
                    'income' => $income,
                    'expense' => $expense,
                    'net_change' => $income - $expense,
                    'ending_balance' => $lastBalance,
                ];
            }
            $current->addMonth();
        }

        // Return newest month first
        $report = array_reverse($report);

        return response()->json([
            'data' => $report
        ]);
    }

    public function destroy($id)
    {
        if (str_starts_with($id, 'exp_')) {
            $realId = substr($id, 4);
            DB::table('expenses')->where('id', $realId)->update(['deleted_at' => now()]);
            return response()->json(['message' => 'Expense transaction deleted successfully']);
        } elseif (str_starts_with($id, 'sal_')) {
            $realId = substr($id, 4);
            $payment = DB::table('salary_payments')->where('id', $realId)->first();
            if ($payment) {
                $slipId = $payment->salary_slip_id;
                DB::table('salary_payments')->where('id', $realId)->delete();

                $slip = \App\Models\SalarySlip::find($slipId);
                if ($slip) {
                    $totalPaid = (float) DB::table('salary_payments')->where('salary_slip_id', $slipId)->sum('amount_paid');
                    $slip->total_paid = $totalPaid;
                    if ($totalPaid <= 0) {
                        $slip->payment_status = 'unpaid';
                    } elseif ($totalPaid < $slip->payable_salary) {
                        $slip->payment_status = 'partial';
                    } else {
                        $slip->payment_status = 'paid';
                    }
                    $slip->save();
                }
                return response()->json(['message' => 'Salary transaction deleted and salary slip updated successfully']);
            }
            return response()->json(['message' => 'Salary transaction not found'], 404);
        } elseif (str_starts_with($id, 'fee_')) {
            $realId = substr($id, 4);
            DB::table('fee_payments')->where('id', $realId)->delete();
            return response()->json(['message' => 'Fee transaction deleted successfully']);
        } elseif (str_starts_with($id, 'adv_')) {
            $realId = substr($id, 4);
            $adv = \App\Models\AdvanceSalaryRequest::find($realId);
            if ($adv) {
                $adv->status = 'pending';
                $adv->paid_at = null;
                $adv->save();
                return response()->json(['message' => 'Advance salary transaction reverted successfully']);
            }
            return response()->json(['message' => 'Transaction not found'], 404);
        }

        return response()->json(['message' => 'Invalid transaction ID format'], 400);
    }
}
