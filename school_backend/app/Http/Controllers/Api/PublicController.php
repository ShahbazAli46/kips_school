<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\AcademyClass;
use App\Models\Subject;
use App\Models\Test;
use App\Models\ContactMessage;
use App\Models\AcademicSession;
use App\Models\TestCategory;
use App\Models\Major;
use Illuminate\Support\Facades\DB;

class PublicController extends Controller
{
    public function staff()
    {
        $staff = User::where('role_id', 2)
            ->where('is_active', true)
            ->with(['teacherAssignments.subject'])
            ->get(['id', 'name', 'image', 'qualification', 'teaching_exp_year']);
            
        return response()->json($staff);
    }

    public function toppers(Request $request)
    {
        $validated = $request->validate([
            'test_category_id' => 'required',
        ]);

        $activeSession = AcademicSession::getActiveSession();
        if (!$activeSession) {
            return response()->json([]);
        }

        $query = Test::where('academic_session_id', $activeSession->id);

        if ($validated['test_category_id'] !== 'all') {
            if (is_numeric($validated['test_category_id'])) {
                $query->where('test_category_id', $validated['test_category_id']);
            } else {
                $query->whereIn('test_category_id', function($q) use ($validated) {
                    $q->select('id')->from('test_categories')->where('type', $validated['test_category_id']);
                });
            }
        }

        $testIds = $query->pluck('id');

        if ($testIds->isEmpty()) {
            return response()->json([]);
        }

        $results = DB::table('test_marks')
            ->join('tests', 'test_marks.test_id', '=', 'tests.id')
            ->join('users as students', 'test_marks.student_id', '=', 'students.id')
            ->leftJoin('major_subject', function($join) {
                $join->on('students.major_id', '=', 'major_subject.major_id')
                     ->on('tests.subject_id', '=', 'major_subject.subject_id');
            })
            ->leftJoin('classes', 'students.class_id', '=', 'classes.id')
            ->leftJoin('sections', 'students.section_id', '=', 'sections.id')
            ->leftJoin('majors', 'students.major_id', '=', 'majors.id')
            ->where(function($q) {
                $q->whereNull('students.major_id')
                  ->orWhereNotNull('major_subject.major_id');
            })
            ->whereNull('students.deleted_at')
            ->where('students.is_active', 1)
            ->whereIn('tests.id', $testIds)
            ->select(
                'students.id as student_id',
                'students.name as student_name',
                'students.father_name as student_father_name',
                'students.image as student_image',
                'classes.name as class_name',
                'sections.name as section_name',
                'majors.name as major_name',
                DB::raw('SUM(IFNULL(test_marks.obtained_marks, 0)) as total_obtained'),
                DB::raw('SUM(tests.total_marks) as total_max'),
                DB::raw('SUM(CASE WHEN test_marks.is_absent = 1 THEN 1 ELSE 0 END) as total_absents'),
                DB::raw('COUNT(tests.id) as tests_taken')
            )
            ->groupBy('students.id', 'students.name', 'students.father_name', 'students.image', 'classes.name', 'sections.name', 'majors.name')
            ->orderByDesc('total_obtained')
            ->get();

        $grouped = $results->groupBy('class_name');

        $finalResults = [];

        foreach ($grouped as $className => $classStudents) {
            $classStudents = $classStudents->sortByDesc('total_obtained')->values();

            $rank = 1;
            $prevScore = -1;
            $actualRank = 1;
            
            $classTop10 = collect();

            foreach ($classStudents as $item) {
                if ($actualRank > 10) break; // limit to top 10

                $item->total_obtained = (float) $item->total_obtained;
                $item->total_max = (float) $item->total_max;
                $item->percentage = $item->total_max > 0 ? round(($item->total_obtained / $item->total_max) * 100, 2) : 0;
                
                if ($prevScore === -1) {
                    $item->rank = $rank;
                } else if ($item->total_obtained == $prevScore) {
                    $item->rank = $rank;
                } else {
                    $rank = $actualRank;
                    $item->rank = $rank;
                }
                
                $prevScore = $item->total_obtained;
                $actualRank++;
                
                $classTop10->push($item);
            }

            $finalResults[$className ?: 'Unknown Class'] = $classTop10;
        }

        return response()->json($finalResults);
    }

    public function testSchedule()
    {
        $tests = Test::with(['academyClass:id,name', 'section:id,name', 'subject:id,name', 'test_category:id,name,short_name'])
            ->orderBy('date', 'desc')
            ->get();
            
        return response()->json($tests);
    }

