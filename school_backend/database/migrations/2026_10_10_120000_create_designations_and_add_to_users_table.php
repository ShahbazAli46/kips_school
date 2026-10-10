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
        // 1. Create designations table
        if (!Schema::hasTable('designations')) {
            Schema::create('designations', function (Blueprint $table) {
                $table->id();
                $table->string('name', 100)->unique();
                $table->text('description')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        // 2. Add designation_id to users table
        if (!Schema::hasColumn('users', 'designation_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->foreignId('designation_id')
                    ->nullable()
                    ->after('role_id')
                    ->constrained('designations')
                    ->nullOnDelete();
            });
        }

        // 3. Seed common school / academy designations if empty
        $count = DB::table('designations')->count();
        if ($count === 0) {
            $now = now();
            $defaultDesignations = [
                ['name' => 'Lecturer', 'description' => 'College & Senior Secondary Lecturer', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
                ['name' => 'Senior Teacher', 'description' => 'Senior School Teacher', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
                ['name' => 'Junior Teacher', 'description' => 'Primary / Middle School Teacher', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
                ['name' => 'Subject Specialist', 'description' => 'Specialist for specific subjects', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
                ['name' => 'Head of Department (HOD)', 'description' => 'Department Academic Lead', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
                ['name' => 'Principal', 'description' => 'Campus / Institutional Head', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
                ['name' => 'Vice Principal', 'description' => 'Campus Academic / Admin Vice Head', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
                ['name' => 'Academic Coordinator', 'description' => 'Curriculum and Academic Planner', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
                ['name' => 'Lab Assistant', 'description' => 'Science & Computer Lab Incharge', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
                ['name' => 'Accountant', 'description' => 'Finance & Accounts Officer', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
                ['name' => 'Admin Officer', 'description' => 'General Administration & Operations', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ];
            DB::table('designations')->insert($defaultDesignations);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('users', 'designation_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropForeign(['designation_id']);
                $table->dropColumn('designation_id');
            });
        }

        Schema::dropIfExists('designations');
    }
};
