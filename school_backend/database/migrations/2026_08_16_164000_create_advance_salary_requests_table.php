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
        if (!Schema::hasTable('advance_salary_requests')) {
            Schema::create('advance_salary_requests', function (Blueprint $table) {
                $table->id();
                $table->foreignId('teacher_id')->constrained('users')->onDelete('cascade');
                $table->decimal('amount', 10, 2);
                $table->text('reason');
                $table->string('deduction_month', 7)->nullable(); // YYYY-MM
                $table->enum('status', ['pending', 'approved', 'paid', 'rejected'])->default('pending');
                $table->text('admin_notes')->nullable();
                $table->string('payment_method')->nullable();
                $table->foreignId('action_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('paid_at')->nullable();
                $table->timestamps();

                $table->index(['teacher_id', 'deduction_month', 'status']);
                $table->index(['deduction_month', 'status']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('advance_salary_requests');
    }
};
