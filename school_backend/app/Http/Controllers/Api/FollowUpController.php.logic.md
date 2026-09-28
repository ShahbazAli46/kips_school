# FollowUpController Logic

## Overview
This controller manages "follow-up" notes created by the Admin or Attendance-Manager for specific students regarding their attendance or behavior.

## Endpoints

### 1. `GET /api/follow-ups`
- **Role:** Admin (1) & Attendance-Manager (6)
- **Parameters:**
  - `student_id` (optional, int): Filter follow-ups by student.
  - `date` (optional, date): Filter follow-ups by a specific date.
- **Logic:** 
  - Retrieves follow-up records.
  - Eager loads the `student` and `creator` relationships (name and id only).
  - Orders the results by latest first.

### 2. `POST /api/follow-ups`
- **Role:** Admin (1) & Attendance-Manager (6)
- **Parameters:**
  - `student_id` (required, int): ID of the student.
  - `note` (required, string): The text content of the follow-up.
  - `date` (required, date): The date associated with the follow-up note.
- **Logic:** 
  - Validates the inputs.
  - Creates a new `FollowUp` record.
  - The `created_by` field is automatically set to the authenticated user's ID.
  - Returns the newly created record with eager-loaded relationships (201 status).
