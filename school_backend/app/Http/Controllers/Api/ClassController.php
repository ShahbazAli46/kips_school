<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademyClass;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ClassController extends Controller
{
    /**
     * List all classes.
     */
    public function index()
    {
        $classes = \Illuminate\Support\Facades\Cache::rememberForever('api_classes', function () {
            return AcademyClass::with(['sections:id,name', 'createdBy:id,name', 'updatedBy:id,name'])
                ->orderBy('name')
                ->get()
                ->toArray();
        });

        return response()->json($classes);
    }

    /**
     * Create a new class.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:100|unique:classes,name',
            'section_ids' => 'nullable|array',
            'section_ids.*' => 'exists:sections,id',
        ]);

        $class = AcademyClass::create([
            'name'       => $request->name,
            'created_by' => Auth::id(),
            'updated_by' => Auth::id(),
        ]);

        if ($request->has('section_ids')) {
            $class->sections()->sync($request->section_ids);
        }

        \Illuminate\Support\Facades\Cache::forget('api_classes');

        return response()->json($class->load(['sections:id,name', 'createdBy:id,name', 'updatedBy:id,name']), 201);
    }

    /**
     * Update an existing class.
     */
    public function update(Request $request, AcademyClass $class)
    {
        $request->validate([
            'name' => 'required|string|max:100|unique:classes,name,' . $class->id,
            'section_ids' => 'nullable|array',
            'section_ids.*' => 'exists:sections,id',
        ]);

        $class->update([
            'name'       => $request->name,
            'updated_by' => Auth::id(),
        ]);

        if ($request->has('section_ids')) {
            $class->sections()->sync($request->section_ids);
        }

        \Illuminate\Support\Facades\Cache::forget('api_classes');

        return response()->json($class->load(['sections:id,name', 'createdBy:id,name', 'updatedBy:id,name']));
    }

    /**
     * Delete a class.
     */
    public function destroy(AcademyClass $class)
    {
        $class->delete();
        \Illuminate\Support\Facades\Cache::forget('api_classes');

        return response()->json(['message' => 'Class deleted successfully']);
    }
}
