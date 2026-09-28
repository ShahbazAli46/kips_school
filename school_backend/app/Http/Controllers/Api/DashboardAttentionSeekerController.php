<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicSession;
use App\Models\AcademyClass;
use App\Models\AppSetting;
use App\Models\Section;
use App\Models\User;
use App\Services\WhatsAppGatewayService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardAttentionSeekerController extends Controller
{
    /**
     * Get persisted performance criteria thresholds.
     */
    public function getThresholds()
    {
        return response()->json(AppSetting::getAttentionThresholds());
    }

    /**
     * Update persisted performance criteria thresholds across all devices.
     */
    public function updateThresholds(Request $request)
    {
        $request->validate([
            'top_threshold' => 'required|numeric|min:20|max:99',
            'attention_threshold' => 'required|numeric|min:10|max:95',
        ]);

        $updated = AppSetting::setAttentionThresholds(
            (float) $request->input('top_threshold'),
            (float) $request->input('attention_threshold')
        );

        return response()->json([
            'success' => true,
            'message' => 'Performance criteria updated successfully across all devices.',
            'thresholds' => $updated,
        ]);
    }

    /**
     * Get summary metrics, category counts, section comparisons, and subject difficulties.
     */
    public function summary(Request $request)
    {
        $sessionId = $request->input('academic_session_id');
        if (!$sessionId || $sessionId === 'all') {
            $activeSession = AcademicSession::getActiveSession();
            $sessionId = $activeSession ? $activeSession->id : DB::table('academic_sessions')->latest('id')->value('id');
        }

        $classId = $request->input('academy_class_id');
        $sectionId = $request->input('section_id');
        $subjectId = $request->input('subject_id');

        // Dynamic thresholds defaulting to database-persisted values
        $savedThresholds = AppSetting::getAttentionThresholds();
        $topThreshold = $request->filled('top_threshold') ? (float) $request->input('top_threshold') : $savedThresholds['top_threshold'];
        $attentionThreshold = $request->filled('attention_threshold') ? (float) $request->input('attention_threshold') : $savedThresholds['attention_threshold'];
        if ($topThreshold <= 0 || $topThreshold > 100) $topThreshold = 75;
        if ($attentionThreshold <= 0 || $attentionThreshold >= 100) $attentionThreshold = 50;
        if ($topThreshold <= $attentionThreshold) $topThreshold = $attentionThreshold + 5;

        // 1. Gather student evaluations (filtered by subject if provided)
        $studentMetrics = $this->computeStudentEvaluations($sessionId, $classId, $sectionId, $topThreshold, $attentionThreshold, $subjectId);

        // 2. Count categories
        $counts = [
            'all' => 0,
            'top_performers' => 0,
            'average' => 0,
            'attention_seeker' => 0,
            'at_risk' => 0,
            'borderline' => 0,
            'declining' => 0,
            'rising_stars' => 0,
            'single_subject_laggards' => 0,
            'frequent_absentees' => 0,
            'centum_aces' => 0,
            'stagnant' => 0,
            'double_trouble' => 0,
        ];

        $totalScoreSum = 0;
        $activeWithTests = 0;

        foreach ($studentMetrics as $s) {
            $counts['all']++;
            if ($s['tests_taken'] > 0) {
                $totalScoreSum += $s['avg_percentage'];
                $activeWithTests++;
            }

            foreach ($s['categories'] as $cat) {
                if (isset($counts[$cat])) {
                    $counts[$cat]++;
                }
            }
        }

        $overallAverage = $activeWithTests > 0 ? round($totalScoreSum / $activeWithTests, 1) : 0;

        // 3. Class vs Class & Section vs Section comparison
        $classComparison = $this->computeClassComparison($sessionId);
        $sectionComparison = $this->computeSectionComparison($sessionId, $classId);

        // 4. Subject difficulty breakdown
        $subjectDifficulty = $this->computeSubjectDifficulty($sessionId, $classId, $sectionId);

        return response()->json([
            'session_id' => $sessionId,
            'thresholds' => [
                'top_threshold' => $topThreshold,
                'attention_threshold' => $attentionThreshold,
            ],
            'counts' => $counts,
            'overall_stats' => [
                'total_monitored' => count($studentMetrics),
                'active_with_tests' => $activeWithTests,
                'overall_average' => $overallAverage,
                'critical_attention' => ($counts['attention_seeker'] ?? 0) + $counts['declining'] + $counts['double_trouble'],
                'excellence_count' => $counts['top_performers'] + $counts['centum_aces'],
            ],
            'class_comparison' => $classComparison,
            'section_comparison' => $sectionComparison,
            'subject_difficulty' => $subjectDifficulty,
        ]);
    }

    /**
     * Get paginated students belonging to a specific attention category.
     */
    public function students(Request $request)
    {
        $sessionId = $request->input('academic_session_id');
        if (!$sessionId || $sessionId === 'all') {
            $activeSession = AcademicSession::getActiveSession();
            $sessionId = $activeSession ? $activeSession->id : DB::table('academic_sessions')->latest('id')->value('id');
        }

        $classId = $request->input('academy_class_id');
        $sectionId = $request->input('section_id');
        $subjectId = $request->input('subject_id');
        $category = $request->input('category', 'all');
        $search = trim($request->input('search', ''));
        $page = max(1, (int) $request->input('page', 1));
        $rawLimit = $request->input('limit', 15);
        if ($rawLimit === 'all' || (int) $rawLimit >= 500) {
            $limit = 5000;
        } else {
            $limit = min(100, max(5, (int) $rawLimit));
        }

        // Dynamic thresholds defaulting to database-persisted values
        $savedThresholds = AppSetting::getAttentionThresholds();
        $topThreshold = $request->filled('top_threshold') ? (float) $request->input('top_threshold') : $savedThresholds['top_threshold'];
        $attentionThreshold = $request->filled('attention_threshold') ? (float) $request->input('attention_threshold') : $savedThresholds['attention_threshold'];
        if ($topThreshold <= 0 || $topThreshold > 100) $topThreshold = 75;
        if ($attentionThreshold <= 0 || $attentionThreshold >= 100) $attentionThreshold = 50;
        if ($topThreshold <= $attentionThreshold) $topThreshold = $attentionThreshold + 5;

        // 1. Gather all evaluated students (filtered by subject if provided)
        $allEvaluations = $this->computeStudentEvaluations($sessionId, $classId, $sectionId, $topThreshold, $attentionThreshold, $subjectId);

        // 2. Filter by category
        $filtered = array_filter($allEvaluations, function ($s) use ($category) {
            if ($category === 'all') {
                return count($s['categories']) > 0;
            }
            if ($category === 'attention_seeker' || $category === 'at_risk') {
                return in_array('attention_seeker', $s['categories'], true) || in_array('at_risk', $s['categories'], true);
            }
            return in_array($category, $s['categories'], true);
        });

        // 3. Filter by search (name or roll number)
        if (!empty($search)) {
            $searchLower = strtolower($search);
            $filtered = array_filter($filtered, function ($s) use ($searchLower) {
                return str_contains(strtolower($s['name']), $searchLower)
                    || str_contains(strtolower((string) $s['roll_number']), $searchLower)
                    || str_contains(strtolower((string) $s['father_name']), $searchLower);
            });
        }

        // Sort based on category priority
        usort($filtered, function ($a, $b) use ($category) {
            if (in_array($category, ['attention_seeker', 'at_risk', 'declining', 'double_trouble'])) {
                return $a['avg_percentage'] <=> $b['avg_percentage'];
            }
            if ($category === 'frequent_absentees') {
                return $b['tests_absent'] <=> $a['tests_absent'];
            }
            if ($category === 'rising_stars') {
                return $b['trend_delta'] <=> $a['trend_delta'];
            }
            return $b['avg_percentage'] <=> $a['avg_percentage'];
        });

        $total = count($filtered);
        $offset = ($page - 1) * $limit;
        $pagedStudents = array_slice($filtered, $offset, $limit);

        // Hydrate recent 4 tests for each paged student
        $studentIds = array_column($pagedStudents, 'id');
        $recentTestsMap = $this->fetchRecentTestsForStudents($sessionId, $studentIds, $subjectId);

        foreach ($pagedStudents as &$student) {
            $student['recent_tests'] = $recentTestsMap[$student['id']] ?? [];
        }

        return response()->json([
            'current_page' => $page,
            'per_page' => $limit,
            'total' => $total,
            'last_page' => (int) ceil($total / $limit),
            'thresholds' => [
                'top_threshold' => $topThreshold,
                'attention_threshold' => $attentionThreshold,
            ],
            'data' => $pagedStudents,
        ]);
    }

    /**
     * Internal engine: computes comprehensive metrics for students.
     */
    private function computeStudentEvaluations($sessionId, $classId = null, $sectionId = null, $topThreshold = 75.0, $attentionThreshold = 50.0, $subjectId = null)
    {
        // 1. Fetch test marks aggregated per student & subject
        $marksQuery = DB::table('test_marks')
            ->join('tests', 'test_marks.test_id', '=', 'tests.id')
            ->join('users as students', 'test_marks.student_id', '=', 'students.id')
            ->join('major_subject', function ($join) {
                $join->on('students.major_id', '=', 'major_subject.major_id')
                    ->on('tests.subject_id', '=', 'major_subject.subject_id');
            })
            ->join('subjects', 'tests.subject_id', '=', 'subjects.id')
            ->leftJoin('classes', 'students.class_id', '=', 'classes.id')
            ->leftJoin('sections', 'students.section_id', '=', 'sections.id')
            ->leftJoin('majors', 'students.major_id', '=', 'majors.id')
            ->whereNull('students.deleted_at')
            ->where('students.is_active', 1)
            ->where('students.role_id', 3)
            ->where('tests.academic_session_id', $sessionId);

        if ($classId && $classId !== 'all') {
            $marksQuery->where('tests.academy_class_id', $classId);
        }

        if ($sectionId && $sectionId !== 'all') {
            $marksQuery->where('students.section_id', $sectionId);
        }

        if ($subjectId && $subjectId !== 'all') {
            $marksQuery->where('tests.subject_id', $subjectId);
        }

        $records = $marksQuery->select(
            'students.id as student_id',
            'students.name',
            'students.father_name',
            'students.roll_number',
            'students.image',
            'students.contact_number',
            'students.emergency_contact',
            'students.class_id',
            'students.section_id',
            'classes.name as class_name',
            'sections.name as section_name',
            'majors.name as major_name',
            'subjects.id as subject_id',
            'subjects.name as subject_name',
            'tests.id as test_id',
            'tests.academy_class_id',
            'tests.test_category_id',
            'tests.date as test_date',
            'tests.total_marks',
            'test_marks.obtained_marks',
            'test_marks.is_absent',
            'test_marks.created_at as mark_created_at'
        )
            ->orderBy('tests.date', 'asc')
            ->get();

        // 2. Fetch daily attendance rates for students scoped to session date range
        $studentIds = $records->pluck('student_id')->unique()->filter()->values()->all();
        $attendanceMap = [];
        if (!empty($studentIds)) {
            $sessionObj = DB::table('academic_sessions')->where('id', $sessionId)->first(['start_date', 'end_date']);
            $attQuery = DB::table('attendances')->whereIn('student_id', $studentIds);

            if ($sessionObj) {
                if (!empty($sessionObj->start_date)) {
                    $attQuery->where('date', '>=', $sessionObj->start_date);
                }
                if (!empty($sessionObj->end_date)) {
                    $attQuery->where('date', '<=', $sessionObj->end_date);
                }
            }

            $attRows = $attQuery
                ->select(
                    'student_id',
                    DB::raw('COUNT(*) as total_days'),
                    DB::raw('SUM(CASE WHEN status = "present" THEN 1 ELSE 0 END) as present_days')
                )
                ->groupBy('student_id')
                ->get();

            foreach ($attRows as $row) {
                $attendanceMap[$row->student_id] = $row->total_days > 0
                    ? round(($row->present_days / $row->total_days) * 100, 1)
                    : null;
            }
        }

        // 3. Group and compute per-student statistics
        $students = [];
        foreach ($records as $row) {
            $sid = $row->student_id;
            if (!isset($students[$sid])) {
                $students[$sid] = [
                    'id' => $sid,
                    'name' => $row->name,
                    'father_name' => $row->father_name,
                    'roll_number' => $row->roll_number,
                    'image' => $row->image,
                    'contact_number' => $row->contact_number,
                    'emergency_contact' => $row->emergency_contact,
                    'class_id' => $row->class_id ?: $row->academy_class_id,
                    'section_id' => $row->section_id,
                    'test_category_id' => $row->test_category_id,
                    'class_name' => $row->class_name,
                    'section_name' => $row->section_name,
                    'major_name' => $row->major_name,
                    'tests' => [],
                    'subjects' => [],
                ];
            }

            $obtained = $row->is_absent ? 0 : (float) ($row->obtained_marks ?? 0);
            $max = (float) $row->total_marks;
            $pct = $max > 0 ? ($obtained / $max) * 100 : 0;

            $students[$sid]['tests'][] = [
                'test_id' => $row->test_id,
                'subject_id' => $row->subject_id,
                'subject_name' => $row->subject_name,
                'date' => $row->test_date,
                'obtained' => $obtained,
                'max' => $max,
                'percentage' => round($pct, 1),
                'is_absent' => (bool) $row->is_absent,
            ];

            if (!isset($students[$sid]['subjects'][$row->subject_id])) {
                $students[$sid]['subjects'][$row->subject_id] = [
                    'name' => $row->subject_name,
                    'total_obtained' => 0,
                    'total_max' => 0,
                    'tests_count' => 0,
                ];
            }

            if (!$row->is_absent && $row->obtained_marks !== null) {
                $students[$sid]['subjects'][$row->subject_id]['total_obtained'] += $obtained;
                $students[$sid]['subjects'][$row->subject_id]['total_max'] += $max;
                $students[$sid]['subjects'][$row->subject_id]['tests_count']++;
            }
        }

        // 4. Calculate diagnostic metrics & categorize
        $evaluated = [];
        foreach ($students as $sid => $data) {
            $tests = $data['tests'];
            $totalTests = count($tests);
            $testsAbsent = 0;
            $testsTaken = 0;
            $totalObtained = 0;
            $totalMax = 0;
            $maxSinglePct = 0;

            foreach ($tests as $t) {
                if ($t['is_absent']) {
                    $testsAbsent++;
                } else {
                    $testsTaken++;
                    $totalObtained += $t['obtained'];
                    $totalMax += $t['max'];
                    if ($t['percentage'] > $maxSinglePct) {
                        $maxSinglePct = $t['percentage'];
                    }
                }
            }

            $avgPct = $totalMax > 0 ? round(($totalObtained / $totalMax) * 100, 1) : 0;

            // Trend Delta (Early vs Recent tests)
            $trendDelta = 0;
            if ($testsTaken >= 3) {
                // Split taken tests chronologically
                $takenTests = array_values(array_filter($tests, fn($t) => !$t['is_absent']));
                $half = (int) floor(count($takenTests) / 2);
                $firstHalf = array_slice($takenTests, 0, $half);
                $secondHalf = array_slice($takenTests, -$half);

                $firstAvg = count($firstHalf) > 0 ? array_sum(array_column($firstHalf, 'percentage')) / count($firstHalf) : 0;
                $secondAvg = count($secondHalf) > 0 ? array_sum(array_column($secondHalf, 'percentage')) / count($secondHalf) : 0;
                $trendDelta = round($secondAvg - $firstAvg, 1);
            }

            // Subject breakdown
            $weakestSubject = null;
            $strongestSubject = null;
            $minSubjPct = 100;
            $maxSubjPct = 0;

            foreach ($data['subjects'] as $sub) {
                if ($sub['total_max'] > 0) {
                    $subPct = round(($sub['total_obtained'] / $sub['total_max']) * 100, 1);
                    if ($subPct < $minSubjPct) {
                        $minSubjPct = $subPct;
                        $weakestSubject = ['name' => $sub['name'], 'percentage' => $subPct];
                    }
                    if ($subPct > $maxSubjPct) {
                        $maxSubjPct = $subPct;
                        $strongestSubject = ['name' => $sub['name'], 'percentage' => $subPct];
                    }
                }
            }

            // Grade
            $grade = 'F';
            if ($avgPct >= 80) $grade = 'A+';
            elseif ($avgPct >= 70) $grade = 'A';
            elseif ($avgPct >= 60) $grade = 'B';
            elseif ($avgPct >= 50) $grade = 'C';
            elseif ($avgPct >= 40) $grade = 'D';

            $attendanceRate = $attendanceMap[$sid] ?? null;

            // Categories assignment
            $categories = [];
            $absentRate = $totalTests > 0 ? ($testsAbsent / $totalTests) : 0;

            if ($testsTaken >= 1) {
                if ($avgPct >= $topThreshold) {
                    $categories[] = 'top_performers';
                } elseif ($avgPct < $attentionThreshold) {
                    $categories[] = 'attention_seeker';
                    $categories[] = 'at_risk';
                } else {
                    $categories[] = 'average';
                }

                if ($avgPct >= 45 && $avgPct <= 55) {
                    $categories[] = 'borderline';
                }
            }

            if ($testsTaken >= 3) {
                if ($trendDelta <= -15) {
                    $categories[] = 'declining';
                }
                if ($trendDelta >= 12) {
                    $categories[] = 'rising_stars';
                }
            }

            if ($testsTaken >= 4 && $avgPct >= 58 && $avgPct <= 65 && abs($trendDelta) < 5) {
                $categories[] = 'stagnant';
            }

            if ($avgPct >= 70 && $minSubjPct < 45 && count($data['subjects']) >= 2) {
                $categories[] = 'single_subject_laggards';
            }

            if ($testsAbsent >= 2 && $absentRate >= 0.25) {
                $categories[] = 'frequent_absentees';
            }

            if ($maxSinglePct >= 95) {
                $categories[] = 'centum_aces';
            }

            if ($avgPct < $attentionThreshold && $attendanceRate !== null && $attendanceRate < 75) {
                $categories[] = 'double_trouble';
            }

            // Diagnostic note
            $diagnosticNote = $this->generateDiagnosticNote(
                $categories,
                $avgPct,
                $trendDelta,
                $weakestSubject,
                $strongestSubject,
                $testsAbsent,
                $totalTests,
                $topThreshold,
                $attentionThreshold
            );

            $evaluated[] = [
                'id' => $sid,
                'name' => $data['name'],
                'father_name' => $data['father_name'],
                'roll_number' => $data['roll_number'],
                'image' => $data['image'],
                'contact_number' => $data['contact_number'],
                'emergency_contact' => $data['emergency_contact'],
                'class_id' => $data['class_id'] ?? null,
                'section_id' => $data['section_id'] ?? null,
                'test_category_id' => $data['test_category_id'] ?? null,
                'class_name' => $data['class_name'] ?? 'N/A',
                'section_name' => $data['section_name'] ?? 'N/A',
                'major_name' => $data['major_name'] ?? 'N/A',
                'avg_percentage' => $avgPct,
                'grade' => $grade,
                'tests_taken' => $testsTaken,
                'tests_absent' => $testsAbsent,
                'total_tests' => $totalTests,
                'trend_delta' => $trendDelta,
                'weakest_subject' => $weakestSubject,
                'strongest_subject' => $strongestSubject,
                'attendance_rate' => $attendanceRate,
                'categories' => $categories,
                'diagnostic_note' => $diagnosticNote,
            ];
        }

        return $evaluated;
    }

    /**
     * Generate diagnostic one-liner for cards.
     */
    private function generateDiagnosticNote($categories, $avg, $delta, $weakest, $strongest, $absent, $total, $topThreshold = 75.0, $attentionThreshold = 50.0)
    {
        if (in_array('double_trouble', $categories)) {
            return "Critical: Poor exam marks ({$avg}%) compounded with irregular attendance.";
        }
        if (in_array('declining', $categories)) {
            return "Alert: Performance dropped by {$delta}% compared to earlier tests.";
        }
        if (in_array('single_subject_laggards', $categories) && $weakest) {
            return "Strong overall, but struggling in {$weakest['name']} ({$weakest['percentage']}%).";
        }
        if (in_array('rising_stars', $categories)) {
            return "Great momentum! Gained +{$delta}% in recent exams.";
        }
        if (in_array('top_performers', $categories)) {
            return "Honor Roll: Outstanding consistency with {$avg}% aggregate (≥ {$topThreshold}% benchmark).";
        }
        if ((in_array('attention_seeker', $categories) || in_array('at_risk', $categories)) && $weakest) {
            return "Needs academic intervention: Aggregate {$avg}% is below {$attentionThreshold}%, weakest in {$weakest['name']} ({$weakest['percentage']}%).";
        }
        if (in_array('attention_seeker', $categories) || in_array('at_risk', $categories)) {
            return "Needs academic attention: Score of {$avg}% is below the {$attentionThreshold}% threshold.";
        }
        if (in_array('borderline', $categories)) {
            return "On the borderline ({$avg}%): Targeted revision can push to higher grades.";
        }
        if (in_array('frequent_absentees', $categories)) {
            return "Skipped {$absent} of {$total} scheduled tests; missing evaluation data.";
        }
        if (in_array('centum_aces', $categories) && $strongest) {
            return "Single-test ace: Scored exceptional {$strongest['percentage']}% in {$strongest['name']}.";
        }
        if (in_array('average', $categories)) {
            return "Moderate performance: {$avg}% aggregate in the average performance band.";
        }
        return "Consistent academic record with {$avg}% average across {$total} tests.";
    }

    /**
     * Compute section vs section comparison statistics.
     */
    private function computeSectionComparison($sessionId, $classId = null)
    {
        $enrolledQuery = DB::table('users')
            ->join('sections', 'users.section_id', '=', 'sections.id')
            ->join('classes', 'users.class_id', '=', 'classes.id')
            ->where('users.role_id', 3)
            ->where('users.is_active', 1)
            ->whereNull('users.deleted_at')
            ->where('users.academic_session_id', $sessionId);

        if ($classId && $classId !== 'all') {
            $enrolledQuery->where('users.class_id', $classId);
        }

        $allSections = $enrolledQuery
            ->select(
                'users.class_id',
                'classes.name as class_name',
                'sections.id as section_id',
                'sections.name as section_name',
                DB::raw('COUNT(*) as total_enrolled')
            )
            ->groupBy('users.class_id', 'classes.name', 'sections.id', 'sections.name')
            ->orderBy('users.class_id')
            ->orderBy('sections.name')
            ->get();

        $marksQuery = DB::table('test_marks')
            ->join('tests', 'test_marks.test_id', '=', 'tests.id')
            ->join('users as students', 'test_marks.student_id', '=', 'students.id')
            ->join('sections', 'students.section_id', '=', 'sections.id')
            ->whereNull('students.deleted_at')
            ->where('students.is_active', 1)
            ->where('tests.academic_session_id', $sessionId);

        if ($classId && $classId !== 'all') {
            $marksQuery->where('tests.academy_class_id', $classId);
        }

        $stats = $marksQuery->select(
            'tests.academy_class_id as class_id',
            'sections.id as section_id',
            DB::raw('COUNT(DISTINCT students.id) as student_count'),
            DB::raw('SUM(IFNULL(test_marks.obtained_marks, 0)) as total_obtained'),
            DB::raw('SUM(CASE WHEN test_marks.is_absent = 0 THEN tests.total_marks ELSE 0 END) as total_max'),
            DB::raw('SUM(CASE WHEN test_marks.is_absent = 1 THEN 1 ELSE 0 END) as total_absents'),
            DB::raw('COUNT(test_marks.id) as total_marks_records')
        )
            ->groupBy('tests.academy_class_id', 'sections.id')
            ->get()
            ->keyBy(function ($item) {
                return $item->class_id . '_' . $item->section_id;
            });

        return $allSections->map(function ($row) use ($stats) {
            $key = $row->class_id . '_' . $row->section_id;
            $stat = $stats->get($key);

            if ($stat && (float) $stat->total_max > 0) {
                $totalMax = (float) $stat->total_max;
                $obtained = (float) $stat->total_obtained;
                $avgPct = round(($obtained / $totalMax) * 100, 1);
                $totalMarks = (int) $stat->total_marks_records;
                $absentRate = $totalMarks > 0 ? round(((int) $stat->total_absents / $totalMarks) * 100, 1) : 0;

                return [
                    'class_id' => $row->class_id,
                    'class_name' => $row->class_name,
                    'section_id' => $row->section_id,
                    'section_name' => $row->section_name,
                    'student_count' => (int) $stat->student_count,
                    'total_enrolled' => (int) $row->total_enrolled,
                    'avg_percentage' => $avgPct,
                    'absent_rate' => $absentRate,
                    'has_tests' => true,
                ];
            }

            return [
                'class_id' => $row->class_id,
                'class_name' => $row->class_name,
                'section_id' => $row->section_id,
                'section_name' => $row->section_name,
                'student_count' => (int) $row->total_enrolled,
                'total_enrolled' => (int) $row->total_enrolled,
                'avg_percentage' => 0,
                'absent_rate' => 0,
                'has_tests' => false,
            ];
        });
    }

    /**
     * Compute class vs class comparison statistics.
     */
    private function computeClassComparison($sessionId)
    {
        $allClasses = DB::table('classes')->select('id', 'name')->orderBy('id')->get();

        $query = DB::table('test_marks')
            ->join('tests', 'test_marks.test_id', '=', 'tests.id')
            ->join('users as students', 'test_marks.student_id', '=', 'students.id')
            ->join('classes', 'tests.academy_class_id', '=', 'classes.id')
            ->whereNull('students.deleted_at')
            ->where('students.is_active', 1)
            ->where('tests.academic_session_id', $sessionId);

        $stats = $query->select(
            'classes.id as class_id',
            DB::raw('COUNT(DISTINCT students.id) as student_count'),
            DB::raw('SUM(IFNULL(test_marks.obtained_marks, 0)) as total_obtained'),
            DB::raw('SUM(CASE WHEN test_marks.is_absent = 0 THEN tests.total_marks ELSE 0 END) as total_max'),
            DB::raw('SUM(CASE WHEN test_marks.is_absent = 1 THEN 1 ELSE 0 END) as total_absents'),
            DB::raw('COUNT(test_marks.id) as total_marks_records')
        )
            ->groupBy('classes.id')
            ->get()
            ->keyBy('class_id');

        $enrolledCounts = DB::table('users')
            ->where('role_id', 3)
            ->where('is_active', 1)
            ->whereNull('deleted_at')
            ->where('academic_session_id', $sessionId)
            ->select('class_id', DB::raw('COUNT(*) as total_students'))
            ->groupBy('class_id')
            ->pluck('total_students', 'class_id');

        return $allClasses->map(function ($c) use ($stats, $enrolledCounts) {
            $row = $stats->get($c->id);
            $totalEnrolled = $enrolledCounts->get($c->id, 0);

            if ($row && (float) $row->total_max > 0) {
                $totalMax = (float) $row->total_max;
                $obtained = (float) $row->total_obtained;
                $avgPct = round(($obtained / $totalMax) * 100, 1);
                $totalMarks = (int) $row->total_marks_records;
                $absentRate = $totalMarks > 0 ? round(((int) $row->total_absents / $totalMarks) * 100, 1) : 0;

                return [
                    'class_id' => $c->id,
                    'class_name' => $c->name,
                    'student_count' => (int) $row->student_count,
                    'total_enrolled' => (int) $totalEnrolled,
                    'avg_percentage' => $avgPct,
                    'absent_rate' => $absentRate,
                    'has_tests' => true,
                ];
            }

            return [
                'class_id' => $c->id,
                'class_name' => $c->name,
                'student_count' => (int) $totalEnrolled,
                'total_enrolled' => (int) $totalEnrolled,
                'avg_percentage' => 0,
                'absent_rate' => 0,
                'has_tests' => false,
            ];
        });
    }

    /**
     * Compute subject difficulty heatmap.
     */
    private function computeSubjectDifficulty($sessionId, $classId = null, $sectionId = null)
    {
        $query = DB::table('test_marks')
            ->join('tests', 'test_marks.test_id', '=', 'tests.id')
            ->join('subjects', 'tests.subject_id', '=', 'subjects.id')
            ->join('users as students', 'test_marks.student_id', '=', 'students.id')
            ->whereNull('students.deleted_at')
            ->where('students.is_active', 1)
            ->where('tests.academic_session_id', $sessionId);

        if ($classId && $classId !== 'all') {
            $query->where('tests.academy_class_id', $classId);
        }

        if ($sectionId && $sectionId !== 'all') {
            $query->where('students.section_id', $sectionId);
        }

        $results = $query->select(
            'subjects.id as subject_id',
            'subjects.name as subject_name',
            DB::raw('COUNT(tests.id) as tests_count'),
            DB::raw('SUM(IFNULL(test_marks.obtained_marks, 0)) as total_obtained'),
            DB::raw('SUM(CASE WHEN test_marks.is_absent = 0 THEN tests.total_marks ELSE 0 END) as total_max')
        )
            ->groupBy('subjects.id', 'subjects.name')
            ->orderByRaw('(SUM(IFNULL(test_marks.obtained_marks, 0)) / NULLIF(SUM(tests.total_marks), 0)) ASC')
            ->get();

        return $results->map(function ($row) {
            $max = (float) $row->total_max;
            $obtained = (float) $row->total_obtained;
            $pct = $max > 0 ? round(($obtained / $max) * 100, 1) : 0;

            $difficulty = 'easy';
            if ($pct < 50) $difficulty = 'hard';
            elseif ($pct < 70) $difficulty = 'medium';

            return [
                'subject_id' => $row->subject_id,
                'subject_name' => $row->subject_name,
                'tests_count' => (int) $row->tests_count,
                'avg_percentage' => $pct,
                'difficulty' => $difficulty,
            ];
        });
    }

    /**
     * Fetch recent tests for specific students (optionally filtered by subject).
     */
    private function fetchRecentTestsForStudents($sessionId, array $studentIds, $subjectId = null)
    {
        if (empty($studentIds)) {
            return [];
        }

        $query = DB::table('test_marks')
            ->join('tests', 'test_marks.test_id', '=', 'tests.id')
            ->join('subjects', 'tests.subject_id', '=', 'subjects.id')
            ->whereIn('test_marks.student_id', $studentIds)
            ->where('tests.academic_session_id', $sessionId);

        if ($subjectId && $subjectId !== 'all') {
            $query->where('tests.subject_id', $subjectId);
        }

        $rows = $query->select(
            'test_marks.student_id',
            'tests.title as test_title',
            'tests.date as test_date',
            'subjects.name as subject_name',
            'test_marks.obtained_marks',
            'tests.total_marks',
            'test_marks.is_absent'
        )
            ->orderBy('tests.date', 'desc')
            ->get();

        $map = [];
        foreach ($rows as $row) {
            $sid = $row->student_id;
            if (!isset($map[$sid])) {
                $map[$sid] = [];
            }
            if (count($map[$sid]) < 6) {
                $max = (float) $row->total_marks;
                $obtained = $row->is_absent ? 0 : (float) ($row->obtained_marks ?? 0);
                $pct = $max > 0 ? round(($obtained / $max) * 100, 1) : 0;

                $map[$sid][] = [
                    'test_title' => $row->test_title,
                    'subject_name' => $row->subject_name,
                    'obtained_marks' => $obtained,
                    'total_marks' => $max,
                    'percentage' => $pct,
                    'is_absent' => (bool) $row->is_absent,
                    'date' => $row->test_date,
                ];
            }
        }

        // Chronological order (oldest to newest, left to right on graph)
        foreach ($map as $sid => &$tests) {
            $tests = array_reverse($tests);
        }

        return $map;
    }

    /**
     * Dispatch WhatsApp Academic Alert directly to student/parent via WhatsApp Gateway.
     */
    public function sendWhatsAppAlert(Request $request, $id, WhatsAppGatewayService $whatsAppService)
    {
        $student = User::with(['academyClass', 'section'])->find($id);

        if (!$student) {
            return response()->json([
                'success' => false,
                'message' => 'Student not found.',
            ], 404);
        }

        $phone = $request->input('phone') ?: ($student->contact_number ?: $student->emergency_contact);
        $formattedPhone = $whatsAppService->formatPhoneNumber($phone);

        if (!$formattedPhone) {
            return response()->json([
                'success' => false,
                'message' => 'Valid WhatsApp phone number not found for this student.',
            ], 422);
        }

        if ($request->filled('message')) {
            $message = $request->input('message');
        } else {
            $className = $student->academyClass?->name ?? 'N/A';
            if (!empty($student->section?->name)) {
                $className .= ' - Section ' . $student->section->name;
            }
            $rollNo = $student->roll_number ? $student->roll_number : ('KIPS-' . str_pad($student->id, 4, '0', STR_PAD_LEFT));

            $avgPct = $request->input('avg_percentage', 'N/A');
            $grade = $request->input('grade', '');
            $diagnosticNote = $request->input('diagnostic_note', 'Academic Attention Required');
            $testsTaken = $request->input('tests_taken', 0);
            $totalTests = $request->input('total_tests', 0);
            $weakestSubject = $request->input('weakest_subject');

            $weakestLine = '';
            if (!empty($weakestSubject)) {
                $weakestLine = "⚠️ *کمزور مضمون / Weak Subject:* {$weakestSubject}\n";
            }

            $message = "📢 *KIPS SCHOOL CHUNIAN CAMPUS*\n"
                . "*تعلیمی کارکردگی نوٹس | Academic Performance Alert*\n\n"
                . "محترم والدین / سرپرست،\n"
                . "Assalam-o-Alaikum Respected Parent,\n\n"
                . "یہ اطلاع طالب علم کی تعلیمی کارکردگی کے حوالے سے ہے:\n"
                . "Academic status alert regarding student:\n\n"
                . "👤 *طالب علم / Student:* {$student->name}\n"
                . "🔢 *رول نمبر / Roll No:* {$rollNo}\n"
                . "📚 *کلاس / Class:* {$className}\n"
                . "📈 *مجموعی فیصد / Average:* {$avgPct}%\n"
                . "📝 *ٹیسٹ کی تعداد / Tests:* {$testsTaken} / {$totalTests}\n"
                . "📌 *کیفیت / Status:* {$diagnosticNote}\n"
                . $weakestLine . "\n"
                . "⚠️ برائے مہربانی طالب علم کے تعلیمی تسلسل اور باقاعدگی پر خصوصی توجہ دیں۔ کسی بھی رہنمائی کے لیے اکیڈمی انتظامیہ سے رابطہ فرمائیں۔\n\n"
                . "📞 *Helpline:* 0300 39 39 581\n"
                . "🌐 *Portal:* https://kips.usachunian.com";
        }

        $res = $whatsAppService->sendTextMessage($formattedPhone, $message);

        $isSuccess = !empty($res['success']) || (isset($res['status']) && in_array($res['status'], ['success', 200, 'sent']));

        if ($isSuccess) {
            return response()->json([
                'success' => true,
                'message' => "WhatsApp Alert successfully sent to {$student->name} ({$formattedPhone})!",
                'gateway_response' => $res,
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Failed to send WhatsApp message: ' . ($res['error'] ?? 'Gateway Error'),
            'gateway_response' => $res,
        ], 500);
    }
}
