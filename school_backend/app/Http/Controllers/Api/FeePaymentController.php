<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FeePayment;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Jobs\SendFeeLedgerEmailJob;

class FeePaymentController extends Controller
{
    public function index(Request $request)
    {
        $month = $request->query('month', now()->format('Y-m'));
        
        $payments = FeePayment::with([
                'student:id,name,father_name,class_id,section_id,major_id',
                'student.academyClass:id,name',
                'student.section:id,name',
                'student.major:id,name',
                'receiver:id,name'
            ])
            ->where('month', $month)
            ->orderBy('payment_date', 'desc')
            ->get();
            
        return response()->json($payments);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'student_id' => 'required|exists:users,id',
            'month' => 'required|date_format:Y-m',
            'amount_paid' => 'required|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'payment_date' => 'required|date',
            'payer_name' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Check if a payment for this month already exists to prevent duplicates if desired
        // But maybe they pay in installments, so we allow multiple records.

        $data = $validator->validated();
        $data['received_by'] = auth()->id();

        $payment = FeePayment::create($data);
        $payment->load('student:id,name,email');

        // Head-wise Payment Allocation
        $remainingPayment = (float)$payment->amount_paid;
        $studentFeeItems = \App\Models\StudentFeeItem::where('student_id', $payment->student_id)
            ->where('balance_amount', '>', 0)
            ->get();

        $isCustomAllocation = $request->has('head_allocations') && is_array($request->input('head_allocations'));
        // Custom head allocation if provided in request
        if ($isCustomAllocation) {
            foreach ($request->input('head_allocations') as $alloc) {
                $headKey = $alloc['head_key'] ?? '';
                $allocAmount = (float)($alloc['amount'] ?? 0);
                if ($allocAmount <= 0) continue;

                $item = $studentFeeItems->firstWhere('head_key', $headKey);
                if ($item) {
                    $item->paid_amount = (float)$item->paid_amount + $allocAmount;
                    $item->balance_amount = max(0, (float)$item->payable_amount - (float)$item->paid_amount);
                    $item->save();

                    \App\Models\FeePaymentItem::create([
                        'fee_payment_id' => $payment->id,
                        'student_fee_item_id' => $item->id,
                        'head_key' => $headKey,
                        'head_name' => $item->head_name,
                        'amount_paid' => $allocAmount,
                        'discount_applied' => 0,
                        'month' => $payment->month,
                    ]);
                    $remainingPayment -= $allocAmount;
                } elseif ($headKey === 'tuition_fee') {
                    // Current month tuition fee doesn't have a student_fee_item
                    \App\Models\FeePaymentItem::create([
                        'fee_payment_id' => $payment->id,
                        'student_fee_item_id' => null,
                        'head_key' => 'tuition_fee',
                        'head_name' => 'Tuition Fee',
                        'amount_paid' => $allocAmount,
                        'discount_applied' => 0,
                        'month' => $payment->month,
                    ]);
                    $remainingPayment -= $allocAmount;
                }
            }
        }

        // Automatic waterfall allocation for remaining amount (only if not custom allocation)
        if (!$isCustomAllocation && $remainingPayment > 0 && $studentFeeItems->isNotEmpty()) {
            // Priority: one-time admission heads first, then recurring
            $sortedItems = $studentFeeItems->sortBy(function ($item) {
                $order = [
                    'adm_fee' => 1, 'security_fee' => 2, 'id_card_charges' => 3, 'brd_reg_charges' => 4,
                    'brd_adm_charges' => 5, 'tuition_fee' => 6, 'lms_charges' => 7, 'ac_charges' => 8,
                    'lab_charges' => 9, 'library_charges' => 10, 'exam_charges' => 11, 'service_charges' => 12,
                    'lim_charges' => 13, 'r_and_t_charges' => 14, 'fine' => 15
                ];
                return $order[$item->head_key] ?? 99;
            });

            foreach ($sortedItems as $item) {
                if ($remainingPayment <= 0) break;
                $balance = (float)$item->balance_amount;
                if ($balance <= 0) continue;

                $take = min($remainingPayment, $balance);
                $remainingPayment -= $take;

                $item->paid_amount = (float)$item->paid_amount + $take;
                $item->balance_amount = max(0, (float)$item->payable_amount - (float)$item->paid_amount);
                $item->save();

                \App\Models\FeePaymentItem::create([
                    'fee_payment_id' => $payment->id,
                    'student_fee_item_id' => $item->id,
                    'head_key' => $item->head_key,
                    'head_name' => $item->head_name,
                    'amount_paid' => $take,
                    'discount_applied' => 0,
                    'month' => $payment->month,
                ]);
            }
        }

        if ($payment->student && $payment->student->email) {
            \App\Jobs\SendFeeReceiptEmailJob::dispatch($payment);
        }

        // Dispatch WhatsApp Fee Receipt to Parent
        try {
            \App\Jobs\SendFeeReceiptWhatsAppJob::dispatch($payment);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('[Fee WhatsApp Receipt Error] ' . $e->getMessage());
        }

        // Send Push Notification
        try {
            $student = \App\Models\User::find($payment->student_id);
            if ($student) {
                $targetUserIds = \App\Models\User::where('id', $student->id)
                    ->orWhere('contact_number', $student->contact_number)
                    ->orWhere('emergency_contact', $student->contact_number)
                    ->pluck('id')
                    ->unique()
                    ->toArray();

                $formattedAmount = number_format($payment->amount_paid);
                app(\App\Services\FcmService::class)->sendToUsers(
                    $targetUserIds,
                    "Fee Payment Received: {$student->name}",
                    "Payment of Rs {$formattedAmount} received for {$student->name} (Month: {$payment->month}).",
                    [
                        'type' => 'fee',
                        'student_id' => $student->uuid,
                        'student_name' => $student->name,
                        'amount' => $payment->amount_paid,
                        'month' => $payment->month,
                    ],
                    'salaries_channel',
                    'ledger',
                    $student->uuid,
                    null,
                    $student->name
                );
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('[Fee Push Error] ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Fee payment recorded successfully',
            'payment' => $payment->load('items')
        ]);
    }

    public function update(Request $request, FeePayment $feePayment)
    {
        $validator = Validator::make($request->all(), [
            'amount_paid' => 'required|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'payment_date' => 'required|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $feePayment->update($validator->validated());
        $feePayment->load('student:id,name');

        return response()->json([
            'message' => 'Fee payment updated successfully',
            'payment' => $feePayment
        ]);
    }

    public function balances(Request $request)
    {
        $activeSession = \App\Models\AcademicSession::getActiveSession();
        $startDate = $activeSession ? $activeSession->start_date : '2020-01-01';
        $sessionStart = \Carbon\Carbon::parse($startDate)->startOfMonth();
        $startMonthStr = $sessionStart->format('Y-m');

        $monthStr = $request->input('month', now()->format('Y-m'));
        $targetCarbon = \Carbon\Carbon::createFromFormat('Y-m', $monthStr)->startOfMonth();

        $query = User::with([
                'academyClass:id,name', 
                'major:id,name', 
                'section:id,name',
                'feeItems',
                'feePayments' => function($q) use ($startMonthStr) {
                    $q->where('month', '>=', $startMonthStr)
                      ->with(['items', 'studentExtraCharge'])
                      ->select('id', 'student_id', 'month', 'amount_paid', 'discount_amount', 'payment_date');
                }
            ])
            ->where('role_id', 3)
            ->where('is_active', true);

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('contact_number', 'like', "%{$search}%")
                  ->orWhere('father_name', 'like', "%{$search}%")
                  ->orWhere('roll_number', 'like', "%{$search}%");
            });
        }

        if ($request->filled('class_id')) {
            $query->where('class_id', $request->input('class_id'));
        }

        if ($request->filled('section_id')) {
            $query->where('section_id', $request->input('section_id'));
        }

        $query->orderBy('name', 'asc');

        $allStudents = $query->get();

        $getTuitionPaidAndDiscount = function ($paymentsCollection) {
            $tuitionPaid = 0;
            $tuitionDiscount = 0;
            foreach ($paymentsCollection as $p) {
                $pItems = $p->relationLoaded('items') ? $p->items : $p->items()->get();
                $nonTuitionPaid = (float)$pItems->whereNotNull('student_fee_item_id')->sum('amount_paid');
                $tuitionPaid += max(0, (float)$p->amount_paid - $nonTuitionPaid);
                $tuitionDiscount += (float)$p->discount_amount;
            }
            return [$tuitionPaid, $tuitionDiscount];
        };

        $totalReceivedMonth = 0;
        $totalRemainingOverall = 0;

        $calculatedList = $allStudents->map(function ($student) use ($monthStr, $startMonthStr, $sessionStart, $targetCarbon, $getTuitionPaidAndDiscount, &$totalReceivedMonth, &$totalRemainingOverall) {
            $monthlyFee = (float)($student->monthly_fee ?: 0);

            // Payments this month
            $monthPayments = $student->feePayments->filter(fn($p) => $p->month === $monthStr);
            $totalMonthPaid = (float)$monthPayments->sum('amount_paid');
            $totalMonthDiscount = (float)$monthPayments->sum('discount_amount');

            [$currentMonthTuitionPaid, $currentMonthTuitionDiscount] = $getTuitionPaidAndDiscount($monthPayments);
            $currentMonthNetDue = max(0, $monthlyFee - ($currentMonthTuitionPaid + $currentMonthTuitionDiscount));

            // Prior months tuition arrears
            $studentCreated = \Carbon\Carbon::parse($student->created_at);
            $start = ($studentCreated->gt($sessionStart) ? $studentCreated : $sessionStart)->copy()->startOfMonth();
            $previousTuitionArrears = 0;

            if ($start->lt($targetCarbon)) {
                $priorMonthsCount = $start->diffInMonths($targetCarbon);
                $priorFeesDue = ($priorMonthsCount * $monthlyFee);

                $priorPayments = $student->feePayments->filter(fn($p) => $p->month < $monthStr);
                [$priorPaid, $priorDiscount] = $getTuitionPaidAndDiscount($priorPayments);

                $previousTuitionArrears = max(0, $priorFeesDue - ($priorPaid + $priorDiscount));
            }

            // Unpaid non-monthly Fee Heads
            $unpaidOneTimeBalance = 0;
            if ($student->relationLoaded('feeItems') || $student->feeItems) {
                foreach ($student->feeItems as $fi) {
                    if ($fi->head_key !== 'tuition_fee' && (float)$fi->balance_amount > 0) {
                        $unpaidOneTimeBalance += (float)$fi->balance_amount;
                    }
                }
            } elseif ($student->pending_amount > 0) {
                $unpaidOneTimeBalance = (float)$student->pending_amount;
            }

            $previousArrears = $previousTuitionArrears + $unpaidOneTimeBalance;
            $totalPayable = $currentMonthNetDue + $previousArrears;

            $status = 'unpaid';
            if ($totalPayable <= 0) {
                $status = 'paid';
            } elseif ($totalMonthPaid > 0 || $totalMonthDiscount > 0) {
                $status = 'partial';
            }

            $totalReceivedMonth += $totalMonthPaid;
            $totalRemainingOverall += $totalPayable;

            $student->total_payable = $totalPayable;
            $student->total_receivable = $totalPayable;
            $student->arrears = $totalPayable;
            $allStudentPaymentsSum = (float)$student->feePayments->sum('amount_paid');
            $student->total_paid = $allStudentPaymentsSum + (float)($student->amount_received_at_admission ?? 0);
            $student->total_received = $student->total_paid;
            $student->current_month_paid = $totalMonthPaid;
            $student->current_month_discount = $totalMonthDiscount;
            $student->current_month_net_due = $currentMonthNetDue;
            $student->previous_arrears = $previousArrears;
            $student->unpaid_extra_charges = $unpaidOneTimeBalance;
            $student->computed_status = $status;
            
            // Set fee_payments for the current month
            $student->setRelation('feePayments', $monthPayments->values());

            return $student;
        });

        // Filter by status if requested
        if ($request->filled('status')) {
            $reqStatus = strtolower($request->input('status'));
            $calculatedList = $calculatedList->filter(function ($s) use ($reqStatus) {
                return $s->computed_status === $reqStatus;
            })->values();
        }

        // Pagination
        $perPage = (int)$request->input('per_page', 50);
        $page = (int)$request->input('page', 1);
        $total = $calculatedList->count();
        $lastPage = max(1, (int)ceil($total / $perPage));
        $slice = $calculatedList->slice(($page - 1) * $perPage, $perPage)->values();

        return response()->json([
            'current_page' => $page,
            'data' => $slice,
            'last_page' => $lastPage,
            'per_page' => $perPage,
            'total' => $total,
            'stats' => [
                'expected' => $totalReceivedMonth + $totalRemainingOverall,
                'received' => $totalReceivedMonth,
                'remaining' => $totalRemainingOverall,
            ]
        ]);
    }

