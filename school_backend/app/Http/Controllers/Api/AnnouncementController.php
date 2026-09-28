<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AnnouncementController extends Controller
{
    /**
     * Display a listing of the resource for the public website.
     */
    public function publicIndex()
    {
        return response()->json(Announcement::where('target_type', 'global')
            ->orderBy('date', 'desc')
            ->orderBy('created_at', 'desc')
            ->get());
    }

    /**
     * Display a listing of the resource for Admin.
     */
    public function index()
    {
        return response()->json(Announcement::orderBy('date', 'desc')->orderBy('created_at', 'desc')->get());
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'date' => 'required|date',
            'details' => 'required|string',
            'image' => 'nullable|image|max:5120',
            'attachment' => 'nullable|file|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,zip,txt,jpg,jpeg,png|max:20480',
            'target_type' => 'required|in:global,class,student',
            'class_id' => 'nullable|exists:classes,id',
            'student_id' => 'nullable|exists:users,id',
        ]);

        if ($request->hasFile('image')) {
            $validated['image'] = $request->file('image')->store('announcements', 'public');
        }

        if ($request->hasFile('attachment')) {
            $file = $request->file('attachment');
            $validated['attachment_name'] = $file->getClientOriginalName();
            $validated['attachment'] = $file->store('announcements/attachments', 'public');
        }

        $announcement = Announcement::create($validated);

        try {
            $fcm = app(\App\Services\FcmService::class);
            $cleanDetails = strip_tags($announcement->details);
            $snippet = mb_substr($cleanDetails, 0, 120) . (mb_strlen($cleanDetails) > 120 ? '...' : '');

            if ($announcement->target_type === 'global') {
                $fcm->sendBroadcast(
                    $announcement->title,
                    $snippet,
                    ['announcement_id' => (string)$announcement->id],
                    'announcements_channel',
                    'announcements'
                );
            } elseif ($announcement->target_type === 'class' && $announcement->class_id) {
                $studentIds = \App\Models\User::where('class_id', $announcement->class_id)
                    ->whereIn('role_id', [3, 4])
                    ->pluck('id')
                    ->toArray();
                if (!empty($studentIds)) {
                    $fcm->sendToUsers(
                        $studentIds,
                        $announcement->title,
                        $snippet,
                        ['announcement_id' => (string)$announcement->id],
                        'announcements_channel',
                        'announcements'
                    );
                }
            } elseif ($announcement->target_type === 'student' && $announcement->student_id) {
                $fcm->sendToUser(
                    $announcement->student_id,
                    $announcement->title,
                    $snippet,
                    ['announcement_id' => (string)$announcement->id],
                    'announcements_channel',
                    'announcements'
                );
            }
        } catch (\Throwable $e) {
            // Logged inside FcmService
        }

        return response()->json($announcement, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Announcement $announcement)
    {
        return response()->json($announcement);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Announcement $announcement)
    {
        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'date' => 'sometimes|required|date',
            'details' => 'sometimes|required|string',
            'image' => 'nullable|image|max:5120',
            'attachment' => 'nullable|file|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,zip,txt,jpg,jpeg,png|max:20480',
            'target_type' => 'sometimes|required|in:global,class,student',
            'class_id' => 'nullable|exists:classes,id',
            'student_id' => 'nullable|exists:users,id',
        ]);

        if ($request->hasFile('image')) {
            if ($announcement->image) {
                Storage::disk('public')->delete($announcement->image);
            }
            $validated['image'] = $request->file('image')->store('announcements', 'public');
        }

        if ($request->hasFile('attachment')) {
            if ($announcement->attachment) {
                Storage::disk('public')->delete($announcement->attachment);
            }
            $file = $request->file('attachment');
            $validated['attachment_name'] = $file->getClientOriginalName();
            $validated['attachment'] = $file->store('announcements/attachments', 'public');
        }

        $announcement->update($validated);
        return response()->json($announcement);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Announcement $announcement)
    {
        if ($announcement->image) {
            Storage::disk('public')->delete($announcement->image);
        }
        if ($announcement->attachment) {
            Storage::disk('public')->delete($announcement->attachment);
        }
        $announcement->delete();
        return response()->json(null, 204);
    }
}
