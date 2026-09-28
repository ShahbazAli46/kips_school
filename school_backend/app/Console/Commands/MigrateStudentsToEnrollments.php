<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\StudentSessionEnrollment;

class MigrateStudentsToEnrollments extends Command
{
    protected $signature = 'migrate:student-enrollments';
    protected $description = 'Migrate existing students data from users table to student_session_enrollments table';

    public function handle()
    {
        $students = User::where('role_id', 3)->whereNotNull('academic_session_id')->get();
        if ($students->isEmpty()) {
            $this->info('No students to migrate.');
            return 0;
        }

        $this->info("Found {$students->count()} students. Migrating to enrollments...");

        $migrated = 0;
        foreach ($students as $student) {
            // Check if enrollment already exists to prevent duplicate
            $exists = StudentSessionEnrollment::where('student_id', $student->id)
                ->where('academic_session_id', $student->academic_session_id)
                ->exists();

            if (!$exists) {
                StudentSessionEnrollment::create([
                    'student_id' => $student->id,
                    'academic_session_id' => $student->academic_session_id,
                    'class_id' => $student->class_id,
                    'section_id' => $student->section_id,
                    'major_id' => $student->major_id,
                    'roll_number' => $student->roll_number,
                    'monthly_fee' => $student->monthly_fee,
                ]);
                $migrated++;
            }
        }

        $this->info("Successfully migrated {$migrated} enrollments.");
        return 0;
    }
}
