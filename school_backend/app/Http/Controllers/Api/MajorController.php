<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Major;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class MajorController extends Controller
{
    public function index()
    {
        $majors = \Illuminate\Support\Facades\Cache::rememberForever('api_majors', function () {
            return Major::with(['subjects:id,name', 'createdBy:id,name', 'updatedBy:id,name'])
                ->orderBy('name')
                ->get()
                ->toArray();
        });

        return response()->json($majors);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:100|unique:majors,name',
            'subject_ids' => 'nullable|array',
            'subject_ids.*' => 'exists:subjects,id',
        ]);

        $major = Major::create([
            'name'       => $request->name,
            'created_by' => Auth::id(),
            'updated_by' => Auth::id(),
        ]);

        if ($request->has('subject_ids')) {
            $major->subjects()->sync($request->subject_ids);
        }

        \Illuminate\Support\Facades\Cache::forget('api_majors');
        return response()->json($major->load(['subjects:id,name', 'createdBy:id,name', 'updatedBy:id,name']), 201);
    }

    public function update(Request $request, Major $major)
    {
        $request->validate([
            'name' => 'required|string|max:100|unique:majors,name,' . $major->id,
            'subject_ids' => 'nullable|array',
            'subject_ids.*' => 'exists:subjects,id',
        ]);

        $major->update([
            'name'       => $request->name,
            'updated_by' => Auth::id(),
        ]);

        if ($request->has('subject_ids')) {
            $major->subjects()->sync($request->subject_ids);
        }

        \Illuminate\Support\Facades\Cache::forget('api_majors');
        return response()->json($major->load(['subjects:id,name', 'createdBy:id,name', 'updatedBy:id,name']));
    }

    public function destroy(Major $major)
    {
        $major->delete();
        \Illuminate\Support\Facades\Cache::forget('api_majors');
        return response()->json(['message' => 'Major deleted successfully']);
    }
}
