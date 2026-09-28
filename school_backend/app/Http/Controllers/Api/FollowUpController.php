<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FollowUp;
use Illuminate\Http\Request;

class FollowUpController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'student_id' => 'nullable|integer|exists:users,id',
            'date' => 'nullable|date',
            'class_id' => 'nullable|integer',
            'section_id' => 'nullable|integer',
        ]);

        $query = FollowUp::with([
            'student:id,name,contact_number,class_id,section_id',
            'student.academyClass:id,name',
            'student.section:id,name',
            'creator:id,name'
        ]);

        if ($request->student_id) {
            $query->where('student_id', $request->student_id);
        }

        if ($request->date) {
            $query->where('date', $request->date);
        }

        if ($request->class_id || $request->section_id) {
            $query->whereHas('student', function ($q) use ($request) {
                if ($request->class_id) {
                    $q->where('class_id', $request->class_id);
                }
                if ($request->section_id) {
                    $q->where('section_id', $request->section_id);
                }
            });
        }

        return response()->json($query->latest()->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'student_id' => 'required|integer|exists:users,id',
            'note' => 'required|string',
            'date' => 'required|date'
        ]);

        $followUp = FollowUp::create([
            'student_id' => $request->student_id,
            'created_by' => $request->user()->id,
            'note' => $request->note,
            'date' => $request->date
        ]);

        return response()->json($followUp->load(['student:id,name', 'creator:id,name']), 201);
    }
}
