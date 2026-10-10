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
        Schema::table('teacher_assignments', function (Blueprint $table) {
            if (!Schema::hasColumn('teacher_assignments', 'is_class_incharge')) {
                $table->boolean('is_class_incharge')->default(false)->after('fixed_amount');
            }
            // Make subject_id nullable so a staff member can be assigned as pure Class Incharge without a subject
            $table->unsignedBigInteger('subject_id')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('teacher_assignments', function (Blueprint $table) {
            if (Schema::hasColumn('teacher_assignments', 'is_class_incharge')) {
                $table->dropColumn('is_class_incharge');
            }
        });
    }
};
