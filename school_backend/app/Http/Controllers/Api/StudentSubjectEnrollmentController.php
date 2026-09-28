<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StudentSubjectEnrollment;
use App\Models\Subject;
use App\Models\TeacherAssignment;
use App\Models\User;
use Illuminate\Http\Request;

class StudentSubjectEnrollmentController extends Controller
{
    /**
     * Get enrollments for a student for a given month.
     * Also returns all available subjects in their class (via teacher assignments),
     * so the frontend knows what subjects are available to activate.
     */
    public function index(User $student, Request $request)
    {
        if ($student->role_id !== 3) {
            return response()->json(['message' => 'User is not a student'], 400);
        }

        $month = $request->query('month', now()->format('Y-m'));

        // Get subjects linked to the student's major
        $subjectIds = \DB::table('major_subject')
            ->where('major_id', $student->major_id)
            ->pluck('subject_id');

        $subjects = \App\Models\Subject::whereIn('id', $subjectIds)
            ->orderBy('name')
            ->get(['id', 'name']);

        // Get effective enrollments for this student on or before the requested month
        // We find the latest enrollment record per subject on or before $month (or overall latest)
        $enrollments = StudentSubjectEnrollment::where('student_id', $student->id)
            ->whereRaw("month = COALESCE(
                (SELECT MAX(sse2.month) FROM student_subject_enrollments sse2 WHERE sse2.student_id = student_subject_enrollments.student_id AND sse2.subject_id = student_subject_enrollments.subject_id AND sse2.month <= ?),
                (SELECT MAX(sse3.month) FROM student_subject_enrollments sse3 WHERE sse3.student_id = student_subject_enrollments.student_id AND sse3.subject_id = student_subject_enrollments.subject_id)
            )", [$month])
            ->get();

        $enrollments = $enrollments->keyBy('subject_id');

        return response()->json([
            'month' => $month,
            'subjects' => $subjects,
            'enrollments' => $enrollments,
        ]);
    }

    /**
     * Sync student enrollments for a given month.
     * Receives an array of subject entries with is_active and percentage.
     */
    public function sync(User $student, Request $request)
    {
        if ($student->role_id !== 3) {
            return response()->json(['message' => 'User is not a student'], 400);
        }

        $request->validate([
            'month' => 'required|string|size:7', // e.g. "2026-01"
            'enrollments' => 'array',
            'enrollments.*.subject_id' => 'required|exists:subjects,id',
            'enrollments.*.is_active' => 'required|boolean',
            'enrollments.*.percentage' => 'nullable|numeric|min:0|max:100',
        ]);

        $month = $request->month;

        // Delete all enrollments for this student+month and re-insert
        StudentSubjectEnrollment::where('student_id', $student->id)
            ->where('month', $month)
            ->delete();

        $toInsert = [];
        foreach ($request->enrollments as $entry) {
            $toInsert[] = [
                'student_id' => $student->id,
                'subject_id' => $entry['subject_id'],
                'month' => $month,
                'is_active' => $entry['is_active'],
                'percentage' => $entry['percentage'] ?? null,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        if (!empty($toInsert)) {
            StudentSubjectEnrollment::insert($toInsert);
        }

        return response()->json(['message' => 'Enrollments saved successfully']);
    }

    /**
     * Copy previous month's enrollments to a new month (carry-forward).
     */
    public function carryForward(User $student, Request $request)
    {
        if ($student->role_id !== 3) {
            return response()->json(['message' => 'User is not a student'], 400);
        }

        $request->validate([
            'from_month' => 'required|string|size:7',
            'to_month' => 'required|string|size:7',
        ]);

        $existing = StudentSubjectEnrollment::where('student_id', $student->id)
            ->where('month', $request->from_month)
            ->get();

        if ($existing->isEmpty()) {
            return response()->json(['message' => 'No enrollments found for source month'], 404);
        }

        // Don't overwrite if target month already has data
        $alreadyExists = StudentSubjectEnrollment::where('student_id', $student->id)
            ->where('month', $request->to_month)
            ->exists();

        if ($alreadyExists) {
            return response()->json(['message' => 'Target month already has enrollments'], 409);
        }

        $toInsert = $existing->map(fn($e) => [
            'student_id' => $student->id,
            'subject_id' => $e->subject_id,
            'month' => $request->to_month,
            'is_active' => $e->is_active,
            'percentage' => $e->percentage,
            'created_at' => now(),
            'updated_at' => now(),
        ])->toArray();

        StudentSubjectEnrollment::insert($toInsert);

        return response()->json(['message' => 'Enrollments carried forward successfully']);
    }
}
