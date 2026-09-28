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

    public function destroy(TestMark $testMark)
    {
        $testMark->delete();
        return response()->json(null, 204);
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
