<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TestSeries;
use Illuminate\Http\Request;

class TestSeriesController extends Controller
{
    public function index(Request $request)
    {
        $query = TestSeries::with(['category', 'academicSession']);
        if ($request->has('academic_session_id')) {
            $query->where('academic_session_id', $request->academic_session_id);
        }
        if ($request->has('test_category_id')) {
            $query->where('test_category_id', $request->test_category_id);
        }
        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'test_category_id' => 'required|exists:test_categories,id',
            'academic_session_id' => 'required|exists:academic_sessions,id',
            'name' => 'required|string|max:255',
        ]);

        $series = TestSeries::create($validated);
        return response()->json($series, 201);
    }

    public function show(TestSeries $testSeries)
    {
        return response()->json($testSeries->load(['category', 'academicSession', 'tests']));
    }

    public function update(Request $request, TestSeries $testSeries)
    {
        $validated = $request->validate([
            'test_category_id' => 'sometimes|exists:test_categories,id',
            'academic_session_id' => 'sometimes|exists:academic_sessions,id',
            'name' => 'sometimes|string|max:255',
        ]);

        $testSeries->update($validated);
        return response()->json($testSeries);
    }

    public function destroy(TestSeries $testSeries)
    {
        $testSeries->delete();
        return response()->json(null, 204);
    }
}
