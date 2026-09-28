# AttendanceController Logic

## Overview
This controller manages student attendance records and automated notifications (FCM & WhatsApp Absentee PDF notices).

## Endpoints

### 1. `GET /api/attendance`
- **Role:** Admin (1) & Attendance-Manager (6)
- **Parameters:**
  - `date` (optional, date): Filter attendance by date.
  - `section_id` (optional, int): Filter attendance by section.
- **Logic:** 
  - Retrieves all attendance records matching the filters.
  - Eager loads the related `student` details (`id`, `name`, `email`, `contact_number`).

### 2. `POST /api/attendance/bulk`
- **Role:** Admin (1) & Attendance-Manager (6)
- **Parameters:**
  - `date` (required, date): The date of the attendance.
  - `attendances` (required, array): Array of objects containing `student_id` and `status` (`present`, `absent`, `leave`).
- **Logic:** 
  - Uses a database transaction.
  - Loops through the `attendances` array and uses `updateOrCreate` to insert or update the status of the student for that specific date.
  - Checks if student has an active sanctioned leave on that date; if so, status is overridden to `leave`.
  - Dispatches FCM In-App and Push notification strictly for students marked `absent` or `leave`.
  - **WhatsApp Absentee Notice PDF Generation:**
    - Checks `AppSetting::isWhatsAppAbsentNotificationEnabled()`.
    - If enabled in Super Admin settings:
      - Iterates strictly over students marked `absent` (present students are completely ignored).
      - Renders the official Kips School Chunian Campus Absentee Notice PDF (`pdf.absent-notice-pdf`) with student photo, roll no, class/section, and date.
      - Dispatches Base64 PDF to parent phone via WhatsApp Gateway API (`http://13.60.50.153`).
      - Immediately clears DomPDF memory buffers to maintain lightweight execution on shared hosting.
    - If disabled, zero WhatsApp requests are made.
