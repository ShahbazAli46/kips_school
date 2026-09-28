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
        Schema::table('student_session_enrollments', function (Blueprint $table) {
            // Add a composite index since we frequently query by session and class together
            $table->index(['academic_session_id', 'class_id'], 'idx_session_class');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('student_session_enrollments', function (Blueprint $table) {
            $table->dropIndex('idx_session_class');
        });
    }
};
