<?php

namespace App\Console\Commands;

use App\Models\FeePayment;
use App\Models\FeePaymentItem;
use App\Models\PosPayment;
use App\Models\StaffStudentReceiving;
use App\Models\StudentExtraCharge;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * One-off data migration: moves legacy Books / Extra Charges cash collections
 * out of fee_payments (the academic fee received ledger) and into pos_payments
 * (the separate Books/Extra POS received ledgers).
 *
 * Idempotent: records are deleted from fee_payments once moved, so re-running
 * finds nothing left to move. Never creates pairs.
 */
class MigratePosLegacyPayments extends Command
{
    protected $signature = 'pos:migrate-legacy-payments {--dry-run}';

    protected $description = 'Move legacy Books & Extra Charges cash payments from fee_payments into pos_payments';

    public function handle(): int
    {
        $dry = (bool) $this->option('dry-run');

        $items = FeePaymentItem::query()
            ->where('head_key', 'like', 'books\_%')
            ->orWhere('head_key', 'like', 'extra_charge\_%')
            ->get();

        if ($items->isEmpty()) {
            $this->info('Nothing to migrate — no legacy books/extra fee payment items found.');
            return self::SUCCESS;
        }

        // Group by parent payment so a payment is only deleted once ALL of its
        // items are POS items (mixed academic+POS payments keep their remainder).
        $byPayment = $items->groupBy('fee_payment_id');
        $movedItems = 0;
        $movedAmount = 0.0;
        $deletedPayments = 0;

        foreach ($byPayment as $paymentId => $paymentItems) {
            $payment = FeePayment::find($paymentId);
            if (!$payment) {
                $this->warn("Payment #{$paymentId} missing — skipping its " . $paymentItems->count() . ' item(s).');
                continue;
            }

            $totalItems = $payment->items()->count();
            if ($totalItems > $paymentItems->count()) {
                $this->warn("Payment #{$paymentId} is mixed (POS + academic heads) — items moved, payment kept.");
            }

            $migrate = function () use ($payment, $paymentItems, &$movedItems, &$movedAmount, &$deletedPayments, $totalItems, $dry) {
                foreach ($paymentItems as $item) {
                    $isBooks = str_starts_with($item->head_key, 'books_');

                    // Link a staff handover if this payment was cleared via the staff flow
                    $receiving = StaffStudentReceiving::where('fee_payment_id', $payment->id)->first();

                    $charge = StudentExtraCharge::where('fee_payment_id', $payment->id)
                        ->where('student_fee_item_id', $item->student_fee_item_id)
                        ->first();

                    $pos = PosPayment::create([
                        'category'               => $isBooks ? 'books' : 'extra',
                        'student_id'             => $payment->student_id,
                        'month'                  => $payment->month,
                        'amount_paid'            => $item->amount_paid,
                        'discount_amount'        => 0,
                        'payment_date'           => $payment->payment_date,
                        'payer_name'             => $payment->payer_name ?: $payment->student?->name,
                        'payment_method'         => $payment->payment_method ?? 'cash',
                        'description'            => $item->head_name ?: $item->head_key,
                        'student_fee_item_id'    => $item->student_fee_item_id,
                        'student_extra_charge_id'=> $charge?->id,
                        'staff_receiving_id'     => $receiving?->id,
                        'received_by'            => $payment->received_by,
                        'created_at'             => $payment->created_at,
                        'updated_at'             => $payment->updated_at ?? now(),
                    ]);

                    $receiving?->update(['fee_payment_id' => null]);
                    $charge?->update(['fee_payment_id' => null, 'pos_payment_id' => $pos->id]);

                    $item->delete();
                    $movedItems++;
                    $movedAmount += (float) $item->amount_paid;
                }

                if ($totalItems <= $paymentItems->count()) {
                    $payment->delete(); // items cascade or are already gone
                    $deletedPayments++;
                }
            };

            if ($dry) {
                foreach ($paymentItems as $item) {
                    $this->line("DRY: would move item #{$item->id} (" . ($item->head_key) . ") Rs {$item->amount_paid} from FP#{$paymentId} on {$payment->payment_date}");
                }
                continue;
            }

            DB::transaction($migrate);
        }

        if ($dry) {
            $this->info("Dry run complete: {$movedItems} item(s), Rs " . number_format($movedAmount) . " would be moved.");
            return self::SUCCESS;
        }

        $this->info("Migrated {$movedItems} item(s) totalling Rs " . number_format($movedAmount) . " — deleted {$deletedPayments} fully-pos payment(s) from fee_payments.");
        $this->info('pos_payments now holds ' . PosPayment::count() . ' record(s).');
        return self::SUCCESS;
    }
}
