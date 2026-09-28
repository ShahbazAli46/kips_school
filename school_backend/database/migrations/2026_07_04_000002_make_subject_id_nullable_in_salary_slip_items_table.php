<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Drop the foreign key constraint first
        Schema::table('salary_slip_items', function (Blueprint $table) {
            $table->dropForeign(['subject_id']);
        });

        // Modify the column to be nullable
        DB::statement('ALTER TABLE salary_slip_items MODIFY COLUMN subject_id BIGINT UNSIGNED NULL;');

        // Add the foreign key constraint back
        Schema::table('salary_slip_items', function (Blueprint $table) {
            $table->foreign('subject_id')->references('id')->on('subjects')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('salary_slip_items', function (Blueprint $table) {
            $table->dropForeign(['subject_id']);
        });

        DB::statement('UPDATE salary_slip_items SET subject_id = 1 WHERE subject_id IS NULL;'); // fallback default
        DB::statement('ALTER TABLE salary_slip_items MODIFY COLUMN subject_id BIGINT UNSIGNED NOT NULL;');

        Schema::table('salary_slip_items', function (Blueprint $table) {
            $table->foreign('subject_id')->references('id')->on('subjects')->cascadeOnDelete();
        });
    }
};
