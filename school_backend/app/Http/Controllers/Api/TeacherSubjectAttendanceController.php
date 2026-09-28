<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\SendSubjectAttendanceNotifications;
use App\Models\StudentSubjectEnrollment;
use App\Models\SubjectAttendance;
use App\Models\TeacherAssignment;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TeacherSubjectAttendanceController extends Controller
{
    /**
     * Get the authenticated teacher's assignments.
     */
    public function getAssignments(Request $request)
    {
        $teacherId = $request->user()->id;

        $assignments = TeacherAssignment::with(['academyClass', 'major', 'section', 'subject'])
            ->where('teacher_id', $teacherId)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $assignments
        ]);
    }

    /**
     * Fetch students enrolled in a specific subject matching an assignment.
     */
    public function getStudents(Request $request)
    {
        $request->validate([
            'subject_id' => 'required|exists:subjects,id',
            'class_id' => 'required|exists:classes,id',
            'section_id' => 'required|exists:sections,id',
            'major_id' => 'nullable|exists:majors,id',
            'date' => 'required|date',
        ]);

        $subjectId = $request->subject_id;
        $date = $request->date;
        $month = substr($date, 0, 7);

        // Get all active students belonging to this class/section/major
        // whose latest enrollment on or before $month has is_active = true for this subject
        $studentQuery = User::where('role_id', 3)
            ->where('is_active', true)
            ->where('class_id', $request->class_id)
            ->where('section_id', $request->section_id);

        if ($request->filled('major_id')) {
            $studentQuery->where('major_id', $request->major_id);
        }

        $studentQuery->whereExists(function ($query) use ($subjectId, $month) {
            $query->select(DB::raw(1))
                ->from('student_subject_enrollments as sse')
                ->whereColumn('sse.student_id', 'users.id')
                ->where('sse.subject_id', $subjectId)
                ->where('sse.is_active', true)
                ->whereRaw("sse.month = COALESCE(
                    (SELECT MAX(sse2.month) FROM student_subject_enrollments sse2 WHERE sse2.student_id = sse.student_id AND sse2.subject_id = sse.subject_id AND sse2.month <= ?),
                    (SELECT MAX(sse3.month) FROM student_subject_enrollments sse3 WHERE sse3.student_id = sse.student_id AND sse3.subject_id = sse.subject_id)
                )", [$month]);
        });

        $students = $studentQuery->orderBy('name')->get();

        // Load existing attendance for these students on this specific date
        $attendances = SubjectAttendance::where('subject_id', $subjectId)
            ->where('date', $date)
            ->whereIn('student_id', $students->pluck('id'))
            ->get()
            ->keyBy('student_id');

        // Map students to include their existing attendance status
        $studentsData = $students->map(function ($student) use ($attendances) {
            $status = 'present'; // default
            if ($attendances->has($student->id)) {
                $status = $attendances->get($student->id)->status;
            }
            
            $studentArray = $student->toArray();
            $studentArray['current_attendance_status'] = $status;
            return $studentArray;
        });

        return response()->json([
            'success' => true,
            'data' => $studentsData
        ]);
    }

    /**
     * Submit attendance for a specific subject and date.
     */
    public function store(Request $request)
    {
        $request->validate([
            'subject_id' => 'required|exists:subjects,id',
            'date' => 'required|date',
            'attendances' => 'required|array',
            'attendances.*.student_id' => 'required|exists:users,id',
            'attendances.*.status' => 'required|in:present,absent,late',
        ]);

        $teacherId = $request->user()->id;
        $subjectId = $request->subject_id;
        $date = $request->date;
        $attendancesData = $request->attendances;

        $records = collect();

        DB::transaction(function () use ($teacherId, $subjectId, $date, $attendancesData, &$records) {
            foreach ($attendancesData as $data) {
                $record = SubjectAttendance::updateOrCreate(
                    [
                        'student_id' => $data['student_id'],
                        'subject_id' => $subjectId,
                        'date' => $date,
                    ],
                    [
                        'teacher_id' => $teacherId,
                        'status' => $data['status'],
                    ]
                );
                
                $records->push($record);
            }
        });

        // Dispatch notifications immediately to parents
        SendSubjectAttendanceNotifications::dispatchSync($records);

        return response()->json([
            'success' => true,
            'message' => 'Attendance saved successfully.',
        ]);
    }
}
