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
        Schema::table('users', function (Blueprint $table) {
            $table->decimal('advance_balance', 10, 2)->default(0)->after('total_discount');
        });

        Schema::table('salary_slips', function (Blueprint $table) {
            $table->decimal('advance_deducted', 10, 2)->default(0)->after('bonus');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('advance_balance');
        });

        Schema::table('salary_slips', function (Blueprint $table) {
            $table->dropColumn('advance_deducted');
        });
    }
};
