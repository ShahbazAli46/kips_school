<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Optimize student_extra_charges table
        Schema::table('student_extra_charges', function (Blueprint $table) {
            $table->index('payment_status', 'sec_payment_status_idx');
            $table->index('category', 'sec_category_idx');
            $table->index(['payment_status', 'created_at'], 'sec_status_created_idx');
        });

        // 2. Optimize extra_charge_items table
        Schema::table('extra_charge_items', function (Blueprint $table) {
            $table->index(['is_active', 'item_type'], 'eci_active_type_idx');
            $table->index(['category', 'is_active'], 'eci_category_active_idx');
            $table->index('name', 'eci_name_idx');
        });

        // 3. Optimize student_fee_items table
        Schema::table('student_fee_items', function (Blueprint $table) {
            $table->index(['student_id', 'balance_amount'], 'sfi_student_balance_idx');
            $table->index('balance_amount', 'sfi_balance_amount_idx');
        });

        // 4. Optimize fee_payment_items table
        Schema::table('fee_payment_items', function (Blueprint $table) {
            $table->index('month', 'fpi_month_idx');
            $table->index(['student_fee_item_id', 'month'], 'fpi_sfi_month_idx');
        });

        // 5. Optimize fee_payments table
        Schema::table('fee_payments', function (Blueprint $table) {
            $table->index('payment_date', 'fp_payment_date_idx');
            $table->index(['payment_date', 'month'], 'fp_date_month_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('student_extra_charges', function (Blueprint $table) {
            $table->dropIndex('sec_payment_status_idx');
            $table->dropIndex('sec_category_idx');
            $table->dropIndex('sec_status_created_idx');
        });

        Schema::table('extra_charge_items', function (Blueprint $table) {
            $table->dropIndex('eci_active_type_idx');
            $table->dropIndex('eci_category_active_idx');
            $table->dropIndex('eci_name_idx');
        });

        Schema::table('student_fee_items', function (Blueprint $table) {
            $table->dropIndex('sfi_student_balance_idx');
            $table->dropIndex('sfi_balance_amount_idx');
        });

        Schema::table('fee_payment_items', function (Blueprint $table) {
            $table->dropIndex('fpi_month_idx');
            $table->dropIndex('fpi_sfi_month_idx');
        });

        Schema::table('fee_payments', function (Blueprint $table) {
            $table->dropIndex('fp_payment_date_idx');
            $table->dropIndex('fp_date_month_idx');
        });
    }
};