    public function ledger(User $student)
    {
        if ($student->role_id !== 3) {
            return response()->json(['message' => 'Not a student'], 400);
        }

        $user = auth()->user();
        if ($user && $user->role_id === 3 && (!$user->email || $student->email !== $user->email)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $activeSession = \App\Models\AcademicSession::getActiveSession();
        $sessionStartDate = $activeSession ? $activeSession->start_date : '2020-01-01';
        $startMonthStr = \Carbon\Carbon::parse($sessionStartDate)->format('Y-m');

        $payments = FeePayment::where('student_id', $student->id)
            ->where('month', '>=', $startMonthStr)
            ->orderBy('payment_date', 'asc')
            ->get();

        $ledger = [];
        $monthlyFee = (float)($student->monthly_fee ?: 0);
        
        $studentCreated = \Carbon\Carbon::parse($student->created_at);
        $sessionStart = \Carbon\Carbon::parse($sessionStartDate);
        $start = ($studentCreated->gt($sessionStart) ? $studentCreated : $sessionStart)->copy()->startOfMonth();
        $end = now()->startOfMonth();
        $monthsEnrolled = $start->diffInMonths($end) + 1;
        $totalPaid = (float)$payments->sum('amount_paid');
        $totalDiscount = (float)$payments->sum('discount_amount');

        $student->loadMissing(['feeItems', 'academyClass', 'section', 'major']);
        $oneTimePayable = (float)$student->feeItems->where('head_key', '!=', 'tuition_fee')->sum('payable_amount');
        $oneTimeInitial = $oneTimePayable > 0 ? $oneTimePayable : (float)($student->pending_amount ?: 0);

        $totalDue = ($monthsEnrolled * $monthlyFee) + $oneTimeInitial;
        $arrears = max(0, $totalDue - ($totalPaid + $totalDiscount));

        $remainingCredit = $totalPaid + $totalDiscount;
        
        if ($oneTimeInitial > 0) {
            $allocatedToPending = min($remainingCredit, $oneTimeInitial);
            $remainingCredit -= $allocatedToPending;
            
            $ledger[] = [
                'month' => (clone $start)->subMonth()->format('Y-m'),
                'month_name' => 'Previous Arrears / Admission Heads',
                'amount_due' => $oneTimeInitial,
                'amount_paid' => 0,
                'discount' => 0,
                'status' => $allocatedToPending >= $oneTimeInitial ? 'Received' : ($allocatedToPending > 0 ? 'Partial' : 'Unpaid'),
                'payments' => []
            ];
        }

        $current = $start->copy();
        
        // Build a queue of actual payments for true FIFO date attribution
        $paymentQueue = [];
        foreach ($payments as $p) {
            $paymentQueue[] = [
                'date' => $p->payment_date,
                'paid_remaining' => (float)$p->amount_paid,
                'discount_remaining' => (float)$p->discount_amount
            ];
        }
        
        while ($current->lte($end) || $remainingCredit > 0) {
            $monthStr = $current->format('Y-m');
            $amountDue = $monthlyFee;
            
            $allocated = min($remainingCredit, $amountDue);

            // Handle edge case where fee is 0 and we are in the future to prevent infinite loop
            if ($monthlyFee <= 0 && $current->gt($end)) {
                 break;
            }

            $remainingCredit -= $allocated;

            // Draw from payment queue to determine which exact dates paid for this month
            $amountToDraw = $allocated;
            $datesThisMonth = [];
            $monthCashPaid = 0;
            $monthDiscount = 0;
            
            while ($amountToDraw > 0 && count($paymentQueue) > 0) {
                $q = &$paymentQueue[0];
                $totalQ = $q['paid_remaining'] + $q['discount_remaining'];
                if ($totalQ <= 0) {
                    array_shift($paymentQueue);
                    continue;
                }
                
                $take = min($totalQ, $amountToDraw);
                
                $takePaid = min($q['paid_remaining'], $take);
                $takeDiscount = $take - $takePaid;

                $q['paid_remaining'] -= $takePaid;
                $q['discount_remaining'] -= $takeDiscount;
                
                $monthCashPaid += $takePaid;
                $monthDiscount += $takeDiscount;
                $amountToDraw -= $take;
                
                $datesThisMonth[] = ['payment_date' => $q['date']];
                
                if ($q['paid_remaining'] + $q['discount_remaining'] <= 0) {
                    array_shift($paymentQueue);
                }
            }

            $status = 'Unpaid';
            if ($monthlyFee > 0) {
                if ($allocated >= $monthlyFee) {
                    $status = 'Received';
                } elseif ($allocated > 0) {
                    $status = 'Partial';
                }
            } else {
                $status = 'Received';
            }

            if ($current->gt($end)) {
                $status = 'Advance';
            }

            $ledger[] = [
                'month' => $monthStr,
                'month_name' => $current->format('F Y'),
                'amount_due' => $amountDue,
                'amount_paid' => $monthCashPaid,
                'discount' => $monthDiscount,
                'status' => $status,
                'payments' => $datesThisMonth
            ];

            $current->addMonth();
        }

        usort($ledger, function($a, $b) {
            return strcmp($b['month'], $a['month']);
        });

        $student->load(['academyClass', 'section', 'major', 'feeItems']);
        $payments->load(['items', 'receiver:id,name']);

        $statementItems = [];
        $tuitionInserted = false;

        $generateTuitionRows = function() use ($start, $end, $payments, $monthlyFee) {
            $rows = [];
            $curr = $start->copy();
            while ($curr->lte($end)) {
                $mStr = $curr->format('Y-m');
                $mLabel = $curr->format('M Y');
                
                $monthPayment = $payments->firstWhere('month', $mStr);
                $tuitionPaid = 0;
                $tuitionDisc = 0;
                
                if ($monthPayment) {
                    $tuitionItem = $monthPayment->items->first(function($it) {
                        return stripos($it->head_name, 'Tuition') !== false || is_null($it->student_fee_item_id);
                    });
                    if ($tuitionItem) {
                        $tuitionPaid = (float)$tuitionItem->amount_paid;
                    } else {
                        $itemPaidSum = (float)$monthPayment->items->whereNotNull('student_fee_item_id')->sum('amount_paid');
                        $tuitionPaid = max(0, (float)$monthPayment->amount_paid - $itemPaidSum);
                    }
                    $tuitionDisc = (float)$monthPayment->discount_amount;
                }
                
                $payable = max(0, $monthlyFee - $tuitionDisc);
                $bal = max(0, $payable - $tuitionPaid);
                
                $status = 'N/A';
                if ($payable > 0) {
                    if ($bal <= 0) $status = 'Cleared';
                    elseif ($tuitionPaid > 0) $status = 'Partial';
                    else $status = 'Unpaid';
                }
                
                $rows[] = [
                    'id' => 'tuition_' . $mStr,
                    'head_key' => 'tuition_fee_' . $mStr,
                    'head_name' => "Tuition Fee ({$mLabel})",
                    'head_type' => 'monthly',
                    'actual_amount' => $monthlyFee,
                    'discount_amount' => $tuitionDisc,
                    'payable_amount' => $payable,
                    'paid_amount' => $tuitionPaid,
                    'balance_amount' => $bal,
                    'status' => $status,
                ];
                
                $curr->addMonth();
            }
            return $rows;
        };

        foreach ($student->feeItems as $fi) {
            if ($fi->head_key === 'tuition_fee') {
                continue;
            }

            $actual = (float)$fi->actual_amount;
            $disc = (float)$fi->discount_amount;
            $payable = (float)$fi->payable_amount;
            $paid = (float)$fi->paid_amount;
            $bal = (float)$fi->balance_amount;
            
            $status = 'N/A';
            if ($payable > 0) {
                if ($bal <= 0) $status = 'Cleared';
                elseif ($paid > 0) $status = 'Partial';
                else $status = 'Unpaid';
            }

            $statementItems[] = [
                'id' => $fi->id,
                'head_key' => $fi->head_key,
                'head_name' => $fi->head_name,
                'head_type' => $fi->head_type ?? 'one_time',
                'actual_amount' => $actual,
                'discount_amount' => $disc,
                'payable_amount' => $payable,
                'paid_amount' => $paid,
                'balance_amount' => $bal,
                'status' => $status,
            ];
        }

        // Monthly tuition fees and subsequent recurring entries are placed at the bottom of the ledger
        foreach ($generateTuitionRows() as $tRow) {
            $statementItems[] = $tRow;
        }

        $cumBalance = 0;
        foreach ($statementItems as &$stItem) {
            $netItem = (float)$stItem['payable_amount'] - (float)$stItem['paid_amount'];
            $cumBalance += $netItem;
            $stItem['running_balance'] = $cumBalance;
        }
        unset($stItem);

        $unpaidHeads = collect($statementItems)->filter(function($item) {
            return ($item['balance_amount'] ?? 0) > 0;
        })->values();

        return response()->json([
            'student' => [
                'id' => $student->id,
                'uuid' => $student->uuid,
                'roll_number' => $student->roll_number,
                'name' => $student->name,
                'father_name' => $student->father_name,
                'student_cnic' => $student->student_cnic,
                'father_cnic' => $student->father_cnic,
                'father_cell' => $student->father_cell,
                'contact_number' => $student->contact_number,
                'gender' => $student->gender,
                'dob' => $student->dob ? $student->dob->format('Y-m-d') : null,
                'stream_type' => $student->stream_type,
                'admission_month' => $student->admission_month,
                'monthly_fee' => (float)$student->monthly_fee,
                'pending_amount' => (float)$student->pending_amount,
                'created_at' => $student->created_at,
                'class_name' => $student->academyClass->name ?? '—',
                'section_name' => $student->section->name ?? '—',
                'major_name' => $student->major->name ?? '—'
            ],
            'summary' => [
                'total_due' => $totalDue,
                'total_paid' => $totalPaid,
                'total_discount' => $totalDiscount,
                'arrears' => $arrears,
                'unpaid_heads_count' => $unpaidHeads->count(),
                'total_unpaid_heads_balance' => (float)$unpaidHeads->sum('balance_amount'),
            ],
            'fee_items' => $statementItems,
            'statement_items' => $statementItems,
            'raw_fee_items' => $student->feeItems,
            'unpaid_heads' => $unpaidHeads,
            'ledger' => $ledger,
            'payments' => $payments
        ]);
    }

    public function emailLedger(User $student)
    {
        if ($student->role_id !== 3) {
            return response()->json(['message' => 'Not a student'], 400);
        }

        if (!$student->email) {
            return response()->json(['message' => 'Student has no email address'], 400);
        }

        SendFeeLedgerEmailJob::dispatch($student);

        return response()->json(['message' => 'Ledger email job dispatched successfully']);
    }

    public function bulkEmailLedger(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'student_ids' => 'required|array',
            'student_ids.*' => 'integer|exists:users,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $studentIds = $request->input('student_ids');
        $students = User::whereIn('id', $studentIds)
                        ->where('role_id', 3)
                        ->whereNotNull('email')
                        ->get();

        if ($students->isEmpty()) {
            return response()->json(['message' => 'No valid students with email addresses found'], 400);
        }

        foreach ($students as $student) {
            SendFeeLedgerEmailJob::dispatch($student);
        }

        return response()->json([
            'message' => 'Bulk ledger email jobs dispatched successfully',
            'dispatched_count' => $students->count(),
        ]);
    }

    
    public function sendWhatsAppReminder(Request $request, $studentId, \App\Services\WhatsAppGatewayService $whatsAppService)
    {
        $activeSession = \App\Models\AcademicSession::getActiveSession();
        $startDate = $activeSession ? $activeSession->start_date : "2020-01-01";
        $startMonthStr = \Carbon\Carbon::parse($startDate)->format("Y-m");

        $student = User::with(["academyClass", "section", "major"])
            ->withSum(["feePayments as total_paid" => function($q) use ($startMonthStr) {
                $q->where("month", ">=", $startMonthStr);
            }], "amount_paid")
            ->withSum(["feePayments as total_discount" => function($q) use ($startMonthStr) {
                $q->where("month", ">=", $startMonthStr);
            }], "discount_amount")
            ->selectRaw("
                users.*,
                (TIMESTAMPDIFF(MONTH, DATE_FORMAT(GREATEST(created_at, ?), \"%Y-%m-01\"), DATE_FORMAT(CURDATE(), \"%Y-%m-01\")) + 1) as total_months
            ", [$startDate])
            ->findOrFail($studentId);

        $phone = $student->contact_number ?: $student->emergency_contact;
        if (!$phone) {
            return response()->json(["message" => "Student does not have a contact phone number."], 400);
        }

        $monthlyFee = (float) ($student->monthly_fee ?? 0);
        $totalMonths = (int) ($student->total_months ?? 1);
        $pendingAmount = (float) ($student->pending_amount ?? 0);
        $totalExpected = ($monthlyFee * $totalMonths) + $pendingAmount;
        $totalPaid = (float) ($student->total_paid ?? 0);
        $totalDiscount = (float) ($student->total_discount ?? 0);
        $balance = $totalExpected - ($totalPaid + $totalDiscount);

        $className = $student->academyClass?->name ?? "N/A";
        if (!empty($student->section?->name)) {
            $className .= " - Section " . $student->section->name;
        }
        $rollNo = $student->roll_number ? $student->roll_number : ("KIPS-" . str_pad($student->id, 4, "0", STR_PAD_LEFT));
        $formattedFee = number_format($monthlyFee);
        $formattedBalance = number_format(max(0, $balance));
        $formattedMonth = date("F Y");

        $message = "📢 *KIPS SCHOOL CHUNIAN CAMPUS*\n"
            . "*فیس کی ادائیگی کی یاد دہانی | Fee Due Notice*\n\n"
            . "محترم والدین / سرپرست،\n"
            . "امید ہے آپ خیریت سے ہوں گے۔ برائے مہربانی اپنے بچے کی واجب الادا اکیڈمی فیس کی تفصیلات ملاحظہ فرمائیں:\n\n"
            . "👤 *طالب علم / Student:* {$student->name}\n"
            . "🔢 *رول نمبر / Roll No:* {$rollNo}\n"
            . "📚 *کلاس / Class:* {$className}\n"
            . "💰 *ماہانہ فیس / Monthly Fee:* Rs {$formattedFee}\n"
            . "💳 *کل واجب الادا رقم / Pending Balance:* Rs {$formattedBalance}\n"
            . "📅 *مہینہ / Billing Month:* {$formattedMonth}\n\n"
            . "⚠️ *گزارش:* برائے مہربانی کسی بھی تعطل سے بچنے کے لیے واجب الادا فیس جلد از جلد اکیڈمی آفس میں جمع کروائیں۔ شکریہ!\n\n"
            . "📞 *Helpline:* 0300 39 39 581\n"
            . "🌐 *Portal:* https://usachunian.com";

        $res = $whatsAppService->sendTextMessage($phone, $message);

        if (!empty($res["success"])) {
            return response()->json([
                "message" => "WhatsApp fee reminder sent successfully to {$student->name} ({$phone})!",
                "gateway_response" => $res
            ]);
        }

        return response()->json([
            "message" => "Failed to send WhatsApp message: " . ($res["error"] ?? "Gateway Error"),
            "details" => $res
        ], 500);
    }

    public function sendBulkWhatsAppReminders(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'student_ids' => 'required|array',
            'student_ids.*' => 'integer|exists:users,id',
            'month' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $studentIds = $request->input('student_ids');
        $month = $request->input('month', date('Y-m'));

        \App\Jobs\SendFeeReminderWhatsAppBatchJob::dispatch($studentIds, $month);

        return response()->json([
            'message' => 'Bulk WhatsApp fee reminder job dispatched successfully.',
            'total_students' => count($studentIds)
        ]);
    }

    public function destroy(FeePayment $feePayment)
    {
        // Revert allocated paid amounts on student_fee_items
        $paymentItems = \App\Models\FeePaymentItem::where('fee_payment_id', $feePayment->id)->get();
        foreach ($paymentItems as $pi) {
            if ($pi->student_fee_item_id) {
                $item = \App\Models\StudentFeeItem::find($pi->student_fee_item_id);
                if ($item) {
                    $item->paid_amount = max(0, (float)$item->paid_amount - (float)$pi->amount_paid);
                    $item->balance_amount = max(0, (float)$item->payable_amount - (float)$item->paid_amount);
                    $item->save();
                }
            }
        }

        \App\Models\FeePaymentItem::where('fee_payment_id', $feePayment->id)->delete();
        $feePayment->delete();
        return response()->json(['message' => 'Fee payment deleted successfully']);
    }
}
