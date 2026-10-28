<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademyClass;
use App\Models\PosPayment;
use Illuminate\Http\Request;

/**
 * Separate received-amount ledgers for the Books store and the Extra Charges POS.
 * These cash collections are intentionally NOT part of the fee received ledgers.
 *
 * Built for 4-5 years of records: server-side pagination + aggregate totals
 * computed with a single indexed query (never loads the full dataset).
 */
class PosPaymentController extends Controller
{
    public function index(Request $request)
    {
        $perPage = min(100, max(10, (int) $request->input('per_page', 50)));

        $query = PosPayment::query()
            ->when($request->filled('category') && $request->category !== 'all', fn($q) => $q->where('category', $request->category))
            ->when($request->filled('month'), fn($q) => $q->where('month', $request->month))
            ->when($request->filled('date_from'), fn($q) => $q->whereDate('payment_date', '>=', $request->date_from))
            ->when($request->filled('date_to'), fn($q) => $q->whereDate('payment_date', '<=', $request->date_to))
            ->when($request->filled('class_id'), fn($q) => $q->whereHas('student', fn($s) => $s->where('class_id', $request->class_id)))
            ->when($request->filled('charge_title') && $request->charge_title !== 'all', fn($q) => $q->where('description', $request->charge_title))
            ->when($request->filled('search'), function ($q) use ($request) {
                $search = $request->search;
                $q->where(function ($sq) use ($search) {
                    $sq->where('description', 'like', "%{$search}%")
                        ->orWhere('payer_name', 'like', "%{$search}%")
                        ->orWhereHas('student', function ($st) use ($search) {
                            $st->where('name', 'like', "%{$search}%")
                                ->orWhere('roll_number', 'like', "%{$search}%")
                                ->orWhere('father_name', 'like', "%{$search}%");
                        });
                });
            })
            ->orderByDesc('payment_date')
            ->orderByDesc('id');

        // Totals over the whole filtered set (single aggregate query), independent of paging.
        // The main query is ordered for the paginated records. Remove that
        // ordering from the aggregate query; MySQL rejects ORDER BY columns
        // that are neither grouped nor aggregated when ONLY_FULL_GROUP_BY is on.
        $summary = (clone $query)->reorder()->selectRaw(
            "COUNT(*) as count, COALESCE(SUM(amount_paid),0) as total, "
            . "COALESCE(SUM(CASE WHEN category = 'books' THEN amount_paid ELSE 0 END),0) as books, "
            . "COALESCE(SUM(CASE WHEN category = 'extra' THEN amount_paid ELSE 0 END),0) as extra"
        )->first();

        $payments = $query->with([
            'student:id,name,roll_number,father_name,class_id,section_id',
            'student.academyClass:id,name',
            'student.section:id,name',
            'receiver:id,name',
        ])->paginate($perPage);

        return response()->json([
            'data' => collect($payments->items())->values(),
            'meta' => [
                'current_page' => $payments->currentPage(),
                'per_page' => $payments->perPage(),
                'total' => $payments->total(),
                'last_page' => $payments->lastPage(),
            ],
            'summary' => $summary ? [
                'count' => (int) $summary->count,
                'total' => (float) $summary->total,
                'books' => (float) $summary->books,
                'extra' => (float) $summary->extra,
            ] : ['count' => 0, 'total' => 0.0, 'books' => 0.0, 'extra' => 0.0],
            'classes' => AcademyClass::orderBy('name')->get(['id', 'name']),
            'charge_titles' => PosPayment::query()
                ->where('category', 'extra')
                ->whereNotNull('description')
                ->distinct()
                ->orderBy('description')
                ->pluck('description'),
            'months' => PosPayment::query()
                ->when($request->filled('category') && $request->category !== 'all', fn($q) => $q->where('category', $request->category))
                ->distinct()
                ->orderByDesc('month')
                ->pluck('month'),
        ]);
    }
}
