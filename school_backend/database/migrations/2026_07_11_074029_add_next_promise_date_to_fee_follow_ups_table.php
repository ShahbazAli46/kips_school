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
        Schema::table('fee_follow_ups', function (Blueprint $table) {
            $table->date('next_promise_date')->nullable()->after('promise_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('fee_follow_ups', function (Blueprint $table) {
            $table->dropColumn('next_promise_date');
        });
    }
};
