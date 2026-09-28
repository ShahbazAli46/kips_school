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
            $table->decimal('total_paid', 10, 2)->default(0)->after('pending_amount');
        });

        Schema::table('fee_payments', function (Blueprint $table) {
            $table->index(['student_id', 'month']);
            $table->index('month');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('fee_payments', function (Blueprint $table) {
            $table->dropIndex(['student_id', 'month']);
            $table->dropIndex(['month']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('total_paid');
        });
    }
};
