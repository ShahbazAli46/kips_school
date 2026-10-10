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
        // 1. Add BF deduction columns to salary_slips
        Schema::table('salary_slips', function (Blueprint $table) {
            if (!Schema::hasColumn('salary_slips', 'bf_percentage')) {
                $table->decimal('bf_percentage', 5, 2)->default(0)->after('advance_deducted');
            }
            if (!Schema::hasColumn('salary_slips', 'bf_deduction')) {
                $table->decimal('bf_deduction', 10, 2)->default(0)->after('bf_percentage');
            }
        });

        // 2. Add staff default BF and employment dates to users table
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'bf_percentage')) {
                $table->decimal('bf_percentage', 5, 2)->default(0)->nullable();
            }
            if (!Schema::hasColumn('users', 'joining_date')) {
                $table->date('joining_date')->nullable();
            }
            if (!Schema::hasColumn('users', 'resignation_date')) {
                $table->date('resignation_date')->nullable();
            }
            if (!Schema::hasColumn('users', 'resignation_remarks')) {
                $table->text('resignation_remarks')->nullable();
            }
        });

        // 3. Create staff_salary_adjustments table
        if (!Schema::hasTable('staff_salary_adjustments')) {
            Schema::create('staff_salary_adjustments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
                $table->enum('type', ['increment', 'decrement'])->default('increment');
                $table->decimal('amount', 10, 2);
                $table->decimal('previous_salary', 10, 2)->default(0);
                $table->decimal('new_salary', 10, 2)->default(0);
                $table->date('effective_date');
                $table->text('reason')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->index(['user_id', 'effective_date']);
            });
        }

        // 4. Create staff_bf_settlements table (resignation / collection of BF)
        if (!Schema::hasTable('staff_bf_settlements')) {
            Schema::create('staff_bf_settlements', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
                $table->decimal('amount', 10, 2);
                $table->date('settlement_date');
                $table->string('payment_method')->default('Cash');
                $table->text('notes')->nullable();
                $table->boolean('is_resignation')->default(true);
                $table->foreignId('settled_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->index(['user_id', 'settlement_date']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('staff_bf_settlements');
        Schema::dropIfExists('staff_salary_adjustments');

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'resignation_remarks')) {
                $table->dropColumn('resignation_remarks');
            }
            if (Schema::hasColumn('users', 'resignation_date')) {
                $table->dropColumn('resignation_date');
            }
            if (Schema::hasColumn('users', 'joining_date')) {
                $table->dropColumn('joining_date');
            }
            if (Schema::hasColumn('users', 'bf_percentage')) {
                $table->dropColumn('bf_percentage');
            }
        });

        Schema::table('salary_slips', function (Blueprint $table) {
            if (Schema::hasColumn('salary_slips', 'bf_deduction')) {
                $table->dropColumn('bf_deduction');
            }
            if (Schema::hasColumn('salary_slips', 'bf_percentage')) {
                $table->dropColumn('bf_percentage');
            }
        });
    }
};
