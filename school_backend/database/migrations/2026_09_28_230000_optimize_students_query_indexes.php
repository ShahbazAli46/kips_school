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
        Schema::table('student_subject_enrollments', function (Blueprint $table) {
            $table->index(['student_id', 'is_active', 'month'], 'sse_student_active_month_idx');
        });

        Schema::table('fee_payments', function (Blueprint $table) {
            $table->index(['student_id', 'amount_paid'], 'fp_student_amount_idx');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->index(['role_id', 'is_active', 'class_id'], 'users_role_active_class_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('student_subject_enrollments', function (Blueprint $table) {
            $table->dropIndex('sse_student_active_month_idx');
        });

        Schema::table('fee_payments', function (Blueprint $table) {
            $table->dropIndex('fp_student_amount_idx');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('users_role_active_class_idx');
        });
    }
};
