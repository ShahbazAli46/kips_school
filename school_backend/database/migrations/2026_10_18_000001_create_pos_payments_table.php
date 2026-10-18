<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('pos_payments')) {
            Schema::create('pos_payments', function (Blueprint $table) {
                // Separate cash-collection ledger for Books store & Extra Charges POS.
                // These are deliberately NOT recorded in fee_payments, so they never
                // appear in the academic Fee Received ledgers / Daily Receivings.
                $table->id();
                $table->foreignId('student_id')->nullable()->constrained('users')->nullOnDelete();
                $table->enum('category', ['books', 'extra'])->index('pos_payments_category_idx');
                $table->string('month', 7);
                $table->decimal('amount_paid', 12, 2);
                $table->decimal('discount_amount', 12, 2)->default(0);
                $table->date('payment_date');
                $table->string('payer_name', 255)->nullable();
                $table->string('payment_method', 50)->default('cash');
                $table->string('description', 500)->nullable();
                $table->foreignId('student_fee_item_id')->nullable()->constrained('student_fee_items')->nullOnDelete();
                $table->foreignId('student_extra_charge_id')->nullable()->constrained('student_extra_charges')->nullOnDelete();
                $table->foreignId('staff_receiving_id')->nullable()->constrained('staff_student_receivings')->nullOnDelete();
                $table->foreignId('received_by')->nullable()->constrained('users')->nullOnDelete();

                $table->index(['month', 'category'], 'pos_payments_month_category_idx');
                $table->index('payment_date', 'pos_payments_date_idx');
                $table->index('student_id', 'pos_payments_student_idx');
                $table->timestamps();
            });
        }

        if (Schema::hasTable('student_extra_charges') && !Schema::hasColumn('student_extra_charges', 'pos_payment_id')) {
            Schema::table('student_extra_charges', function (Blueprint $table) {
                $table->foreignId('pos_payment_id')->nullable()->after('fee_payment_id')->constrained('pos_payments')->nullOnDelete();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('student_extra_charges') && Schema::hasColumn('student_extra_charges', 'pos_payment_id')) {
            Schema::table('student_extra_charges', function (Blueprint $table) {
                $table->dropConstrainedForeignId('pos_payment_id');
            });
        }
        Schema::dropIfExists('pos_payments');
    }
};
