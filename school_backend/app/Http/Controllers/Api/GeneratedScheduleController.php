<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GeneratedSchedule;
use Illuminate\Http\Request;

class GeneratedScheduleController extends Controller
{
    public function index()
    {
        $schedules = GeneratedSchedule::with('creator:id,name')
            ->orderBy('updated_at', 'desc')
            ->get();

        return response()->json($schedules);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'nullable|string|max:255',
            'class_name' => 'nullable|string|max:255',
            'session_name' => 'nullable|string|max:255',
            'settings' => 'nullable|array',
            'subjects' => 'nullable|array',
            'holidays' => 'nullable|array',
            'schedule' => 'nullable|array',
        ]);

        $validated['title'] = $validated['title'] ?? 'KIPS SCHOOL CHUNIAN CAMPUS';
        $validated['created_by'] = $request->user()?->id;

        $schedule = GeneratedSchedule::create($validated);

        return response()->json($schedule, 201);
    }

    public function show(GeneratedSchedule $generatedSchedule)
    {
        return response()->json($generatedSchedule);
    }

    public function update(Request $request, GeneratedSchedule $generatedSchedule)
    {
        $validated = $request->validate([
            'title' => 'nullable|string|max:255',
            'class_name' => 'nullable|string|max:255',
            'session_name' => 'nullable|string|max:255',
            'settings' => 'nullable|array',
            'subjects' => 'nullable|array',
            'holidays' => 'nullable|array',
            'schedule' => 'nullable|array',
        ]);

        $generatedSchedule->update($validated);

        return response()->json($generatedSchedule);
    }

    public function destroy(GeneratedSchedule $generatedSchedule)
    {
        $generatedSchedule->delete();
        return response()->json(null, 204);
    }
}
