<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TeacherLeave;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class TeacherLeaveController extends Controller
{
    /**
     * Get list of leaves for the authenticated teacher
     */
    public function index(Request $request)
    {
        $leaves = TeacherLeave::where('teacher_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'status' => 'success',
            'leaves' => $leaves
        ]);
    }

    /**
     * Submit a new leave application
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'start_date' => 'required|date|after_or_equal:today',
            'end_date' => 'required|date|after_or_equal:start_date',
            'reason' => 'required|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $leave = TeacherLeave::create([
            'teacher_id' => $request->user()->id,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'reason' => $request->reason,
            'status' => 'pending'
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Leave application submitted successfully.',
            'leave' => $leave
        ], 201);
    }
}
