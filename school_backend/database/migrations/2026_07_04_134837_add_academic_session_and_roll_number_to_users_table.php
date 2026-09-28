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
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedBigInteger('academic_session_id')->nullable()->after('id');
            $table->unsignedInteger('roll_number')->nullable()->after('academic_session_id');

            $table->foreign('academic_session_id')->references('id')->on('academic_sessions')->onDelete('cascade');
        });

        // Populate existing students with the current active session
        $activeSession = DB::table('academic_sessions')->where('is_active', true)->first();
        if (!$activeSession) {
            $activeSession = DB::table('academic_sessions')->orderBy('id', 'desc')->first();
        }

        if ($activeSession) {
            DB::table('users')->where('role_id', 3)->update([
                'academic_session_id' => $activeSession->id,
                'roll_number' => DB::raw('id') // existing users keep ID as their roll number
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['academic_session_id']);
            $table->dropColumn(['academic_session_id', 'roll_number']);
        });
    }
};
