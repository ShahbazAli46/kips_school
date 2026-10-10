<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Designation;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DesignationController extends Controller
{
    /**
     * Display a listing of designations.
     */
    public function index(Request $request)
    {
        $query = Designation::withCount(['users', 'teachers']);

        if ($request->boolean('active_only')) {
            $query->where('is_active', true);
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $designations = $query->orderBy('name')->get();

        return response()->json($designations);
    }

    /**
     * Store a newly created designation in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100', 'unique:designations,name'],
            'description' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $designation = Designation::create([
            'name' => trim($validated['name']),
            'description' => $validated['description'] ?? null,
            'is_active' => $request->has('is_active') ? $request->boolean('is_active') : true,
        ]);

        $designation->loadCount(['users', 'teachers']);

        return response()->json([
            'message' => 'Designation created successfully.',
            'designation' => $designation,
        ], 201);
    }

    /**
     * Display the specified designation.
     */
    public function show(Designation $designation)
    {
        $designation->loadCount(['users', 'teachers']);
        $designation->load(['teachers:id,name,email,contact_number,designation_id,image']);

        return response()->json($designation);
    }

    /**
     * Update the specified designation in storage.
     */
    public function update(Request $request, Designation $designation)
    {
        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:100',
                Rule::unique('designations', 'name')->ignore($designation->id),
            ],
            'description' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $designation->update([
            'name' => trim($validated['name']),
            'description' => $validated['description'] ?? null,
            'is_active' => $request->has('is_active') ? $request->boolean('is_active') : $designation->is_active,
        ]);

        $designation->loadCount(['users', 'teachers']);

        return response()->json([
            'message' => 'Designation updated successfully.',
            'designation' => $designation,
        ]);
    }

    /**
     * Remove the specified designation from storage.
     */
    public function destroy(Designation $designation)
    {
        $dissociated = User::where('designation_id', $designation->id)->count();

        if ($dissociated > 0) {
            User::where('designation_id', $designation->id)->update(['designation_id' => null]);
        }

        $designation->delete();

        return response()->json([
            'message' => 'Designation deleted successfully.',
            'dissociated_users_count' => $dissociated,
        ]);
    }
}
