<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Check whether an index already exists on a table (MySQL / MariaDB).
     */
    private function indexExists(string $table, string $index): bool
    {
        return (bool) DB::select(
            "SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1",
            [$table, $index]
        );
    }

    /**
     * Run the migrations.
     *
     * Keeps the POS received ledgers (books & extra charges) fast at
     * 4-5 years of records: proper covering indexes + a sargable
     * index for the books ledger head_key prefix scan.
     */
    public function up(): void
    {
        // 1. pos_payments: default ledger view filters by category and sorts newest first.
        //    (category, payment_date) serves both the filter and the ORDER BY without filesort.
        if (Schema::hasTable('pos_payments') && !$this->indexExists('pos_payments', 'pos_payments_cat_date_idx')) {
            Schema::table('pos_payments', function (Blueprint $table) {
                $table->index(['category', 'payment_date', 'id'], 'pos_payments_cat_date_idx');
            });
        }

        // 2. student_fee_items: the books ledger filters `head_key LIKE 'books\_%'`
        //    across ALL students. The existing (student_id, head_key) index can't serve
        //    that without a student id; a standalone head_key index makes the prefix
        //    scan index-driven.
        if (Schema::hasTable('student_fee_items') && !$this->indexExists('student_fee_items', 'sfi_head_key_idx')) {
            Schema::table('student_fee_items', function (Blueprint $table) {
                $table->index('head_key', 'sfi_head_key_idx');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('pos_payments') && $this->indexExists('pos_payments', 'pos_payments_cat_date_idx')) {
            Schema::table('pos_payments', function (Blueprint $table) {
                $table->dropIndex('pos_payments_cat_date_idx');
            });
        }
        if (Schema::hasTable('student_fee_items') && $this->indexExists('student_fee_items', 'sfi_head_key_idx')) {
            Schema::table('student_fee_items', function (Blueprint $table) {
                $table->dropIndex('sfi_head_key_idx');
            });
        }
    }
};
