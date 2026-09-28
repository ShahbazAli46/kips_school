<?php

namespace App\Jobs;

use App\Models\SubjectAttendance;
use App\Services\FcmService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendSubjectAttendanceNotifications implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $attendanceRecords;

    /**
     * Create a new job instance.
     *
     * @param \Illuminate\Database\Eloquent\Collection|array $attendanceRecords Array or Collection of SubjectAttendance models
     */
    public function __construct($attendanceRecords)
    {
        $this->attendanceRecords = $attendanceRecords;
    }

    /**
     * Execute the job.
     */
    public function handle(FcmService $fcmService): void
    {
        foreach ($this->attendanceRecords as $attendance) {
            try {
                // Ensure the relationships are loaded
                $attendance->loadMissing(['student', 'subject']);

                $student = $attendance->student;
                $subject = $attendance->subject;

                if (!$student || !$subject) {
                    continue;
                }

                $statusText = ucfirst($attendance->status);
                $title = "Subject Attendance: {$subject->name}";
                $body = "{$student->name} was marked {$statusText} in {$subject->name} on {$attendance->date}.";

                // Find all target accounts associated with the student (Parent & Student devices)
                $targetUserIds = \App\Models\User::where('id', $student->id)
                    ->when(!empty($student->email), function ($q) use ($student) {
                        $q->orWhere('email', $student->email);
                    })
                    ->when(!empty($student->contact_number), function ($q) use ($student) {
                        $q->orWhere('contact_number', $student->contact_number)
                          ->orWhere('emergency_contact', $student->contact_number);
                    })
                    ->pluck('id')
                    ->unique()
                    ->toArray();

                if (empty($targetUserIds)) {
                    continue;
                }

                // Send push notification to target users
                $fcmService->sendToUsers(
                    $targetUserIds,
                    $title,
                    $body,
                    [
                        'type' => 'subject_attendance',
                        'student_id' => (string) $student->id,
                        'student_name' => $student->name,
                        'subject_id' => (string) $subject->id,
                        'subject_name' => $subject->name,
                        'status' => $attendance->status,
                        'date' => $attendance->date,
                    ],
                    'attendance_channel',
                    'student_diary',
                    (string) $student->id,
                    null,
                    $student->name
                );

            } catch (\Throwable $e) {
                Log::error("Failed to send subject attendance notification for attendance ID {$attendance->id}: " . $e->getMessage());
            }
        }
    }
}
