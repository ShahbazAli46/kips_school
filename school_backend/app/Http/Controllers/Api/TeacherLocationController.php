<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TeacherAttendance;
use App\Models\TeacherLocationPing;
use App\Models\User;
use App\Services\FcmService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

class TeacherLocationController extends Controller
{
    // Kips School Chunian Campus GPS Coordinates
    const ACADEMY_LAT = 30.96916059661241;
    const ACADEMY_LNG = 73.97791492883526;
    const GEOFENCE_RADIUS_METERS = 50.0;

    /**
     * Calculate Haversine distance in meters between two lat/lng points.
     */
    private function calculateDistance(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earthRadius = 6371000; // in meters
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat / 2) * sin($dLat / 2) +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($dLon / 2) * sin($dLon / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return round($earthRadius * $c, 2);
    }

    /**
     * Teacher mobile app sends periodic location telemetry.
     * POST /api/teacher/ping-location
     */
    public function pingLocation(Request $request)
    {
        $request->validate([
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'accuracy' => 'nullable|numeric|min:0',
            'battery_level' => 'nullable|integer|between:0,100',
            'device_info' => 'nullable|string|max:150',
        ]);

        $teacher = $request->user();
        if (!$teacher || (int)$teacher->role_id !== 2) {
            return response()->json(['message' => 'Unauthorized: Only teachers can send location pings'], 403);
        }

        $lat = (float) $request->latitude;
        $lng = (float) $request->longitude;
        $accuracy = $request->accuracy ? (float) $request->accuracy : null;

        // Calculate distance from academy center
        $distance = $this->calculateDistance(self::ACADEMY_LAT, self::ACADEMY_LNG, $lat, $lng);

        // Geofence check (accounting for GPS accuracy tolerance if reasonable)
        $isInside = $distance <= self::GEOFENCE_RADIUS_METERS;

        $today = Carbon::today()->toDateString();

        // Save ping record
        $ping = TeacherLocationPing::create([
            'teacher_id' => $teacher->id,
            'date' => $today,
            'latitude' => $lat,
            'longitude' => $lng,
            'accuracy' => $accuracy,
            'distance_meters' => $distance,
            'is_inside_geofence' => $isInside,
            'device_info' => $request->device_info,
            'battery_level' => $request->battery_level,
            'recorded_at' => Carbon::now(),
        ]);

        // Update user activity
        $teacher->forceFill(['last_seen_at' => Carbon::now()])->saveQuietly();

        // Check if attendance can be auto-marked
        $attendanceMarked = false;
        $insidePings = TeacherLocationPing::where('teacher_id', $teacher->id)
            ->where('date', $today)
            ->where('is_inside_geofence', true)
            ->orderBy('recorded_at', 'asc')
            ->get();

        $totalInside = $insidePings->count();

        // If at least 4 pings inside geofence across >= 45 minutes
        if ($totalInside >= 4) {
            $firstPing = $insidePings->first();
            $latestPing = $insidePings->last();

            $diffMinutes = Carbon::parse($firstPing->recorded_at)->diffInMinutes(Carbon::parse($latestPing->recorded_at));

            if ($diffMinutes >= 45) {
                // Check or mark attendance
                $existing = TeacherAttendance::where('teacher_id', $teacher->id)
                    ->where('date', $today)
                    ->first();

                if (!$existing || $existing->status !== 'Present') {
                    $checkInTime = Carbon::parse($firstPing->recorded_at)->format('H:i:s');
                    TeacherAttendance::updateOrCreate(
                        ['teacher_id' => $teacher->id, 'date' => $today],
                        [
                            'status' => 'Present',
                            'marked_by' => $teacher->id,
                            'check_in_time' => $checkInTime,
                        ]
                    );
                    $attendanceMarked = true;
                    Log::info("[LocationAttendance] Teacher #{$teacher->id} ({$teacher->name}) auto-marked Present at {$checkInTime}");
                } else {
                    $attendanceMarked = true;
                }
            }
        }

        return response()->json([
            'success' => true,
            'distance_meters' => $distance,
            'is_inside_geofence' => $isInside,
            'inside_pings_today' => $totalInside,
            'required_pings' => 4,
            'attendance_marked' => $attendanceMarked,
            'message' => $isInside
                ? "Located inside academy ({$distance}m). Ping #{$totalInside} recorded."
                : "Located outside academy ({$distance}m)."
        ]);
    }

