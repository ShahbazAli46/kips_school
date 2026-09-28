<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

use Illuminate\Support\Carbon;

class TeacherController extends Controller
{
    public function index(Request $request)
    {
        $currentUser = $request->user();
        $isOfficeAdmin = $currentUser && (int)$currentUser->role_id === 5;

        $teachers = User::where('role_id', 2)
            ->with([
                'teacherAssignments.academyClass', 
                'teacherAssignments.subject', 
                'teacherAssignments.section',
                'fcmTokens' => function ($q) {
                    $q->orderBy('updated_at', 'desc');
                }
            ])
            ->orderBy('name')
            ->get();

        $enriched = $teachers->map(function ($teacher) use ($isOfficeAdmin) {
            $latestFcm = $teacher->fcmTokens->first();
            $isOnline = false;
            
            if ($teacher->last_seen_at) {
                // Consider online if activity was within the last 5 minutes
                $isOnline = Carbon::parse($teacher->last_seen_at)->diffInMinutes(now()) <= 5;
            }

            $teacherArray = $teacher->toArray();

            if ($isOfficeAdmin) {
                $teacherArray['monthly_salary'] = null;
            }

            $teacherArray['is_online'] = $isOnline;
            $teacherArray['last_seen_human'] = $teacher->last_seen_at 
                ? Carbon::parse($teacher->last_seen_at)->diffForHumans() 
                : 'Never logged in';
            $teacherArray['has_app'] = $teacher->fcmTokens->isNotEmpty();
            $teacherArray['app_details'] = $latestFcm ? [
                'device_name' => $latestFcm->device_name,
                'device_type' => $latestFcm->device_type,
                'app_version' => $latestFcm->app_version,
                'last_used_at' => $latestFcm->last_used_at ? Carbon::parse($latestFcm->last_used_at)->diffForHumans() : null,
            ] : null;

            return $teacherArray;
        });

        return response()->json($enriched);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:100',
            'email' => ['required', 'email', \Illuminate\Validation\Rule::unique('users', 'email')->whereNull('deleted_at')],
            'contact_number' => 'nullable|string|max:20',
            'qualification' => 'nullable|string|max:255',
            'emergency_contact' => 'nullable|string|max:20',
            'teaching_exp_year' => 'nullable|integer',
            'monthly_salary' => 'nullable|numeric|min:0',
            'joining_date' => 'nullable|date',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:2048',
        ]);

        $data = $request->except(['image']);
        $data['role_id'] = 2;
        
        // Random secure password for teachers if they don't have one
        $data['password'] = Hash::make(str()->random(12));

        if ($request->hasFile('image')) {
            $data['image'] = $request->file('image')->store('teachers', 'public');
        }

        $teacher = User::create($data);

        return response()->json($teacher, 201);
    }

    public function update(Request $request, User $teacher)
    {
        if ($teacher->role_id !== 2) {
            return response()->json(['message' => 'User is not a teacher'], 400);
        }

        $request->validate([
            'name' => 'required|string|max:100',
            'email' => ['required', 'email', \Illuminate\Validation\Rule::unique('users', 'email')->ignore($teacher->id)->whereNull('deleted_at')],
            'contact_number' => 'nullable|string|max:20',
            'qualification' => 'nullable|string|max:255',
            'emergency_contact' => 'nullable|string|max:20',
            'teaching_exp_year' => 'nullable|integer',
            'monthly_salary' => 'nullable|numeric|min:0',
            'joining_date' => 'nullable|date',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:2048',
        ]);

        $data = $request->except(['image']);

        if ($request->hasFile('image')) {
            if ($teacher->image) Storage::disk('public')->delete($teacher->image);
            $data['image'] = $request->file('image')->store('teachers', 'public');
        }

        $teacher->update($data);

        return response()->json($teacher);
    }

    public function destroy(User $teacher)
    {
        if ($teacher->role_id !== 2) {
            return response()->json(['message' => 'User is not a teacher'], 400);
        }

        if ($teacher->image) Storage::disk('public')->delete($teacher->image);
        
        $teacher->delete();

        return response()->json(['message' => 'Teacher deleted successfully']);
    }
}
