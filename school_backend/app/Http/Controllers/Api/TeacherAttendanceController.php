<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TeacherAttendance;
use App\Models\User;
use Illuminate\Http\Request;
use Carbon\Carbon;

class TeacherAttendanceController extends Controller
{
    // For Super Admin to get all teachers' attendance on a specific date
    public function getAttendanceByDate(Request $request)
    {
        $request->validate([
            'date' => 'required|date'
        ]);

        $date = $request->date;

        // Get all active teachers
        $teachers = User::whereHas('role', function($q) {
            $q->where('name', 'teacher');
        })->where('is_active', true)->get();

        $attendances = TeacherAttendance::where('date', $date)->get()->keyBy('teacher_id');

        $result = $teachers->map(function ($teacher) use ($attendances) {
            $attendance = $attendances->get($teacher->id);
            return [
                'teacher_id' => $teacher->id,
                'name' => $teacher->name,
                'image' => $teacher->image,
                'status' => $attendance ? $attendance->status : null,
                'check_in_time' => $attendance ? $attendance->check_in_time : null,
                'check_out_time' => $attendance ? $attendance->check_out_time : null,
            ];
        });

        return response()->json($result);
    }

    // For Super Admin to mark/update attendance
    public function markAttendance(Request $request)
    {
        $request->validate([
            'date' => 'required|date',
            'attendances' => 'required|array',
            'attendances.*.teacher_id' => 'required|exists:users,id',
            'attendances.*.status' => 'required|in:Present,Absent,Leave',
            'attendances.*.check_in_time' => 'nullable|string',
        ]);

        $date = $request->date;
        $adminId = auth()->id();

        foreach ($request->attendances as $record) {
            TeacherAttendance::updateOrCreate(
                ['teacher_id' => $record['teacher_id'], 'date' => $date],
                [
                    'status' => $record['status'],
                    'marked_by' => $adminId,
                    'check_in_time' => $record['status'] == 'Present' ? ($record['check_in_time'] ?? Carbon::now()->format('H:i:s')) : null,
                    'check_out_time' => $record['status'] == 'Present' ? ($record['check_out_time'] ?? null) : null,
                ]
            );
        }

        return response()->json(['message' => 'Teacher attendance updated successfully']);
    }

    // For Teacher Portal to get their own attendance for a specific month
    public function getMonthlyAttendance(Request $request)
    {
        $request->validate([
            'month' => 'required|date_format:Y-m'
        ]);

        $teacherId = auth()->id();
        $month = Carbon::createFromFormat('Y-m', $request->month);
        
        $attendances = TeacherAttendance::where('teacher_id', $teacherId)
            ->whereYear('date', $month->year)
            ->whereMonth('date', $month->month)
            ->orderBy('date', 'desc')
            ->get();

        return response()->json($attendances);
    }

    public function markSelfPresent(Request $request)
    {
        $request->validate([
            'date' => 'required|date',
            'check_in_time' => 'required|date_format:H:i:s'
        ]);
        
        $teacherId = auth()->id();
        $date = $request->date;
        
        TeacherAttendance::updateOrCreate(
            ['teacher_id' => $teacherId, 'date' => $date],
            [
                'status' => 'Present',
                'marked_by' => $teacherId,
                'check_in_time' => $request->check_in_time
            ]
        );
        
        return response()->json(['success' => true, 'message' => 'Attendance marked present successfully']);
    }

    // For Super Admin / Office Admin to get monthly teacher attendance register
    public function getMonthlyRegister(Request $request)
    {
        $request->validate([
            'month' => 'required|date_format:Y-m'
        ]);

        $monthStr = $request->month;
        $carbonMonth = Carbon::createFromFormat('Y-m', $monthStr);
        $daysInMonth = $carbonMonth->daysInMonth;

        // Get all active teachers
        $teachers = User::where('role_id', 2)
            ->where('is_active', true)
            ->with(['teacherAssignments.subject'])
            ->orderBy('name', 'asc')
            ->get();

        // Get all attendances for the month
        $attendances = TeacherAttendance::whereYear('date', $carbonMonth->year)
            ->whereMonth('date', $carbonMonth->month)
            ->get()
            ->groupBy('teacher_id');

        $result = $teachers->map(function ($teacher) use ($attendances, $carbonMonth, $daysInMonth) {
            $teacherAttendances = $attendances->get($teacher->id, collect())->keyBy(function ($item) {
                return (int) Carbon::parse($item->date)->format('j'); // 1..31
            });

            $daily = [];
            $presentCount = 0;
            $absentCount = 0;
            $leaveCount = 0;

            for ($day = 1; $day <= $daysInMonth; $day++) {
                $att = $teacherAttendances->get($day);
                $status = $att ? $att->status : null;
                $daily[$day] = [
                    'status' => $status,
                    'check_in' => $att ? $att->check_in_time : null,
                    'check_out' => $att ? $att->check_out_time : null,
                ];

                if ($status === 'Present') $presentCount++;
                elseif ($status === 'Absent') $absentCount++;
                elseif ($status === 'Leave') $leaveCount++;
            }

            $totalMarked = $presentCount + $absentCount + $leaveCount;
            $percentage = $totalMarked > 0 ? round(($presentCount / $totalMarked) * 100, 1) : 0;

            // Extract subjects
            $subjects = $teacher->teacherAssignments->pluck('subject.name')->filter()->unique()->values()->all();

            return [
                'teacher_id' => $teacher->id,
                'name' => $teacher->name,
                'email' => $teacher->email,
                'contact_number' => $teacher->contact_number,
                'qualification' => $teacher->qualification,
                'subjects' => $subjects,
                'daily' => $daily,
                'summary' => [
                    'present' => $presentCount,
                    'absent' => $absentCount,
                    'leave' => $leaveCount,
                    'total_marked' => $totalMarked,
                    'percentage' => $percentage,
                ]
            ];
        });

        return response()->json([
            'month' => $monthStr,
            'days_in_month' => $daysInMonth,
            'teachers' => $result,
        ]);
    }

    public function quickUpdate(Request $request)
    {
        $request->validate([
            'teacher_id' => 'required|exists:users,id',
            'date' => 'required|date',
            'status' => 'nullable|in:Present,Absent,Leave,clear'
        ]);

        if ($request->status === 'clear' || empty($request->status)) {
            TeacherAttendance::where('teacher_id', $request->teacher_id)->where('date', $request->date)->delete();
            return response()->json(['message' => 'Attendance cleared']);
        }

        TeacherAttendance::updateOrCreate(
            ['teacher_id' => $request->teacher_id, 'date' => $request->date],
            [
                'status' => $request->status,
                'marked_by' => auth()->id(),
                'check_in_time' => $request->status === 'Present' ? Carbon::now()->format('H:i:s') : null,
            ]
        );

        return response()->json(['message' => 'Attendance updated']);
    }
}

