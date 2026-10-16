<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Test;

class ResultController extends Controller
{
    public function getAvailableRounds(Request $request)
    {
        $validated = $request->validate([
            'academic_session_id' => 'required|exists:academic_sessions,id',
            'academy_class_id' => 'required|exists:classes,id',
            'test_category_id' => 'required',
            'section_id' => 'nullable',
        ]);

        $query = DB::table('tests')
            ->where('academic_session_id', $validated['academic_session_id'])
            ->where('academy_class_id', $validated['academy_class_id']);

        if (!empty($validated['section_id']) && $validated['section_id'] !== 'all') {
            $query->where(function($q) use ($validated) {
                $q->where('section_id', $validated['section_id'])
                  ->orWhereNull('section_id');
            });
        }

        if ($validated['test_category_id'] !== 'all') {
            if (is_numeric($validated['test_category_id'])) {
                $query->where('test_category_id', $validated['test_category_id']);
            } else {
                $query->whereIn('test_category_id', function($q) use ($validated) {
                    $q->select('id')->from('test_categories')->where('type', $validated['test_category_id']);
                });
            }
        }

        // Distinct test titles in database ordered by test date
        $dbTitles = $query->whereNotNull('title')
            ->orderBy('date', 'asc')
            ->pluck('title')
            ->unique()
            ->values()
            ->toArray();

        // Also build standard template round names matching Excel (up to 5 rounds for regular tests)
        $categoryName = null;
        $categoryType = null;
        if (is_numeric($validated['test_category_id'])) {
            $catRecord = DB::table('test_categories')->where('id', $validated['test_category_id'])->first();
            $categoryName = $catRecord ? $catRecord->name : null;
            $categoryType = $catRecord ? $catRecord->type : null;
        } else {
            $categoryType = $validated['test_category_id'];
        }

        $isRnt = ($categoryType === 'rnt' || 
                  ($categoryName && (stripos($categoryName, 'r n t') !== false || stripos($categoryName, 'r&t') !== false)));

        if ($isRnt) {
            $rounds = array_values(array_unique($dbTitles));
        } else {
            $defaultRoundNames = [
                "Round 1",
                "Round 2",
                "Round 3",
                "Round 4",
                "Round 5"
            ];
            if ($categoryName && !in_array($categoryName, $defaultRoundNames)) {
                array_unshift($defaultRoundNames, $categoryName);
            }

            $rounds = array_values(array_unique($dbTitles));
            foreach ($defaultRoundNames as $defName) {
                if (count($rounds) >= 5) break;
                if (!in_array($defName, $rounds)) {
                    $rounds[] = $defName;
                }
            }
            $rounds = array_values(array_unique($rounds));
        }

        $classId = $validated['academy_class_id'];
        $studentsQuery = DB::table('users')
            ->where('class_id', $classId)
            ->whereNull('deleted_at')
            ->where('is_active', 1);

        if (!empty($validated['section_id']) && $validated['section_id'] !== 'all') {
            $studentsQuery->where('section_id', $validated['section_id']);
        }
        $students = $studentsQuery->get();

        $majorIds = $students->pluck('major_id')->filter()->unique();
        $majorSubjects = [];
        if ($majorIds->isNotEmpty()) {
            $msRows = DB::table('major_subject')->whereIn('major_id', $majorIds)->get();
            foreach ($msRows as $row) {
                $majorSubjects[$row->major_id][] = $row->subject_id;
            }
        }

        $roundStatuses = [];
        $activeRounds = [];
        $completedRounds = [];
        $partialRounds = [];

        // 1. Single batch query for all tests across all rounds in this session/class
        $allTests = $query->whereNotNull('title')->get();
        $testsByTitle = $allTests->groupBy('title');

        // 2. Single batch query for all test marks using the covering index
        $allTestIds = $allTests->pluck('id');
        $marksByStudentAndTest = [];
        $testsWithMarksMap = [];

        if ($allTestIds->isNotEmpty()) {
            $marksRows = DB::table('test_marks')
                ->whereIn('test_id', $allTestIds)
                ->where(function ($q) {
                    $q->whereNotNull('obtained_marks')
                      ->orWhere('is_absent', 1);
                })
                ->select('test_id', 'student_id')
                ->get();

            foreach ($marksRows as $m) {
                $marksByStudentAndTest[$m->student_id][$m->test_id] = true;
                $testsWithMarksMap[$m->test_id] = true;
            }
        }

        // 3. Fast in-memory evaluation for each round - zero additional DB queries
        foreach ($rounds as $rTitle) {
            $rTests = $testsByTitle->get($rTitle, collect());

            if ($rTests->isEmpty()) {
                $roundStatuses[$rTitle] = [
                    'status' => 'template',
                    'entered' => 0,
                    'total' => 0,
                ];
                continue;
            }

            $testIds = $rTests->pluck('id');
            $hasAnyMarks = false;
            foreach ($testIds as $tId) {
                if (isset($testsWithMarksMap[$tId])) {
                    $hasAnyMarks = true;
                    break;
                }
            }

            $studentTotals = [];
            $studentEntered = [];

            if ($students->isNotEmpty()) {
                foreach ($students as $student) {
                    $appTests = $rTests->filter(function ($t) use ($student, $majorSubjects) {
                        if ($t->section_id && $student->section_id && $t->section_id != $student->section_id) {
                            return false;
                        }
                        if ($t->major_id && $student->major_id && $t->major_id != $student->major_id) {
                            return false;
                        }
                        if ($student->major_id && isset($majorSubjects[$student->major_id])) {
                            if (!in_array($t->subject_id, $majorSubjects[$student->major_id])) {
                                return false;
                            }
                        }
                        return true;
                    });

                    $appTestIds = $appTests->pluck('id')->toArray();
                    $sMarksMap = $marksByStudentAndTest[$student->id] ?? [];

                    $totalCount = count($appTestIds);
                    $enteredCount = 0;
                    foreach ($appTestIds as $tId) {
                        if (isset($sMarksMap[$tId])) {
                            $enteredCount++;
                        }
                    }

                    if ($totalCount > 0) {
                        $studentTotals[] = $totalCount;
                        $studentEntered[] = $enteredCount;
                    }
                }
            }

            if (!empty($studentTotals)) {
                $totalSubjects = (int) round(collect($studentTotals)->avg());
                $enteredSubjects = (int) round(collect($studentEntered)->avg());
            } else {
                $totalSubjects = $rTests->pluck('subject_id')->unique()->count();
                $enteredSubjects = 0;
                foreach ($testIds as $tId) {
                    if (isset($testsWithMarksMap[$tId])) {
                        $enteredSubjects++;
                    }
                }
            }

            if ($totalSubjects > 0 && $enteredSubjects >= $totalSubjects) {
                $status = 'completed';
                $completedRounds[] = $rTitle;
                $activeRounds[] = $rTitle;
            } elseif ($enteredSubjects > 0 || $hasAnyMarks) {
                $status = 'partial';
                $partialRounds[] = $rTitle;
                $activeRounds[] = $rTitle;
            } else {
                $status = 'template';
            }

            $roundStatuses[$rTitle] = [
                'status' => $status,
                'entered' => $enteredSubjects,
                'total' => $totalSubjects,
            ];
        }

        return response()->json([
            'rounds' => array_values(array_unique($rounds)),
            'active_rounds' => array_values(array_unique($activeRounds)),
            'completed_rounds' => array_values(array_unique($completedRounds)),
            'partial_rounds' => array_values(array_unique($partialRounds)),
            'round_statuses' => $roundStatuses,
        ]);
    }

