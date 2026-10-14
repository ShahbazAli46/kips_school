<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TestCategory;
use Illuminate\Http\Request;

class TestCategoryController extends Controller
{
    public function index()
    {
        return response()->json(
            TestCategory::withCount(['tests', 'testSeries'])->orderBy('id')->get()
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|string|in:class_test,school_test,rnt',
        ]);
        
        $validated['short_name'] = $validated['name'];

        $category = TestCategory::create($validated);
        return response()->json($category->loadCount(['tests', 'testSeries']), 201);
    }

    public function show(TestCategory $testCategory)
    {
        return response()->json($testCategory->loadCount(['tests', 'testSeries']));
    }

    public function update(Request $request, TestCategory $testCategory)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'type' => 'sometimes|string|in:class_test,school_test,rnt',
        ]);

        if (isset($validated['name'])) {
            $validated['short_name'] = $validated['name'];
        }

        $testCategory->update($validated);
        return response()->json($testCategory->loadCount(['tests', 'testSeries']));
    }

    public function destroy(Request $request, TestCategory $testCategory)
    {
        $testsCount = $testCategory->tests()->count();
        $seriesCount = $testCategory->testSeries()->count();
        $totalLinked = $testsCount + $seriesCount;

        if ($totalLinked > 0 && !$request->boolean('force')) {
            return response()->json([
                'message' => "Category '{$testCategory->name}' is linked to {$testsCount} test(s) and {$seriesCount} test series. Deleting it will also remove those tests and their marks. Are you sure you want to proceed?",
                'tests_count' => $testsCount,
                'series_count' => $seriesCount,
                'requires_confirmation' => true,
            ], 422);
        }

        $testCategory->delete();
        return response()->json(['message' => 'Test category deleted successfully']);
    }
}
