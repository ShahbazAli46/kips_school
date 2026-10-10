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

        $query = User::where('role_id', 2)
            ->with([
                'designation',
                'teacherAssignments.academyClass', 
                'teacherAssignments.subject', 
                'teacherAssignments.section',
                'fcmTokens' => function ($q) {
                    $q->orderBy('updated_at', 'desc');
                }
            ]);

        if ($request->filled('designation_id')) {
            $query->where('designation_id', $request->input('designation_id'));
        }

        $teachers = $query->orderBy('name')->get();

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

    public function show(User $teacher)
    {
        if ($teacher->role_id !== 2) {
            return response()->json(['message' => 'User is not a staff member'], 400);
        }

        $teacher->load([
            'designation',
            'teacherAssignments.academyClass', 
            'teacherAssignments.subject', 
            'teacherAssignments.section',
        ]);

        return response()->json($teacher);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:100',
            'email' => ['required', 'email', \Illuminate\Validation\Rule::unique('users', 'email')->whereNull('deleted_at')],
            'designation_id' => 'nullable|exists:designations,id',
            'contact_number' => 'nullable|string|max:20',
            'qualification' => 'nullable|string|max:255',
            'emergency_contact' => 'nullable|string|max:20',
            'teaching_exp_year' => 'nullable|integer',
            'monthly_salary' => 'nullable|numeric|min:0',
            'bf_percentage' => 'nullable|numeric|min:0|max:100',
            'joining_date' => 'nullable|date',
            'resignation_date' => 'nullable|date',
            'resignation_remarks' => 'nullable|string',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:2048',
            'signature' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:2048',
            'signature_base64' => 'nullable|string',
        ]);

        $data = $request->except(['image', 'signature', 'signature_base64']);
        $data['role_id'] = 2;
        
        // Random secure password for staff/teachers if they don't have one
        $data['password'] = Hash::make(str()->random(12));

        if ($request->hasFile('image')) {
            $data['image'] = $request->file('image')->store('teachers', 'public');
        }

        if ($request->hasFile('signature')) {
            $data['signature'] = $request->file('signature')->store('signatures', 'public');
        } elseif ($request->filled('signature_base64')) {
            $base64 = $request->input('signature_base64');
            if (preg_match('/^data:image\/(\w+);base64,/', $base64, $type)) {
                $base64Data = substr($base64, strpos($base64, ',') + 1);
                $typeExt = strtolower($type[1]);
                $binary = base64_decode($base64Data);
                if ($binary !== false) {
                    $filename = 'signatures/' . uniqid('sig_', true) . '.' . $typeExt;
                    Storage::disk('public')->put($filename, $binary);
                    $data['signature'] = $filename;
                }
            }
        }

        $teacher = User::create($data);
        $teacher->load('designation');

        return response()->json($teacher, 201);
    }

    public function update(Request $request, User $teacher)
    {
        if ($teacher->role_id !== 2) {
            return response()->json(['message' => 'User is not a staff member'], 400);
        }

        $request->validate([
            'name' => 'required|string|max:100',
            'email' => ['required', 'email', \Illuminate\Validation\Rule::unique('users', 'email')->ignore($teacher->id)->whereNull('deleted_at')],
            'designation_id' => 'nullable|exists:designations,id',
            'contact_number' => 'nullable|string|max:20',
            'qualification' => 'nullable|string|max:255',
            'emergency_contact' => 'nullable|string|max:20',
            'teaching_exp_year' => 'nullable|integer',
            'monthly_salary' => 'nullable|numeric|min:0',
            'bf_percentage' => 'nullable|numeric|min:0|max:100',
            'joining_date' => 'nullable|date',
            'resignation_date' => 'nullable|date',
            'resignation_remarks' => 'nullable|string',
            'is_active' => 'nullable|boolean',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:2048',
            'signature' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:2048',
            'signature_base64' => 'nullable|string',
        ]);

        $data = $request->except(['image', 'signature', 'signature_base64']);

        if ($request->hasFile('image')) {
            if ($teacher->image) Storage::disk('public')->delete($teacher->image);
            $data['image'] = $request->file('image')->store('teachers', 'public');
        }

        if ($request->hasFile('signature')) {
            if ($teacher->signature) Storage::disk('public')->delete($teacher->signature);
            $data['signature'] = $request->file('signature')->store('signatures', 'public');
        } elseif ($request->filled('signature_base64')) {
            $base64 = $request->input('signature_base64');
            if (preg_match('/^data:image\/(\w+);base64,/', $base64, $type)) {
                $base64Data = substr($base64, strpos($base64, ',') + 1);
                $typeExt = strtolower($type[1]);
                $binary = base64_decode($base64Data);
                if ($binary !== false) {
                    if ($teacher->signature) Storage::disk('public')->delete($teacher->signature);
                    $filename = 'signatures/' . uniqid('sig_', true) . '.' . $typeExt;
                    Storage::disk('public')->put($filename, $binary);
                    $data['signature'] = $filename;
                }
            }
        }

        $teacher->update($data);
        $teacher->load('designation');

        return response()->json($teacher);
    }

    public function updateSignature(Request $request, User $teacher)
    {
        if ($teacher->role_id !== 2) {
            return response()->json(['message' => 'User is not a teacher'], 400);
        }

        if ($request->hasFile('signature')) {
            $request->validate([
                'signature' => 'required|image|mimes:jpeg,png,jpg,webp|max:2048',
            ]);

            if ($teacher->signature) {
                Storage::disk('public')->delete($teacher->signature);
            }

            $path = $request->file('signature')->store('signatures', 'public');
            $teacher->update(['signature' => $path]);

            return response()->json([
                'message' => 'Signature uploaded successfully.',
                'signature' => $path,
                'teacher' => $teacher
            ]);
        }

        if ($request->filled('signature_base64')) {
            $base64 = $request->input('signature_base64');
            if (preg_match('/^data:image\/(\w+);base64,/', $base64, $type)) {
                $base64 = substr($base64, strpos($base64, ',') + 1);
                $type = strtolower($type[1]);
                $data = base64_decode($base64);
                if ($data === false) {
                    return response()->json(['message' => 'Invalid base64 image data'], 422);
                }

                if ($teacher->signature) {
                    Storage::disk('public')->delete($teacher->signature);
                }

                $filename = 'signatures/' . uniqid('sig_', true) . '.' . $type;
                Storage::disk('public')->put($filename, $data);
                $teacher->update(['signature' => $filename]);

                return response()->json([
                    'message' => 'Signature saved successfully.',
                    'signature' => $filename,
                    'teacher' => $teacher
                ]);
            }
        }

        return response()->json(['message' => 'No signature file or base64 image provided'], 422);
    }

    public function deleteSignature(User $teacher)
    {
        if ($teacher->role_id !== 2) {
            return response()->json(['message' => 'User is not a teacher'], 400);
        }

        if ($teacher->signature) {
            Storage::disk('public')->delete($teacher->signature);
            $teacher->update(['signature' => null]);
        }

        return response()->json(['message' => 'Signature deleted successfully']);
    }

    public function updateMySignature(Request $request)
    {
        $teacher = auth()->user();
        if (!$teacher || (int)$teacher->role_id !== 2) {
            return response()->json(['message' => 'Unauthorized: User is not a teacher'], 403);
        }
        return $this->updateSignature($request, $teacher);
    }

    public function deleteMySignature()
    {
        $teacher = auth()->user();
        if (!$teacher || (int)$teacher->role_id !== 2) {
            return response()->json(['message' => 'Unauthorized: User is not a teacher'], 403);
        }
        return $this->deleteSignature($teacher);
    }

    public function destroy(User $teacher)
    {
        if ($teacher->role_id !== 2) {
            return response()->json(['message' => 'User is not a teacher'], 400);
        }

        if ($teacher->image) Storage::disk('public')->delete($teacher->image);
        if ($teacher->signature) Storage::disk('public')->delete($teacher->signature);
        
        $teacher->delete();

        return response()->json(['message' => 'Teacher deleted successfully']);
    }
}
