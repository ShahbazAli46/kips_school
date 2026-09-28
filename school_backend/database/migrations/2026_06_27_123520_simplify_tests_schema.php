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
        \DB::table('test_marks')->truncate();
        \DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        \DB::table('tests')->truncate();
        \DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        Schema::table('tests', function (Blueprint $table) {
            $table->dropForeign(['test_series_id']);
            $table->dropColumn('test_series_id');
            $table->foreignId('test_category_id')->after('id')->constrained('test_categories')->cascadeOnDelete();
            $table->foreignId('academic_session_id')->after('test_category_id')->constrained('academic_sessions')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tests', function (Blueprint $table) {
            $table->dropForeign(['test_category_id']);
            $table->dropColumn('test_category_id');
            $table->dropForeign(['academic_session_id']);
            $table->dropColumn('academic_session_id');
            $table->foreignId('test_series_id')->after('id')->constrained('test_series')->cascadeOnDelete();
        });
    }
};
