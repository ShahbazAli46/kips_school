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
            return response()->json(['message' => 'User is not a teacher'], 400);
        }

        $assignments = $teacher->teacherAssignments()->with(['academyClass:id,name', 'subject:id,name', 'section:id,name'])->get();
        return response()->json($assignments);
    }

    public function store(Request $request, User $teacher)
    {
        if ($teacher->role_id !== 2) {
            return response()->json(['message' => 'User is not a teacher'], 400);
        }

        $request->validate([
            'class_id' => 'required|exists:classes,id',
            'section_id' => 'nullable|exists:sections,id',
            'subject_id' => 'required|exists:subjects,id',
            'payment_type' => 'required|in:fixed,percentage',
            'fixed_amount' => 'nullable|numeric|min:0',
        ]);

        // Check if already exists to avoid duplicates
        $exists = TeacherAssignment::where('teacher_id', $teacher->id)
            ->where('class_id', $request->class_id)
            ->where('subject_id', $request->subject_id)
            ->when($request->section_id, function($q) use ($request) {
                return $q->where('section_id', $request->section_id);
            }, function($q) {
                return $q->whereNull('section_id');
            })
            ->exists();

        if ($exists) {
            return response()->json(['message' => 'This assignment already exists for the teacher.'], 422);
        }

        TeacherAssignment::create([
            'teacher_id' => $teacher->id,
            'class_id' => $request->class_id,
            'section_id' => $request->section_id,
            'subject_id' => $request->subject_id,
            'payment_type' => $request->payment_type,
            'fixed_amount' => $request->fixed_amount,
        ]);

        $assignments = $teacher->teacherAssignments()->with(['academyClass:id,name', 'subject:id,name', 'section:id,name'])->get();
        return response()->json($assignments, 201);
    }

    public function destroy(User $teacher, TeacherAssignment $assignment)
    {
        if ($assignment->teacher_id !== $teacher->id) {
            return response()->json(['message' => 'Assignment does not belong to this teacher'], 403);
        }

        $assignment->delete();
        return response()->json(['message' => 'Assignment removed successfully']);
    }
}
