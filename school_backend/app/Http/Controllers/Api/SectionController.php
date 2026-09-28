<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Section;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SectionController extends Controller
{
    public function index()
    {
        $sections = \Illuminate\Support\Facades\Cache::rememberForever('api_sections', function () {
            return Section::with(['createdBy:id,name', 'updatedBy:id,name'])
                ->orderBy('name')
                ->get()
                ->toArray();
        });

        return response()->json($sections);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:100|unique:sections,name',
        ]);

        $section = Section::create([
            'name'       => $request->name,
            'created_by' => Auth::id(),
            'updated_by' => Auth::id(),
        ]);

        \Illuminate\Support\Facades\Cache::forget('api_sections');
        return response()->json($section->load(['createdBy:id,name', 'updatedBy:id,name']), 201);
    }

    public function update(Request $request, Section $section)
    {
        $request->validate([
            'name' => 'required|string|max:100|unique:sections,name,' . $section->id,
        ]);

        $section->update([
            'name'       => $request->name,
            'updated_by' => Auth::id(),
        ]);

        \Illuminate\Support\Facades\Cache::forget('api_sections');
        return response()->json($section->load(['createdBy:id,name', 'updatedBy:id,name']));
    }

    public function destroy(Section $section)
    {
        $section->delete();
        \Illuminate\Support\Facades\Cache::forget('api_sections');
        return response()->json(['message' => 'Section deleted successfully']);
    }
}
