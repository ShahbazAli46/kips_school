<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Test;
use App\Models\User;
use Illuminate\Http\Request;

class TestController extends Controller
{
    public function index(Request $request)
    {
        $query = Test::with(['test_category', 'academic_session', 'academyClass', 'section', 'major', 'subject']);
        if ($request->has('test_category_id')) {
            $query->where('test_category_id', $request->test_category_id);
        }
        if ($request->has('academic_session_id')) {
            $query->where('academic_session_id', $request->academic_session_id);
        }
        if ($request->has('academy_class_id')) {
            $query->where('academy_class_id', $request->academy_class_id);
        }
        if ($request->has('subject_id')) {
            $query->where('subject_id', $request->subject_id);
        }
        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'test_category_id' => 'required|exists:test_categories,id',
            'academic_session_id' => 'required|exists:academic_sessions,id',
            'academy_class_id' => 'required|exists:classes,id',
            'section_id' => 'nullable|exists:sections,id',
            'major_id' => 'nullable|exists:majors,id',
            'subject_id' => 'required|exists:subjects,id',
            'date' => 'required|date',
            'total_marks' => 'required|numeric|min:1',
            'passing_marks' => 'nullable|numeric|min:0',
            'syllabus' => 'nullable|string',
            'syllabus_english' => 'nullable|string',
            'syllabus_urdu' => 'nullable|string',
        ]);

        $category = \App\Models\TestCategory::find($validated['test_category_id']);
        $count = Test::where('test_category_id', $validated['test_category_id'])
            ->where('academy_class_id', $validated['academy_class_id'])
            ->where('subject_id', $validated['subject_id'])
            ->where('academic_session_id', $validated['academic_session_id'])
            ->count();
            
        $validated['title'] = $category->name . ' ' . ($count + 1);

        $test = Test::create($validated);
        return response()->json($test, 201);
    }

    public function show(Test $test)
    {
        return response()->json($test->load(['test_category', 'academic_session', 'academyClass', 'section', 'major', 'subject']));
    }

    public function update(Request $request, Test $test)
    {
        $validated = $request->validate([
            'test_category_id' => 'sometimes|exists:test_categories,id',
            'academic_session_id' => 'sometimes|exists:academic_sessions,id',
            'academy_class_id' => 'sometimes|exists:classes,id',
            'section_id' => 'nullable|exists:sections,id',
            'major_id' => 'nullable|exists:majors,id',
            'subject_id' => 'sometimes|exists:subjects,id',
            'title' => 'sometimes|string|max:255',
            'date' => 'sometimes|date',
            'total_marks' => 'sometimes|numeric|min:1',
            'passing_marks' => 'nullable|numeric|min:0',
            'syllabus' => 'nullable|string',
            'syllabus_english' => 'nullable|string',
            'syllabus_urdu' => 'nullable|string',
        ]);

        $test->update($validated);
        return response()->json($test);
    }

    public function destroy(Test $test)
    {
        $test->delete();
        return response()->json(null, 204);
    }

    // Custom endpoint to fetch students for this test to enter marks
    public function students(Request $request, Test $test)
    {
        // Get students in the class
        $query = User::where('role_id', 3)
            ->where('class_id', $test->academy_class_id);

        $sectionId = $request->query('section_id') ?? $test->section_id;
        if ($sectionId) {
            $query->where('section_id', $sectionId);
        }

        // Find which majors are associated with this subject
        $associatedMajorIds = \Illuminate\Support\Facades\DB::table('major_subject')
            ->where('subject_id', $test->subject_id)
            ->pluck('major_id')
            ->toArray();

        // If the subject is associated with any majors, only return students of those majors.
        // Otherwise, it is a common subject, so return all students of the class.
        if (!empty($associatedMajorIds)) {
            $query->whereIn('major_id', $associatedMajorIds);
        }
        
        $students = $query->with(['section', 'major'])
            ->orderByRaw('CASE WHEN roll_number IS NULL THEN 1 ELSE 0 END')
            ->orderByRaw('CAST(roll_number AS UNSIGNED) ASC')
            ->orderBy('name', 'asc')
            ->get();

        // Include any existing marks
        $marks = $test->marks()->get()->keyBy('student_id');

        $result = $students->map(function($student) use ($marks) {
            return [
                'student' => $student,
                'mark' => $marks->get($student->id)
            ];
        });

        return response()->json($result);
    }

    public function bulkImport(Request $request)
    {
        $validated = $request->validate([
            'marks' => 'required|array',
            'marks.*.student_roll_number' => 'required|integer',
            'marks.*.subject_id' => 'required|exists:subjects,id',
            'marks.*.obtained_marks' => 'required|numeric',
            'marks.*.total_marks' => 'required|numeric|min:1',
            'marks.*.test_series_name' => 'required|string',
            'marks.*.class_name' => 'required|string',
        ]);

        \Illuminate\Support\Facades\DB::beginTransaction();
        try {
            // Find active session
            $activeSession = \App\Models\AcademicSession::getActiveSession();
            if (!$activeSession) {
                $activeSession = \App\Models\AcademicSession::first();
                if (!$activeSession) {
                    $activeSession = \App\Models\AcademicSession::create([
                        'name' => date('Y') . '-' . (date('Y') + 1),
                        'start_date' => date('Y-03-01'),
                        'end_date' => (date('Y') + 1) . '-02-28',
                        'is_active' => true,
                    ]);
                }
            }

            $cache = [
                'categories' => [],
                'series' => [],
                'classes' => [],
                'tests' => [],
            ];

            $results = ['imported' => 0];

            // Pre-fetch all valid student records from the CSV based on session and roll number
            $requestedRollNumbers = array_column($validated['marks'], 'student_roll_number');
            $validUsers = \App\Models\User::where('role_id', 3)
                ->where('academic_session_id', $activeSession->id)
                ->whereIn('roll_number', $requestedRollNumbers)
                ->pluck('id', 'roll_number')
                ->toArray();

            foreach ($validated['marks'] as $row) {
                if (!array_key_exists($row['student_roll_number'], $validUsers)) {
                    throw new \Exception("Student Roll Number {$row['student_roll_number']} does not exist in the current session. Import aborted to prevent data corruption.");
                }

                $seriesName = trim($row['test_series_name']);
                
                // Extract category (alpha prefix, e.g., "T" from "T5")
                preg_match('/^[A-Za-z]+/', $seriesName, $matches);
                $categoryName = !empty($matches[0]) ? $matches[0] : 'General';

                // Find or create category
                if (!isset($cache['categories'][$categoryName])) {
                    $cache['categories'][$categoryName] = \App\Models\TestCategory::firstOrCreate(
                        ['short_name' => $categoryName],
                        ['name' => $categoryName]
                    );
                }
                $category = $cache['categories'][$categoryName];

                // Find or create series
                $seriesKey = $seriesName . '_' . $activeSession->id;
                if (!isset($cache['series'][$seriesKey])) {
                    $cache['series'][$seriesKey] = \App\Models\TestSeries::firstOrCreate(
                        ['name' => $seriesName, 'academic_session_id' => $activeSession->id],
                        ['test_category_id' => $category->id]
                    );
                }
                $series = $cache['series'][$seriesKey];

                // Find or create class
                $className = trim($row['class_name']);
                if (!isset($cache['classes'][$className])) {
                    $cls = \App\Models\AcademyClass::where('name', $className)->first();
                    if (!$cls) {
                        $cls = \App\Models\AcademyClass::create(['name' => $className]);
                    }
                    $cache['classes'][$className] = $cls;
                }
                $class = $cache['classes'][$className];

                // Find or create Test
                $testKey = $series->id . '_' . $class->id . '_' . $row['subject_id'];
                if (!isset($cache['tests'][$testKey])) {
                    $cache['tests'][$testKey] = \App\Models\Test::firstOrCreate(
                        [
                            'test_series_id' => $series->id,
                            'academy_class_id' => $class->id,
                            'subject_id' => $row['subject_id'],
                        ],
                        [
                            'title' => $seriesName . ' - ' . (\App\Models\Subject::find($row['subject_id'])->name ?? 'Subject'),
                            'date' => date('Y-m-d'),
                            'total_marks' => $row['total_marks'],
                            'passing_marks' => 0,
                        ]
                    );
                }
                $test = $cache['tests'][$testKey];

                // Save or update Mark
                \App\Models\TestMark::updateOrCreate(
                    [
                        'test_id' => $test->id,
                        'student_id' => $validUsers[$row['student_roll_number']],
                    ],
                    [
                        'obtained_marks' => $row['obtained_marks'],
                        'is_absent' => false,
                    ]
                );

                $results['imported']++;
            }

            \Illuminate\Support\Facades\DB::commit();
            return response()->json(['message' => 'Successfully imported ' . $results['imported'] . ' marks.'], 200);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\DB::rollBack();
            return response()->json(['message' => 'Import failed: ' . $e->getMessage()], 500);
        }
    }
}
