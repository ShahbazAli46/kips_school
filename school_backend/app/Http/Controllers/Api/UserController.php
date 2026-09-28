<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserController extends Controller
{
    public function index(Request $request)
    {
        // Get all users except students(3), teachers(2), parents(4)
        // Essentially admins(1), accountants(5), attendance managers(6)
        $users = User::whereIn('role_id', [1, 5, 6])->get();
        return response()->json($users);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'role_id' => 'required|integer|in:1,5,6',
            'permissions' => 'nullable|array',
            'permissions.*' => 'string'
        ]);

        $user = User::create([
            'uuid' => (string) Str::uuid(),
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make('Pak@1234istan'), // Standard fallback, they login via OTP
            'role_id' => $request->role_id,
        ]);

        if ($request->has('permissions')) {
            foreach ($request->permissions as $permName) {
                \Spatie\Permission\Models\Permission::firstOrCreate(['name' => $permName, 'guard_name' => 'web']);
            }
            $user->syncPermissions($request->permissions);
        }

        return response()->json($user, 201);
    }

    public function show(User $user)
    {
        $user->load('permissions');
        return response()->json($user);
    }

    public function update(Request $request, User $user)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $user->id,
            'role_id' => 'required|integer|in:1,5,6',
            'permissions' => 'nullable|array',
            'permissions.*' => 'string'
        ]);

        $user->update([
            'name' => $request->name,
            'email' => $request->email,
            'role_id' => $request->role_id,
        ]);

        if ($request->has('permissions')) {
            foreach ($request->permissions as $permName) {
                \Spatie\Permission\Models\Permission::firstOrCreate(['name' => $permName, 'guard_name' => 'web']);
            }
            $user->syncPermissions($request->permissions);
        } else {
            $user->syncPermissions([]);
        }

        return response()->json($user);
    }

    public function destroy(User $user)
    {
        $user->delete();
        return response()->json(['message' => 'User deleted successfully']);
    }

    public function updateProfileImage(Request $request)
    {
        $request->validate([
            'image' => 'required|file|mimes:jpeg,png,jpg,gif,webp,heic,heif,jfif|max:20480'
        ]);

        /** @var \App\Models\User $user */
        $user = auth()->user();

        if ($request->hasFile('image')) {
            if ($user->image) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($user->image);
            }

            $destDir = storage_path('app/public/users');
            if (!file_exists($destDir)) {
                @mkdir($destDir, 0775, true);
            }

            $path = $request->file('image')->store('users', 'public');
            $user->image = $path;
            $user->save();
        }

        return response()->json([
            'message' => 'Image updated successfully',
            'image' => $user->image,
            'user' => $user
        ]);
    }

    public function updateProfile(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'contact_number' => 'nullable|string|max:255',
            'qualification' => 'nullable|string|max:255',
            'emergency_contact' => 'nullable|string|max:255',
            'teaching_exp_year' => 'nullable|integer',
            'gender' => 'nullable|string|in:male,female,other'
        ]);

        /** @var \App\Models\User $user */
        $user = auth()->user();
        
        $user->update($request->only([
            'name', 'email', 'contact_number', 'qualification', 'emergency_contact', 'teaching_exp_year', 'gender'
        ]));

        return response()->json($user);
    }
}
