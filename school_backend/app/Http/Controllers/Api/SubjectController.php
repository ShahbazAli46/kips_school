<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Subject;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SubjectController extends Controller
{
    public function index()
    {
        $subjects = Subject::with(['createdBy:id,name', 'updatedBy:id,name'])
            ->orderBy('name')
            ->get();

        return response()->json($subjects);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:100|unique:subjects,name',
        ]);

        $subject = Subject::create([
            'name'       => $request->name,
            'created_by' => Auth::id(),
            'updated_by' => Auth::id(),
        ]);

        return response()->json($subject->load(['createdBy:id,name', 'updatedBy:id,name']), 201);
    }

    public function update(Request $request, Subject $subject)
    {
        $request->validate([
            'name' => 'required|string|max:100|unique:subjects,name,' . $subject->id,
        ]);

        $subject->update([
            'name'       => $request->name,
            'updated_by' => Auth::id(),
        ]);

        return response()->json($subject->load(['createdBy:id,name', 'updatedBy:id,name']));
    }

    public function destroy(Subject $subject)
    {
        $subject->delete();
        return response()->json(['message' => 'Subject deleted successfully']);
    }
}
