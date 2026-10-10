<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TeacherAssignment;
use App\Models\User;
use Illuminate\Http\Request;

class TeacherAssignmentController extends Controller
{
    public function index(User $teacher)
    {
        if ($teacher->role_id !== 2) {
            return response()->json(['message' => 'User is not a staff member'], 400);
        }

        $assignments = $teacher->teacherAssignments()
            ->with(['academyClass:id,name', 'subject:id,name', 'section:id,name'])
            ->orderBy('is_class_incharge', 'desc')
            ->orderBy('class_id', 'asc')
            ->get();

        return response()->json($assignments);
    }

    public function store(Request $request, User $teacher)
    {
        if ($teacher->role_id !== 2) {
            return response()->json(['message' => 'User is not a staff member'], 400);
        }

        $request->validate([
            'class_id' => 'required|exists:classes,id',
            'section_id' => 'nullable|exists:sections,id',
            'subject_id' => 'nullable|exists:subjects,id',
            'is_class_incharge' => 'nullable|boolean',
            'payment_type' => 'nullable|in:fixed,percentage',
            'fixed_amount' => 'nullable|numeric|min:0',
        ]);

        $isClassIncharge = $request->boolean('is_class_incharge');
        $subjectId = $request->filled('subject_id') ? (int) $request->subject_id : null;

        if (!$subjectId && !$isClassIncharge) {
            return response()->json([
                'message' => 'Please select a Subject or designate this staff member as Class Incharge.'
            ], 422);
        }

        // Check if matching assignment already exists
        $query = TeacherAssignment::where('teacher_id', $teacher->id)
            ->where('class_id', $request->class_id);

        if ($subjectId) {
            $query->where('subject_id', $subjectId);
        } else {
            $query->whereNull('subject_id');
        }

        if ($request->filled('section_id')) {
            $query->where('section_id', $request->section_id);
        } else {
            $query->whereNull('section_id');
        }

        $existing = $query->first();

        if ($existing) {
            // Update existing assignment attributes
            $existing->update([
                'is_class_incharge' => $isClassIncharge ?: $existing->is_class_incharge,
                'payment_type' => $request->payment_type ?? $existing->payment_type,
                'fixed_amount' => $request->filled('fixed_amount') ? $request->fixed_amount : $existing->fixed_amount,
            ]);

            $assignments = $teacher->teacherAssignments()
                ->with(['academyClass:id,name', 'subject:id,name', 'section:id,name'])
                ->orderBy('is_class_incharge', 'desc')
                ->get();

            return response()->json($assignments, 200);
        }

        TeacherAssignment::create([
            'teacher_id' => $teacher->id,
            'class_id' => $request->class_id,
            'section_id' => $request->section_id,
            'subject_id' => $subjectId,
            'is_class_incharge' => $isClassIncharge,
            'payment_type' => $request->payment_type ?? 'fixed',
            'fixed_amount' => $request->fixed_amount,
        ]);

        $assignments = $teacher->teacherAssignments()
            ->with(['academyClass:id,name', 'subject:id,name', 'section:id,name'])
            ->orderBy('is_class_incharge', 'desc')
            ->get();

        return response()->json($assignments, 201);
    }

    public function toggleIncharge(User $teacher, TeacherAssignment $assignment)
    {
        if ($assignment->teacher_id !== $teacher->id) {
            return response()->json(['message' => 'Assignment does not belong to this staff member'], 403);
        }

        $newStatus = !$assignment->is_class_incharge;
        $assignment->update(['is_class_incharge' => $newStatus]);

        $assignments = $teacher->teacherAssignments()
            ->with(['academyClass:id,name', 'subject:id,name', 'section:id,name'])
            ->orderBy('is_class_incharge', 'desc')
            ->get();

        return response()->json([
            'message' => $newStatus ? 'Staff member designated as Class Incharge.' : 'Class Incharge designation removed.',
            'assignments' => $assignments,
        ]);
    }

    public function destroy(User $teacher, TeacherAssignment $assignment)
    {
        if ($assignment->teacher_id !== $teacher->id) {
            return response()->json(['message' => 'Assignment does not belong to this staff member'], 403);
        }

        $assignment->delete();

        $assignments = $teacher->teacherAssignments()
            ->with(['academyClass:id,name', 'subject:id,name', 'section:id,name'])
            ->orderBy('is_class_incharge', 'desc')
            ->get();

        return response()->json([
            'message' => 'Assignment removed successfully',
            'assignments' => $assignments,
        ]);
    }
}
