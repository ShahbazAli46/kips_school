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
        Schema::table('salary_slips', function (Blueprint $table) {
            $table->decimal('attendance_percentage', 5, 2)->default(100.00)->after('total_amount');
            $table->decimal('bonus', 10, 2)->default(0.00)->after('attendance_percentage');
            $table->decimal('payable_salary', 10, 2)->default(0.00)->after('bonus');
            $table->decimal('total_paid', 10, 2)->default(0.00)->after('payable_salary');
            $table->enum('payment_status', ['unpaid', 'partial', 'paid'])->default('unpaid')->after('total_paid');
        });

        Schema::create('salary_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('salary_slip_id')->constrained('salary_slips')->onDelete('cascade');
            $table->decimal('amount_paid', 10, 2);
            $table->date('payment_date');
            $table->string('payment_method')->default('Cash');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('salary_payments');
        
        Schema::table('salary_slips', function (Blueprint $table) {
            $table->dropColumn(['attendance_percentage', 'bonus', 'payable_salary', 'total_paid', 'payment_status']);
        });
    }
};
