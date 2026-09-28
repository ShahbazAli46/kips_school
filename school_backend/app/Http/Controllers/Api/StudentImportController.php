<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademyClass;
use App\Models\Major;
use App\Models\Section;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class StudentImportController extends Controller
{
    public function importStudents(Request $request)
    {
        if ($request->user() && $request->user()->role_id == 5) {
            return response()->json(['message' => 'Forbidden: Office Admin does not have permission to import students.'], 403);
        }

        set_time_limit(120); // Increase max execution time to 2 minutes
        
        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:10240', // 10MB max
        ]);

        $file = $request->file('file');
        $csvData = file_get_contents($file);
        $rows = array_map('str_getcsv', explode("\n", trim($csvData)));
        $header = array_shift($rows);

        // Make headers lowercase for case-insensitive matching
        $lowerHeader = array_map(function($h) { return strtolower(trim($h)); }, $header);

        // Required headers mapping
        $nameIdx = array_search('name', $lowerHeader);
        $fatherNameIdx = array_search('father name', $lowerHeader);
        $genderIdx = array_search('gender', $lowerHeader);
        $mobileIdx = array_search('mobile no', $lowerHeader);
        $classIdx = array_search('class', $lowerHeader);
        $passIdx = array_search('pass', $lowerHeader);
        $groupIdx = array_search('group', $lowerHeader);
        $statusIdx = array_search('status', $lowerHeader);
        $photoIdx = array_search('id photo', $lowerHeader);
        $feeIdx = array_search('monthly fee', $lowerHeader) !== false ? array_search('monthly fee', $lowerHeader) : array_search('fee', $lowerHeader);
        $emailIdx = array_search('email', $lowerHeader);
        $sectionIdx = array_search('section', $lowerHeader);
        $pendingAmountIdx = array_search('pending amount', $lowerHeader);

        if ($nameIdx === false || $mobileIdx === false || $passIdx === false) {
            return response()->json(['message' => 'CSV is missing required headers (Name, Mobile No, Pass)'], 400);
        }

        // Cache all existing classes, majors, and contact numbers to memory to avoid DB queries inside the loop
        $existingClasses = AcademyClass::pluck('id', 'name')->mapWithKeys(fn($id, $name) => [strtolower($name) => $id])->toArray();
        $existingMajors = Major::pluck('id', 'name')->mapWithKeys(fn($id, $name) => [strtolower($name) => $id])->toArray();
        $existingSections = Section::pluck('id', 'name')->mapWithKeys(fn($id, $name) => [strtolower($name) => $id])->toArray();

        $imported = 0;
        $failed = 0;
        $errors = [];

        $usersToInsert = [];
        $newClasses = [];
        $newMajors = [];
        $newSections = [];

        // Get existing students to avoid duplicates (key: name_mobile)
        $existingStudents = User::where('role_id', 3)
            ->get(['id', 'name', 'contact_number'])
            ->mapWithKeys(function ($s) {
                $key = strtolower($s->name) . '_' . preg_replace('/\D/', '', $s->contact_number);
                return [$key => $s->id];
            })
            ->toArray();

        $existingStudentsProcessed = [];

        foreach ($rows as $index => $row) {
            if (empty(array_filter($row))) continue;

            $name = $nameIdx !== false ? ($row[$nameIdx] ?? null) : null;
            $mobile = $mobileIdx !== false ? ($row[$mobileIdx] ?? null) : null;
            if ($mobile) {
                $mobile = trim($mobile);
                // Remove dashes and spaces
                $mobile = str_replace(['-', ' '], '', $mobile);
                
                if (str_starts_with($mobile, '0')) {
                    // Replace leading 0 with +92
                    $mobile = '+92' . substr($mobile, 1);
                } elseif (!str_starts_with($mobile, '+92')) {
                    // If it doesn't start with +92 or 0, just prepend +92
                    $mobile = '+92' . ltrim($mobile, '+');
                }
            }
            $password = $passIdx !== false ? ($row[$passIdx] ?? null) : null;

            if (!$name || !$mobile || !$password) {
                $failed++;
                $errors[] = "Row {$index}: Missing Name, Mobile, or Pass.";
                continue;
            }

            // Check if student already exists (Name + Mobile match)
            $studentKey = strtolower(trim($name)) . '_' . preg_replace('/\D/', '', $mobile);
            $existingUserId = $existingStudents[$studentKey] ?? null;

            // We will separate inserts from updates
            if ($existingUserId && !isset($existingStudentsProcessed[$studentKey])) {
                $existingStudentsProcessed[$studentKey] = true;
            } elseif ($existingUserId && isset($existingStudentsProcessed[$studentKey])) {
                // Duplicate inside the same CSV
                $failed++;
                $errors[] = "Row {$index}: Duplicate entry in CSV for '{$name}'. Skipped.";
                continue;
            }

            // Map Gender
            $rawGender = $genderIdx !== false ? strtolower(trim($row[$genderIdx] ?? '')) : '';
            $gender = null;
            if ($rawGender === 'm' || $rawGender === 'male') $gender = 'male';
            if ($rawGender === 'f' || $rawGender === 'female') $gender = 'female';

            // Handle Class
            $className = $classIdx !== false ? trim($row[$classIdx] ?? '') : '';
            $classId = null;
            if ($className) {
                $lowerClassName = strtolower($className);
                if (isset($existingClasses[$lowerClassName])) {
                    $classId = $existingClasses[$lowerClassName];
                } else {
                    $newClasses[$className] = true;
                }
            }

            // Handle Major
            $majorName = $groupIdx !== false ? trim($row[$groupIdx] ?? '') : '';
            $majorId = null;
            if ($majorName) {
                $lowerMajorName = strtolower($majorName);
                if (isset($existingMajors[$lowerMajorName])) {
                    $majorId = $existingMajors[$lowerMajorName];
                } else {
                    $newMajors[$majorName] = true;
                }
            }

            // Handle Section
            $sectionName = $sectionIdx !== false ? trim($row[$sectionIdx] ?? '') : '';
            $sectionId = null;
            if ($sectionName) {
                $lowerSectionName = strtolower($sectionName);
                if (isset($existingSections[$lowerSectionName])) {
                    $sectionId = $existingSections[$lowerSectionName];
                } else {
                    $newSections[$sectionName] = true;
                }
            }

            // Image & Fee & Email & Pending
            $photoUrl = $photoIdx !== false ? trim($row[$photoIdx] ?? '') : '';
            $imagePath = ($photoUrl && filter_var($photoUrl, FILTER_VALIDATE_URL)) ? $photoUrl : null;
            $monthlyFee = $feeIdx !== false ? preg_replace('/[^\d.]/', '', $row[$feeIdx] ?? '') : null;
            $pendingAmount = $pendingAmountIdx !== false ? preg_replace('/[^\d.]/', '', $row[$pendingAmountIdx] ?? '') : null;
            $emailStr = $emailIdx !== false ? trim($row[$emailIdx] ?? '') : null;

            if ($existingUserId) {
                // For existing users, we just prepare them for enrollment
                $enrollmentsToInsert[] = [
                    'user_uuid' => null, // We have the actual ID
                    'student_id' => $existingUserId,
                    'class_name_temp' => $className,
                    'major_name_temp' => $majorName,
                    'section_name_temp' => $sectionName,
                    'monthly_fee' => $monthlyFee ? (float)$monthlyFee : null,
                ];
            } else {
                // Prepare for insert
                $uuid = (string) Str::uuid();
                $usersToInsert[] = [
                    'uuid' => $uuid,
                    'name' => $name,
                    'father_name' => $fatherNameIdx !== false ? ($row[$fatherNameIdx] ?? null) : null,
                    'gender' => $gender,
                    'contact_number' => $mobile,
                    'email' => $emailStr,
                    'password' => Hash::make($password, ['rounds' => 10]), 
                    'role_id' => 3,
                    'image' => $imagePath,
                    'pending_amount' => $pendingAmount ? (float)$pendingAmount : null,
                    'is_active' => $statusIdx !== false ? (($row[$statusIdx] ?? '1') == '1') : true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];

                $enrollmentsToInsert[] = [
                    'user_uuid' => $uuid,
                    'student_id' => null,
                    'class_name_temp' => $className,
                    'major_name_temp' => $majorName,
                    'section_name_temp' => $sectionName,
                    'monthly_fee' => $monthlyFee ? (float)$monthlyFee : null,
                ];
            }

            // Mark as existing so we don't insert duplicates within the SAME csv
            $existingStudents[$studentKey] = $existingUserId ?: 'temp';
        }

        // Insert missing classes
        if (!empty($newClasses)) {
            foreach (array_keys($newClasses) as $cName) {
                $c = AcademyClass::firstOrCreate(['name' => $cName]);
                $existingClasses[strtolower($cName)] = $c->id;
            }
        }

        // Insert missing majors
        if (!empty($newMajors)) {
            foreach (array_keys($newMajors) as $mName) {
                $m = Major::firstOrCreate(['name' => $mName]);
                $existingMajors[strtolower($mName)] = $m->id;
            }
        }

        // Insert missing sections
        if (!empty($newSections)) {
            foreach (array_keys($newSections) as $sName) {
                $s = Section::firstOrCreate(['name' => $sName]);
                $existingSections[strtolower($sName)] = $s->id;
            }
        }

        // Link IDs, assign session, and assign roll numbers
        $activeSession = \App\Models\AcademicSession::getActiveSession();
        if (!$activeSession) {
            $activeSession = \App\Models\AcademicSession::orderBy('id', 'desc')->first();
        }
        $sessionId = $activeSession ? $activeSession->id : null;

        // Keep track of max roll numbers per class to allow sequential assignment in the batch
        $classMaxRolls = [];

        foreach ($enrollmentsToInsert as &$enr) {
            $cName = $enr['class_name_temp'];
            $classId = $cName ? ($existingClasses[strtolower($cName)] ?? null) : null;
            $enr['class_id'] = $classId;
            unset($enr['class_name_temp']);

            $mName = $enr['major_name_temp'];
            $majorId = $mName ? ($existingMajors[strtolower($mName)] ?? null) : null;
            $enr['major_id'] = $majorId;
            unset($enr['major_name_temp']);

            $sName = $enr['section_name_temp'];
            $sectionId = $sName ? ($existingSections[strtolower($sName)] ?? null) : null;
            $enr['section_id'] = $sectionId;
            unset($enr['section_name_temp']);

            // Assign session
            $enr['academic_session_id'] = $sessionId;

            $rollNumber = null;
            // Assign roll number per class
            if ($sessionId && $classId) {
                if (!isset($classMaxRolls[$classId])) {
                    $classMaxRolls[$classId] = \App\Models\StudentSessionEnrollment::where('academic_session_id', $sessionId)
                        ->where('class_id', $classId)
                        ->max(\Illuminate\Support\Facades\DB::raw('CAST(roll_number AS UNSIGNED)')) ?? 0;
                }
                $classMaxRolls[$classId]++;
                $rollNumber = $classMaxRolls[$classId];
            }
            $enr['roll_number'] = $rollNumber;
        }
        unset($enr); // Clear reference to avoid overwriting last element in subsequent loops

        // Apply these resolved fields back to $usersToInsert (because columns aren't dropped yet)
        foreach ($usersToInsert as &$u) {
            unset($u['class_name_temp'], $u['major_name_temp'], $u['section_name_temp']);
            
            // Find corresponding enrollment
            foreach ($enrollmentsToInsert as $enr) {
                if ($enr['user_uuid'] === $u['uuid']) {
                    $u['class_id'] = $enr['class_id'];
                    $u['major_id'] = $enr['major_id'];
                    $u['section_id'] = $enr['section_id'];
                    $u['academic_session_id'] = $enr['academic_session_id'];
                    $u['roll_number'] = $enr['roll_number'] ?? null;
                    break;
                }
            }
        }
        unset($u); // Clear reference

        // Extremely fast bulk insert (batches of 500)
        foreach (array_chunk($usersToInsert, 500) as $chunk) {
            User::insert($chunk);
            $imported += count($chunk);
        }

        // Now fetch the newly inserted users to get their IDs
        $newUuids = array_column($usersToInsert, 'uuid');
        $newUsers = User::whereIn('uuid', $newUuids)->pluck('id', 'uuid');

        // Prepare final enrollments array and collect updates for existing users
        $finalEnrollments = [];
        $updatesForExisting = [];

        foreach ($enrollmentsToInsert as $enr) {
            if (!empty($enr['user_uuid'])) {
                $userId = $newUsers[$enr['user_uuid']] ?? null;
            } else {
                $userId = $enr['student_id'];
                
                // Track update for existing user snapshot
                if ($userId) {
                    $updatesForExisting[$userId] = [
                        'class_id' => $enr['class_id'],
                        'major_id' => $enr['major_id'],
                        'section_id' => $enr['section_id'],
                        'academic_session_id' => $enr['academic_session_id'],
                        'roll_number' => $enr['roll_number'],
                        'monthly_fee' => $enr['monthly_fee'],
                    ];
                }
            }
            
            if ($userId && $enr['academic_session_id']) {
                unset($enr['user_uuid']);
                $enr['student_id'] = $userId;
                
                // Use upsert to avoid duplicate entry errors for the SAME session
                $finalEnrollments[] = $enr;
            }
        }

        // Bulk insert/upsert enrollments
        foreach (array_chunk($finalEnrollments, 500) as $chunk) {
            \App\Models\StudentSessionEnrollment::upsert(
                $chunk, 
                ['student_id', 'academic_session_id'], 
                ['class_id', 'section_id', 'major_id', 'roll_number', 'monthly_fee', 'updated_at']
            );
        }

        // Update existing users active session snapshot
        foreach ($updatesForExisting as $uid => $updateData) {
            User::where('id', $uid)->update($updateData);
            $imported++; // Treat existing user updates as 'imported'
        }

        return response()->json([
            'message' => 'Import completed',
            'imported' => $imported,
            'failed' => $failed,
            'errors' => $errors,
        ]);
    }
}
