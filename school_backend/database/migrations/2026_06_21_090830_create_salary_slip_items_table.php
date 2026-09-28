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
        Schema::create('salary_slip_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('salary_slip_id')->constrained()->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained()->cascadeOnDelete();
            $table->foreignId('class_id')->nullable()->constrained('classes')->nullOnDelete();
            $table->foreignId('major_id')->nullable()->constrained('majors')->nullOnDelete();
            $table->foreignId('section_id')->nullable()->constrained('sections')->nullOnDelete();
            
            $table->enum('payment_type', ['fixed', 'percentage']);
            $table->decimal('fixed_amount', 10, 2)->nullable();
            
            $table->foreignId('student_id')->nullable()->constrained('users')->nullOnDelete();
            $table->decimal('student_fee_paid', 10, 2)->nullable();
            $table->integer('student_active_subjects_count')->nullable();
            $table->decimal('subject_share', 10, 2)->nullable();
            $table->decimal('percentage', 5, 2)->nullable();
            $table->decimal('teacher_cut', 10, 2)->nullable();
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('salary_slip_items');
    }
};
