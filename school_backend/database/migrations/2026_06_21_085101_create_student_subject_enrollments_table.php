<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_subject_enrollments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('subject_id')->constrained('subjects')->onDelete('cascade');
            $table->string('month', 7); // e.g. "2026-01"
            $table->boolean('is_active')->default(true);
            // Percentage the teacher earns from this student's fee share for this subject
            // null means this subject's teacher is fixed-salary (not relevant here)
            $table->decimal('percentage', 5, 2)->nullable();
            $table->timestamps();

            // One record per student, per subject, per month
            $table->unique(['student_id', 'subject_id', 'month'], 'unique_student_subject_month');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_subject_enrollments');
    }
};
