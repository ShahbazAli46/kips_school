<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\EvolutionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WhatsAppController extends Controller
{
    public function __construct(protected EvolutionService $evolution) {}

    /**
     * Get WhatsApp instance status.
     */
    public function getStatus(): JsonResponse
    {
        $status = $this->evolution->getInstanceStatus();

        return response()->json([
            'status' => 'success',
            'data'   => $status,
        ]);
    }

    /**
     * Get QR code for pairing WhatsApp.
     */
    public function getQrCode(): JsonResponse
    {
        $qr = $this->evolution->getQrCode();

        return response()->json([
            'status' => 'success',
            'data'   => $qr,
        ]);
    }

    /**
     * Initialize or create instance.
     */
    public function createInstance(Request $request): JsonResponse
    {
        $instanceName = $request->input('instanceName');
        $result = $this->evolution->createInstance($instanceName);

        return response()->json([
            'status' => 'success',
            'data'   => $result,
        ]);
    }

    /**
     * Send a single WhatsApp message to a custom phone number or specific user.
     */
    public function sendSingle(Request $request): JsonResponse
    {
        $request->validate([
            'phone'     => 'nullable|string',
            'user_id'   => 'nullable|integer|exists:users,id',
            'message'   => 'required|string',
            'media_url' => 'nullable|url',
            'media_type'=> 'nullable|string|in:document,image,video,audio',
            'file_name' => 'nullable|string',
        ]);

        $phone = $request->input('phone');
        if (!$phone && $request->input('user_id')) {
            $user = User::find($request->input('user_id'));
            $phone = $user?->contact_number ?: $user?->emergency_contact;
        }

        if (!$phone) {
            return response()->json([
                'success' => false,
                'message' => 'No valid phone number found for recipient.',
            ], 422);
        }

        if ($request->filled('media_url')) {
            $result = $this->evolution->sendMediaMessage(
                phone: $phone,
                mediaUrl: $request->input('media_url'),
                caption: $request->input('message'),
                mediaType: $request->input('media_type', 'document'),
                fileName: $request->input('file_name')
            );
        } else {
            $result = $this->evolution->sendTextMessage($phone, $request->input('message'));
        }

        return response()->json($result);
    }

    /**
     * Send bulk WhatsApp messages by role, class, or section.
     */
    public function sendBulk(Request $request): JsonResponse
    {
        $request->validate([
            'message'    => 'required|string',
            'role_id'    => 'nullable|integer',
            'class_id'   => 'nullable|integer',
            'section_id' => 'nullable|integer',
            'user_ids'   => 'nullable|array',
            'user_ids.*' => 'integer|exists:users,id',
        ]);

        $query = User::query()->where('is_active', true);

        if ($request->filled('user_ids')) {
            $query->whereIn('id', $request->input('user_ids'));
        } else {
            if ($request->filled('role_id')) {
                $query->where('role_id', $request->input('role_id'));
            }
            if ($request->filled('class_id')) {
                $query->where('class_id', $request->input('class_id'));
            }
            if ($request->filled('section_id')) {
                $query->where('section_id', $request->input('section_id'));
            }
        }

        $users = $query->get(['id', 'name', 'contact_number', 'emergency_contact', 'roll_number']);

        $sentCount = 0;
        $failedCount = 0;
        $skippedCount = 0;

        foreach ($users as $user) {
            $phone = $user->contact_number ?: $user->emergency_contact;
            if (!$phone) {
                $skippedCount++;
                continue;
            }

            // Replace simple template variables if present: {name}, {roll_number}
            $personalizedMessage = str_replace(
                ['{name}', '{roll_number}'],
                [$user->name, $user->roll_number ?? ''],
                $request->input('message')
            );

            $res = $this->evolution->sendTextMessage($phone, $personalizedMessage);
            if ($res['success'] ?? false) {
                $sentCount++;
            } else {
                $failedCount++;
            }
        }

        return response()->json([
            'success' => true,
            'summary' => [
                'total_targeted' => $users->count(),
                'sent'           => $sentCount,
                'failed'         => $failedCount,
                'skipped'        => $skippedCount,
            ],
        ]);
    }

    /**
     * Send fee reminder directly for a student.
     */
    public function sendFeeReminder(Request $request, int $studentId): JsonResponse
    {
        $student = User::where('role_id', 3)->findOrFail($studentId);
        $result = $this->evolution->sendFeeReminder($student, $request->input('pending_amount'));

        return response()->json($result);
    }

    /**
     * Send absent alert directly for a student.
     */
    public function sendAbsentAlert(Request $request, int $studentId): JsonResponse
    {
        $request->validate(['date' => 'required|date']);
        $student = User::where('role_id', 3)->findOrFail($studentId);
        $result = $this->evolution->sendAttendanceAbsentAlert($student, $request->input('date'));

        return response()->json($result);
    }
}
