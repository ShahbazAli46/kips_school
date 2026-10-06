<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ClassController;
use App\Http\Controllers\Api\SectionController;
use App\Http\Controllers\Api\SubjectController;
use App\Http\Controllers\Api\MajorController;
use App\Http\Controllers\Api\StudentController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\FollowUpController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\AnnouncementController;

Route::post('/login', [AuthController::class, 'login']);
Route::post('/verify-otp', [AuthController::class, 'verifyOtp']);
Route::post('/migrate-email', [AuthController::class, 'migrateEmail']);
Route::get('/app-config', [\App\Http\Controllers\Api\AppSettingController::class, 'getPublicConfig']);

// Public Unauthenticated Fee Voucher Verification & PDF APIs
Route::get('/public/vouchers/verify', [\App\Http\Controllers\Api\FeeVoucherController::class, 'publicVerify']);
Route::get('/public/vouchers/pdf', [\App\Http\Controllers\Api\FeeVoucherController::class, 'publicPdf']);
Route::get('/public/vouchers/qr', [\App\Http\Controllers\Api\FeeVoucherController::class, 'publicQrCode']);

// Masjid & Madrasa Treasury Routes
Route::post('/masjid-madrasa/sync', [\App\Http\Controllers\Api\MasjidMadrasaController::class, 'sync']);
Route::get('/masjid-madrasa/records', [\App\Http\Controllers\Api\MasjidMadrasaController::class, 'index']);
Route::get('/masjid-madrasa/summary', [\App\Http\Controllers\Api\MasjidMadrasaController::class, 'summary']);
Route::post('/masjid-madrasa/records', [\App\Http\Controllers\Api\MasjidMadrasaController::class, 'store']);
Route::put('/masjid-madrasa/records/{id}', [\App\Http\Controllers\Api\MasjidMadrasaController::class, 'update']);
Route::delete('/masjid-madrasa/records/{id}', [\App\Http\Controllers\Api\MasjidMadrasaController::class, 'destroy']);

\Illuminate\Support\Facades\Broadcast::routes(['middleware' => ['auth:sanctum']]);

// Direct file server for shared hosting environments where symlinks don't work
Route::get('/storage/{path}', function ($path) {
    $fullPath = storage_path('app/public/' . $path);
    if (!file_exists($fullPath)) {
        abort(404);
    }
    return response()->file($fullPath);
})->where('path', '.*');