    public function classes()
    {
        $classes = AcademyClass::all(['id', 'name']);
        return response()->json($classes);
    }

    public function sessions()
    {
        $sessions = AcademicSession::all(['id', 'name']);
        return response()->json($sessions);
    }

    public function testCategories()
    {
        $categories = TestCategory::all(['id', 'name', 'type']);
        return response()->json($categories);
    }

    public function subjects()
    {
        $subjects = Subject::all(['id', 'name']);
        return response()->json($subjects);
    }

    public function contact(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
            'message' => 'required|string',
        ]);

        $message = ContactMessage::create($data);

        return response()->json([
            'message' => 'Your message has been sent successfully.',
            'data' => $message
        ], 201);
    }

    public function checkResult(Request $request)
    {
        $validated = $request->validate([
            'registration_number' => 'required|string',
        ]);

        // Parse student ID from format USA-0097 or 0097 or 97
        $regNum = $validated['registration_number'];
        $studentId = (int) preg_replace('/[^0-9]/', '', $regNum);

        if (!$studentId) {
            return response()->json(['message' => 'Invalid Registration Number format.'], 400);
        }

        // Verify student exists
        $student = User::where('id', $studentId)->where('role_id', 3)->where('is_active', 1)->first();
        if (!$student) {
            return response()->json(['message' => 'Student not found or inactive.'], 404);
        }

        // Find all unique combinations of session, class, category for this student in test_marks
        $resultSeries = DB::table('test_marks')
            ->join('tests', 'test_marks.test_id', '=', 'tests.id')
            ->join('academic_sessions', 'tests.academic_session_id', '=', 'academic_sessions.id')
            ->join('classes', 'tests.academy_class_id', '=', 'classes.id')
            ->join('test_categories', 'tests.test_category_id', '=', 'test_categories.id')
            ->where('test_marks.student_id', $studentId)
            ->select(
                'tests.academic_session_id',
                'tests.academy_class_id',
                'tests.test_category_id',
                'academic_sessions.name as session_name',
                'classes.name as class_name',
                'test_categories.name as category_name',
                'test_categories.type as category_type'
            )
            ->distinct()
            ->orderBy('tests.academic_session_id', 'desc')
            ->get();

        if ($resultSeries->isEmpty()) {
            return response()->json(['message' => 'No results found for this student.'], 404);
        }

        $studentData = [
            'student_id' => $student->id,
            'student_name' => $student->name,
            'student_father_name' => $student->father_name,
            'student_roll_number' => $student->roll_number,
            'student_image' => $student->image,
            'class_name' => $student->academyClass ? $student->academyClass->name : null,
            'section_name' => $student->section ? $student->section->name : null,
            'major_name' => $student->major ? $student->major->name : null,
        ];

        // Fetch summary for each series
        $seriesData = [];
        foreach ($resultSeries as $series) {
            // Summary logic similar to ResultController
            $summaryQuery = DB::table('test_marks')
                ->join('tests', 'test_marks.test_id', '=', 'tests.id')
                ->join('users as students', 'test_marks.student_id', '=', 'students.id')
                ->leftJoin('major_subject', function($join) {
                    $join->on('students.major_id', '=', 'major_subject.major_id')
                         ->on('tests.subject_id', '=', 'major_subject.subject_id');
                })
                ->where(function($q) {
                    $q->whereNull('students.major_id')
                      ->orWhereNotNull('major_subject.major_id');
                })
                ->where('students.id', $studentId)
                ->where('tests.academic_session_id', $series->academic_session_id)
                ->where('tests.academy_class_id', $series->academy_class_id)
                ->where('tests.test_category_id', $series->test_category_id);

            $summary = $summaryQuery->select(
                DB::raw('SUM(IFNULL(test_marks.obtained_marks, 0)) as total_obtained'),
                DB::raw('SUM(tests.total_marks) as total_max'),
                DB::raw('SUM(CASE WHEN test_marks.is_absent = 1 THEN 1 ELSE 0 END) as total_absents'),
                DB::raw('COUNT(tests.id) as tests_taken')
            )->first();

            if ($summary && $summary->tests_taken > 0) {
                // Calculate rank
                $allScores = DB::table('test_marks')
                    ->join('tests', 'test_marks.test_id', '=', 'tests.id')
                    ->join('users as students', 'test_marks.student_id', '=', 'students.id')
                    ->leftJoin('major_subject', function($join) {
                        $join->on('students.major_id', '=', 'major_subject.major_id')
                             ->on('tests.subject_id', '=', 'major_subject.subject_id');
                    })
                    ->where(function($q) {
                        $q->whereNull('students.major_id')
                          ->orWhereNotNull('major_subject.major_id');
                    })
                    ->where('students.is_active', 1)
                    ->where('tests.academic_session_id', $series->academic_session_id)
                    ->where('tests.academy_class_id', $series->academy_class_id)
                    ->where('tests.test_category_id', $series->test_category_id)
                    ->select('test_marks.student_id', DB::raw('SUM(IFNULL(test_marks.obtained_marks, 0)) as total_obtained'))
                    ->groupBy('test_marks.student_id')
                    ->orderByDesc('total_obtained')
                    ->get();
                
                $rank = 1;
                $prevScore = -1;
                $actualRank = 1;
                $studentRank = 1;
                foreach ($allScores as $score) {
                    if ($prevScore !== -1 && $score->total_obtained != $prevScore) {
                        $rank = $actualRank;
                    }
                    if ($score->student_id == $studentId) {
                        $studentRank = $rank;
                        break;
                    }
                    $prevScore = $score->total_obtained;
                    $actualRank++;
                }

                $totalObtained = (float) $summary->total_obtained;
                $totalMax = (float) $summary->total_max;
                $percentage = $totalMax > 0 ? round(($totalObtained / $totalMax) * 100, 2) : 0;

                $seriesData[] = [
                    'session_id' => $series->academic_session_id,
                    'class_id' => $series->academy_class_id,
                    'category_id' => $series->test_category_id,
                    'session_name' => $series->session_name,
                    'class_name' => $series->class_name,
                    'category_name' => $series->category_name,
                    'category_type' => $series->category_type,
                    'total_obtained' => $totalObtained,
                    'total_max' => $totalMax,
                    'percentage' => $percentage,
                    'tests_taken' => $summary->tests_taken,
                    'total_absents' => $summary->total_absents,
                    'rank' => $studentRank
                ];
            }
        }

        if (empty($seriesData)) {
             return response()->json(['message' => 'No results found for this student.'], 404);
        }

        return response()->json([
            'student' => $studentData,
            'series' => $seriesData
        ]);
    }

    public function studentResultDetails(Request $request)
    {
        $validated = $request->validate([
            'student_id' => 'required|integer',
            'academic_session_id' => 'required|integer',
            'academy_class_id' => 'required|integer',
            'test_category_id' => 'required|integer',
        ]);

        $studentId = $validated['student_id'];
        $student = User::find($studentId);

        if (!$student) {
            return response()->json(['message' => 'Student not found.'], 404);
        }

        $detailsQuery = DB::table('test_marks')
            ->join('tests', 'test_marks.test_id', '=', 'tests.id')
            ->join('subjects', 'tests.subject_id', '=', 'subjects.id')
            ->where('test_marks.student_id', $studentId)
            ->where('tests.academic_session_id', $validated['academic_session_id'])
            ->where('tests.academy_class_id', $validated['academy_class_id'])
            ->where('tests.test_category_id', $validated['test_category_id']);
            
        if ($student->major_id) {
            $detailsQuery->whereIn('tests.subject_id', function ($q) use ($student) {
                $q->select('subject_id')
                  ->from('major_subject')
                  ->where('major_id', $student->major_id);
            });
        }

        $details = $detailsQuery->select(
                'subjects.id as subject_id',
                'subjects.name as subject_name',
                DB::raw('COUNT(tests.id) as tests_taken'),
                DB::raw('SUM(IFNULL(test_marks.obtained_marks, 0)) as total_obtained'),
                DB::raw('SUM(tests.total_marks) as total_max')
            )
            ->groupBy('subjects.id', 'subjects.name')
            ->get();

        $details->transform(function ($item) {
            $item->total_obtained = (float) $item->total_obtained;
            $item->total_max = (float) $item->total_max;
            $item->percentage = $item->total_max > 0 ? round(($item->total_obtained / $item->total_max) * 100, 2) : 0;
            return $item;
        });

        return response()->json($details);
    }

    public function majors()
    {
        $majors = Major::with('subjects:id,name')->get();
        return response()->json($majors);
    }
}
