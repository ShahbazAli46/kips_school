# ClassController Logic

## Overview
Manages academy class records (e.g., 9th, 10th, FSC Part 1, etc.).
`Class` is a reserved word in PHP, so the model is named `AcademyClass` but maps to the `classes` table.

## `index()`
- **Purpose:** Returns all classes sorted alphabetically by name.
- **Auth:** Requires `auth:sanctum`.
- **Returns:** Array of class objects, each including `createdBy` and `updatedBy` user name for audit display.

## `store(Request $request)`
- **Purpose:** Creates a new class.
- **Validation:** `name` is required, max 100 chars, must be unique in `classes` table.
- **Audit Trail:** Automatically sets `created_by` and `updated_by` to the authenticated user's ID.
- **Returns:** The newly created class object (201 Created).

## `update(Request $request, AcademyClass $class)`
- **Purpose:** Updates an existing class name.
- **Validation:** Same as store, but the unique rule ignores the current record's own ID to allow saving without name change.
- **Audit Trail:** Updates `updated_by` to the currently authenticated user.
- **Returns:** The updated class object.

## `destroy(AcademyClass $class)`
- **Purpose:** Permanently deletes a class record.
- **Note:** Future consideration — should check if students/teachers are assigned to this class before deletion.
- **Returns:** Success message JSON.