    /**
     * Super Admin / Office Admin: Get live presence and location telemetry for all teachers.
     * GET /api/admin/teachers/live-presence
     */
    public function getLivePresence(Request $request)
    {
        $today = Carbon::today()->toDateString();

        $teachers = User::where('role_id', 2)
            ->where('is_active', true)
            ->with([
                'designation',
                'teacherAssignments.academyClass',
                'teacherAssignments.subject',
                'fcmTokens' => function ($q) {
                    $q->orderBy('updated_at', 'desc');
                }
            ])
            ->orderBy('name', 'asc')
            ->get();

        // Get all today's pings for all teachers
        $todayPings = TeacherLocationPing::where('date', $today)
            ->orderBy('recorded_at', 'asc')
            ->get()
            ->groupBy('teacher_id');

        // Get all today's attendances
        $todayAttendances = TeacherAttendance::where('date', $today)
            ->get()
            ->keyBy('teacher_id');

        $list = $teachers->map(function ($teacher) use ($todayPings, $todayAttendances) {
            $pings = $todayPings->get($teacher->id, collect());
            $insidePings = $pings->where('is_inside_geofence', true);
            $latestPing = $pings->last();
            $firstInsidePing = $insidePings->first();
            $latestFcm = $teacher->fcmTokens->first();

            $isOnline = false;
            if ($teacher->last_seen_at) {
                $isOnline = Carbon::parse($teacher->last_seen_at)->diffInMinutes(Carbon::now()) <= 5;
            }

            // Determine geofence presence status
            $presenceStatus = 'no_pings_today';
            if ($latestPing) {
                $presenceStatus = $latestPing->is_inside_geofence ? 'inside_academy' : 'outside_academy';
            }

            // Attendance status
            $attendance = $todayAttendances->get($teacher->id);

            return [
                'id' => $teacher->id,
                'name' => $teacher->name,
                'email' => $teacher->email,
                'contact_number' => $teacher->contact_number,
                'emergency_contact' => $teacher->emergency_contact,
                'qualification' => $teacher->qualification,
                'image' => $teacher->image,
                'signature' => $teacher->signature,
                'is_online' => $isOnline,
                'last_seen_at' => $teacher->last_seen_at ? Carbon::parse($teacher->last_seen_at)->toIso8601String() : null,
                'last_seen_human' => $teacher->last_seen_at ? Carbon::parse($teacher->last_seen_at)->diffForHumans() : 'Never logged in',
                'has_app' => $teacher->fcmTokens->isNotEmpty(),
                'app_details' => $latestFcm ? [
                    'device_name' => $latestFcm->device_name,
                    'device_type' => $latestFcm->device_type,
                    'app_version' => $latestFcm->app_version,
                    'last_used_at' => $latestFcm->last_used_at ? Carbon::parse($latestFcm->last_used_at)->diffForHumans() : null,
                ] : null,
                'location_telemetry' => [
                    'presence_status' => $presenceStatus,
                    'total_pings_today' => $pings->count(),
                    'inside_pings_today' => $insidePings->count(),
                    'latest_distance_meters' => $latestPing ? $latestPing->distance_meters : null,
                    'latest_accuracy_meters' => $latestPing ? $latestPing->accuracy : null,
                    'latest_battery_level' => $latestPing ? $latestPing->battery_level : null,
                    'latest_ping_time' => $latestPing ? Carbon::parse($latestPing->recorded_at)->format('h:i A') : null,
                    'latest_ping_human' => $latestPing ? Carbon::parse($latestPing->recorded_at)->diffForHumans() : null,
                    'first_arrival_time' => $firstInsidePing ? Carbon::parse($firstInsidePing->recorded_at)->format('h:i A') : null,
                    'latest_latitude' => $latestPing ? (float)$latestPing->latitude : null,
                    'latest_longitude' => $latestPing ? (float)$latestPing->longitude : null,
                ],
                'today_attendance' => $attendance ? [
                    'status' => $attendance->status,
                    'check_in_time' => $attendance->check_in_time,
                    'check_out_time' => $attendance->check_out_time,
                ] : [
                    'status' => 'Not Marked',
                    'check_in_time' => null,
                    'check_out_time' => null,
                ],
            ];
        });

        $summary = [
            'total_teachers' => $list->count(),
            'online_now' => $list->where('is_online', true)->count(),
            'at_academy_today' => $list->where('location_telemetry.presence_status', 'inside_academy')->count(),
            'outside_academy' => $list->where('location_telemetry.presence_status', 'outside_academy')->count(),
            'no_pings_today' => $list->where('location_telemetry.presence_status', 'no_pings_today')->count(),
            'app_installed' => $list->where('has_app', true)->count(),
            'attendance_present_today' => $list->where('today_attendance.status', 'Present')->count(),
        ];

        return response()->json([
            'summary' => $summary,
            'teachers' => $list,
        ]);
    }

    /**
     * Admin: Send instant background FCM push to request fresh GPS check from teacher's phone.
     * POST /api/admin/teachers/{teacher}/request-location-ping
     */
    public function requestLocationPing(User $teacher, FcmService $fcmService)
    {
        if ((int)$teacher->role_id !== 2) {
            return response()->json(['message' => 'User is not a teacher'], 400);
        }

        $tokens = $teacher->fcmTokens;
        if ($tokens->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => "Teacher has not installed or logged into the mobile app yet."
            ], 404);
        }

        // Dispatch high priority background ping command
        $fcmService->sendToUser(
            $teacher->id,
            'Attendance Verification Ping',
            'Academy presence sync requested by admin',
            [
                'type' => 'location_check',
                'action' => 'force_ping',
                'timestamp' => (string) Carbon::now()->timestamp,
            ],
            'attendance_channel'
        );

        return response()->json([
            'success' => true,
            'message' => "GPS location sync request dispatched to {$teacher->name}'s device."
        ]);
    }

    /**
     * Admin: Get full location history for a teacher on a given date.
     * GET /api/admin/teachers/{teacher}/location-trail?date=YYYY-MM-DD
     */
    public function getLocationTrail(Request $request, User $teacher)
    {
        $date = $request->query('date', Carbon::today()->toDateString());

        $pings = TeacherLocationPing::where('teacher_id', $teacher->id)
            ->where('date', $date)
            ->orderBy('recorded_at', 'asc')
            ->get();

        return response()->json([
            'teacher' => [
                'id' => $teacher->id,
                'name' => $teacher->name,
                'email' => $teacher->email,
            ],
            'date' => $date,
            'total_pings' => $pings->count(),
            'inside_pings' => $pings->where('is_inside_geofence', true)->count(),
            'trail' => $pings,
        ]);
    }
}