    public function getSeriesResults(Request $request)
    {
        $validated = $request->validate([
            'academic_session_id' => 'required|exists:academic_sessions,id',
            'academy_class_id' => 'required|exists:classes,id',
            'test_category_id' => 'required',
            'section_id' => 'nullable',
        ]);

        $query = Test::where('academic_session_id', $validated['academic_session_id'])
            ->where('academy_class_id', $validated['academy_class_id']);

        if ($validated['test_category_id'] !== 'all') {
            if (is_numeric($validated['test_category_id'])) {
                $query->where('test_category_id', $validated['test_category_id']);
            } else {
                $query->whereIn('test_category_id', function($q) use ($validated) {
                    $q->select('id')->from('test_categories')->where('type', $validated['test_category_id']);
                });
            }
        }

        if ($request->filled('rounds')) {
            $selectedRounds = is_array($request->rounds) ? $request->rounds : explode(',', $request->rounds);
            $selectedRounds = array_filter(array_map('trim', $selectedRounds));
            if (!empty($selectedRounds)) {
                $query->whereIn('title', $selectedRounds);
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
            ->whereIn('tests.id', $testIds);

        if (!empty($validated['section_id'])) {
            $results->where('students.section_id', $validated['section_id']);
        }

        $results = $results->select(
                'students.id as student_id',
                'students.name as student_name',
                'students.father_name as student_father_name',
                'students.roll_number as student_roll_number',
                'students.image as student_image',
                'students.class_id as class_id',
                'students.section_id as section_id',
                'classes.name as class_name',
                'sections.name as section_name',
                'majors.name as major_name',
                DB::raw('SUM(IFNULL(test_marks.obtained_marks, 0)) as total_obtained'),
                DB::raw('SUM(tests.total_marks) as total_max'),
                DB::raw('SUM(CASE WHEN test_marks.is_absent = 1 THEN 1 ELSE 0 END) as total_absents'),
                DB::raw('COUNT(tests.id) as tests_taken'),
                DB::raw('MIN(tests.date) as min_test_date')
            )
            ->groupBy('students.id', 'students.name', 'students.father_name', 'students.roll_number', 'students.image', 'students.class_id', 'students.section_id', 'classes.name', 'sections.name', 'majors.name');

        // Determine how many rounds are selected. Rank is ALWAYS computed from
        // percentage order, so the base query is ordered by percentage descending.
        // If exactly one round is selected, the final list is re-ordered by test
        // date (oldest first) after ranks are assigned.
        $selectedRoundsCount = 0;
        if ($request->filled('rounds')) {
            $parsedRounds = is_array($request->rounds) ? $request->rounds : explode(',', $request->rounds);
            $selectedRoundsCount = count(array_filter(array_map('trim', $parsedRounds)));
        }

        $results->orderByRaw('(SUM(IFNULL(test_marks.obtained_marks, 0)) / NULLIF(SUM(tests.total_marks), 0)) DESC');

        $results = $results->get();

        $rank = 1;
        $prevScore = -1;
        $actualRank = 1;

        $sessionName = DB::table('academic_sessions')->where('id', $validated['academic_session_id'])->value('name');

        $teacherAssignments = DB::table('teacher_assignments')
            ->join('users as teachers', 'teacher_assignments.teacher_id', '=', 'teachers.id')
            ->where('teacher_assignments.class_id', $validated['academy_class_id'])
            ->whereNull('teachers.deleted_at')
            ->orderBy('teacher_assignments.is_class_incharge', 'desc')
            ->orderByRaw('CASE WHEN teachers.signature IS NOT NULL THEN 0 ELSE 1 END')
            ->select('teacher_assignments.section_id', 'teacher_assignments.is_class_incharge', 'teachers.id', 'teachers.name', 'teachers.signature')
            ->get();

        $results->transform(function ($item, $key) use (&$rank, &$prevScore, &$actualRank, $sessionName, $teacherAssignments) {
            $item->total_obtained = (float) $item->total_obtained;
            $item->total_max = (float) $item->total_max;
            $item->percentage = $item->total_max > 0 ? round(($item->total_obtained / $item->total_max) * 100, 2) : 0;
            $item->session_name = $sessionName;

            // Priority for Class Incharge:
            // 1. Incharge assigned specifically to this student's section
            // 2. Incharge assigned to the entire class (section_id is null)
            // 3. Any incharge assigned to this class
            // 4. Any teacher assigned to this student's section
            // 5. Any teacher assigned to this class
            $assigned = $teacherAssignments->first(function($t) use ($item) {
                return !empty($t->section_id) && !empty($item->section_id) && $t->section_id == $item->section_id && $t->is_class_incharge;
            }) ?: $teacherAssignments->first(function($t) {
                return empty($t->section_id) && $t->is_class_incharge;
            }) ?: $teacherAssignments->first(function($t) {
                return (bool) $t->is_class_incharge;
            }) ?: $teacherAssignments->first(function($t) use ($item) {
                return !empty($t->section_id) && !empty($item->section_id) && $t->section_id == $item->section_id;
            }) ?: $teacherAssignments->first();

            $item->class_incharge = $assigned ? $assigned->name : null;
            $item->teacher_signature = ($assigned && $assigned->signature)
                ? (str_starts_with($assigned->signature, 'http') ? $assigned->signature : asset('storage/' . $assigned->signature))
                : null;

            if ($prevScore === -1) {
                $item->rank = $rank;
            } else if ($item->percentage == $prevScore) {
                $item->rank = $rank;
            } else {
                $rank = $actualRank;
                $item->rank = $rank;
            }
            
            $prevScore = $item->percentage;
            $actualRank++;
            
            return $item;
        });

        // If exactly one round is selected, re-order the final list by test date
        // (oldest first) for display, while keeping the percentage-based ranks.
        if ($selectedRoundsCount === 1) {
            $results = $results->sortBy('min_test_date')->values();
        }

        return response()->json($results);
    }

    public function getSummarySheetResults(Request $request)
    {
        $validated = $request->validate([
            'academic_session_id' => 'required|exists:academic_sessions,id',
            'academy_class_id' => 'required|exists:classes,id',
            'test_category_id' => 'required',
            'section_id' => 'nullable',
        ]);

        $session = DB::table('academic_sessions')->where('id', $validated['academic_session_id'])->first();
        $class = DB::table('classes')->where('id', $validated['academy_class_id'])->first();
        $section = (!empty($validated['section_id']) && $validated['section_id'] !== 'all')
            ? DB::table('sections')->where('id', $validated['section_id'])->first()
            : null;

        // Base query for tests
        $testQuery = DB::table('tests')
            ->where('academic_session_id', $validated['academic_session_id'])
            ->where('academy_class_id', $validated['academy_class_id']);

        if (!empty($validated['section_id']) && $validated['section_id'] !== 'all') {
            $testQuery->where(function($q) use ($validated) {
                $q->where('section_id', $validated['section_id'])
                  ->orWhereNull('section_id');
            });
        }

        $categoryName = null;
        $categoryType = null;
        if ($validated['test_category_id'] !== 'all') {
            if (is_numeric($validated['test_category_id'])) {
                $testQuery->where('test_category_id', $validated['test_category_id']);
                $catRecord = DB::table('test_categories')->where('id', $validated['test_category_id'])->first();
                $categoryName = $catRecord ? $catRecord->name : null;
                $categoryType = $catRecord ? $catRecord->type : null;
            } else {
                $categoryType = $validated['test_category_id'];
                $testQuery->whereIn('test_category_id', function($q) use ($validated) {
                    $q->select('id')->from('test_categories')->where('type', $validated['test_category_id']);
                });
            }
        }

        $allTests = $testQuery->whereNotNull('title')->orderBy('date', 'asc')->get();

        // Distinct rounds from database
        $dbRounds = $allTests->pluck('title')->filter()->unique()->values()->toArray();

        // Check if rounds are filtered via request parameter
        $requestedRounds = null;
        if ($request->filled('rounds') && $request->rounds !== 'none') {
            $requestedRounds = is_array($request->rounds) ? $request->rounds : explode(',', $request->rounds);
            $requestedRounds = array_filter(array_map('trim', $requestedRounds));
        }

        $isRnt = ($categoryType === 'rnt' || 
                  ($categoryName && (stripos($categoryName, 'r n t') !== false || stripos($categoryName, 'r&t') !== false)));

        if (!empty($requestedRounds)) {
            $rounds = array_values(array_unique($requestedRounds));
        } elseif ($isRnt) {
            $rounds = array_values(array_unique($dbRounds));
        } else {
            // Standard 5 rounds padding matching Excel Summary Sheet template
            $defaultRoundNames = [
                "Round 1",
                "Round 2",
                "Round 3",
                "Round 4",
                "Round 5"
            ];
            if ($categoryName && !in_array($categoryName, $defaultRoundNames)) {
                array_unshift($defaultRoundNames, $categoryName);
            }

            $rounds = array_values(array_unique($dbRounds));
            foreach ($defaultRoundNames as $defName) {
                if (count($rounds) >= 5) break;
                if (!in_array($defName, $rounds)) {
                    $rounds[] = $defName;
                }
            }
            $rounds = array_values(array_unique($rounds));
        }

        // Subjects: find all subjects that have tests or belong to class
        $subjectIds = $allTests->pluck('subject_id')->unique()->values();
        $classSubjectIds = DB::table('class_subject')->where('class_id', $validated['academy_class_id'])->pluck('subject_id');
        $allSubjectIds = $subjectIds->merge($classSubjectIds)->unique()->values();

        $subjectOrder = [
            'english' => 1,
            'urdu' => 2,
            'nazra' => 3,
            'islamiyat' => 4,
            'islamiat' => 4,
            'mathematics' => 5,
            'math' => 5,
            'maths' => 5,
            'social studies' => 6,
            'pak studies' => 6,
            'general science' => 7,
            'science' => 7,
            'amazing world' => 8,
            'general knowledge' => 8,
            'computer' => 9,
            'biology' => 10,
            'chemistry' => 11,
            'physics' => 12,
        ];

        $subjects = DB::table('subjects')
            ->whereIn('id', $allSubjectIds)
            ->get()
            ->sortBy(function($sub) use ($subjectOrder) {
                $nameLower = strtolower(trim($sub->name));
                return $subjectOrder[$nameLower] ?? (100 + $sub->id);
            })
            ->values();

        // If no subjects from tests, fetch all subjects for class
        if ($subjects->isEmpty()) {
            $subjects = DB::table('subjects')
                ->get()
                ->sortBy(function($sub) use ($subjectOrder) {
                    $nameLower = strtolower(trim($sub->name));
                    return $subjectOrder[$nameLower] ?? (100 + $sub->id);
                })
                ->values()
                ->take(8);
        }

        // Active students in class / section
        $studentsQuery = DB::table('users as students')
            ->leftJoin('sections', 'students.section_id', '=', 'sections.id')
            ->leftJoin('majors', 'students.major_id', '=', 'majors.id')
            ->where('students.class_id', $validated['academy_class_id'])
            ->whereNull('students.deleted_at')
            ->where('students.is_active', 1);

        if (!empty($validated['section_id']) && $validated['section_id'] !== 'all') {
            $studentsQuery->where('students.section_id', $validated['section_id']);
        }

        $students = $studentsQuery->select(
                'students.id',
                'students.name',
                'students.father_name',
                'students.roll_number',
                'students.section_id',
                'students.major_id',
                'sections.name as section_name',
                'majors.name as major_name'
            )
            ->orderByRaw('CAST(students.roll_number AS UNSIGNED) ASC, students.roll_number ASC')
            ->get();

        // Major subjects mapping
        $majorIds = $students->pluck('major_id')->filter()->unique();
        $majorSubjects = [];
        if ($majorIds->isNotEmpty()) {
            $msRows = DB::table('major_subject')->whereIn('major_id', $majorIds)->get();
            foreach ($msRows as $row) {
                $majorSubjects[$row->major_id][] = $row->subject_id;
            }
        }

        // Pre-fetch all marks
        $allTestIds = $allTests->pluck('id');
        $marksByStudentAndTest = [];
        if ($allTestIds->isNotEmpty() && $students->isNotEmpty()) {
            $marksRows = DB::table('test_marks')
                ->whereIn('test_id', $allTestIds)
                ->whereIn('student_id', $students->pluck('id'))
                ->select('test_id', 'student_id', 'obtained_marks', 'is_absent')
                ->get();

            foreach ($marksRows as $m) {
                $marksByStudentAndTest[$m->student_id][$m->test_id] = [
                    'obtained_marks' => $m->obtained_marks !== null ? (float) $m->obtained_marks : null,
                    'is_absent' => (bool) $m->is_absent,
                ];
            }
        }

        // Map tests by subject_id and title (round title)
        $testsBySubjectAndRound = [];
        foreach ($allTests as $t) {
            $testsBySubjectAndRound[$t->subject_id][$t->title] = $t;
        }

        // Build subject metadata (round conduction dates & max marks)
        $subjectsData = [];
        $grandTotalMaxMarks = 0;

        foreach ($subjects as $subject) {
            $subRounds = [];
            $subTotalMax = 0;

            foreach ($rounds as $rTitle) {
                $test = $testsBySubjectAndRound[$subject->id][$rTitle] ?? null;
                $dateFormatted = '';
                $maxMarks = 0;

                if ($test) {
                    $maxMarks = (float) $test->total_marks;
                    $subTotalMax += $maxMarks;
                    if (!empty($test->date)) {
                        $dateFormatted = date('d/m', strtotime($test->date));
                    }
                }

                $subRounds[] = [
                    'round_title' => $rTitle,
                    'short_title' => preg_match('/Round\s*(\d+)/i', $rTitle, $m) ? ('R-' . $m[1]) : (str_starts_with($rTitle, 'R-') ? $rTitle : substr($rTitle, 0, 5)),
                    'date' => $dateFormatted,
                    'max_marks' => $maxMarks,
                    'has_test' => (bool) $test,
                ];
            }

            $grandTotalMaxMarks += $subTotalMax;

            $subjectsData[] = [
                'id' => $subject->id,
                'name' => $subject->name,
                'rounds' => $subRounds,
                'total_max_marks' => $subTotalMax,
            ];
        }

        // Build Student Results
        $studentRows = [];

        foreach ($students as $student) {
            $studentSubjectMarks = [];
            $grandTotalObtained = 0;
            $grandStudentMax = 0;

            foreach ($subjectsData as $subMeta) {
                $subId = $subMeta['id'];
                $subObtained = 0;
                $subMax = 0;
                $roundMarksList = [];

                // Check if this subject applies to student's major
                $isSubjectApplicable = true;
                if ($student->major_id && isset($majorSubjects[$student->major_id])) {
                    if (!in_array($subId, $majorSubjects[$student->major_id])) {
                        $isSubjectApplicable = false;
                    }
                }

                foreach ($rounds as $rTitle) {
                    $test = $testsBySubjectAndRound[$subId][$rTitle] ?? null;
                    $obtained = null;
                    $isAbsent = false;

                    if ($test && $isSubjectApplicable) {
                        // Check section filter for this test if applicable
                        if (empty($test->section_id) || empty($student->section_id) || $test->section_id == $student->section_id) {
                            $subMax += (float) $test->total_marks;
                            $mInfo = $marksByStudentAndTest[$student->id][$test->id] ?? null;
                            if ($mInfo) {
                                if ($mInfo['is_absent']) {
                                    $isAbsent = true;
                                    $obtained = 0;
                                } else if ($mInfo['obtained_marks'] !== null) {
                                    $obtained = (float) $mInfo['obtained_marks'];
                                    $subObtained += $obtained;
                                }
                            }
                        }
                    }

                    $roundMarksList[] = [
                        'round_title' => $rTitle,
                        'obtained_marks' => $obtained,
                        'is_absent' => $isAbsent,
                    ];
                }

                $subPercentage = $subMax > 0 ? round(($subObtained / $subMax) * 100, 2) : 0;
                $subGrade = '-';
                if ($subMax > 0) {
                    if ($subPercentage >= 90) $subGrade = 'A+';
                    elseif ($subPercentage >= 80) $subGrade = 'A';
                    elseif ($subPercentage >= 70) $subGrade = 'B';
                    elseif ($subPercentage >= 60) $subGrade = 'C';
                    elseif ($subPercentage >= 40) $subGrade = 'D';
                    else $subGrade = 'Fail';
                }

                $studentSubjectMarks[$subId] = [
                    'rounds' => $roundMarksList,
                    'total_obtained' => $subObtained,
                    'total_max' => $subMax,
                    'percentage' => $subPercentage,
                    'grade' => $subGrade,
                ];

                $grandTotalObtained += $subObtained;
                $grandStudentMax += $subMax;
            }

            $effectiveMax = $grandStudentMax > 0 ? $grandStudentMax : $grandTotalMaxMarks;
            $grandPercentage = $effectiveMax > 0 ? round(($grandTotalObtained / $effectiveMax) * 100, 2) : 0;
            
            $grandGrade = 'Fail';
            if ($effectiveMax > 0) {
                if ($grandPercentage >= 90) $grandGrade = 'A+';
                elseif ($grandPercentage >= 80) $grandGrade = 'A';
                elseif ($grandPercentage >= 70) $grandGrade = 'B';
                elseif ($grandPercentage >= 60) $grandGrade = 'C';
                elseif ($grandPercentage >= 40) $grandGrade = 'D';
                else $grandGrade = 'Fail';
            }

            $studentRows[] = [
                'student_id' => $student->id,
                'student_name' => $student->name,
                'father_name' => $student->father_name,
                'roll_number' => $student->roll_number,
                'section_name' => $student->section_name,
                'subjects' => $studentSubjectMarks,
                'grand_total_obtained' => $grandTotalObtained,
                'grand_total_max' => $effectiveMax,
                'percentage' => $grandPercentage,
                'grade' => $grandGrade,
                'position' => null,
            ];
        }

        // Calculate Ranks
        $rankedList = collect($studentRows)->sortByDesc(function($s) {
            return $s['percentage'] * 100000 + $s['grand_total_obtained'];
        })->values();

        $rank = 1;
        $prevScore = -1;
        $actualRank = 1;
        $rankMap = [];

        foreach ($rankedList as $item) {
            $score = $item['percentage'];
            if ($prevScore === -1) {
                $assignedRank = $rank;
            } elseif ($score == $prevScore) {
                $assignedRank = $rank;
            } else {
                $rank = $actualRank;
                $assignedRank = $rank;
            }
            $prevScore = $score;
            $actualRank++;

            // Only assign rank if student took at least one test / has score > 0
            $rankMap[$item['student_id']] = ($item['grand_total_obtained'] > 0 || $item['percentage'] > 0) ? $assignedRank : '-';
        }

        // Apply ranks back to studentRows in roll number order
        foreach ($studentRows as &$sRow) {
            $sRow['position'] = $rankMap[$sRow['student_id']] ?? '-';
        }
        unset($sRow);

        // Teacher / Incharge assignment
        $teacherAssignments = DB::table('teacher_assignments')
            ->join('users as teachers', 'teacher_assignments.teacher_id', '=', 'teachers.id')
            ->where('teacher_assignments.class_id', $validated['academy_class_id'])
            ->whereNull('teachers.deleted_at')
            ->orderBy('teacher_assignments.is_class_incharge', 'desc')
            ->select('teacher_assignments.section_id', 'teacher_assignments.is_class_incharge', 'teachers.name')
            ->get();

        $assigned = $teacherAssignments->first(function($t) use ($validated) {
            return !empty($validated['section_id']) && $t->section_id == $validated['section_id'] && $t->is_class_incharge;
        }) ?: $teacherAssignments->first(function($t) {
            return empty($t->section_id) && $t->is_class_incharge;
        }) ?: $teacherAssignments->first();

        // -------------------------------------------------------------
        // Section Summary Analytics & Grade Distribution
        // -------------------------------------------------------------
        $appearedStudents = array_filter($studentRows, function($s) {
            return $s['grand_total_max'] > 0;
        });
        $totalAppeared = count($appearedStudents);

        $gradeTiers = [
            ['grade' => 'A+', 'score_range' => '90% and Above', 'min' => 90.0, 'max' => 1000.0],
            ['grade' => 'A',  'score_range' => '80% to 89.9%',  'min' => 80.0, 'max' => 89.999],
            ['grade' => 'B',  'score_range' => '70% to 79.9%',  'min' => 70.0, 'max' => 79.999],
            ['grade' => 'C',  'score_range' => '60% to 69.9%',  'min' => 60.0, 'max' => 69.999],
            ['grade' => 'D',  'score_range' => '40% to 59.9%',  'min' => 40.0, 'max' => 59.999],
            ['grade' => 'Fail','score_range' => 'Below 40%',    'min' => -1.0, 'max' => 39.999],
        ];

        $gradeBreakdown = [];
        foreach ($gradeTiers as $tier) {
            $count = 0;
            foreach ($appearedStudents as $s) {
                $pct = (float) $s['percentage'];
                if ($tier['grade'] === 'A+' && $pct >= 90.0) {
                    $count++;
                } elseif ($tier['grade'] === 'Fail' && $pct < 40.0) {
                    $count++;
                } elseif ($pct >= $tier['min'] && $pct <= $tier['max']) {
                    $count++;
                }
            }
            $gradeBreakdown[] = [
                'grade' => $tier['grade'],
                'score_range' => $tier['score_range'],
                'count' => $count,
                'percentage' => $totalAppeared > 0 ? round(($count / $totalAppeared) * 100, 1) : 0,
            ];
        }
        $gradeBreakdown[] = [
            'grade' => 'Total',
            'score_range' => 'All Appeared',
            'count' => $totalAppeared,
            'percentage' => 100.0,
        ];

        // Subject-Wise Performance Analysis
        $subjectPerformance = [];
        foreach ($subjectsData as $sub) {
            $subId = $sub['id'];
            $subTotalMarks = (float) $sub['total_max_marks'];
            
            $subAppearedCount = 0;
            $subPassedCount = 0;
            $sumObtained = 0.0;
            $sumPercentages = 0.0;
            
            foreach ($studentRows as $s) {
                $subInfo = $s['subjects'][$subId] ?? null;
                if ($subInfo && $subInfo['total_max'] > 0) {
                    $subAppearedCount++;
                    $sumObtained += (float) $subInfo['total_obtained'];
                    $sumPercentages += (float) $subInfo['percentage'];
                    if ($subInfo['percentage'] >= 40.0) {
                        $subPassedCount++;
                    }
                }
            }
            
            $classAvgScore = $subAppearedCount > 0 ? round($sumObtained / $subAppearedCount, 1) : 0;
            $avgPct = $subTotalMarks > 0 ? round(($classAvgScore / $subTotalMarks) * 100, 1) : ($subAppearedCount > 0 ? round($sumPercentages / $subAppearedCount, 1) : 0);
            $passRate = $subAppearedCount > 0 ? round(($subPassedCount / $subAppearedCount) * 100, 1) : 0;
            
            $subjectPerformance[] = [
                'subject_id' => $subId,
                'subject_name' => $sub['name'],
                'total_marks' => $subTotalMarks,
                'class_avg_score' => $classAvgScore,
                'avg_percentage' => $avgPct,
                'pass_rate' => $passRate,
                'appeared_count' => $subAppearedCount,
                'passed_count' => $subPassedCount,
            ];
        }

        $analytics = [
            'grade_breakdown' => $gradeBreakdown,
            'subject_performance' => $subjectPerformance,
            'total_appeared' => $totalAppeared,
        ];

        return response()->json([
            'session' => [
                'id' => $session->id,
                'name' => $session->name,
            ],
            'class' => [
                'id' => $class->id,
                'name' => $class->name,
            ],
            'section' => $section ? [
                'id' => $section->id,
                'name' => $section->name,
            ] : null,
            'category_type' => $categoryType,
            'category_name' => $categoryName ?: ($categoryType ? ucwords(str_replace('_', ' ', $categoryType)) : 'All'),
            'class_incharge' => $assigned ? $assigned->name : null,
            'rounds' => $rounds,
            'subjects' => $subjectsData,
            'grand_total_max' => $grandTotalMaxMarks,
            'students' => $studentRows,
            'analytics' => $analytics,
        ]);
    }

    public function getStudentDetailedResults(Request $request, $studentId)
    {
        $validated = $request->validate([
            'academic_session_id' => 'required|exists:academic_sessions,id',
            'academy_class_id' => 'required|exists:classes,id',
            'test_category_id' => 'required',
        ]);

        $student = DB::table('users as students')
            ->leftJoin('classes', 'students.class_id', '=', 'classes.id')
            ->leftJoin('sections', 'students.section_id', '=', 'sections.id')
            ->leftJoin('academic_sessions', 'students.academic_session_id', '=', 'academic_sessions.id')
            ->leftJoin('majors', 'students.major_id', '=', 'majors.id')
            ->where('students.id', $studentId)
            ->select(
                'students.id',
                'students.name',
                'students.father_name',
                'students.roll_number',
                'students.image',
                'students.class_id',
                'students.section_id',
                'classes.name as class_name',
                'sections.name as section_name',
                'academic_sessions.name as session_name',
                'majors.name as major_name'
            )
            ->first();

        if ($student) {
            // Find assigned teacher for this class & section
            $assignedTeacher = DB::table('teacher_assignments')
                ->join('users as teachers', 'teacher_assignments.teacher_id', '=', 'teachers.id')
                ->where('teacher_assignments.class_id', $student->class_id)
                ->where(function($q) use ($student) {
                    if ($student->section_id) {
                        $q->where('teacher_assignments.section_id', $student->section_id)
                          ->orWhereNull('teacher_assignments.section_id');
                    }
                })
                ->whereNull('teachers.deleted_at')
                ->orderBy('teacher_assignments.is_class_incharge', 'desc')
                ->orderByRaw('CASE WHEN teacher_assignments.section_id = ' . intval($student->section_id ?? 0) . ' THEN 0 ELSE 1 END')
                ->orderByRaw('CASE WHEN teachers.signature IS NOT NULL THEN 0 ELSE 1 END')
                ->select('teachers.id', 'teachers.name', 'teachers.signature')
                ->first();

            if (!$assignedTeacher) {
                $assignedTeacher = DB::table('teacher_assignments')
                    ->join('users as teachers', 'teacher_assignments.teacher_id', '=', 'teachers.id')
                    ->where('teacher_assignments.class_id', $student->class_id)
                    ->whereNull('teachers.deleted_at')
                    ->orderBy('teacher_assignments.is_class_incharge', 'desc')
                    ->orderByRaw('CASE WHEN teachers.signature IS NOT NULL THEN 0 ELSE 1 END')
                    ->select('teachers.id', 'teachers.name', 'teachers.signature')
                    ->first();
            }

            $student->class_incharge = $assignedTeacher ? $assignedTeacher->name : null;
            $student->teacher_signature = ($assignedTeacher && $assignedTeacher->signature) 
                ? (str_starts_with($assignedTeacher->signature, 'http') ? $assignedTeacher->signature : asset('storage/' . $assignedTeacher->signature))
                : null;
        }

        $query = DB::table('test_marks')
            ->join('tests', 'test_marks.test_id', '=', 'tests.id')
            ->join('subjects', 'tests.subject_id', '=', 'subjects.id')
            ->where('test_marks.student_id', $studentId)
            ->where('tests.academic_session_id', $validated['academic_session_id'])
            ->where('tests.academy_class_id', $validated['academy_class_id']);

        if ($student && !empty($student->major_name)) {
            $majorId = DB::table('users')->where('id', $studentId)->value('major_id');
            if ($majorId) {
                $query->whereIn('tests.subject_id', function ($q) use ($majorId) {
                    $q->select('subject_id')
                      ->from('major_subject')
                      ->where('major_id', $majorId);
                });
            }
        }

        if ($validated['test_category_id'] !== 'all') {
            if (is_numeric($validated['test_category_id'])) {
                $query->where('tests.test_category_id', $validated['test_category_id']);
            } else {
                $query->whereIn('tests.test_category_id', function($q) use ($validated) {
                    $q->select('id')->from('test_categories')->where('type', $validated['test_category_id']);
                });
            }
        }

        if ($request->filled('rounds')) {
            $selectedRounds = is_array($request->rounds) ? $request->rounds : explode(',', $request->rounds);
            $selectedRounds = array_filter(array_map('trim', $selectedRounds));
            if (!empty($selectedRounds)) {
                $query->whereIn('tests.title', $selectedRounds);
            }
        }

        $individualTestsQuery = clone $query;

        $details = $query->select(
                'subjects.id as subject_id',
                'subjects.name as subject_name',
                DB::raw('COUNT(tests.id) as tests_taken'),
                DB::raw('SUM(IFNULL(test_marks.obtained_marks, 0)) as total_obtained'),
                DB::raw('SUM(tests.total_marks) as total_max'),
                DB::raw('SUM(CASE WHEN test_marks.is_absent = 1 THEN 1 ELSE 0 END) as absents')
            )
            ->groupBy('subjects.id', 'subjects.name')
            ->get();

        $details->transform(function ($item) {
            $item->total_obtained = (float) $item->total_obtained;
            $item->total_max = (float) $item->total_max;
            $item->absents = (int) $item->absents;
            $item->percentage = $item->total_max > 0 ? round(($item->total_obtained / $item->total_max) * 100, 2) : 0;
            
            // Standard KIPS grading scale from Excel
            if ($item->percentage > 85) $item->grade = 'A+';
            elseif ($item->percentage > 75) $item->grade = 'A';
            elseif ($item->percentage > 65) $item->grade = 'B';
            elseif ($item->percentage > 50) $item->grade = 'C';
            elseif ($item->percentage > 40) $item->grade = 'D';
            elseif ($item->percentage > 32) $item->grade = 'E';
            else $item->grade = 'Fail';
            
            return $item;
        });

        // Fetch individual tests in chronological order
        $individualTests = $individualTestsQuery->select(
            'tests.id as test_id',
            'tests.title as test_title',
            'tests.date as test_date',
            'subjects.id as subject_id',
            'subjects.name as subject_name',
            'test_marks.obtained_marks',
            'tests.total_marks',
            'test_marks.is_absent'
        )
        ->orderBy('tests.date', 'asc')
        ->get();

        // Extract distinct test rounds / dates
        $distinctRounds = [];
        foreach ($individualTests as $t) {
            $key = $t->test_title ?: ('Test ' . $t->test_id);
            if (!isset($distinctRounds[$key])) {
                $distinctRounds[$key] = [
                    'title' => $key,
                    'date' => $t->test_date,
                    'total_marks' => (float)$t->total_marks
                ];
            }
        }
        $rounds = array_values($distinctRounds);

        // Compute overall summary
        $totalMax = (float) $details->sum('total_max');
        $totalObtained = (float) $details->sum('total_obtained');
        $overallPercentage = $totalMax > 0 ? round(($totalObtained / $totalMax) * 100, 2) : 0;
        $totalAbsents = (int) $details->sum('absents');

        // Overall Grade
        if ($overallPercentage > 85) $overallGrade = 'A+';
        elseif ($overallPercentage > 75) $overallGrade = 'A';
        elseif ($overallPercentage > 65) $overallGrade = 'B';
        elseif ($overallPercentage > 50) $overallGrade = 'C';
        elseif ($overallPercentage > 40) $overallGrade = 'D';
        elseif ($overallPercentage > 32) $overallGrade = 'E';
        else $overallGrade = 'Fail';

        // Attendance remark from Excel formula
        if ($totalAbsents < 1) $attendanceRemark = 'Excellent';
        elseif ($totalAbsents == 1) $attendanceRemark = 'V. Good';
        elseif ($totalAbsents == 2) $attendanceRemark = 'Good';
        elseif ($totalAbsents == 3) $attendanceRemark = 'Satisfactory';
        else $attendanceRemark = 'Poor';

        $overallSummary = [
            'total_max' => $totalMax,
            'total_obtained' => $totalObtained,
            'percentage' => $overallPercentage,
            'grade' => $overallGrade,
            'total_absents' => $totalAbsents,
            'attendance_remark' => $attendanceRemark,
        ];

        return response()->json([
            'student' => $student,
            'subjects' => $details,
            'tests' => $individualTests,
            'rounds' => $rounds,
            'overall_summary' => $overallSummary,
        ]);
    }

    public function emailResultCard(Request $request, $studentId)
    {
        $validated = $request->validate([
            'academic_session_id' => 'required|exists:academic_sessions,id',
            'academy_class_id' => 'required|exists:classes,id',
            'test_category_id' => 'required',
        ]);

        // Get student summary
        $summaryQuery = DB::table('test_marks')
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
            ->where('students.id', $studentId)
            ->where('tests.academic_session_id', $validated['academic_session_id'])
            ->where('tests.academy_class_id', $validated['academy_class_id']);

        if ($validated['test_category_id'] !== 'all') {
            if (is_numeric($validated['test_category_id'])) {
                $summaryQuery->where('tests.test_category_id', $validated['test_category_id']);
            } else {
                $summaryQuery->whereIn('tests.test_category_id', function($q) use ($validated) {
                    $q->select('id')->from('test_categories')->where('type', $validated['test_category_id']);
                });
            }
        }

        $studentSummary = $summaryQuery->select(
                'students.id as student_id',
                'students.email as student_email',
                'students.name as student_name',
                'students.father_name as student_father_name',
                'students.roll_number as student_roll_number',
                'students.image as student_image',
                'classes.name as class_name',
                'sections.name as section_name',
                'majors.name as major_name',
                DB::raw('SUM(IFNULL(test_marks.obtained_marks, 0)) as total_obtained'),
                DB::raw('SUM(tests.total_marks) as total_max'),
                DB::raw('SUM(CASE WHEN test_marks.is_absent = 1 THEN 1 ELSE 0 END) as total_absents'),
                DB::raw('COUNT(tests.id) as tests_taken')
            )
            ->groupBy('students.id', 'students.email', 'students.name', 'students.father_name', 'students.roll_number', 'students.image', 'classes.name', 'sections.name', 'majors.name')
            ->first();

        if (!$studentSummary) {
            return response()->json(['message' => 'No results found for this student.'], 404);
        }

        if (!$studentSummary->student_email) {
            return response()->json(['message' => 'Student does not have an email address.'], 400);
        }

        // We also need rank. Rank calculation is complex, but for email, we can either re-run the full query or just omit rank/query rank specifically.
        // Let's do a quick rank query by getting all totals
        $allScoresQuery = DB::table('test_marks')
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
            ->whereNull('students.deleted_at')
            ->where('students.is_active', 1)
            ->where('tests.academic_session_id', $validated['academic_session_id'])
            ->where('tests.academy_class_id', $validated['academy_class_id']);
            
        if ($validated['test_category_id'] !== 'all') {
            if (is_numeric($validated['test_category_id'])) {
                $allScoresQuery->where('tests.test_category_id', $validated['test_category_id']);
            } else {
                $allScoresQuery->whereIn('tests.test_category_id', function($q) use ($validated) {
                    $q->select('id')->from('test_categories')->where('type', $validated['test_category_id']);
                });
            }
        }

        $allScores = $allScoresQuery->select('test_marks.student_id', DB::raw('SUM(IFNULL(test_marks.obtained_marks, 0)) as total_obtained'))
            ->groupBy('test_marks.student_id')
            ->orderByDesc('total_obtained')
            ->get();
        
        $rank = 1;
        $prevScore = -1;
        $actualRank = 1;
        $studentRank = 1;
        foreach ($allScores as $score) {
            if ($prevScore === -1 || $score->total_obtained == $prevScore) {
                // rank stays same
            } else {
                $rank = $actualRank;
            }
            if ($score->student_id == $studentId) {
                $studentRank = $rank;
                break;
            }
            $prevScore = $score->total_obtained;
            $actualRank++;
        }

        $studentSummary->rank = $studentRank;
        $studentSummary->total_obtained = (float) $studentSummary->total_obtained;
        $studentSummary->total_max = (float) $studentSummary->total_max;
        $studentSummary->percentage = $studentSummary->total_max > 0 ? round(($studentSummary->total_obtained / $studentSummary->total_max) * 100, 2) : 0;

        // Get student & assigned incharge
        $student = DB::table('users')->find($studentId);

        $assignedTeacher = DB::table('teacher_assignments')
            ->join('users as teachers', 'teacher_assignments.teacher_id', '=', 'teachers.id')
            ->where('teacher_assignments.class_id', $validated['academy_class_id'])
            ->where(function($q) use ($student) {
                if ($student && $student->section_id) {
                    $q->where('teacher_assignments.section_id', $student->section_id)
                      ->orWhereNull('teacher_assignments.section_id');
                }
            })
            ->whereNull('teachers.deleted_at')
            ->orderBy('teacher_assignments.is_class_incharge', 'desc')
            ->orderByRaw('CASE WHEN teacher_assignments.section_id = ' . intval($student->section_id ?? 0) . ' THEN 0 ELSE 1 END')
            ->orderByRaw('CASE WHEN teachers.signature IS NOT NULL THEN 0 ELSE 1 END')
            ->select('teachers.name', 'teachers.signature')
            ->first();

        if (!$assignedTeacher) {
            $assignedTeacher = DB::table('teacher_assignments')
                ->join('users as teachers', 'teacher_assignments.teacher_id', '=', 'teachers.id')
                ->where('teacher_assignments.class_id', $validated['academy_class_id'])
                ->whereNull('teachers.deleted_at')
                ->orderBy('teacher_assignments.is_class_incharge', 'desc')
                ->orderByRaw('CASE WHEN teachers.signature IS NOT NULL THEN 0 ELSE 1 END')
                ->select('teachers.name', 'teachers.signature')
                ->first();
        }

        $studentSummary->class_incharge = $assignedTeacher ? $assignedTeacher->name : null;
        $studentSummary->teacher_signature = ($assignedTeacher && $assignedTeacher->signature)
            ? (str_starts_with($assignedTeacher->signature, 'http') ? $assignedTeacher->signature : asset('storage/' . $assignedTeacher->signature))
            : null;

        $detailsQuery = DB::table('test_marks')
            ->join('tests', 'test_marks.test_id', '=', 'tests.id')
            ->join('subjects', 'tests.subject_id', '=', 'subjects.id')
            ->where('test_marks.student_id', $studentId)
            ->where('tests.academic_session_id', $validated['academic_session_id'])
            ->where('tests.academy_class_id', $validated['academy_class_id']);
            
        if ($student && $student->major_id) {
            $detailsQuery->whereIn('tests.subject_id', function ($q) use ($student) {
                $q->select('subject_id')
                  ->from('major_subject')
                  ->where('major_id', $student->major_id);
            });
        }

        if ($validated['test_category_id'] !== 'all') {
            if (is_numeric($validated['test_category_id'])) {
                $detailsQuery->where('tests.test_category_id', $validated['test_category_id']);
            } else {
                $detailsQuery->whereIn('tests.test_category_id', function($q) use ($validated) {
                    $q->select('id')->from('test_categories')->where('type', $validated['test_category_id']);
                });
            }
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

        // Send email
        \Illuminate\Support\Facades\Mail::to($studentSummary->student_email)->send(new \App\Mail\ResultCardMail($studentSummary, $details));

        return response()->json(['message' => 'Result card emailed successfully!']);
    }

    public function sendWhatsAppResultCard(Request $request, $studentId, \App\Services\WhatsAppGatewayService $whatsAppService)
    {
        $validated = $request->validate([
            'academic_session_id' => 'required|exists:academic_sessions,id',
            'academy_class_id' => 'required|exists:classes,id',
            'test_category_id' => 'required',
        ]);

        $student = \App\Models\User::with(['academyClass', 'section', 'major'])->findOrFail($studentId);
        $phone = $student->contact_number ?: $student->emergency_contact;
        if (!$phone) {
            return response()->json(['message' => 'Student does not have a contact phone number.'], 400);
        }

        // Precompute rank
        $allScoresQuery = DB::table('test_marks')
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
            ->whereNull('students.deleted_at')
            ->where('students.is_active', 1)
            ->where('tests.academic_session_id', $validated['academic_session_id'])
            ->where('tests.academy_class_id', $validated['academy_class_id']);
            
        if ($validated['test_category_id'] !== 'all') {
            if (is_numeric($validated['test_category_id'])) {
                $allScoresQuery->where('tests.test_category_id', $validated['test_category_id']);
            } else {
                $allScoresQuery->whereIn('tests.test_category_id', function($q) use ($validated) {
                    $q->select('id')->from('test_categories')->where('type', $validated['test_category_id']);
                });
            }
        }

        $allScores = $allScoresQuery->select('test_marks.student_id', DB::raw('SUM(IFNULL(test_marks.obtained_marks, 0)) as total_obtained'))
            ->groupBy('test_marks.student_id')
            ->orderByDesc('total_obtained')
            ->get();
        
        $rank = 1;
        $prevScore = -1;
        $actualRank = 1;
        $studentRank = 1;
        foreach ($allScores as $score) {
            if ($prevScore === -1 || $score->total_obtained == $prevScore) {
                // keep same rank
            } else {
                $rank = $actualRank;
            }
            if ($score->student_id == $studentId) {
                $studentRank = $rank;
                break;
            }
            $prevScore = $score->total_obtained;
            $actualRank++;
        }

        // Details per subject
        $detailsQuery = DB::table('test_marks')
            ->join('tests', 'test_marks.test_id', '=', 'tests.id')
            ->join('subjects', 'tests.subject_id', '=', 'subjects.id')
            ->where('test_marks.student_id', $studentId)
            ->where('tests.academic_session_id', $validated['academic_session_id'])
            ->where('tests.academy_class_id', $validated['academy_class_id']);
            
        if ($student->major_id) {
            $detailsQuery->whereIn('tests.subject_id', function ($q) use ($student) {
                $q->select('subject_id')
                  ->from('major_subject')
                  ->where('major_id', $student->major_id);
            });
        }

        if ($validated['test_category_id'] !== 'all') {
            if (is_numeric($validated['test_category_id'])) {
                $detailsQuery->where('tests.test_category_id', $validated['test_category_id']);
            } else {
                $detailsQuery->whereIn('tests.test_category_id', function($q) use ($validated) {
                    $q->select('id')->from('test_categories')->where('type', $validated['test_category_id']);
                });
            }
        }

        $subjectRows = $detailsQuery->select(
                'subjects.name as subject_name',
                DB::raw('SUM(IFNULL(test_marks.obtained_marks, 0)) as total_obtained'),
                DB::raw('SUM(tests.total_marks) as total_max')
            )
            ->groupBy('subjects.id', 'subjects.name')
            ->get();

        if ($subjectRows->isEmpty()) {
            return response()->json(['message' => 'No test records found for this student.'], 404);
        }

        $totalObtained = 0;
        $totalMax = 0;
        $subjectBreakdownText = "";

        foreach ($subjectRows as $sRow) {
            $sObtained = (float) $sRow->total_obtained;
            $sMax = (float) $sRow->total_max;
            $sPct = $sMax > 0 ? round(($sObtained / $sMax) * 100, 1) : 0;
            $totalObtained += $sObtained;
            $totalMax += $sMax;
            
            $subjectBreakdownText .= "▫️ *{$sRow->subject_name}:* {$sObtained} / {$sMax} ({$sPct}%)\n";
        }

        $overallPct = $totalMax > 0 ? round(($totalObtained / $totalMax) * 100, 1) : 0;
        $className = $student->academyClass?->name ?? 'N/A';
        if (!empty($student->section?->name)) {
            $className .= ' - Section ' . $student->section->name;
        }
        $assignedTeacher = DB::table('teacher_assignments')
            ->join('users as teachers', 'teacher_assignments.teacher_id', '=', 'teachers.id')
            ->where('teacher_assignments.class_id', $validated['academy_class_id'])
            ->where(function($q) use ($student) {
                if ($student->section_id) {
                    $q->where('teacher_assignments.section_id', $student->section_id)
                      ->orWhereNull('teacher_assignments.section_id');
                }
            })
            ->whereNull('teachers.deleted_at')
            ->orderBy('teacher_assignments.is_class_incharge', 'desc')
            ->orderByRaw('CASE WHEN teachers.signature IS NOT NULL THEN 0 ELSE 1 END')
            ->value('teachers.name');

        $inchargeLine = $assignedTeacher ? "👨‍🏫 *کلاس انچارج / Class Incharge:* {$assignedTeacher}\n" : "";

        $message = "📢 *KIPS SCHOOL CHUNIAN CAMPUS*\n"
            . "*امتحانی نتیجہ / Official Result Card*\n\n"
            . "محترم والدین / سرپرست،\n"
            . "طالب علم کے امتحانی نتائج کی تفصیل درج ذیل ہے:\n\n"
            . "👤 *طالب علم / Student:* {$student->name}\n"
            . "🔢 *رول نمبر / Roll No:* {$rollNo}\n"
            . "📚 *کلاس / Class:* {$className}\n"
            . "🏆 *کلاس پوزیشن / Rank:* #{$studentRank}\n"
            . $inchargeLine . "\n"
            . "📊 *مضامین کے نمبرات / Subject Breakdown:*\n"
            . $subjectBreakdownText . "\n"
            . "━━━━━━━━━━━━━━━━━━━━\n"
            . "🎯 *کل حاصل کردہ نمبر / Total:* {$totalObtained} / {$totalMax}\n"
            . "📈 *مجموعی فیصد / Percentage:* {$overallPct}%\n"
            . "━━━━━━━━━━━━━━━━━━━━\n\n"
            . "⚠️ باقاعدہ محنت اور وقت کی پابندی بہترین کامیابی کی ضامن ہے۔ مزید تفصیلات اکیڈمی پورٹل پر دیکھی جا سکتی ہیں۔\n\n"
            . "📞 *Helpline:* 0300 39 39 581\n"
            . "🌐 *Portal:* https://kips.usachunian.com";

        $res = $whatsAppService->sendTextMessage($phone, $message);

        if (!empty($res['success'])) {
            return response()->json([
                'message' => "WhatsApp Result Card delivered successfully to {$student->name} ({$phone})!",
                'gateway_response' => $res
            ]);
        }

        return response()->json([
            'message' => 'Failed to send WhatsApp message: ' . ($res['error'] ?? 'Gateway Error'),
            'details' => $res
        ], 500);
    }

    public function sendBulkWhatsAppResultCards(Request $request)
    {
        $validated = $request->validate([
            'academic_session_id' => 'required|exists:academic_sessions,id',
            'academy_class_id' => 'required|exists:classes,id',
            'test_category_id' => 'required',
            'section_id' => 'nullable',
        ]);

        $query = DB::table('test_marks')
            ->join('tests', 'test_marks.test_id', '=', 'tests.id')
            ->join('users as students', 'test_marks.student_id', '=', 'students.id')
            ->whereNull('students.deleted_at')
            ->where('students.is_active', 1)
            ->where('tests.academic_session_id', $validated['academic_session_id'])
            ->where('tests.academy_class_id', $validated['academy_class_id']);

        if (!empty($validated['section_id'])) {
            $query->where('students.section_id', $validated['section_id']);
        }

        if ($validated['test_category_id'] !== 'all') {
            if (is_numeric($validated['test_category_id'])) {
                $query->where('tests.test_category_id', $validated['test_category_id']);
            } else {
                $query->whereIn('tests.test_category_id', function($q) use ($validated) {
                    $q->select('id')->from('test_categories')->where('type', $validated['test_category_id']);
                });
            }
        }

        $studentIds = $query->pluck('students.id')->unique()->values()->toArray();

        if (empty($studentIds)) {
            return response()->json(['message' => 'No students with test records found for the selected criteria.'], 400);
        }

        \App\Jobs\SendResultCardWhatsAppBatchJob::dispatch(
            $studentIds,
            (int) $validated['academic_session_id'],
            (int) $validated['academy_class_id'],
            (string) $validated['test_category_id']
        );

        return response()->json([
            'message' => 'Bulk WhatsApp Result Cards dispatch job queued successfully.',
            'total_students' => count($studentIds)
        ]);
    }
}
