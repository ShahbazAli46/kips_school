<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class MessageController extends Controller
{
    public function getConversations(Request $request)
    {
        // Admin gets conversations
        $userId = $request->user()->id;
        
        // Get all users who have sent a message to the admin or received from admin
        $users = \App\Models\User::where(function($query) use ($userId) {
            $query->whereHas('sentMessages', function($q) use ($userId) {
                $q->where('receiver_id', $userId);
            })->orWhereHas('receivedMessages', function($q) use ($userId) {
                $q->where('sender_id', $userId);
            });
        })
        ->withCount(['sentMessages as unread_count' => function($q) use ($userId) {
            $q->where('receiver_id', $userId)->where('is_read', false);
        }])
        ->orderByDesc('unread_count')
        ->get();

        return response()->json($users);
    }

    public function getMessages(Request $request, $userId)
    {
        $authId = $request->user()->id;
        
        $messages = \App\Models\Message::where(function($q) use ($authId, $userId) {
            $q->where('sender_id', $authId)->where('receiver_id', $userId);
        })->orWhere(function($q) use ($authId, $userId) {
            $q->where('sender_id', $userId)->where('receiver_id', $authId);
        })->with('sender')->orderBy('created_at', 'asc')->get();

        return response()->json($messages);
    }

    public function getSupportContact(Request $request)
    {
        $admin = \App\Models\User::where('role_id', 1)->first(['id', 'name', 'email', 'contact_number', 'role_id', 'image']);
        if (!$admin) {
            $admin = \App\Models\User::first(['id', 'name', 'email', 'contact_number', 'role_id', 'image']);
        }
        return response()->json($admin);
    }

    public function sendMessage(Request $request)
    {
        $request->validate([
            'receiver_id' => 'required|exists:users,id',
            'type' => 'required|in:text,audio',
            'message' => 'required_if:type,text',
            'audio' => 'required_if:type,audio|file|max:10240',
        ]);

        $message = new \App\Models\Message();
        $message->sender_id = $request->user()->id;
        $message->receiver_id = $request->receiver_id;
        $message->type = $request->type;

        if ($request->type === 'text') {
            $message->message = $request->message;
        } else {
            $path = $request->file('audio')->store('audio_messages', 'public');
            $message->audio_path = $path;
        }

        $message->save();

        try {
            broadcast(new \App\Events\MessageSent($message))->toOthers();
        } catch (\Throwable $e) {
            // Ignore broadcast failure if Pusher keys not configured
        }

        // Dispatch FCM Push notification to receiver
        try {
            $sender = $request->user();
            $body = $request->type === 'text' ? \Illuminate\Support\Str::limit($request->message, 100) : 'Sent a voice message';
            app(\App\Services\FcmService::class)->sendToUser(
                $request->receiver_id,
                "New message from {$sender->name}",
                $body,
                [
                    'type' => 'chat',
                    'sender_id' => $sender->id,
                    'sender_name' => $sender->name,
                ],
                'messages_channel',
                'chat',
                (string)$sender->id
            );
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('[Message Push Error] ' . $e->getMessage());
        }

        return response()->json($message->load('sender'));
    }

    public function markAsRead(Request $request, $userId)
    {
        \App\Models\Message::where('sender_id', $userId)
            ->where('receiver_id', $request->user()->id)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json(['status' => 'success']);
    }
}
