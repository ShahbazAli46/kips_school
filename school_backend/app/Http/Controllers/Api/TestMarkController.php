<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TestMark;
use Illuminate\Http\Request;

class TestMarkController extends Controller
{
    public function index(Request $request)
    {
        $query = TestMark::with(['test', 'student']);
        if ($request->has('test_id')) {
            $query->where('test_id', $request->test_id);
        }
        if ($request->has('student_id')) {
            $query->where('student_id', $request->student_id);
        }
        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'test_id' => 'required|exists:tests,id',
            'student_id' => 'required|exists:users,id',
            'obtained_marks' => 'nullable|numeric|min:0',
            'is_absent' => 'boolean',
            'remarks' => 'nullable|string',
        ]);

        $markTest = \App\Models\Test::findOrFail($validated['test_id']);
        $this->authorizeForTeacher($request, $markTest);
        $this->validateObtainedAgainstTotal($validated['obtained_marks'] ?? null, $markTest);

        $mark = TestMark::create($validated);

        // Push notification on single test mark create
        try {
            $test = \App\Models\Test::with('subject:id,name')->find($validated['test_id']);
            $student = \App\Models\User::find($validated['student_id']);
            if ($test && $student) {
                $subjectName = $test->subject?->name ?? 'Subject';
                $isAbsent = $validated['is_absent'] ?? false;
                $obtained = $validated['obtained_marks'] ?? 0;
                $scoreText = $isAbsent ? 'Absent' : "{$obtained}/{$test->total_marks}";

                $targetUserIds = \App\Models\User::where('id', $student->id)
                    ->orWhere('contact_number', $student->contact_number)
                    ->orWhere('emergency_contact', $student->contact_number)
                    ->pluck('id')
                    ->unique()
                    ->toArray();

                app(\App\Services\FcmService::class)->sendToUsers(
                    $targetUserIds,
                    "Test Result: {$student->name}",
                    "{$student->name} scored {$scoreText} in {$test->title} ({$subjectName}).",
                    [
                        'type' => 'result',
                        'student_id' => $student->uuid,
                        'student_name' => $student->name,
                        'test_title' => $test->title,
                        'score' => $scoreText,
                    ],
                    'academic_channel',
                    'child_detail',
                    $student->uuid,
                    null,
                    $student->name
                );
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('[TestMark Single Push Error] ' . $e->getMessage());
        }

        return response()->json($mark, 201);
    }

    public function show(TestMark $testMark)
    {
        return response()->json($testMark->load(['test', 'student']));
    }

    public function update(Request $request, TestMark $testMark)
    {
        $validated = $request->validate([
            'obtained_marks' => 'nullable|numeric|min:0',
            'is_absent' => 'boolean',
            'remarks' => 'nullable|string',
        ]);

        $testMark->load('test');
        $this->authorizeForTeacher($request, $testMark->test);
        $this->validateObtainedAgainstTotal($validated['obtained_marks'] ?? $testMark->obtained_marks, $testMark->test);

        $testMark->update($validated);

        // Push notification on mark update
        try {
            $test = $testMark->test()->with('subject:id,name')->first();
            $student = $testMark->student;
            if ($test && $student) {
                $subjectName = $test->subject?->name ?? 'Subject';
                $isAbsent = $testMark->is_absent;
                $obtained = $testMark->obtained_marks ?? 0;
                $scoreText = $isAbsent ? 'Absent' : "{$obtained}/{$test->total_marks}";

                $targetUserIds = \App\Models\User::where('id', $student->id)
                    ->orWhere('contact_number', $student->contact_number)
                    ->orWhere('emergency_contact', $student->contact_number)
                    ->pluck('id')
                    ->unique()
                    ->toArray();

                app(\App\Services\FcmService::class)->sendToUsers(
                    $targetUserIds,
                    "Test Result Updated: {$student->name}",
                    "{$student->name}'s score in {$test->title} ({$subjectName}) has been updated to {$scoreText}.",
                    [
                        'type' => 'result',
                        'student_id' => $student->uuid,
                        'student_name' => $student->name,
                        'test_title' => $test->title,
                        'score' => $scoreText,
                    ],
                    'academic_channel',
                    'child_detail',
                    $student->uuid,
                    null,
                    $student->name
                );
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('[TestMark Update Push Error] ' . $e->getMessage());
        }

        return response()->json($testMark);
    }

    public function destroy(Request $request, TestMark $testMark)
    {
        $this->authorizeForTeacher($request, $testMark->load('test')->test);
        $testMark->delete();
        return response()->json(null, 204);
    }

    /**
     * Blocks teachers (role 2) from managing test marks outside their assignments.
     */
    private function authorizeForTeacher(Request $request, Test $test): void
    {
        $user = $request->user();
        if ((int) $user->role_id === 2 && !$this->matchesTeacherAssignment($test, $user)) {
            abort(403, 'You can only enter marks for your assigned class & subject.');
        }
    }

    /**
     * Whether this test belongs to one of the given teacher's assigned
     * class & subject (section/major compatible).
     */
    private function matchesTeacherAssignment(Test $test, $user): bool
    {
        return \App\Models\TeacherAssignment::where('teacher_id', $user->id)
            ->where('class_id', $test->academy_class_id)
            ->where('subject_id', $test->subject_id)
            ->get()
            ->contains(function ($assignment) use ($test) {
                $sectionOk = $test->section_id === null || $assignment->section_id === null
                    || (int) $test->section_id === (int) $assignment->section_id;

                $majorOk = $test->major_id === null
                    || ($assignment->major_id !== null && (int) $test->major_id === (int) $assignment->major_id);

                return $sectionOk && $majorOk;
            });
    }

    /**
     * Entered marks can never exceed the test's total marks.
     */
    private function validateObtainedAgainstTotal($obtainedMarks, Test $test): void
    {
        if ($obtainedMarks !== null && (float) $obtainedMarks > (float) $test->total_marks) {
            abort(422, "Obtained marks cannot exceed the test's total marks ({$test->total_marks}).");
        }
    }

    // Custom endpoint to bulk store/update marks for a test
    public function bulkStore(Request $request, $test_id)
    {
        $validated = $request->validate([
            'marks' => 'required|array',
            'marks.*.student_id' => 'required|exists:users,id',
            'marks.*.obtained_marks' => 'nullable|numeric|min:0',
            'marks.*.is_absent' => 'nullable|boolean',
            'marks.*.remarks' => 'nullable|string',
        ]);

        $test = \App\Models\Test::findOrFail($test_id);
        $this->authorizeForTeacher($request, $test);

        // Teachers can never submit marks above the test's total
        foreach ($validated['marks'] as $markData) {
            $obtained = $markData['obtained_marks'] ?? null;
            if ($obtained !== null && (float) $obtained > (float) $test->total_marks) {
                abort(422, "Obtained marks cannot exceed the test's total marks ({$test->total_marks}).");
            }
        }

        $now = now();

        $rows = array_map(function ($markData) use ($test_id, $test, $now) {
            $obtained = $markData['obtained_marks'] ?? null;
            $absent = $markData['is_absent'] ?? false;
            $grade = null;

            // Calculate grade (same logic as TestMark::booted)
            if (!$absent && $obtained !== null && $test->total_marks > 0) {
                $percentage = ($obtained / $test->total_marks) * 100;
                if ($percentage >= 80) $grade = 'A+';
                elseif ($percentage >= 70) $grade = 'A';
                elseif ($percentage >= 60) $grade = 'B';
                elseif ($percentage >= 50) $grade = 'C';
                elseif ($percentage >= 40) $grade = 'D';
                else $grade = 'F';
            }

            return [
                'test_id' => $test_id,
                'student_id' => $markData['student_id'],
                'obtained_marks' => $obtained,
                'is_absent' => $absent,
                'remarks' => $markData['remarks'] ?? null,
                'grade' => $grade,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }, $validated['marks']);

        TestMark::upsert(
            $rows,
            ['test_id', 'student_id'], // unique key for matching existing rows
            ['obtained_marks', 'is_absent', 'remarks', 'grade', 'updated_at'] // columns to update
        );

        // Dispatch Push Notification to parents/students
        try {
            $test->load('subject:id,name');
            $subjectName = $test->subject?->name ?? 'Subject';

            foreach ($validated['marks'] as $markData) {
                $student = \App\Models\User::find($markData['student_id']);
                if ($student) {
                    $targetUserIds = \App\Models\User::where('id', $student->id)
                        ->orWhere('contact_number', $student->contact_number)
                        ->orWhere('emergency_contact', $student->contact_number)
                        ->pluck('id')
                        ->unique()
                        ->toArray();

                    $isAbsent = $markData['is_absent'] ?? false;
                    $obtained = $markData['obtained_marks'] ?? 0;
                    $scoreText = $isAbsent ? 'Absent' : "{$obtained}/{$test->total_marks}";

                    app(\App\Services\FcmService::class)->sendToUsers(
                        $targetUserIds,
                        "Test Result: {$student->name}",
                        "{$student->name} scored {$scoreText} in {$test->title} ({$subjectName}).",
                        [
                            'type' => 'result',
                            'student_id' => $student->uuid,
                            'student_name' => $student->name,
                            'test_title' => $test->title,
                            'score' => $scoreText,
                        ],
                        'academic_channel',
                        'child_detail',
                        $student->uuid,
                        null,
                        $student->name
                    );
                }
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('[TestMark Push Error] ' . $e->getMessage());
        }

        return response()->json(['message' => 'Marks saved successfully']);
    }
}
