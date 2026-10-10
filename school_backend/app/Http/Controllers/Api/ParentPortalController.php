<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Attendance;
use App\Models\TestMark;
use App\Models\Announcement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ParentPortalController extends Controller
{
    /**
     * Get all students associated with the authenticated user's email.
     */
    public function myStudents(Request $request)
    {
        $user = Auth::user();
        if (!$user->email) {
            return response()->json([]);
        }

        $students = User::with(['academyClass:id,name', 'section:id,name', 'major:id,name'])
            ->where('role_id', 3)
            ->where('email', $user->email)
            ->where('is_active', true)
            ->get();

        return response()->json($students);
    }

    /**
     * Get attendance for a specific student if they share the authenticated user's email.
     */
    public function studentAttendance(Request $request, User $student)
    {
        $user = Auth::user();

        // Ensure authorization (the student shares the same email as the logged-in parent)
        if (!$user->email || $student->email !== $user->email) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $month = $request->query('month');
        if (!$month) {
            $month = now()->format('Y-m');
        }

        $attendances = Attendance::where('student_id', $student->id)
            ->where('date', 'like', $month . '-%')
            ->orderBy('date', 'desc')
            ->get();

        return response()->json($attendances);
    }

    /**
     * Get test marks for a specific student if they share the authenticated user's email.
     */
    public function studentMarks(Request $request, User $student)
    {
        $user = Auth::user();

        // Ensure authorization
        // if (!$user->email || $student->email !== $user->email) {
        //     return response()->json(['message' => 'Unauthorized'], 403);
        // }

        $marks = TestMark::with(['test.test_category', 'test.subject'])
            ->where('student_id', $student->id)
            ->orderBy('created_at', 'desc')
            ->get();

        $categories = collect();
        $positions = [];

        $marksByType = $marks->groupBy(function($m) {
            return $m->test && $m->test->test_category ? $m->test->test_category->type : null;
        });

        foreach ($marksByType as $type => $categoryMarks) {
            if (!$type) continue;
            
            $typeNames = [
                'class_test' => 'Class Test',
                'school_test' => 'School Test',
                'rnt' => 'R n T',
                'academy_series' => 'Class Test',
            ];
            $name = $typeNames[$type] ?? ucwords(str_replace('_', ' ', $type));
            if (!$categories->contains('id', $type)) {
                $categories->push((object)[
                    'id' => $type,
                    'name' => $name
                ]);
            }

            $testIds = $categoryMarks->pluck('test_id')->unique();

            $allMarks = TestMark::whereIn('test_id', $testIds)
                ->selectRaw('student_id, SUM(obtained_marks) as total_obtained, SUM(IF(is_absent=0, (SELECT total_marks FROM tests WHERE tests.id = test_marks.test_id), 0)) as total_max')
                ->groupBy('student_id')
                ->orderByDesc('total_obtained')
                ->get();

            $rank = 1;
            $studentPosition = 1;
            $studentTotal = 0;
            $studentMax = 0;

            foreach ($allMarks as $m) {
                if ($m->student_id == $student->id) {
                    $studentPosition = $rank;
                    $studentTotal = $m->total_obtained;
                    $studentMax = $m->total_max;
                    break;
                }
                $rank++;
            }

            $positions[] = [
                'category_id' => $type,
                'position' => $studentPosition,
                'total_students' => $allMarks->count(),
                'total_obtained' => (float) $studentTotal,
                'total_max' => (float) $studentMax,
                'percentage' => $studentMax > 0 ? round(((float)$studentTotal / (float)$studentMax) * 100, 2) : 0
            ];
        }

        // Calculate "All Categories" overall position
        $allTestIds = $marks->pluck('test_id')->unique();
        if ($allTestIds->isNotEmpty()) {
            $allMarks = TestMark::whereIn('test_id', $allTestIds)
                ->selectRaw('student_id, SUM(obtained_marks) as total_obtained, SUM(IF(is_absent=0, (SELECT total_marks FROM tests WHERE tests.id = test_marks.test_id), 0)) as total_max')
                ->groupBy('student_id')
                ->orderByDesc('total_obtained')
                ->get();

            $rank = 1;
            $studentPosition = 1;
            $studentTotal = 0;
            $studentMax = 0;

            foreach ($allMarks as $m) {
                if ($m->student_id == $student->id) {
                    $studentPosition = $rank;
                    $studentTotal = $m->total_obtained;
                    $studentMax = $m->total_max;
                    break;
                }
                $rank++;
            }

            $positions[] = [
                'category_id' => 'all',
                'position' => $studentPosition,
                'total_students' => $allMarks->count(),
                'total_obtained' => (float) $studentTotal,
                'total_max' => (float) $studentMax,
                'percentage' => $studentMax > 0 ? round(((float)$studentTotal / (float)$studentMax) * 100, 2) : 0
            ];
        }

        $assignedTeacher = \Illuminate\Support\Facades\DB::table('teacher_assignments')
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
            ->select('teachers.name', 'teachers.signature')
            ->first();

        return response()->json([
            'marks' => $marks,
            'categories' => $categories,
            'positions' => $positions,
            'class_incharge' => $assignedTeacher ? $assignedTeacher->name : null,
            'teacher_signature' => ($assignedTeacher && $assignedTeacher->signature)
                ? (str_starts_with($assignedTeacher->signature, 'http') ? $assignedTeacher->signature : asset('storage/' . $assignedTeacher->signature))
                : null,
        ]);
    }

    /**
     * Update student profile image
     */
    public function updateStudentImage(Request $request, User $student)
    {
        $user = Auth::user();

        // Ensure authorization
        if (!$user->email || $student->email !== $user->email) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,webp|max:2048',
        ]);

        if ($request->hasFile('image')) {
            if ($student->image) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($student->image);
            }
            $path = $request->file('image')->store('students', 'public');
            $student->image = $path;
            $student->save();

            return response()->json([
                'message' => 'Image updated successfully',
                'image' => $path
            ]);
        }

        return response()->json(['message' => 'No image provided'], 400);
    }

    /**
     * Get targeted and global announcements for a specific student.
     */
    public function studentAnnouncements(Request $request, User $student)
    {
        $user = Auth::user();

        // Ensure authorization
        if (!$user->email || $student->email !== $user->email) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $announcements = Announcement::where(function ($query) use ($student) {
            $query->where('target_type', 'global')
                  ->orWhere(function ($q) use ($student) {
                      $q->where('target_type', 'class')->where('class_id', $student->class_id);
                  })
                  ->orWhere(function ($q) use ($student) {
                      $q->where('target_type', 'student')->where('student_id', $student->id);
                  });
        })
        ->orderBy('date', 'desc')
        ->orderBy('created_at', 'desc')
        ->get();

        return response()->json($announcements);
    }

    public function studentDetailedResults(Request $request, User $student)
    {
        $user = Auth::user();
        if (!$user->email || $student->email !== $user->email) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'category_type' => 'nullable|string'
        ]);
        
        $categoryType = $validated['category_type'] ?? 'all';

        $query = \Illuminate\Support\Facades\DB::table('test_marks')
            ->join('tests', 'test_marks.test_id', '=', 'tests.id')
            ->join('subjects', 'tests.subject_id', '=', 'subjects.id')
            ->join('test_categories', 'tests.test_category_id', '=', 'test_categories.id')
            ->where('test_marks.student_id', $student->id);

        if ($student->major_id) {
            $query->whereIn('tests.subject_id', function ($q) use ($student) {
                $q->select('subject_id')
                  ->from('major_subject')
                  ->where('major_id', $student->major_id);
            });
        }

        if ($categoryType !== 'all') {
            $query->where('test_categories.type', $categoryType);
        }

        $individualTestsQuery = clone $query;

        $details = $query->select(
                'subjects.id as subject_id',
                'subjects.name as subject_name',
                \Illuminate\Support\Facades\DB::raw('COUNT(tests.id) as tests_taken'),
                \Illuminate\Support\Facades\DB::raw('SUM(IFNULL(test_marks.obtained_marks, 0)) as total_obtained'),
                \Illuminate\Support\Facades\DB::raw('SUM(tests.total_marks) as total_max'),
                \Illuminate\Support\Facades\DB::raw('SUM(CASE WHEN test_marks.is_absent = 1 THEN 1 ELSE 0 END) as absents')
            )
            ->groupBy('subjects.id', 'subjects.name')
            ->get();

        $details->transform(function ($item) {
            $item->total_obtained = (float) $item->total_obtained;
            $item->total_max = (float) $item->total_max;
            $item->percentage = $item->total_max > 0 ? round(($item->total_obtained / $item->total_max) * 100, 2) : 0;
            return $item;
        });

        $individualTests = $individualTestsQuery->select(
            'tests.id as test_id',
            'tests.title as test_title',
            'tests.date as test_date',
            'subjects.name as subject_name',
            'test_marks.obtained_marks',
            'tests.total_marks',
            'test_marks.is_absent'
        )
        ->orderBy('tests.date', 'desc')
        ->get();

        $assignedTeacher = \Illuminate\Support\Facades\DB::table('teacher_assignments')
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
            $assignedTeacher = \Illuminate\Support\Facades\DB::table('teacher_assignments')
                ->join('users as teachers', 'teacher_assignments.teacher_id', '=', 'teachers.id')
                ->where('teacher_assignments.class_id', $student->class_id)
                ->whereNull('teachers.deleted_at')
                ->orderBy('teacher_assignments.is_class_incharge', 'desc')
                ->orderByRaw('CASE WHEN teachers.signature IS NOT NULL THEN 0 ELSE 1 END')
                ->select('teachers.id', 'teachers.name', 'teachers.signature')
                ->first();
        }

        $studentData = [
            'id' => $student->id,
            'name' => $student->name,
            'father_name' => $student->father_name,
            'roll_number' => $student->roll_number,
            'image' => $student->image,
            'class_id' => $student->class_id,
            'section_id' => $student->section_id,
            'class_name' => $student->academyClass?->name,
            'section_name' => $student->section?->name,
            'class_incharge' => $assignedTeacher ? $assignedTeacher->name : null,
            'teacher_signature' => ($assignedTeacher && $assignedTeacher->signature)
                ? (str_starts_with($assignedTeacher->signature, 'http') ? $assignedTeacher->signature : asset('storage/' . $assignedTeacher->signature))
                : null,
        ];

        return response()->json([
            'student' => $studentData,
            'subjects' => $details,
            'tests' => $individualTests
        ]);
    }

    public function submitLeave(Request $request, User $student)
    {
        if ($student->role_id !== 3) {
            return response()->json(['message' => 'Invalid student'], 400);
        }

        $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'remarks' => 'nullable|string',
        ]);

        $leave = \App\Models\LeaveApplication::create([
            'student_id' => $student->id,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'remarks' => $request->remarks,
            'status' => 'approved', // Auto-approved by default
        ]);

        return response()->json(['message' => 'Leave application submitted successfully', 'leave' => $leave], 201);
    }
}