<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TeacherLeave;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AdminTeacherLeaveController extends Controller
{
    /**
     * Get list of all teacher leaves
     */
    public function index(Request $request)
    {
        $query = TeacherLeave::with('teacher')
            ->orderBy('created_at', 'desc');

        if ($request->has('month') && !empty($request->month)) {
            $month = $request->month;
            $startOfMonth = \Carbon\Carbon::parse($month . '-01')->startOfMonth();
            $endOfMonth = \Carbon\Carbon::parse($month . '-01')->endOfMonth();
            
            $query->where(function($q) use ($startOfMonth, $endOfMonth) {
                $q->whereBetween('start_date', [$startOfMonth, $endOfMonth])
                  ->orWhereBetween('end_date', [$startOfMonth, $endOfMonth])
                  ->orWhere(function($sq) use ($startOfMonth, $endOfMonth) {
                      $sq->where('start_date', '<', $startOfMonth)
                         ->where('end_date', '>', $endOfMonth);
                  });
            });
        }

        $leaves = $query->get();

        return response()->json([
            'status' => 'success',
            'leaves' => $leaves
        ]);
    }

    /**
     * Update the status of a teacher leave
     */
    public function updateStatus(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'status' => 'required|in:approved,rejected',
            'admin_notes' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $leave = TeacherLeave::find($id);

        if (!$leave) {
            return response()->json([
                'status' => 'error',
                'message' => 'Teacher leave application not found'
            ], 404);
        }

        $oldStatus = $leave->getOriginal('status');
        $leave->status = $request->status;
        if ($request->has('admin_notes')) {
            $leave->admin_notes = $request->admin_notes;
        }
        $leave->save();
        $newStatus = $leave->status;

        if ($oldStatus !== 'approved' && $newStatus === 'approved') {
            $sign = 1;
        } elseif ($oldStatus === 'approved' && $newStatus !== 'approved') {
            $sign = -1;
        } else {
            $sign = 0;
        }

        if ($sign !== 0) {
            $start = \Carbon\Carbon::parse($leave->start_date);
            $end = \Carbon\Carbon::parse($leave->end_date);
            
            $currentMonth = $start->copy()->startOfMonth();
            $endMonth = $end->copy()->startOfMonth();
            
            while ($currentMonth->lte($endMonth)) {
                $monthString = $currentMonth->format('Y-m');
                
                $startOfMonth = $currentMonth->copy()->startOfMonth();
                $endOfMonth = $currentMonth->copy()->endOfMonth();
                
                $overlapStart = $start->copy()->max($startOfMonth);
                $overlapEnd = $end->copy()->min($endOfMonth);
                $days = $overlapStart->diffInDays($overlapEnd) + 1;
                
                if ($days > 0) {
                    $slip = \App\Models\SalarySlip::where('teacher_id', $leave->teacher_id)->where('month', $monthString)->first();
                    if ($slip) {
                        $slip->taken_off_days += ($days * $sign);
                        // Prevent negative taken_off_days
                        $slip->taken_off_days = max(0, $slip->taken_off_days);
                        
                        $extraOffDays = max(0, $slip->taken_off_days - $slip->permitted_off_days);
                        $dailyRate = $slip->total_amount / 30;
                        $deduction = $extraOffDays * $dailyRate;
                        
                        $slip->payable_salary = max(0, $slip->total_amount - $deduction) + $slip->bonus + $slip->previous_arrears - $slip->advance_deducted;
                        $slip->attendance_percentage = max(0, 100 - ($extraOffDays * (100 / 30)));
                        
                        $totalPaid = (float)($slip->total_paid ?? 0);
                        if ($totalPaid <= 0) {
                            $slip->payment_status = 'unpaid';
                        } elseif ($totalPaid < $slip->payable_salary) {
                            $slip->payment_status = 'partial';
                        } else {
                            $slip->payment_status = 'paid';
                        }
                        
                        $slip->save();
                    }
                }
                $currentMonth->addMonth();
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Leave status updated successfully',
            'leave' => $leave->load('teacher')
        ]);
    }
}
