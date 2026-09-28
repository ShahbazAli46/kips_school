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
            // Personal Data fields
            $table->string('student_cnic', 30)->nullable()->after('email');
            $table->date('dob')->nullable()->after('student_cnic');
            $table->string('father_cnic', 30)->nullable()->after('father_name');
            $table->string('father_cell', 30)->nullable()->after('contact_number');
            $table->text('current_address')->nullable()->after('father_cell');
            $table->text('remarks')->nullable()->after('current_address');

            // Admission Stream fields
            $table->string('stream_type', 50)->nullable()->default('Regular')->after('section_id');
            $table->decimal('test_marks', 8, 2)->nullable()->default(100)->after('stream_type');
            $table->decimal('obtained_marks', 8, 2)->nullable()->default(0)->after('test_marks');
            $table->string('admission_month', 7)->nullable()->after('obtained_marks'); // e.g. '2026-09'

            // Discounts & Payables Settings
            $table->boolean('is_prospectus_sold')->default(false)->after('admission_month');
            $table->boolean('is_marks_based_discount')->default(false)->after('is_prospectus_sold');
            $table->boolean('is_discretionary_discount')->default(false)->after('is_marks_based_discount');
            $table->boolean('is_policy_discount')->default(false)->after('is_discretionary_discount');

            $table->string('selected_months_tf', 20)->default('1-MONTH')->after('is_policy_discount');
            $table->decimal('tuition_fee_per_policy', 10, 2)->default(0)->after('selected_months_tf');
            $table->string('discretionary_discount_reason')->nullable()->after('tuition_fee_per_policy');
            $table->decimal('discretionary_discount_amount', 10, 2)->default(0)->after('discretionary_discount_reason');
            $table->string('policy_discount_type')->nullable()->after('discretionary_discount_amount');
            $table->decimal('policy_discount_amount', 10, 2)->default(0)->after('policy_discount_type');

            // Admission financial summary
            $table->decimal('total_admission_payable', 10, 2)->default(0)->after('policy_discount_amount');
            $table->decimal('amount_received_at_admission', 10, 2)->default(0)->after('total_admission_payable');
            $table->decimal('admission_balance', 10, 2)->default(0)->after('amount_received_at_admission');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'student_cnic',
                'dob',
                'father_cnic',
                'father_cell',
                'current_address',
                'remarks',
                'stream_type',
                'test_marks',
                'obtained_marks',
                'admission_month',
                'is_prospectus_sold',
                'is_marks_based_discount',
                'is_discretionary_discount',
                'is_policy_discount',
                'selected_months_tf',
                'tuition_fee_per_policy',
                'discretionary_discount_reason',
                'discretionary_discount_amount',
                'policy_discount_type',
                'policy_discount_amount',
                'total_admission_payable',
                'amount_received_at_admission',
                'admission_balance',
            ]);
        });
    }
};
