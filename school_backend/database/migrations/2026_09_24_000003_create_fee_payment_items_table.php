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
        Schema::create('fee_payment_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fee_payment_id')->constrained('fee_payments')->cascadeOnDelete();
            $table->foreignId('student_fee_item_id')->nullable()->constrained('student_fee_items')->nullOnDelete();
            $table->string('head_key', 50); // e.g. adm_fee, tuition_fee, security_fee, etc.
            $table->string('head_name', 100)->nullable();
            $table->decimal('amount_paid', 10, 2)->default(0);
            $table->decimal('discount_applied', 10, 2)->default(0);
            $table->string('month', 7)->nullable(); // e.g. '2026-09'
            $table->timestamps();

            $table->index(['fee_payment_id', 'head_key']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('fee_payment_items');
    }
};
