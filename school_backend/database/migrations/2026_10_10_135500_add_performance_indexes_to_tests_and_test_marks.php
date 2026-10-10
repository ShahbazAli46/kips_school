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
        Schema::table('tests', function (Blueprint $table) {
            // Index for querying tests by session, class, and evaluation round title
            $table->index(['academic_session_id', 'academy_class_id', 'title'], 'idx_tests_session_class_title');

            // Index for chronological ordering of tests / rounds by date
            $table->index(['academic_session_id', 'academy_class_id', 'date'], 'idx_tests_session_class_date');

            // Index for querying tests by session, class, and subject
            $table->index(['academic_session_id', 'academy_class_id', 'subject_id'], 'idx_tests_session_class_subject');

            // Index for category-specific series round lookups
            $table->index(['academy_class_id', 'test_category_id', 'title'], 'idx_tests_class_cat_title');
        });

        Schema::table('test_marks', function (Blueprint $table) {
            // Covering index for student-first queries (student result details, report cards, portals)
            // Mirrors idx_test_marks_covering but with student_id as the leading column
            $table->index(['student_id', 'test_id', 'obtained_marks', 'is_absent'], 'idx_test_marks_student_covering');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tests', function (Blueprint $table) {
            $table->dropIndex('idx_tests_session_class_title');
            $table->dropIndex('idx_tests_session_class_date');
            $table->dropIndex('idx_tests_session_class_subject');
            $table->dropIndex('idx_tests_class_cat_title');
        });

        Schema::table('test_marks', function (Blueprint $table) {
            $table->dropIndex('idx_test_marks_student_covering');
        });
    }
};
