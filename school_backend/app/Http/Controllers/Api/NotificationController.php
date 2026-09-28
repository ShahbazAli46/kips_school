<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FcmToken;
use App\Models\PushNotificationLog;
use App\Models\User;
use App\Services\FcmService;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    protected FcmService $fcmService;

    public function __construct(FcmService $fcmService)
    {
        $this->fcmService = $fcmService;
    }

    /**
     * Register or update FCM device token for authenticated user.
     */
    public function registerToken(Request $request)
    {
        $validated = $request->validate([
            'token' => 'required|string|max:500',
            'device_type' => 'nullable|string|max:50',
            'device_name' => 'nullable|string|max:255',
            'app_version' => 'nullable|string|max:50',
        ]);

        $user = $request->user();

        FcmToken::updateOrCreate(
            ['token' => $validated['token']],
            [
                'user_id' => $user->id,
                'device_type' => $validated['device_type'] ?? 'android',
                'device_name' => $validated['device_name'] ?? null,
                'app_version' => $validated['app_version'] ?? null,
                'last_used_at' => now(),
            ]
        );

        return response()->json([
            'message' => 'FCM Device token registered successfully.',
        ]);
    }

    /**
     * Remove FCM device token on user logout.
     */
    public function removeToken(Request $request)
    {
        $validated = $request->validate([
            'token' => 'required|string',
        ]);

        FcmToken::where('token', $validated['token'])
            ->where('user_id', $request->user()->id)
            ->delete();

        return response()->json([
            'message' => 'Device token removed successfully.',
        ]);
    }

    /**
     * Send custom push notifications from Super Admin / Office Admin dashboard.
     */
    public function adminSend(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:150',
            'body' => 'required|string',
            'target_type' => 'required|in:all,role,user',
            'target_id' => 'nullable|string',
            'channel_id' => 'nullable|string',
            'screen' => 'nullable|string',
            'extra_id' => 'nullable|string',
            'data' => 'nullable|array',
        ]);

        $title = $validated['title'];
        $body = $validated['body'];
        $targetType = $validated['target_type'];
        $channelId = $validated['channel_id'] ?? 'general_channel';
        $screen = $validated['screen'] ?? null;
        $extraId = $validated['extra_id'] ?? null;
        $customData = $validated['data'] ?? [];
        $senderId = $request->user()?->id;

        $result = [];

        if ($targetType === 'all') {
            $result = $this->fcmService->sendBroadcast($title, $body, $customData, $channelId, $screen, $extraId, $senderId);
        } elseif ($targetType === 'role') {
            $roleId = (int) ($validated['target_id'] ?? 2);
            $result = $this->fcmService->sendToRole($roleId, $title, $body, $customData, $channelId, $screen, $extraId, $senderId);
        } elseif ($targetType === 'user') {
            $userId = (int) $validated['target_id'];
            $result = $this->fcmService->sendToUsers([$userId], $title, $body, $customData, $channelId, $screen, $extraId, $senderId);
        }

        return response()->json([
            'message' => 'Notification dispatched.',
            'result' => $result,
        ]);
    }

    /**
     * Get paginated logs of sent push notifications.
     */
    public function getLogs(Request $request)
    {
        $logs = PushNotificationLog::with('sender:id,name,email')
            ->latest()
            ->paginate(25);

        return response()->json($logs);
    }

    /**
     * Get statistics about registered devices and campaigns.
     */
    public function getStats()
    {
        $totalDevices = FcmToken::count();
        $androidDevices = FcmToken::where('device_type', 'android')->count();
        $totalCampaigns = PushNotificationLog::count();
        $teachersRegistered = FcmToken::whereHas('user', fn($q) => $q->where('role_id', 2))->count();
        $studentsRegistered = FcmToken::whereHas('user', fn($q) => $q->where('role_id', 3))->count();

        return response()->json([
            'total_devices' => $totalDevices,
            'android_devices' => $androidDevices,
            'total_campaigns' => $totalCampaigns,
            'teachers_registered' => $teachersRegistered,
            'students_registered' => $studentsRegistered,
        ]);
    }

    /**
     * Get in-app notifications for the authenticated user.
     */
    public function getUserNotifications(Request $request)
    {
        $user = $request->user();

        $notifications = \App\Models\UserNotification::where('user_id', $user->id)
            ->latest()
            ->take(50)
            ->get();

        $unreadCount = \App\Models\UserNotification::where('user_id', $user->id)
            ->unread()
            ->count();

        return response()->json([
            'notifications' => $notifications,
            'unread_count' => $unreadCount,
        ]);
    }

    /**
     * Mark a specific notification as read.
     */
    public function markRead(Request $request, $id)
    {
        \App\Models\UserNotification::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->update(['read_at' => now()]);

        return response()->json(['message' => 'Notification marked as read.']);
    }

    /**
     * Mark all notifications as read for the authenticated user.
     */
    public function markAllRead(Request $request)
    {
        \App\Models\UserNotification::where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['message' => 'All notifications marked as read.']);
    }

    /**
     * Delete a specific notification.
     */
    public function destroyNotification(Request $request, $id)
    {
        \App\Models\UserNotification::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->delete();

        return response()->json(['message' => 'Notification deleted.']);
    }

    /**
     * Clear all notifications for the authenticated user.
     */
    public function clearAllNotifications(Request $request)
    {
        \App\Models\UserNotification::where('user_id', $request->user()->id)->delete();

        return response()->json(['message' => 'All notifications cleared.']);
    }
}
