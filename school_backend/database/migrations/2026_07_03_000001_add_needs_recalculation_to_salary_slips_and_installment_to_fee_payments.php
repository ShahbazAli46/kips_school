<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Add installment_number to fee_payments
        //    This auto-numbers installments per student+month (1st, 2nd, 3rd…)
        Schema::table('fee_payments', function (Blueprint $table) {
            $table->unsignedTinyInteger('installment_number')->default(1)->after('month');
        });

        // Backfill installment_number for existing rows
        DB::statement("
            UPDATE fee_payments fp
            JOIN (
                SELECT id, 
                    ROW_NUMBER() OVER (PARTITION BY student_id, month ORDER BY payment_date ASC, id ASC) AS rn
                FROM fee_payments
            ) ranked ON fp.id = ranked.id
            SET fp.installment_number = ranked.rn
        ");

        // 2. Add needs_recalculation flag to salary_slips
        //    When fee payments change for a month, the related salary slips are marked stale.
        Schema::table('salary_slips', function (Blueprint $table) {
            $table->boolean('needs_recalculation')->default(false)->after('payment_status');
        });
    }

    public function down(): void
    {
        Schema::table('fee_payments', function (Blueprint $table) {
            $table->dropColumn('installment_number');
        });

        Schema::table('salary_slips', function (Blueprint $table) {
            $table->dropColumn('needs_recalculation');
        });
    }
};