// Public Website APIs
Route::prefix('website')->group(function () {
    Route::get('/staff', [\App\Http\Controllers\Api\PublicController::class, 'staff']);
    Route::get('/toppers', [\App\Http\Controllers\Api\PublicController::class, 'toppers']);
    Route::get('/test-schedule', [\App\Http\Controllers\Api\PublicController::class, 'testSchedule']);
    Route::get('/classes', [\App\Http\Controllers\Api\PublicController::class, 'classes']);
    Route::get('/subjects', [\App\Http\Controllers\Api\PublicController::class, 'subjects']);
    Route::get('/majors', [\App\Http\Controllers\Api\PublicController::class, 'majors']);
    Route::get('/sessions', [\App\Http\Controllers\Api\PublicController::class, 'sessions']);
    Route::get('/test-categories', [\App\Http\Controllers\Api\PublicController::class, 'testCategories']);
    Route::post('/contact', [\App\Http\Controllers\Api\PublicController::class, 'contact']);
    Route::post('/check-result', [\App\Http\Controllers\Api\PublicController::class, 'checkResult']);
    Route::post('/student-result-details', [\App\Http\Controllers\Api\PublicController::class, 'studentResultDetails']);
    Route::get('/announcements', [AnnouncementController::class, 'publicIndex']);
    Route::get('/memories', [\App\Http\Controllers\Api\MemoryController::class, 'publicIndex']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', fn(Request $request) => $request->user());
    Route::put('/user/profile', [\App\Http\Controllers\Api\UserController::class, 'updateProfile']);
    Route::post('/user/image', [\App\Http\Controllers\Api\UserController::class, 'updateProfileImage']);
    Route::post('/switch-profile', [AuthController::class, 'switchProfile']);

    // FCM Device Token & In-App Notifications
    Route::post('/device-token', [\App\Http\Controllers\Api\NotificationController::class, 'registerToken']);
    Route::delete('/device-token', [\App\Http\Controllers\Api\NotificationController::class, 'removeToken']);
    Route::get('/notifications', [\App\Http\Controllers\Api\NotificationController::class, 'getUserNotifications']);
    Route::post('/notifications/{id}/read', [\App\Http\Controllers\Api\NotificationController::class, 'markRead']);
    Route::post('/notifications/read-all', [\App\Http\Controllers\Api\NotificationController::class, 'markAllRead']);
    Route::delete('/notifications/{id}', [\App\Http\Controllers\Api\NotificationController::class, 'destroyNotification']);
    Route::delete('/notifications', [\App\Http\Controllers\Api\NotificationController::class, 'clearAllNotifications']);

    // Teacher Attendance routes
    Route::get('/teacher-attendance', [\App\Http\Controllers\Api\TeacherAttendanceController::class, 'getMonthlyAttendance']);
    Route::post('/teacher-attendance/mark-self-present', [\App\Http\Controllers\Api\TeacherAttendanceController::class, 'markSelfPresent']);
    Route::post('/teacher/ping-location', [\App\Http\Controllers\Api\TeacherLocationController::class, 'pingLocation']);

    // Teacher Subject Attendance routes
    Route::get('/teacher/subject-attendance/assignments', [\App\Http\Controllers\Api\TeacherSubjectAttendanceController::class, 'getAssignments']);
    Route::get('/teacher/subject-attendance/students', [\App\Http\Controllers\Api\TeacherSubjectAttendanceController::class, 'getStudents']);
    Route::post('/teacher/subject-attendance', [\App\Http\Controllers\Api\TeacherSubjectAttendanceController::class, 'store']);

    // Teacher Salary routes
    Route::get('/teacher-salaries', [\App\Http\Controllers\Api\SalaryController::class, 'getTeacherSlips']);
    Route::get('/teacher-salaries/{id}', [\App\Http\Controllers\Api\SalaryController::class, 'getTeacherSlipDetail']);

    // Teacher Advance Salary routes
    Route::get('/teacher/advance-salary', [\App\Http\Controllers\Api\AdvanceSalaryController::class, 'myRequests']);
    Route::post('/teacher/advance-salary', [\App\Http\Controllers\Api\AdvanceSalaryController::class, 'store']);

    // Teacher Class Diary routes
    Route::get('/teacher/diary-assignments', [\App\Http\Controllers\Api\ClassDiaryController::class, 'getTeacherAssignments']);
    Route::get('/teacher/diaries', [\App\Http\Controllers\Api\ClassDiaryController::class, 'getTeacherDiaries']);
    Route::post('/teacher/diaries', [\App\Http\Controllers\Api\ClassDiaryController::class, 'store']);
    Route::delete('/teacher/diaries/{id}', [\App\Http\Controllers\Api\ClassDiaryController::class, 'destroy']);

    // Teacher Leave routes
    Route::get('/teacher/leaves', [\App\Http\Controllers\Api\TeacherLeaveController::class, 'index']);
    Route::post('/teacher/leaves', [\App\Http\Controllers\Api\TeacherLeaveController::class, 'store']);
    
    // Admin routes
    Route::middleware('role:1,5,6')->group(function () {
        Route::get('/admin/teacher-attendance', [\App\Http\Controllers\Api\TeacherAttendanceController::class, 'getAttendanceByDate']);
        Route::post('/admin/teacher-attendance', [\App\Http\Controllers\Api\TeacherAttendanceController::class, 'markAttendance']);
        Route::get('/admin/teacher-attendance/register', [\App\Http\Controllers\Api\TeacherAttendanceController::class, 'getMonthlyRegister']);
        Route::post('/admin/teacher-attendance/quick-update', [\App\Http\Controllers\Api\TeacherAttendanceController::class, 'quickUpdate']);
        
        Route::get('/admin/teacher-leaves', [\App\Http\Controllers\Api\AdminTeacherLeaveController::class, 'index']);
        Route::put('/admin/teacher-leaves/{id}/status', [\App\Http\Controllers\Api\AdminTeacherLeaveController::class, 'updateStatus']);
    });

    // Messaging Routes
    Route::get('/messages/support-contact', [\App\Http\Controllers\Api\MessageController::class, 'getSupportContact']);
    Route::get('/messages/conversations', [\App\Http\Controllers\Api\MessageController::class, 'getConversations']);
    Route::get('/messages/{userId}', [\App\Http\Controllers\Api\MessageController::class, 'getMessages']);
    Route::post('/messages', [\App\Http\Controllers\Api\MessageController::class, 'sendMessage']);
    Route::post('/messages/read/{userId}', [\App\Http\Controllers\Api\MessageController::class, 'markAsRead']);

    // Parent Portal Routes
    Route::prefix('parent')->group(function () {
        Route::get('/my-students', [\App\Http\Controllers\Api\ParentPortalController::class, 'myStudents']);
        Route::get('/student/{student:uuid}/attendance', [\App\Http\Controllers\Api\ParentPortalController::class, 'studentAttendance']);
        Route::get('/student/{student:uuid}/marks', [\App\Http\Controllers\Api\ParentPortalController::class, 'studentMarks']);
        Route::get('/student/{student:uuid}/detailed-results', [\App\Http\Controllers\Api\ParentPortalController::class, 'studentDetailedResults']);
        Route::post('/student/{student:uuid}/image', [\App\Http\Controllers\Api\ParentPortalController::class, 'updateStudentImage']);
        Route::get('/student/{student:uuid}/announcements', [\App\Http\Controllers\Api\ParentPortalController::class, 'studentAnnouncements']);
        Route::get('/student/{student:uuid}/diaries', [\App\Http\Controllers\Api\ClassDiaryController::class, 'getParentStudentDiaries']);
        Route::post('/student/{student:uuid}/leave', [\App\Http\Controllers\Api\ParentPortalController::class, 'submitLeave']);
    });

    // Student Ledger (Accessible by Admins & Parents)
    Route::get('/fees/ledger/{student:uuid}', [\App\Http\Controllers\Api\FeePaymentController::class, 'ledger']);

    // Strictly Super Admin (role:1) Management APIs
    Route::middleware('role:1')->group(function () {
        Route::apiResource('users', UserController::class);
        
        // App Version & Maintenance Settings
        Route::get('/admin/app-settings', [\App\Http\Controllers\Api\AppSettingController::class, 'getAdminSettings']);
        Route::post('/admin/app-settings', [\App\Http\Controllers\Api\AppSettingController::class, 'updateAdminSettings']);

        // Extra Charge Master Catalog & Stock Management (Super Admin only creates/edits items & voids)
        Route::post('/extra-charges/items', [\App\Http\Controllers\Api\ExtraChargeController::class, 'storeItem']);
        Route::put('/extra-charges/items/{id}', [\App\Http\Controllers\Api\ExtraChargeController::class, 'updateItem']);
        Route::post('/extra-charges/items/{id}/adjust-stock', [\App\Http\Controllers\Api\ExtraChargeController::class, 'adjustStock']);
        Route::delete('/extra-charges/items/{id}', [\App\Http\Controllers\Api\ExtraChargeController::class, 'deleteItem']);
        Route::delete('/extra-charges/{id}/void', [\App\Http\Controllers\Api\ExtraChargeController::class, 'voidCharge']);
    });

    // Super Admin & Accountant Management & Financial APIs (role: 1, 5)
    Route::middleware('role:1,5')->group(function () {
        Route::get('/dashboard/stats', [\App\Http\Controllers\Api\DashboardController::class, 'stats']);
        Route::get('/dashboard/attention-seekers/thresholds', [\App\Http\Controllers\Api\DashboardAttentionSeekerController::class, 'getThresholds']);
        Route::post('/dashboard/attention-seekers/thresholds', [\App\Http\Controllers\Api\DashboardAttentionSeekerController::class, 'updateThresholds']);
        Route::get('/dashboard/attention-seekers/summary', [\App\Http\Controllers\Api\DashboardAttentionSeekerController::class, 'summary']);
        Route::get('/dashboard/attention-seekers/students', [\App\Http\Controllers\Api\DashboardAttentionSeekerController::class, 'students']);
        Route::post('/dashboard/attention-seekers/students/{id}/whatsapp-alert', [\App\Http\Controllers\Api\DashboardAttentionSeekerController::class, 'sendWhatsAppAlert']);
        
        Route::apiResource('classes', ClassController::class)->except(['index']);
        Route::apiResource('announcements', AnnouncementController::class);
        Route::post('memories/{memory}', [\App\Http\Controllers\Api\MemoryController::class, 'update']);
        Route::apiResource('memories', \App\Http\Controllers\Api\MemoryController::class)->except(['update']);
        Route::delete('memory-images/{image}', [\App\Http\Controllers\Api\MemoryController::class, 'destroyImage']);
        Route::apiResource('sections', SectionController::class)->except(['index']);
        
        // Leave Applications
        Route::get('leave-applications', [\App\Http\Controllers\Api\LeaveApplicationController::class, 'index']);
        Route::post('leave-applications/{id}/cancel', [\App\Http\Controllers\Api\LeaveApplicationController::class, 'cancel']);
        Route::apiResource('subjects', SubjectController::class);
        Route::get('/admin/subject-attendance', [\App\Http\Controllers\Api\AdminSubjectAttendanceController::class, 'index']);
        Route::put('/admin/subject-attendance/{id}', [\App\Http\Controllers\Api\AdminSubjectAttendanceController::class, 'update']);
        Route::apiResource('majors', MajorController::class);
        Route::apiResource('contact-messages', \App\Http\Controllers\Api\ContactMessageController::class)->only(['index', 'destroy']);
        Route::apiResource('generated-schedules', \App\Http\Controllers\Api\GeneratedScheduleController::class);

        Route::get('students/trashed', [\App\Http\Controllers\Api\StudentController::class, 'trashed']);
        Route::post('students/{id}/restore', [\App\Http\Controllers\Api\StudentController::class, 'restore']);
        Route::post('students/bulk-delete', [\App\Http\Controllers\Api\StudentController::class, 'bulkDelete']);
        Route::post('students/promote', [\App\Http\Controllers\Api\StudentController::class, 'promote']);
        Route::post('students/import', [\App\Http\Controllers\Api\StudentImportController::class, 'importStudents']);
        Route::post('students/import-portal', [\App\Http\Controllers\Api\StudentImportController::class, 'importPortalExcel']);
        Route::post('students/{student}', [StudentController::class, 'update']); // Workaround for multipart/form-data PUT
        Route::patch('students/{student}/toggle-status', [StudentController::class, 'toggleStatus']);
        Route::apiResource('students', StudentController::class)->except(['update']);

        Route::post('teachers/{teacher}', [\App\Http\Controllers\Api\TeacherController::class, 'update']); // Workaround for multipart/form-data PUT
        Route::apiResource('teachers', \App\Http\Controllers\Api\TeacherController::class)->except(['update']);

        // Teacher Live Presence & GPS Telemetry
        Route::get('admin/teachers/live-presence', [\App\Http\Controllers\Api\TeacherLocationController::class, 'getLivePresence']);
        Route::get('admin/teachers/{teacher}/location-trail', [\App\Http\Controllers\Api\TeacherLocationController::class, 'getLocationTrail']);
        Route::post('admin/teachers/{teacher}/request-location-ping', [\App\Http\Controllers\Api\TeacherLocationController::class, 'requestLocationPing']);

        // Teacher Assignments
        Route::get('teachers/{teacher}/assignments', [\App\Http\Controllers\Api\TeacherAssignmentController::class, 'index']);
        Route::post('teachers/{teacher}/assignments', [\App\Http\Controllers\Api\TeacherAssignmentController::class, 'store']);
        Route::delete('teachers/{teacher}/assignments/{assignment}', [\App\Http\Controllers\Api\TeacherAssignmentController::class, 'destroy']);

        // Student Enrollments
        Route::get('/students/{student}/enrollments', [\App\Http\Controllers\Api\StudentSubjectEnrollmentController::class, 'index']);
        Route::post('/students/{student}/enrollments/sync', [\App\Http\Controllers\Api\StudentSubjectEnrollmentController::class, 'sync']);
        Route::post('/students/{student}/enrollments/carry-forward', [\App\Http\Controllers\Api\StudentSubjectEnrollmentController::class, 'carryForward']);

        // WhatsApp Management APIs (Evolution Go)
        Route::prefix('whatsapp')->group(function () {
            Route::get('/status', [\App\Http\Controllers\Api\WhatsAppController::class, 'getStatus']);
            Route::get('/qr', [\App\Http\Controllers\Api\WhatsAppController::class, 'getQrCode']);
            Route::post('/instance/create', [\App\Http\Controllers\Api\WhatsAppController::class, 'createInstance']);
            Route::post('/send-single', [\App\Http\Controllers\Api\WhatsAppController::class, 'sendSingle']);
            Route::post('/send-bulk', [\App\Http\Controllers\Api\WhatsAppController::class, 'sendBulk']);
            Route::post('/send-fee-reminder/{studentId}', [\App\Http\Controllers\Api\WhatsAppController::class, 'sendFeeReminder']);
            Route::post('/send-absent-alert/{studentId}', [\App\Http\Controllers\Api\WhatsAppController::class, 'sendAbsentAlert']);
        });

        // Push Notifications Admin APIs
        Route::post('/admin/notifications/send', [\App\Http\Controllers\Api\NotificationController::class, 'adminSend']);
        Route::get('/admin/notifications/logs', [\App\Http\Controllers\Api\NotificationController::class, 'getLogs']);
        Route::get('/admin/notifications/stats', [\App\Http\Controllers\Api\NotificationController::class, 'getStats']);

        // Fee Payments & Collection
        Route::get('/fees', [\App\Http\Controllers\Api\FeePaymentController::class, 'index']);
        Route::get('/fees/balances', [\App\Http\Controllers\Api\FeePaymentController::class, 'balances']);
        Route::get('/fees/defaulters', [\App\Http\Controllers\Api\FeePaymentController::class, 'defaulters']);
        Route::get('/fees/defaulters/pdf', [\App\Http\Controllers\Api\FeePaymentController::class, 'defaultersPdf']);
        Route::post('/fees/ledger/bulk-email', [\App\Http\Controllers\Api\FeePaymentController::class, 'bulkEmailLedger']);
        Route::post('/fees/ledger/{student:uuid}/email', [\App\Http\Controllers\Api\FeePaymentController::class, 'emailLedger']);
        Route::post('/fees/whatsapp-reminder/{studentId}', [\App\Http\Controllers\Api\FeePaymentController::class, 'sendWhatsAppReminder']);
        Route::post('/fees/whatsapp-reminder-bulk', [\App\Http\Controllers\Api\FeePaymentController::class, 'sendBulkWhatsAppReminders']);
        Route::post('/fees', [\App\Http\Controllers\Api\FeePaymentController::class, 'store']);
        Route::put('/fees/{feePayment}', [\App\Http\Controllers\Api\FeePaymentController::class, 'update']);
        Route::delete('/fees/{feePayment}', [\App\Http\Controllers\Api\FeePaymentController::class, 'destroy']);

        // Fee Vouchers (Individual & Family)
        Route::get('/fees/vouchers', [\App\Http\Controllers\Api\FeeVoucherController::class, 'index']);
        Route::get('/fees/vouchers/settings', [\App\Http\Controllers\Api\FeeVoucherController::class, 'getSettings']);
        Route::post('/fees/vouchers/settings', [\App\Http\Controllers\Api\FeeVoucherController::class, 'updateSettings']);
        Route::post('/fees/vouchers/send-whatsapp', [\App\Http\Controllers\Api\FeeVoucherController::class, 'sendWhatsApp']);

        // Extra Charges POS, Sales & Payments (Accountant & Super Admin can sell and collect)
        Route::get('/extra-charges/stats', [\App\Http\Controllers\Api\ExtraChargeController::class, 'getStats']);
        Route::get('/extra-charges/items', [\App\Http\Controllers\Api\ExtraChargeController::class, 'getItems']);
        Route::post('/extra-charges/issue', [\App\Http\Controllers\Api\ExtraChargeController::class, 'issueCharge']);
        Route::get('/extra-charges/sales', [\App\Http\Controllers\Api\ExtraChargeController::class, 'getSalesLog']);
        Route::post('/extra-charges/{id}/collect', [\App\Http\Controllers\Api\ExtraChargeController::class, 'collectChargePayment']);

        Route::apiResource('fee-follow-ups', \App\Http\Controllers\Api\FeeFollowUpController::class);

        // Salaries & Advance Salaries
        Route::post('/results/whatsapp/{studentId}', [\App\Http\Controllers\Api\ResultController::class, 'sendWhatsAppResultCard']);
        Route::post('/results/whatsapp-bulk', [\App\Http\Controllers\Api\ResultController::class, 'sendBulkWhatsAppResultCards']);
        Route::get('/salaries', [\App\Http\Controllers\Api\SalaryController::class, 'index']);
        Route::get('/salaries/{id}', [\App\Http\Controllers\Api\SalaryController::class, 'show']);
        Route::put('/salaries/{id}', [\App\Http\Controllers\Api\SalaryController::class, 'update']);
        Route::post('/salaries/{id}/payments', [\App\Http\Controllers\Api\SalaryController::class, 'addPayment']);
        Route::post('/salaries/{id}/email', [\App\Http\Controllers\Api\SalaryController::class, 'emailSlip']);
        Route::post('/salaries/generate', [\App\Http\Controllers\Api\SalaryController::class, 'generate']);
        Route::get('/admin/advance-salaries', [\App\Http\Controllers\Api\AdvanceSalaryController::class, 'index']);
        Route::post('/admin/advance-salaries/{id}/status', [\App\Http\Controllers\Api\AdvanceSalaryController::class, 'updateStatus']);

        // Expenses & Categories
        Route::apiResource('expense-categories', \App\Http\Controllers\Api\ExpenseCategoryController::class);
        Route::apiResource('expenses', \App\Http\Controllers\Api\ExpenseController::class);

        // Ledger & Financial Reports
        Route::get('/ledger/financial-report', [\App\Http\Controllers\Api\LedgerController::class, 'financialReport']);
        Route::post('/logout', [\App\Http\Controllers\Api\AuthController::class, 'logout']);
        Route::get('/ledger', [\App\Http\Controllers\Api\LedgerController::class, 'index']);
        Route::delete('/ledger/{id}', [\App\Http\Controllers\Api\LedgerController::class, 'destroy']);
    });

    // Attendance and FollowUps (Admin, Office Admin & Attendance-Manager)
    Route::middleware('role:1,5,6')->group(function () {
        Route::get('/attendance', [AttendanceController::class, 'index']);
        Route::get('/attendance-leaves', [AttendanceController::class, 'leavesOnDate']);
        Route::post('/attendance/bulk', [AttendanceController::class, 'bulkMark']);
        
        Route::apiResource('follow-ups', FollowUpController::class)->only(['index', 'store']);
        
        Route::post('/follow-ups/email', function (Request $request) {
            $request->validate(['student_id' => 'required|integer|exists:users,id']);
            $student = \App\Models\User::find($request->student_id);
            if (!$student->email) {
                return response()->json(['message' => 'Student does not have an email address.'], 400);
            }
            $history = \App\Models\FollowUp::where('student_id', $student->id)->with('creator')->orderBy('date', 'desc')->get();
            \Illuminate\Support\Facades\Mail::to($student->email)->send(new \App\Mail\FollowUpHistoryMail($student, $history));
            return response()->json(['message' => 'Email sent successfully']);
        });
        
        // Attendance Manager also needs to view students to mark their attendance
        // We can expose a basic student list or they can use the existing /students route 
        // if we move it to this middleware. For now, creating a specific lightweight student list route.
        Route::get('/attendance-students', function (Request $request) {
            $query = \App\Models\User::where('role_id', 3)->with(['section']); // removed class relation if it doesn't exist
            if ($request->class_id) {
                $query->where('class_id', $request->class_id);
            }
            if ($request->section_id) {
                $query->where('section_id', $request->section_id);
            }
            return response()->json($query->orderByRaw('CASE WHEN roll_number IS NULL THEN 1 ELSE 0 END')->orderByRaw('CAST(roll_number AS UNSIGNED) ASC')->orderBy('name', 'asc')->get(['id', 'name', 'father_name', 'roll_number', 'class_id', 'section_id', 'contact_number', 'email']));
        });

        // Allow updating a student's contact number, section, or quick details
        Route::put('/students/{id}/contact', function (Request $request, $id) {
            $request->validate(['contact_number' => 'nullable|string|max:25']);
            $student = \App\Models\User::where('role_id', 3)->findOrFail($id);
            $student->update(['contact_number' => $request->contact_number]);
            return response()->json([
                'message' => 'Contact updated successfully.',
                'contact_number' => $student->contact_number
            ]);
        });

        Route::put('/students/{id}/section', function (Request $request, $id) {
            $request->validate(['section_id' => 'nullable|integer']);
            $student = \App\Models\User::where('role_id', 3)->findOrFail($id);
            $student->update(['section_id' => $request->section_id ? (int)$request->section_id : null]);
            $student->load('section:id,name');
            return response()->json([
                'message' => 'Section updated successfully.',
                'section_id' => $student->section_id,
                'section' => $student->section
            ]);
        });

        Route::put('/students/{id}/quick-update', function (Request $request, $id) {
            $request->validate([
                'section_id' => 'nullable',
                'contact_number' => 'nullable|string|max:25',
            ]);
            $student = \App\Models\User::where('role_id', 3)->findOrFail($id);
            $updateData = [];
            if ($request->has('section_id')) {
                $updateData['section_id'] = $request->section_id ? (int)$request->section_id : null;
            }
            if ($request->has('contact_number')) {
                $updateData['contact_number'] = $request->contact_number;
            }
            $student->update($updateData);
            $student->load(['academyClass:id,name', 'section:id,name', 'major:id,name']);
            return response()->json([
                'message' => 'Student updated successfully.',
                'student' => $student
            ]);
        });

        Route::put('/students/{id}/fee', function (Illuminate\Http\Request $request, $id) {
            $request->validate(['monthly_fee' => 'required|numeric|min:0']);
            $student = \App\Models\User::where('role_id', 3)->findOrFail($id);
            $student->update(['monthly_fee' => $request->monthly_fee]);
            return response()->json([
                'message' => 'Monthly fee updated successfully.',
                'monthly_fee' => $student->monthly_fee
            ]);
        });

        // Allow fetching classes and sections for dropdowns
        Route::get('/classes', [ClassController::class, 'index']);
        Route::get('/classes/{class}/subjects', [ClassController::class, 'subjects']);
        Route::get('/sections', [SectionController::class, 'index']);
        Route::get('/academic-sessions', [\App\Http\Controllers\Api\AcademicSessionController::class, 'index']);
        Route::get('/majors', [\App\Http\Controllers\Api\MajorController::class, 'index']);
    });

    // Test Series & Marks Management (Admin, Office Admin & Teacher)
    Route::middleware('role:1,2,5')->group(function () {
        Route::apiResource('academic-sessions', \App\Http\Controllers\Api\AcademicSessionController::class);
        Route::apiResource('test-categories', \App\Http\Controllers\Api\TestCategoryController::class);
        Route::apiResource('test-series', \App\Http\Controllers\Api\TestSeriesController::class);
        Route::post('/tests/batch', [\App\Http\Controllers\Api\TestController::class, 'batchStore']);
        Route::apiResource('tests', \App\Http\Controllers\Api\TestController::class);
        Route::get('/tests/{test}/students', [\App\Http\Controllers\Api\TestController::class, 'students']);
        Route::apiResource('test-marks', \App\Http\Controllers\Api\TestMarkController::class);
        Route::post('/tests/bulk-import', [\App\Http\Controllers\Api\TestController::class, 'bulkImport']);
        Route::post('/tests/{test}/marks/bulk', [\App\Http\Controllers\Api\TestMarkController::class, 'bulkStore']);
    });

    // Results (Super Admin, Office Admin & Students/Parents)
    Route::middleware('role:1,3,5')->group(function () {
        Route::get('/results/series', [\App\Http\Controllers\Api\ResultController::class, 'getSeriesResults']);
        Route::get('/results/series/student/{studentId}', [\App\Http\Controllers\Api\ResultController::class, 'getStudentDetailedResults']);
        Route::post('/results/email/{studentId}', [\App\Http\Controllers\Api\ResultController::class, 'emailResultCard']);
        Route::post('/results/whatsapp/{studentId}', [\App\Http\Controllers\Api\ResultController::class, 'sendWhatsAppResultCard']);
        Route::post('/results/whatsapp-bulk', [\App\Http\Controllers\Api\ResultController::class, 'sendBulkWhatsAppResultCards']);
    });
});
