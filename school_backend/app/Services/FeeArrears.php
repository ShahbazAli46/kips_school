<?php

namespace App\Services;

use App\Models\User;
use Carbon\Carbon;

/**
 * Single source of truth for student fee arithmetics.
 *
 * Used by:
 *  - FeeVoucherController::calculateStudentVoucher (fee vouchers / verify / print)
 *  - FeePaymentController::balances               (fees page)
 *  - FeePaymentController::getDefaultersData      (defaulters page)
 *  - FeePaymentController::ledger                 (student ledger statement)
 *
 * so that every view reports exactly the same payable amount for a student.
 *
 * Model:
 *   tuitionDue   = monthsEnrolled(billing start .. target month) * monthlyFee
 *   credit       = max(cash + discounts - nonTuitionPaid, tuitionPaid)
 *   creditTotal  = credit + nonTuitionPaid  (= max(cash + discounts, all fee-item paid))
 *   total        = max(0, tuitionDue + oneTimeDue - creditTotal)
 *
 * Rationale:
 *  - Cash is pooled against everything (mirrors the ledger headline), so overpayment in
 *    one month correctly nets off other unpaid months instead of being discarded.
 *  - Amounts already written into fee items (including imported rows that have no
 *    matching fee_payments record) are credited without double counting, because
 *    nonTuitionPaid is subtracted from cash while tuitionPaid is taken as-is.
 *  - The `other` / unallocated head is not a fee item, so that cash naturally stays
 *    creditable to tuition.
 *  - Payment-level discounts count as credit (fee_payment_items.discount_applied is
 *    never populated; discounts live on fee_payments.discount_amount).
 */
class FeeArrears
{
    /**
     * Map a fee head key to its voucher category.
     */
    public static function categorizeHeadKey(?string $headKey): string
    {
        if ($headKey && str_starts_with($headKey, 'books_')) return 'books';
        if ($headKey && str_starts_with($headKey, 'extra_charge_')) return 'extra';
        return 'academic';
    }

    /**
     * Compute the shared arithmetics for one student.
     *
     * @param Carbon           $target      Billing month (start of month)
     * @param Carbon           $sessionStart Academic session start
     * @param iterable|null    $payments    FeePayment collection (filtered internally to
     *                                       sessionStart..target); null loads the relation.
     * @param array|null       $include     Voucher categories to demand (null = all heads).
     *                                       Only affects one-time (non-tuition) heads;
     *                                       tuition math is category independent.
     */
    public static function compute(
        User $student,
        Carbon $target,
        Carbon $sessionStart,
        $payments = null,
        ?array $include = null
    ): array {
        $monthlyFee = (float) ($student->monthly_fee ?: 0);
        $sessionStart = $sessionStart->copy()->startOfMonth();
        $target = $target->copy()->startOfMonth();
        $start = $student->getEffectiveEnrollmentStart($sessionStart);

        // Months to bill: enrollment month .. target month (0 when target predates admission)
        $monthsBilled = $target->lt($start) ? 0 : $start->diffInMonths($target) + 1;
        $tuitionDue = $monthsBilled * $monthlyFee;

        // Cash & discounts received inside the active session up to the target month
        $payments = $payments ?? $student->feePayments;
        $sessionStr = $sessionStart->format('Y-m');
        $targetStr = $target->format('Y-m');
        $payments = collect($payments)->filter(
            fn ($p) => $p->month >= $sessionStr && $p->month <= $targetStr
        );
        $cash = (float) $payments->sum('amount_paid');
        $discount = (float) $payments->sum('discount_amount');

        // Fee-item state (current snapshot; every view reads the same rows)
        $feeItems = $student->relationLoaded('feeItems')
            ? $student->feeItems
            : $student->feeItems()->get();
        $tuitionPaid = (float) $feeItems->where('head_key', 'tuition_fee')->sum('paid_amount');
        $nonTuition = $feeItems->filter(fn ($fi) => $fi->head_key !== 'tuition_fee');
        $nonTuitionPaidAll = (float) $nonTuition->sum('paid_amount');

        $filtered = $include === null
            ? $nonTuition
            : $nonTuition->filter(
                fn ($fi) => in_array(self::categorizeHeadKey($fi->head_key), $include, true)
            );
        $oneTimeDue = (float) $filtered->sum('payable_amount');
        $oneTimePaid = (float) $filtered->sum('paid_amount');
        if ($include === null && $oneTimeDue <= 0) {
            // Legacy students without fee items: fall back to the stored pending amount
            $oneTimeDue = (float) ($student->pending_amount ?: 0);
        }

        // Pooled credit: cash minus what was written into non-tuition fee items is
        // tuition-creditable; tuition items written without cash (imported data) count too.
        $credit = max($cash + $discount - $nonTuitionPaidAll, $tuitionPaid);
        $creditTotal = $credit + $oneTimePaid;

        $total = max(0, $tuitionDue + $oneTimeDue - $creditTotal);
        $outstanding = (float) $filtered->sum('balance_amount');
        $monthsPayable = max(0, $total - $outstanding);

        // Distribute the tuition credit over months, earliest first (same order the
        // ledger statement applies), so month labels always sum to $monthsPayable.
        $monthRows = [];
        $available = min(max(0, $tuitionDue - $monthsPayable), $tuitionDue);
        $discountRemaining = $discount;
        $curr = $start->copy();
        for ($i = 0; $i < $monthsBilled; $i++) {
            $applied = min($available, $monthlyFee);
            $available -= $applied;
            $discApplied = min($discountRemaining, $applied);
            $discountRemaining -= $discApplied;
            $monthRows[] = [
                'month' => $curr->format('Y-m'),
                'net' => $monthlyFee - $applied,
                'applied' => $applied,
                'discount' => $discApplied,
            ];
            $curr->addMonth();
        }

        $currentMonthNet = 0.0;
        $priorTuitionArrears = 0.0;
        foreach ($monthRows as $row) {
            if ($row['month'] === $targetStr) {
                $currentMonthNet = (float) $row['net'];
            } else {
                $priorTuitionArrears += (float) $row['net'];
            }
        }

        return [
            'monthly_fee' => $monthlyFee,
            'months_billed' => $monthsBilled,
            'tuition_due' => $tuitionDue,
            'cash' => $cash,
            'discount' => $discount,
            'tuition_paid' => $tuitionPaid,
            'non_tuition_paid' => $nonTuitionPaidAll,
            'credit' => $credit,
            'credit_total' => $creditTotal,
            'one_time_due' => $oneTimeDue,
            'outstanding' => $outstanding,
            'months_payable' => $monthsPayable,
            'total' => $total,
            'month_rows' => $monthRows,
            'current_month_net' => $currentMonthNet,
            'prior_tuition_arrears' => $priorTuitionArrears,
        ];
    }
}
