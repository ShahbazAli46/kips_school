<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\SendAbsenteeWhatsAppBatchJob;
use App\Models\AppSetting;
use App\Models\Attendance;
use App\Models\LeaveApplication;
use App\Models\User;
use App\Services\FcmService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AttendanceController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'date' => 'nullable|date',
            'class_id' => 'nullable|integer|exists:classes,id',
            'section_id' => 'nullable|integer|exists:sections,id',
        ]);

        $query = Attendance::with('student:id,name,email,contact_number');

        if ($request->date) {
            $query->where('date', $request->date);
        }

        if ($request->class_id || $request->section_id) {
            $query->whereHas('student', function ($q) use ($request) {
                if ($request->class_id) {
                    $q->where('class_id', $request->class_id);
                }
                if ($request->section_id) {
                    $q->where('section_id', $request->section_id);
                }
            });
        }

        return response()->json($query->get());
    }

    public function leavesOnDate(Request $request)
    {
        $request->validate(['date' => 'required|date']);
        
        $leaveStudentIds = LeaveApplication::where('start_date', '<=', $request->date)
            ->where('end_date', '>=', $request->date)
            ->where('status', '!=', 'cancelled')
            ->pluck('student_id');
            
        return response()->json($leaveStudentIds);
    }

    public function bulkMark(Request $request)
    {
        $request->validate([
            'date' => 'required|date',
            'attendances' => 'required|array',
            'attendances.*.student_id' => 'required|integer|exists:users,id',
            'attendances.*.status' => 'required|in:present,absent,leave'
        ]);

        $date = $request->date;
        $markedBy = $request->user()->id;
        $attendances = $request->attendances;

        $studentIds = collect($attendances)->pluck('student_id')->toArray();
        $leaves = LeaveApplication::whereIn('student_id', $studentIds)
            ->where('start_date', '<=', $date)
            ->where('end_date', '>=', $date)
            ->where('status', '!=', 'cancelled')
            ->pluck('student_id')
            ->toArray();

        $absentStudentIds = [];

        DB::beginTransaction();
        try {
            foreach ($attendances as $record) {
                $status = in_array($record['student_id'], $leaves) ? 'leave' : $record['status'];
                
                Attendance::updateOrCreate(
                    [
                        'student_id' => $record['student_id'],
                        'date' => $date
                    ],
                    [
                        'status' => $status,
                        'marked_by' => $markedBy
                    ]
                );

                if ($status === 'absent') {
                    $absentStudentIds[] = $record['student_id'];
                }

                // Dispatch FCM In-App/Push notification to parent & student for absentees and leaves
                if (in_array($status, ['absent', 'leave'])) {
                    try {
                        $student = User::find($record['student_id']);
                        if ($student) {
                            $statusText = ucfirst($status);
                            $targetUserIds = User::where('id', $student->id)
                                ->when(!empty($student->email), fn($q) => $q->orWhere('email', $student->email))
                                ->when(!empty($student->contact_number), fn($q) => $q->orWhere('contact_number', $student->contact_number)->orWhere('emergency_contact', $student->contact_number))
                                ->pluck('id')
                                ->unique()
                                ->toArray();

                            app(FcmService::class)->sendToUsers(
                                $targetUserIds,
                                "Attendance Alert: {$student->name}",
                                "{$student->name} has been marked {$statusText} today ({$date}).",
                                [
                                    'type' => 'attendance',
                                    'student_id' => $student->uuid,
                                    'student_name' => $student->name,
                                    'status' => $status,
                                    'date' => $date,
                                ],
                                'attendance_channel',
                                'attendance',
                                $student->uuid,
                                null
                            );
                        }
                    } catch (\Throwable $e) {
                        Log::error('[Attendance Push Error] ' . $e->getMessage());
                    }
                }
            }
            DB::commit();

            // WhatsApp Absentee PDF Notices (Rate-limited, strictly for absentees when enabled in Super Admin)
            if (AppSetting::isWhatsAppAbsentNotificationEnabled() && !empty($absentStudentIds)) {
                SendAbsenteeWhatsAppBatchJob::dispatch($absentStudentIds, $date);
            }

            return response()->json([
                'message' => 'Attendance marked successfully',
                'absent_count' => count($absentStudentIds),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('[Bulk Attendance Error] ' . $e->getMessage());
            return response()->json(['message' => 'Failed to mark attendance'], 500);
        }
    }
}
