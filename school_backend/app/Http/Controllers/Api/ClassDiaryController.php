<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClassDiary;
use App\Models\TeacherAssignment;
use App\Models\User;
use App\Services\FcmService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ClassDiaryController extends Controller
{
    /**
     * Get assigned classes/subjects for the authenticated teacher.
     */
    public function getTeacherAssignments(Request $request)
    {
        $teacher = $request->user();

        $assignments = TeacherAssignment::with([
            'academyClass:id,name',
            'subject:id,name',
            'section:id,name',
            'major:id,name'
        ])
        ->where('teacher_id', $teacher->id)
        ->get();

        return response()->json($assignments);
    }

    /**
     * Get diaries created by the authenticated teacher.
     */
    public function getTeacherDiaries(Request $request)
    {
        $teacher = $request->user();
        $date = $request->query('date');

        $query = ClassDiary::with([
            'academyClass:id,name',
            'subject:id,name',
            'section:id,name',
            'teacher:id,name'
        ])
        ->where('teacher_id', $teacher->id);

        if (!empty($date)) {
            $query->whereDate('diary_date', $date);
        }

        $diaries = $query->orderBy('diary_date', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        return response()->json($diaries);
    }

    /**
     * Store a new class diary entry by teacher.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'class_id' => 'required|exists:academy_classes,id',
            'subject_id' => 'required|exists:subjects,id',
            'section_id' => 'nullable|exists:sections,id',
            'diary_date' => 'required|date',
            'content' => 'required|string|max:2000',
        ]);

        $teacher = $request->user();

        $diary = ClassDiary::create([
            'teacher_id' => $teacher->id,
            'class_id' => $validated['class_id'],
            'subject_id' => $validated['subject_id'],
            'section_id' => $validated['section_id'] ?? null,
            'diary_date' => $validated['diary_date'],
            'content' => $validated['content'],
        ]);

        $diary->load(['academyClass:id,name', 'subject:id,name', 'section:id,name']);

        // Dispatch push notification to students & parents in this class
        try {
            $studentsQuery = User::where('role_id', 3)
                ->where('class_id', $validated['class_id']);

            if (!empty($validated['section_id'])) {
                $studentsQuery->where(function ($q) use ($validated) {
                    $q->where('section_id', $validated['section_id'])
                      ->orWhereNull('section_id');
                });
            }

            $students = $studentsQuery->get(['id', 'uuid', 'name', 'contact_number', 'emergency_contact']);

            $allTargetUserIds = [];
            foreach ($students as $student) {
                $ids = User::where('id', $student->id)
                    ->orWhere('contact_number', $student->contact_number)
                    ->orWhere('emergency_contact', $student->contact_number)
                    ->pluck('id')
                    ->toArray();
                $allTargetUserIds = array_merge($allTargetUserIds, $ids);
            }

            $allTargetUserIds = array_unique($allTargetUserIds);

            if (!empty($allTargetUserIds)) {
                $className = $diary->academyClass?->name ?? 'Class';
                $subjectName = $diary->subject?->name ?? 'Subject';
                $snippet = Str::limit($diary->content, 120);

                app(FcmService::class)->sendToUsers(
                    $allTargetUserIds,
                    "Class Diary: {$subjectName} ({$className})",
                    $snippet,
                    [
                        'type' => 'diary',
                        'diary_id' => $diary->id,
                        'subject_name' => $subjectName,
                        'class_name' => $className,
                        'date' => $diary->diary_date,
                    ],
                    'announcements_channel',
                    'student_diary',
                    null,
                    $teacher->id
                );
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('[Diary Push Error] ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Diary entry saved successfully.',
            'diary' => $diary,
        ], 201);
    }

    /**
     * Delete a diary entry created by the teacher.
     */
    public function destroy(Request $request, $id)
    {
        $teacher = $request->user();

        $diary = ClassDiary::where('id', $id)
            ->where('teacher_id', $teacher->id)
            ->first();

        if (!$diary) {
            return response()->json(['message' => 'Diary entry not found or unauthorized.'], 404);
        }

        $diary->delete();

        return response()->json(['message' => 'Diary entry deleted successfully.']);
    }

    /**
     * Get diaries for a parent's student for a given date.
     */
    public function getParentStudentDiaries(Request $request, User $student)
    {
        $date = $request->query('date', now()->toDateString());

        $query = ClassDiary::with([
            'teacher:id,name',
            'subject:id,name',
            'academyClass:id,name',
            'section:id,name'
        ])
        ->where('class_id', $student->class_id);

        if (!empty($student->section_id)) {
            $query->where(function ($q) use ($student) {
                $q->where('section_id', $student->section_id)
                  ->orWhereNull('section_id');
            });
        }

        $diaries = $query->whereDate('diary_date', $date)
            ->orderBy('id', 'desc')
            ->get();

        return response()->json($diaries);
    }
}
