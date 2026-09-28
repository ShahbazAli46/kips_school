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
        Schema::table('fee_payments', function (Blueprint $table) {
            $table->decimal('discount_amount', 10, 2)->default(0)->after('amount_paid');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->decimal('total_discount', 10, 2)->default(0)->after('total_paid');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('fee_payments', function (Blueprint $table) {
            $table->dropColumn('discount_amount');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('total_discount');
        });
    }
};
