<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademyClass;
use App\Models\AcademicSession;
use App\Models\Major;
use App\Models\Section;
use App\Models\StudentFeeItem;
use App\Models\StudentSessionEnrollment;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Rap2hpoutre\FastExcel\FastExcel;

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
        $activeSession = \App\Models\AcademicSession::getActiveSession() ?: \App\Models\AcademicSession::where('is_active', true)->first() ?: \App\Models\AcademicSession::orderBy('id', 'desc')->first();
        if (!$activeSession) {
            $activeSession = \App\Models\AcademicSession::create([
                'name' => 'Session ' . date('Y') . '-' . (date('Y') + 1),
                'start_date' => date('Y-01-01'),
                'end_date' => (date('Y') + 1) . '-12-31',
                'is_active' => true,
            ]);
        }
        $sessionId = $activeSession->id;

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

    public function importPortalExcel(Request $request)
    {
        if ($request->user() && $request->user()->role_id == 5) {
            return response()->json(['message' => 'Forbidden: Office Admin does not have permission to import students.'], 403);
        }

        set_time_limit(300); // 5 minutes max execution time

        $request->validate([
            'file' => 'required|file|max:20480', // 20MB max
        ]);

        $file = $request->file('file');
        
        try {
            $rows = (new FastExcel)->import($file);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to parse Excel file: ' . $e->getMessage()], 422);
        }

        if ($rows->isEmpty()) {
            return response()->json(['message' => 'The uploaded Excel file is empty.'], 422);
        }

        // Active Academic Session - guaranteed to exist
        $activeSession = AcademicSession::getActiveSession() ?: AcademicSession::where('is_active', true)->first() ?: AcademicSession::orderBy('id', 'desc')->first();
        if (!$activeSession) {
            $activeSession = AcademicSession::create([
                'name' => 'Session ' . date('Y') . '-' . (date('Y') + 1),
                'start_date' => date('Y-01-01'),
                'end_date' => (date('Y') + 1) . '-12-31',
                'is_active' => true,
            ]);
        }
        $sessionId = $activeSession->id;

        // Cache classes & sections
        $existingClasses = AcademyClass::pluck('id', 'name')->mapWithKeys(fn($id, $name) => [strtolower(trim($name)) => $id])->toArray();
        $existingSections = Section::pluck('id', 'name')->mapWithKeys(fn($id, $name) => [strtolower(trim($name)) => $id])->toArray();

        // 1. Auto-create any missing classes and sections in bulk
        $classesToCreate = [];
        $sectionsToCreate = [];
        $classSectionPairs = [];

        foreach ($rows as $row) {
            $grade = trim($row['Grade'] ?? $row['grade'] ?? $row['Class'] ?? $row['class'] ?? '');
            $section = trim($row['Section'] ?? $row['section'] ?? '');
            if ($grade && $grade !== '0' && !isset($existingClasses[strtolower($grade)])) {
                $classesToCreate[strtolower($grade)] = $grade;
            }
            if ($section && $section !== '0' && !isset($existingSections[strtolower($section)])) {
                $sectionsToCreate[strtolower($section)] = $section;
            }
            if ($grade && $section && $grade !== '0' && $section !== '0') {
                $classSectionPairs[] = [strtolower($grade), strtolower($section)];
            }
        }

        foreach ($classesToCreate as $low => $name) {
            $c = AcademyClass::firstOrCreate(['name' => $name]);
            $existingClasses[$low] = $c->id;
        }

        foreach ($sectionsToCreate as $low => $name) {
            $s = Section::firstOrCreate(['name' => $name]);
            $existingSections[$low] = $s->id;
        }

        foreach ($classSectionPairs as $pair) {
            $cid = $existingClasses[$pair[0]] ?? null;
            $sid = $existingSections[$pair[1]] ?? null;
            if ($cid && $sid) {
                DB::table('class_section')->insertOrIgnore(['class_id' => $cid, 'section_id' => $sid]);
            }
        }

        // 2. Index existing students by ERP Reg (stored in cnic/remarks/email) and Name+Father+Class
        $existingStudentsByErp = [];
        $existingStudentsByName = [];
        $allStudents = User::where('role_id', 3)->get(['id', 'name', 'father_name', 'class_id', 'student_cnic', 'email', 'remarks']);
        foreach ($allStudents as $s) {
            if (!empty($s->student_cnic)) {
                $cleanCnic = strtolower(trim(preg_replace('/[^a-zA-Z0-9]/', '', $s->student_cnic)));
                if ($cleanCnic) $existingStudentsByErp[$cleanCnic] = $s->id;
            }
            if (!empty($s->remarks) && preg_match('/ERP(?:\s*Reg#)?:\s*([a-zA-Z0-9-]+)/i', $s->remarks, $m)) {
                $cleanErp = strtolower(trim(preg_replace('/[^a-zA-Z0-9]/', '', $m[1])));
                if ($cleanErp) $existingStudentsByErp[$cleanErp] = $s->id;
            }
            $nameKey = strtolower(trim($s->name)) . '|' . strtolower(trim((string)$s->father_name)) . '|' . (int)$s->class_id;
            $existingStudentsByName[$nameKey] = $s->id;
        }

        // Definition of fee heads mapping from Excel column names
        $feeHeadDefinitions = [
            'tuition_fee' => ['name' => 'Tuition Fee', 'type' => 'monthly', 'keys' => ['Tuition fee', 'Tuition Fee', 'tuition_fee', 'fee', 'monthly_fee', 'Monthly Fee']],
            'ac_charges' => ['name' => 'AC Charges', 'type' => 'monthly', 'keys' => ['AC Charges', 'ac_charges', 'ac', 'AC charges']],
            'id_card_charges' => ['name' => 'ID Card Charges', 'type' => 'one_time', 'keys' => ['Id Card', 'id_card', 'id_card_charges', 'ID Card', 'Id card']],
            'r_and_t_charges' => ['name' => 'R & T Charges', 'type' => 'annual', 'keys' => ['R & T Charges', 'r_and_t_charges', 'R&T Charges']],
            'brd_reg_charges' => ['name' => 'Board Reg Charges', 'type' => 'one_time', 'keys' => ['Brd Reg Charges', 'brd_reg_charges', 'Board Reg Charges']],
            'service_charges' => ['name' => 'Service Charges', 'type' => 'monthly', 'keys' => ['Service Charges', 'service_charges']],
            'exam_charges' => ['name' => 'Exam Charges', 'type' => 'annual', 'keys' => ['Exam Charges', 'Exams Charges', 'exam_charges']],
            'lab_charges' => ['name' => 'Lab Charges', 'type' => 'monthly', 'keys' => ['Lab Chanrges', 'Lab Charges', 'lab_charges', 'lab_chanrges']],
            'security_fee' => ['name' => 'Security Fee', 'type' => 'one_time', 'keys' => ['Security fee', 'security_fee', 'Security Fee']],
            'library_charges' => ['name' => 'Library Charges', 'type' => 'annual', 'keys' => ['Lib. Charges', 'lib_charges', 'library_charges', 'Library Charges']],
            'lms_charges' => ['name' => 'LMS Charges', 'type' => 'monthly', 'keys' => ['LMS', 'lms_charges', 'lms']],
            'fine' => ['name' => 'Fine', 'type' => 'fine', 'keys' => ['Fine', 'fine']],
            'registration_fee' => ['name' => 'Registration Fee', 'type' => 'one_time', 'keys' => ['Registration Fee', 'registration_fee', 'Reg Fee', 'reg_fee', 'Registration fee', 'Registration', 'reg fee']],
            'adm_fee' => ['name' => 'Admission Fee', 'type' => 'one_time', 'keys' => ['Admission Fee', 'admission_fee', 'adm_fee', 'Adm Fee', 'Adm. Fee', 'Admission fee', 'Adm']],
            'adm_test' => ['name' => 'Admission Test', 'type' => 'one_time', 'keys' => ['Admission Test', 'admission_test', 'adm_test', 'Admission test']],
            'kdp' => ['name' => 'KDP Charges', 'type' => 'one_time', 'keys' => ['KDP', 'kdp']],
            'books' => ['name' => 'Books Charges', 'type' => 'one_time', 'keys' => ['Books', 'books']],
            'slj' => ['name' => 'SLJ Charges', 'type' => 'one_time', 'keys' => ['SLJ', 'slj']],
            'arrears' => ['name' => 'Previous Arrears', 'type' => 'one_time', 'keys' => ['Arrears', 'Arrear', 'arrears', 'arrear', 'Previous Arrears', 'Prev Arrears', 'Prev. Arrears', 'Old Arrears', 'Arrears Amount', 'Total Arrears', 'Outstanding', 'pending amount', 'pending', 'Pending Amount', 'Pending Fee', 'Balance', 'Arrears / Advance', 'Arrears/Advance']],
        ];

        $usersToInsert = [];
        $usersToUpdate = [];
        $userRowMap = [];
        $defaultHash = Hash::make('Kips1234');
        $imported = 0;
        $failed = 0;
        $errors = [];

        DB::beginTransaction();

        try {
            foreach ($rows as $index => $row) {
                $normalizedRow = [];
                foreach ($row as $k => $v) {
                    $normalizedRow[trim($k)] = is_string($v) ? trim($v) : $v;
                }

                $getVal = function(array $candidateKeys) use ($normalizedRow) {
                    foreach ($candidateKeys as $ck) {
                        if (isset($normalizedRow[$ck]) && $normalizedRow[$ck] !== '') {
                            return $normalizedRow[$ck];
                        }
                    }
                    foreach ($normalizedRow as $k => $v) {
                        foreach ($candidateKeys as $ck) {
                            if (strcasecmp(trim($k), trim($ck)) === 0 && $v !== '') {
                                return $v;
                            }
                        }
                    }
                    return null;
                };

                $name = $getVal(['Student Name', 'name', 'student_name', 'Student']);
                $fatherName = $getVal(['Father Name', 'father_name', 'Father']);
                $erpReg = $getVal(['ERP Reg#', 'erp_reg', 'erp reg#', 'ERP Reg', 'ERP#']);
                $bForm = $getVal(['B-Form No', 'b-form', 'b form', 'b_form', 'student_cnic', 'cnic', 'CNIC', 'Reg#']);
                $invoiceNo = $getVal(['Invoice No', 'Invoice No ', 'invoice_no', 'Invoice']);
                $campus = $getVal(['Campus', 'campus']);
                $gradeName = $getVal(['Grade', 'grade', 'Class', 'class']);
                $sectionName = $getVal(['Section', 'section']);
                $arrear = $getVal(['Arrears', 'Arrear', 'arrears', 'arrear', 'Previous Arrears', 'Prev Arrears', 'Prev. Arrears', 'Old Arrears', 'Arrears Amount', 'Total Arrears', 'Outstanding', 'pending amount', 'pending', 'Pending Amount', 'Pending Fee', 'Balance', 'Arrears / Advance', 'Arrears/Advance']);
                $tuitionFee = $getVal(['Tuition fee', 'Tuition Fee', 'fee', 'monthly fee', 'tuition']);
                $mobileRaw = $getVal(['Mobile No.', 'mobile no', 'mobile', 'Mobile No', 'contact_number', 'phone', 'Phone']);
                
                $mobile = null;
                if ($mobileRaw) {
                    $mobile = trim((string)$mobileRaw);
                    $mobile = str_replace(['-', ' '], '', $mobile);
                    if (str_starts_with($mobile, '0')) {
                        $mobile = '+92' . substr($mobile, 1);
                    } elseif (!str_starts_with($mobile, '+92')) {
                        $mobile = '+92' . ltrim($mobile, '+');
                    }
                }

                if (empty($name) || strtolower($name) === 'total' || strtolower($name) === 'grand total') {
                    continue;
                }

                $monthlyFeeNum = $tuitionFee !== null ? (float)preg_replace('/[^\d.]/', '', (string)$tuitionFee) : 0;
                $pendingAmountNum = $arrear !== null ? (float)preg_replace('/[^\d.]/', '', (string)$arrear) : 0;

                $classId = $gradeName ? ($existingClasses[strtolower($gradeName)] ?? null) : null;
                $sectionId = $sectionName ? ($existingSections[strtolower($sectionName)] ?? null) : null;

                $gender = 'male';
                if ($sectionName && (preg_match('/\b[Gg]\b|\(G\)|\(g\)/', $sectionName) || str_ends_with($sectionName, ' G') || str_ends_with($sectionName, ' (G)'))) {
                    $gender = 'female';
                }

                $cleanErpKey = $erpReg ? strtolower(trim(preg_replace('/[^a-zA-Z0-9]/', '', (string)$erpReg))) : null;
                $studentId = null;

                if ($cleanErpKey && isset($existingStudentsByErp[$cleanErpKey])) {
                    $studentId = $existingStudentsByErp[$cleanErpKey];
                } else {
                    $nameKey = strtolower(trim($name)) . '|' . strtolower(trim((string)$fatherName)) . '|' . (int)$classId;
                    if (isset($existingStudentsByName[$nameKey])) {
                        $studentId = $existingStudentsByName[$nameKey];
                    }
                }

                $remarksStr = trim("ERP Reg#: " . ($erpReg ?? 'N/A') . ($invoiceNo ? " | Invoice: {$invoiceNo}" : "") . ($campus ? " | Campus: {$campus}" : ""));

                $rowFeeItems = [];
                foreach ($feeHeadDefinitions as $headKey => $def) {
                    $val = $getVal($def['keys']);
                    $amount = $val !== null ? (float)preg_replace('/[^\d.]/', '', (string)$val) : 0;
                    if ($headKey === 'tuition_fee' && $amount == 0 && $monthlyFeeNum > 0) {
                        $amount = $monthlyFeeNum;
                    }
                    if ($headKey === 'arrears' && $amount == 0 && $pendingAmountNum > 0) {
                        $amount = $pendingAmountNum;
                    }
                    if ($amount > 0 || $headKey === 'tuition_fee') {
                        $rowFeeItems[$headKey] = [
                            'name' => $def['name'],
                            'type' => $def['type'],
                            'amount' => $amount
                        ];
                    }
                }

                if ($pendingAmountNum > 0 && !isset($rowFeeItems['arrears'])) {
                    $rowFeeItems['arrears'] = [
                        'name' => 'Previous Arrears',
                        'type' => 'one_time',
                        'amount' => $pendingAmountNum
                    ];
                }

                $totalNonTuitionPending = 0;
                foreach ($rowFeeItems as $hKey => $hInfo) {
                    if ($hKey !== 'tuition_fee') {
                        $totalNonTuitionPending += (float)$hInfo['amount'];
                    }
                }
                if ($totalNonTuitionPending == 0 && $pendingAmountNum > 0) {
                    $totalNonTuitionPending = $pendingAmountNum;
                }

                if ($studentId) {
                    $usersToUpdate[$studentId] = [
                        'id' => $studentId,
                        'father_name' => $fatherName,
                        'contact_number' => $mobile,
                        'class_id' => $classId,
                        'section_id' => $sectionId,
                        'academic_session_id' => $sessionId,
                        'monthly_fee' => $monthlyFeeNum,
                        'pending_amount' => $totalNonTuitionPending,
                        'student_cnic' => $bForm,
                        'erp_reg' => $erpReg,
                        'remarks' => $remarksStr,
                        'fee_items' => $rowFeeItems,
                    ];
                } else {
                    $uuid = (string) Str::uuid();
                    $emailSlug = $cleanErpKey ?: (preg_replace('/[^a-zA-Z0-9]/', '', strtolower($name)) . '_' . rand(1000, 9999));
                    $email = "erp_{$emailSlug}@kips.edu.pk";

                    $usersToInsert[] = [
                        'uuid' => $uuid,
                        'name' => $name,
                        'father_name' => $fatherName,
                        'gender' => $gender,
                        'contact_number' => $mobile,
                        'role_id' => 3,
                        'class_id' => $classId,
                        'section_id' => $sectionId,
                        'academic_session_id' => $sessionId,
                        'monthly_fee' => $monthlyFeeNum,
                        'pending_amount' => $totalNonTuitionPending,
                        'student_cnic' => $bForm,
                        'erp_reg' => $erpReg,
                        'email' => $email,
                        'password' => $defaultHash,
                        'remarks' => $remarksStr,
                        'is_active' => true,
                        'admission_month' => date('Y-m'),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];

                    $userRowMap[$uuid] = [
                        'class_id' => $classId,
                        'section_id' => $sectionId,
                        'monthly_fee' => $monthlyFeeNum,
                        'fee_items' => $rowFeeItems,
                    ];
                }
            }

            // 3. Bulk insert new users
            if (!empty($usersToInsert)) {
                foreach (array_chunk($usersToInsert, 200) as $chunk) {
                    User::insert($chunk);
                }
            }

            // Update existing users
            foreach ($usersToUpdate as $uid => $uData) {
                User::where('id', $uid)->update([
                    'father_name' => $uData['father_name'],
                    'contact_number' => $uData['contact_number'],
                    'class_id' => $uData['class_id'],
                    'section_id' => $uData['section_id'],
                    'academic_session_id' => $uData['academic_session_id'],
                    'monthly_fee' => $uData['monthly_fee'],
                    'pending_amount' => $uData['pending_amount'],
                    'student_cnic' => $uData['student_cnic'],
                    'erp_reg' => $uData['erp_reg'],
                    'remarks' => $uData['remarks'],
                ]);
            }

            // Fetch new users IDs
            $newUuids = array_column($usersToInsert, 'uuid');
            $newUsers = !empty($newUuids) ? User::whereIn('uuid', $newUuids)->pluck('id', 'uuid') : collect();

            // 4. Enrollments & Roll numbers & Fee Items
            $classMaxRolls = [];
            $enrollmentsToUpsert = [];
            $feeItemsToUpsert = [];

            // For new users
            foreach ($usersToInsert as $u) {
                $uid = $newUsers[$u['uuid']] ?? null;
                if (!$uid) continue;
                $cid = $u['class_id'];
                $sid = $u['section_id'];
                $fee = $u['monthly_fee'];

                if ($sessionId && $cid) {
                    if (!isset($classMaxRolls[$cid])) {
                        $classMaxRolls[$cid] = StudentSessionEnrollment::where('academic_session_id', $sessionId)
                            ->where('class_id', $cid)
                            ->max(DB::raw('CAST(roll_number AS UNSIGNED)')) ?? 0;
                    }
                    $classMaxRolls[$cid]++;
                    $roll = $classMaxRolls[$cid];
                } else {
                    $roll = null;
                }

                $enrollmentsToUpsert[] = [
                    'student_id' => $uid,
                    'academic_session_id' => $sessionId,
                    'class_id' => $cid,
                    'section_id' => $sid,
                    'monthly_fee' => $fee,
                    'roll_number' => $roll,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];

                if ($roll) {
                    User::where('id', $uid)->update(['roll_number' => $roll]);
                }

                $items = $userRowMap[$u['uuid']]['fee_items'] ?? [];
                foreach ($items as $hKey => $hInfo) {
                    $feeItemsToUpsert[] = [
                        'student_id' => $uid,
                        'academic_session_id' => $sessionId,
                        'head_key' => $hKey,
                        'head_name' => $hInfo['name'],
                        'head_type' => $hInfo['type'],
                        'actual_amount' => $hInfo['amount'],
                        'discount_amount' => 0,
                        'payable_amount' => $hInfo['amount'],
                        'paid_amount' => 0,
                        'balance_amount' => $hInfo['amount'],
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }

                $imported++;
            }

            // For existing users
            foreach ($usersToUpdate as $uid => $uData) {
                $cid = $uData['class_id'];
                $sid = $uData['section_id'];
                $fee = $uData['monthly_fee'];

                $existingEnr = StudentSessionEnrollment::where('student_id', $uid)
                    ->where('academic_session_id', $sessionId)
                    ->first();

                $roll = $existingEnr ? $existingEnr->roll_number : null;
                if (!$roll && $sessionId && $cid) {
                    if (!isset($classMaxRolls[$cid])) {
                        $classMaxRolls[$cid] = StudentSessionEnrollment::where('academic_session_id', $sessionId)
                            ->where('class_id', $cid)
                            ->max(DB::raw('CAST(roll_number AS UNSIGNED)')) ?? 0;
                    }
                    $classMaxRolls[$cid]++;
                    $roll = $classMaxRolls[$cid];
                }

                $enrollmentsToUpsert[] = [
                    'student_id' => $uid,
                    'academic_session_id' => $sessionId,
                    'class_id' => $cid,
                    'section_id' => $sid,
                    'monthly_fee' => $fee,
                    'roll_number' => $roll,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];

                if ($roll) {
                    User::where('id', $uid)->update(['roll_number' => $roll]);
                }

                $items = $uData['fee_items'] ?? [];
                foreach ($items as $hKey => $hInfo) {
                    StudentFeeItem::updateOrCreate(
                        [
                            'student_id' => $uid,
                            'academic_session_id' => $sessionId,
                            'head_key' => $hKey,
                        ],
                        [
                            'head_name' => $hInfo['name'],
                            'head_type' => $hInfo['type'],
                            'actual_amount' => $hInfo['amount'],
                            'discount_amount' => 0,
                            'payable_amount' => $hInfo['amount'],
                            'paid_amount' => 0,
                            'balance_amount' => $hInfo['amount'],
                        ]
                    );
                }

                $imported++;
            }

            // Bulk upsert enrollments
            if (!empty($enrollmentsToUpsert)) {
                foreach (array_chunk($enrollmentsToUpsert, 200) as $chunk) {
                    StudentSessionEnrollment::upsert(
                        $chunk, 
                        ['student_id', 'academic_session_id'], 
                        ['class_id', 'section_id', 'monthly_fee', 'roll_number', 'updated_at']
                    );
                }
            }

            // Bulk insert new fee items
            if (!empty($feeItemsToUpsert)) {
                foreach (array_chunk($feeItemsToUpsert, 200) as $chunk) {
                    StudentFeeItem::insert($chunk);
                }
            }

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Import failed due to an error: ' . $e->getMessage(),
                'line' => $e->getLine(),
                'file' => basename($e->getFile()),
            ], 500);
        }

        return response()->json([
            'message' => 'Import completed successfully',
            'imported' => $imported,
            'failed' => $failed,
            'errors' => $errors,
        ]);
    }
}
