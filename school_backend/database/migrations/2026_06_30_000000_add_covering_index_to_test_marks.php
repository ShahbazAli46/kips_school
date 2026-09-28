<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Covering index for the results aggregation query.
     * Allows MySQL to satisfy SUM(obtained_marks) and SUM(is_absent)
     * directly from the index without reading table rows.
     */
    public function up(): void
    {
        Schema::table('test_marks', function (Blueprint $table) {
            $table->index(
                ['test_id', 'student_id', 'obtained_marks', 'is_absent'],
                'idx_test_marks_covering'
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('test_marks', function (Blueprint $table) {
            $table->dropIndex('idx_test_marks_covering');
        });
    }
};
