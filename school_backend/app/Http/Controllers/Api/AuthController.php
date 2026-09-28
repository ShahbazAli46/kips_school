<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Otp;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use App\Mail\OtpMail;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'identifier' => 'required|string',
            'password' => 'nullable|string', // Only required for phone login
        ]);

        $identifier = $request->identifier;

        // Garbage collection: Silently delete all expired OTPs across the system
        Otp::where('expires_at', '<', now())->delete();

        // Determine if identifier is email or phone
        if (filter_var($identifier, FILTER_VALIDATE_EMAIL)) {
            // Email Login -> Send OTP
            $user = User::where('email', $identifier)->first();

            if (!$user) {
                return response()->json(['message' => 'No account found with this email'], 404);
            }

            // Generate OTP
            $code = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
            
            Otp::create([
                'user_id' => $user->id,
                'otp' => $code,
                'expires_at' => now()->addMinutes(10),
            ]);

            // Send the real email
            try {
                Mail::to($user->email)->send(new OtpMail($code));
                Log::info("OTP Email sent to {$user->email} (Code: {$code})");
            } catch (\Exception $e) {
                Log::error("Failed to send OTP to {$user->email}: " . $e->getMessage());
                // Still log the OTP as fallback just in case SMTP fails during development
                Log::info("FALLBACK OTP for {$user->email} is {$code}");
            }

            $responseData = [
                'message' => 'OTP sent to your email',
                'requires_otp' => true,
            ];

            return response()->json($responseData);

        } else {
            // Phone Login -> Verify Password for Migration Check
            $request->validate([
                'password' => 'required|string',
            ]);

            $users = User::where('contact_number', $identifier)->get();
            $authenticatedUser = null;

            foreach ($users as $u) {
                if (Hash::check($request->password, $u->password)) {
                    $authenticatedUser = $u;
                    break;
                }
            }

            if (!$authenticatedUser) {
                return response()->json(['message' => 'Invalid credentials'], 401);
            }

            if (!$authenticatedUser->is_active) {
                return response()->json(['message' => 'Account is inactive'], 403);
            }

            if ($authenticatedUser->email_verified_at !== null) {
                return response()->json([
                    'message' => 'Please enter your verified email to login.',
                    'already_migrated' => true,
                ], 403);
            }

            // Force migration
            return response()->json([
                'message' => 'Please migrate your account to use Email and OTP.',
                'requires_migration' => true,
            ], 403);
        }
    }

    public function migrateEmail(Request $request)
    {
        $request->validate([
            'phone' => 'required|string',
            'password' => 'required|string',
            'email' => 'required|email'
        ]);

        $users = User::where('contact_number', $request->phone)->get();
        $authenticatedUsers = collect();

        foreach ($users as $u) {
            if (Hash::check($request->password, $u->password)) {
                $authenticatedUsers->push($u);
            }
        }

        if ($authenticatedUsers->isEmpty()) {
            return response()->json(['message' => 'Invalid phone or password combination.'], 401);
        }

        // Update the email for all matching users (e.g. siblings with same phone/password)
        $userIds = $authenticatedUsers->pluck('id');
        User::whereIn('id', $userIds)->update(['email' => $request->email]);

        // Generate OTP
        $code = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        
        Otp::create([
            'user_id' => $authenticatedUsers->first()->id,
            'otp' => $code,
            'expires_at' => now()->addMinutes(10),
        ]);

        try {
            Mail::to($request->email)->send(new OtpMail($code));
            Log::info("Migration OTP sent to {$request->email} (Code: {$code})");
        } catch (\Exception $e) {
            Log::error("Failed to send Migration OTP to {$request->email}: " . $e->getMessage());
            Log::info("FALLBACK MIGRATION OTP for {$request->email} is {$code}");
        }

        return response()->json([
            'message' => 'Email linked. An OTP has been sent to your email to verify it.',
            'requires_otp' => true
        ]);
    }

    public function verifyOtp(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'otp' => 'required|string|size:6',
        ]);

        $firstUser = User::where('email', $request->email)->first();

        if (!$firstUser) {
            return response()->json(['message' => 'User not found'], 404);
        }

        $otpRecord = Otp::where('user_id', $firstUser->id)
            ->where('otp', $request->otp)
            ->where('expires_at', '>', now())
            ->latest()
            ->first();

        if (!$otpRecord) {
            return response()->json(['message' => 'Invalid or expired OTP'], 400);
        }

        // Delete used OTPs for this email across all users just to be safe
        $allUsers = User::where('email', $request->email)->where('is_active', true)->with(['academyClass:id,name', 'section:id,name', 'major:id,name'])->get();
        Otp::whereIn('user_id', $allUsers->pluck('id')->push($firstUser->id))->delete();

        if ($allUsers->isEmpty()) {
             return response()->json(['message' => 'Account is inactive or not found'], 403);
        }

        // Mark emails as verified
        User::whereIn('id', $allUsers->pluck('id'))->update(['email_verified_at' => now()]);

        // Prioritize Admin role (1) if multiple accounts exist for this email
        $userToLogin = $allUsers->sortBy('role_id')->first();
        $token = $userToLogin->createToken('auth_token')->plainTextToken;

        $userToLogin->all_permissions = $userToLogin->getAllPermissions()->pluck('name');

        return response()->json([
            'message' => 'Login successful',
            'token' => $token,
            'user' => $userToLogin,
        ]);
    }

    public function switchProfile(Request $request)
    {
        $request->validate([
            'target_user_id' => 'required|exists:users,id',
        ]);

        $currentUser = Auth::user();
        $targetUser = User::with(['academyClass:id,name', 'section:id,name', 'major:id,name'])->findOrFail($request->target_user_id);

        if ($currentUser->email !== $targetUser->email || !$targetUser->is_active) {
            return response()->json(['message' => 'Unauthorized or inactive profile'], 403);
        }

        // Revoke current token
        $currentUser->currentAccessToken()->delete();

        // Issue new token
        $newToken = $targetUser->createToken('auth_token')->plainTextToken;

        $targetUser->all_permissions = $targetUser->getAllPermissions()->pluck('name');

        return response()->json([
            'message' => 'Profile switched successfully',
            'token' => $newToken,
            'user' => $targetUser,
        ]);
    }
}
