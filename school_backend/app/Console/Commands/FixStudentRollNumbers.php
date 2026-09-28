<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\AcademicSession;
use Illuminate\Support\Facades\DB;

class FixStudentRollNumbers extends Command
{
    protected $signature = 'fix:roll-numbers';
    protected $description = 'Assign active session and roll numbers to students missing them';

    public function handle()
    {
        $activeSession = AcademicSession::getActiveSession();
        if (!$activeSession) {
            $activeSession = AcademicSession::orderBy('id', 'desc')->first();
        }

        if (!$activeSession) {
            $this->error('No academic session found in the database!');
            return 1;
        }

        $students = User::where('role_id', 3)->whereNull('roll_number')->get();
        if ($students->isEmpty()) {
            $this->info('No students found with a missing roll number.');
            return 0;
        }

        $this->info("Found {$students->count()} students without roll numbers. Fixing...");

        // Group by class to assign unique roll numbers per class
        $groupedByClass = $students->groupBy('class_id');
        $updatedCount = 0;

        foreach ($groupedByClass as $classId => $classStudents) {
            if (!$classId) {
                // For students without a class, just set the session
                foreach ($classStudents as $student) {
                    $student->academic_session_id = $activeSession->id;
                    $student->save();
                    $updatedCount++;
                }
                continue;
            }

            // Find max roll number for this class in the active session
            $maxRoll = User::where('role_id', 3)
                ->where('academic_session_id', $activeSession->id)
                ->where('class_id', $classId)
                ->max(DB::raw('CAST(roll_number AS UNSIGNED)')) ?? 0;

            foreach ($classStudents as $student) {
                $maxRoll++;
                $student->roll_number = $maxRoll;
                $student->academic_session_id = $activeSession->id;
                $student->save();
                $updatedCount++;
            }
        }

        $this->info("Successfully assigned roll numbers and session to {$updatedCount} students.");
        return 0;
    }
}
