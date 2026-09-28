<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TestCategory;
use Illuminate\Http\Request;

class TestCategoryController extends Controller
{
    public function index()
    {
        return response()->json(TestCategory::all());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|string|in:academy_series,class_test',
        ]);
        
        $validated['short_name'] = $validated['name'];

        $category = TestCategory::create($validated);
        return response()->json($category, 201);
    }

    public function show(TestCategory $testCategory)
    {
        return response()->json($testCategory);
    }

    public function update(Request $request, TestCategory $testCategory)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'type' => 'sometimes|string|in:academy_series,class_test',
        ]);

        if (isset($validated['name'])) {
            $validated['short_name'] = $validated['name'];
        }

        $testCategory->update($validated);
        return response()->json($testCategory);
    }

    public function destroy(TestCategory $testCategory)
    {
        $testCategory->delete();
        return response()->json(null, 204);
    }
}
