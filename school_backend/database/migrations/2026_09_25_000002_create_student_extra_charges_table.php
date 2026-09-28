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
        Schema::create('student_extra_charges', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('extra_charge_item_id')->nullable()->constrained('extra_charge_items')->nullOnDelete();
            $table->foreignId('student_fee_item_id')->nullable()->constrained('student_fee_items')->nullOnDelete();
            $table->foreignId('fee_payment_id')->nullable()->constrained('fee_payments')->nullOnDelete();
            $table->string('title', 200);
            $table->string('category', 50)->default('stationery');
            $table->enum('charge_type', ['stock_based', 'ad_hoc'])->default('stock_based');
            $table->decimal('unit_price', 10, 2)->default(0);
            $table->integer('quantity')->default(1);
            $table->decimal('total_amount', 10, 2)->default(0);
            $table->decimal('paid_amount', 10, 2)->default(0);
            $table->decimal('balance_amount', 10, 2)->default(0);
            $table->enum('payment_status', ['paid', 'unpaid', 'partial', 'billed_to_voucher'])->default('unpaid');
            $table->enum('payment_method', ['cash', 'voucher', 'online', 'bank', 'waived'])->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['student_id', 'payment_status']);
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('student_extra_charges');
    }
};
