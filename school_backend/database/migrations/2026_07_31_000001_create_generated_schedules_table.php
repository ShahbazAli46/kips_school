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
        Schema::create('generated_schedules', function (Blueprint $table) {
            $table->id();
            $table->string('title')->default('KIPS SCHOOL CHUNIAN CAMPUS');
            $table->string('class_name')->nullable();
            $table->string('session_name')->nullable();
            $table->json('settings')->nullable();
            $table->json('subjects')->nullable();
            $table->json('holidays')->nullable();
            $table->json('schedule')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('generated_schedules');
    }
};
