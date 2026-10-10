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
        // Update any existing legacy academy_series records to class_test
        DB::table('test_categories')
            ->where('type', 'academy_series')
            ->update(['type' => 'class_test']);

        Schema::table('test_categories', function (Blueprint $table) {
            $table->string('type')->default('class_test')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('test_categories', function (Blueprint $table) {
            $table->string('type')->default('academy_series')->change();
        });
    }
};
