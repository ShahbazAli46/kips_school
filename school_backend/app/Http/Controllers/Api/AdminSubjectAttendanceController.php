<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SubjectAttendance;
use Illuminate\Http\Request;

class AdminSubjectAttendanceController extends Controller
{
    /**
     * Get paginated subject attendance records with filters.
     */
    public function index(Request $request)
    {
        $query = SubjectAttendance::with(['student.academyClass', 'student.section', 'subject', 'teacher']);

        if ($request->has('date') && !empty($request->date)) {
            $query->where('date', $request->date);
        }

        if ($request->has('subject_id') && !empty($request->subject_id)) {
            $query->where('subject_id', $request->subject_id);
        }

        if ($request->has('student_id') && !empty($request->student_id)) {
            $query->where('student_id', $request->student_id);
        }
        
        if ($request->has('status') && !empty($request->status)) {
            $query->where('status', $request->status);
        }

        if ($request->has('teacher_id') && !empty($request->teacher_id)) {
            $query->where('teacher_id', $request->teacher_id);
        }

        if ($request->has('class_id') && !empty($request->class_id)) {
            $query->whereHas('student', function($q) use ($request) {
                $q->where('class_id', $request->class_id);
            });
        }

        if ($request->has('section_id') && !empty($request->section_id)) {
            $query->whereHas('student', function($q) use ($request) {
                $q->where('section_id', $request->section_id);
            });
        }

        // Sorting
        $query->orderBy('date', 'desc')->orderBy('id', 'desc');

        // Paginating 50 records per page to prevent memory overflow
        $records = $query->paginate(50);

        return response()->json([
            'success' => true,
            'data' => $records
        ]);
    }

    /**
     * Update a specific attendance record.
     */
    public function update(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:present,absent,late',
        ]);

        $attendance = SubjectAttendance::findOrFail($id);
        $attendance->status = $request->status;
        $attendance->save();

        // Dispatch notification immediately to the parent about the updated status
        \App\Jobs\SendSubjectAttendanceNotifications::dispatchSync([$attendance]);

        return response()->json([
            'success' => true,
            'message' => 'Attendance updated successfully.',
            'data' => $attendance->load(['student', 'subject', 'teacher'])
        ]);
    }
}
