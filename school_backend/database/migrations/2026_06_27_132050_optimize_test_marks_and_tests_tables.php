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
        Schema::table('test_marks', function (Blueprint $table) {
            $table->unique(['test_id', 'student_id']);
        });

        Schema::table('tests', function (Blueprint $table) {
            $table->index(['test_category_id', 'academic_session_id', 'academy_class_id'], 'tests_category_session_class_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('test_marks', function (Blueprint $table) {
            $table->dropUnique(['test_id', 'student_id']);
        });

        Schema::table('tests', function (Blueprint $table) {
            $table->dropIndex('tests_category_session_class_idx');
        });
    }
};
