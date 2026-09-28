<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\FeeFollowUp;

class FeeFollowUpController extends Controller
{
    public function index(Request $request)
    {
        $query = FeeFollowUp::with(['student', 'creator']);
        
        if ($request->has('promise_date')) {
            $date = $request->promise_date;
            $query->where(function($q) use ($date) {
                $q->where('promise_date', $date)
                  ->orWhere('next_promise_date', $date);
            });
        }
        
        if ($request->has('student_id')) {
            $query->where('student_id', $request->student_id);
        }

        return response()->json($query->orderBy('promise_date', 'asc')->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'student_id' => 'required|exists:users,id',
            'promise_date' => 'required|date',
            'comments' => 'nullable|string'
        ]);

        $followUp = FeeFollowUp::create([
            'student_id' => $request->student_id,
            'promise_date' => $request->promise_date,
            'comments' => $request->comments,
            'created_by' => auth()->id()
        ]);

        return response()->json($followUp->load(['student', 'creator']), 201);
    }

    public function update(Request $request, FeeFollowUp $feeFollowUp)
    {
        $request->validate([
            'promise_date' => 'sometimes|date',
            'next_promise_date' => 'nullable|date',
            'comments' => 'nullable|string'
        ]);

        $feeFollowUp->update($request->only(['promise_date', 'next_promise_date', 'comments']));

        return response()->json($feeFollowUp->load(['student', 'creator']));
    }

    public function destroy(FeeFollowUp $feeFollowUp)
    {
        $feeFollowUp->delete();
        return response()->json(['message' => 'Deleted successfully']);
    }
}
