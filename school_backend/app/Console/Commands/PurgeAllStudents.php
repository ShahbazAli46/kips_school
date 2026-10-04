<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Cache;

class PurgeAllStudents extends Command
{
    protected $signature = 'students:purge';
    protected $description = 'Safely purge all student records, enrollments, fee records, and test marks';

    public function handle()
    {
        $this->info('Starting student purge...');

        $studentIds = User::withTrashed()->where('role_id', 3)->pluck('id')->toArray();
        $count = count($studentIds);

        if ($count === 0) {
            $this->info('No students found in the database.');
            return 0;
        }

        $this->warn("Found {$count} student records to purge. Proceeding...");

        DB::statement('SET FOREIGN_KEY_CHECKS=0;');

        $deletedFeeItems = DB::table('student_fee_items')->whereIn('student_id', $studentIds)->delete();
        $deletedPaymentItems = DB::table('fee_payment_items')->whereIn('fee_payment_id', function ($q) use ($studentIds) {
            $q->select('id')->from('fee_payments')->whereIn('student_id', $studentIds);
        })->delete();
        $deletedPayments = DB::table('fee_payments')->whereIn('student_id', $studentIds)->delete();
        $deletedEnrollments = DB::table('student_session_enrollments')->whereIn('student_id', $studentIds)->delete();

        if (Schema::hasTable('student_subject_enrollments')) {
            DB::table('student_subject_enrollments')->whereIn('student_id', $studentIds)->delete();
        }

        $deletedTestMarks = DB::table('test_marks')->whereIn('student_id', $studentIds)->delete();

        if (Schema::hasTable('attendance')) {
            DB::table('attendance')->whereIn('student_id', $studentIds)->delete();
        }

        if (Schema::hasTable('follow_ups')) {
            DB::table('follow_ups')->whereIn('student_id', $studentIds)->delete();
        }

        if (Schema::hasTable('notifications')) {
            DB::table('notifications')->whereIn('notifiable_id', $studentIds)->delete();
        }

        $deletedUsers = DB::table('users')->whereIn('id', $studentIds)->delete();

        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        Cache::increment('students_cache_version');

        $this->info("Successfully deleted {$deletedUsers} student user accounts.");
        $this->info("Remaining Students: " . User::withTrashed()->where('role_id', 3)->count());
        $this->info("Remaining Staff/Admins: " . User::withTrashed()->where('role_id', '!=', 3)->count());

        return 0;
    }
}
