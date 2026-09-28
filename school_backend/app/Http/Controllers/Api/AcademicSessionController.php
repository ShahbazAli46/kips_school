<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicSession;
use Illuminate\Http\Request;

class AcademicSessionController extends Controller
{
    public function index()
    {
        return response()->json(AcademicSession::all());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'is_active' => 'boolean',
        ]);

        if ($request->is_active) {
            AcademicSession::where('is_active', true)->update(['is_active' => false]);
        }

        $session = AcademicSession::create($validated);
        return response()->json($session, 201);
    }

    public function show(AcademicSession $academicSession)
    {
        return response()->json($academicSession);
    }

    public function update(Request $request, AcademicSession $academicSession)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date|after_or_equal:start_date',
            'is_active' => 'boolean',
        ]);

        if ($request->is_active) {
            AcademicSession::where('id', '!=', $academicSession->id)->update(['is_active' => false]);
        }

        $academicSession->update($validated);
        return response()->json($academicSession);
    }

    public function destroy(AcademicSession $academicSession)
    {
        $academicSession->delete();
        return response()->json(null, 204);
    }
}
