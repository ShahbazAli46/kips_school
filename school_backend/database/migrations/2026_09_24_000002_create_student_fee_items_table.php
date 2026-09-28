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
        Schema::create('student_fee_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('academic_session_id')->nullable()->constrained('academic_sessions')->nullOnDelete();
            $table->string('head_key', 50); // e.g. adm_fee, security_fee, tuition_fee, lms_charges, ac_charges, library_charges, lim_charges, fine, lab_charges, exam_charges, id_card_charges, service_charges, brd_reg_charges, brd_adm_charges, r_and_t_charges
            $table->string('head_name', 100); // Friendly name e.g. "Admission Fee"
            $table->enum('head_type', ['one_time', 'monthly', 'annual', 'fine'])->default('one_time');
            $table->decimal('actual_amount', 10, 2)->default(0);
            $table->decimal('discount_amount', 10, 2)->default(0);
            $table->decimal('payable_amount', 10, 2)->default(0); // actual - discount
            $table->decimal('paid_amount', 10, 2)->default(0);
            $table->decimal('balance_amount', 10, 2)->default(0);
            $table->timestamps();

            $table->index(['student_id', 'head_key']);
            $table->index(['student_id', 'academic_session_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('student_fee_items');
    }
};
