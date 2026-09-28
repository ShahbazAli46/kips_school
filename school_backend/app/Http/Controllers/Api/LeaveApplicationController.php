<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LeaveApplication;
use Illuminate\Http\Request;

class LeaveApplicationController extends Controller
{
    public function index(Request $request)
    {
        $query = LeaveApplication::with('student:id,name,roll_number,class_id,section_id', 'student.academyClass', 'student.section')
            ->orderBy('created_at', 'desc');
            
        if ($request->has('month') && $request->month !== 'all') {
            $month = $request->month; // expected format: 'YYYY-MM'
            $query->where(function($q) use ($month) {
                $q->where('start_date', 'like', $month . '%')
                  ->orWhere('end_date', 'like', $month . '%');
            });
        }
            
        return response()->json($query->get());
    }

    public function cancel($id)
    {
        $leave = LeaveApplication::findOrFail($id);
        $leave->status = 'cancelled';
        $leave->save();

        return response()->json(['message' => 'Leave application cancelled successfully', 'leave' => $leave]);
    }
}
