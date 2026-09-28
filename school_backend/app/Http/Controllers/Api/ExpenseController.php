<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ExpenseController extends Controller
{
    public function index(Request $request)
    {
        $query = Expense::with(['category', 'recorder']);

        if ($request->filled('academic_session_id')) {
            $query->where('academic_session_id', $request->academic_session_id);
        }

        if ($request->filled('month_year')) {
            $parts = explode('-', $request->month_year);
            if (count($parts) === 2) {
                $query->whereYear('expense_date', $parts[0])
                      ->whereMonth('expense_date', $parts[1]);
            }
        }

        if ($request->filled('category_id')) {
            $query->where('expense_category_id', $request->category_id);
        }

        $expenses = $query->orderBy('expense_date', 'desc')->get();

        return response()->json([
            'expenses' => $expenses
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'academic_session_id' => 'required|exists:academic_sessions,id',
            'expense_category_id' => 'required|exists:expense_categories,id',
            'amount' => 'required|numeric|min:0.01',
            'expense_date' => 'required|date',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $validated['recorded_by'] = Auth::id();

        $expense = Expense::create($validated);
        
        return response()->json($expense->load(['category', 'recorder']), 201);
    }

    public function update(Request $request, $id)
    {
        $expense = Expense::findOrFail($id);

        $validated = $request->validate([
            'academic_session_id' => 'required|exists:academic_sessions,id',
            'expense_category_id' => 'required|exists:expense_categories,id',
            'amount' => 'required|numeric|min:0.01',
            'expense_date' => 'required|date',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $expense->update($validated);
        
        return response()->json($expense->load(['category', 'recorder']));
    }

    public function destroy($id)
    {
        $expense = Expense::findOrFail($id);
        $expense->delete();
        
        return response()->json(['message' => 'Expense deleted successfully']);
    }
}
