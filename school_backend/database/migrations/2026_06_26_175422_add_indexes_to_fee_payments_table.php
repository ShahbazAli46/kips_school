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
            try {
                $sm = Schema::getConnection()->getDoctrineSchemaManager();
                $indexesFound = $sm->listTableIndexes('fee_payments');
                
                if (!array_key_exists('fee_payments_month_index', $indexesFound)) {
                    $table->index('month');
                }
                if (!array_key_exists('fee_payments_student_id_month_index', $indexesFound)) {
                    $table->index(['student_id', 'month']);
                }
            } catch (\Exception $e) {
                // Handle or log exception if index creation fails
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('fee_payments', function (Blueprint $table) {
            //
        });
    }
};
