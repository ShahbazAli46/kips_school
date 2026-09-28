<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Models\User;
use App\Http\Controllers\Api\FeePaymentController;

class SendFeeLedgerEmailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $student;

    /**
     * Create a new job instance.
     */
    public function __construct(User $student)
    {
        $this->student = $student;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        if (!$this->student->email) {
            return;
        }

        $controller = app(FeePaymentController::class);
        $response = $controller->ledger($this->student);
        
        if ($response->getStatusCode() !== 200) {
            return;
        }
        
        $ledgerData = $response->getData(true);
        $summary = $ledgerData['summary'] ?? null;
        $ledger = $ledgerData['ledger'] ?? null;
        $payments = $ledgerData['payments'] ?? [];

        if (!$summary || !$ledger) {
            return;
        }

        $rollNumber = 'KIPS-' . date('Y') . '-' . sprintf('%03d', $this->student->id);

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('emails.fee-ledger-pdf', [
            'student' => $this->student,
            'summary' => $summary,
            'ledger' => $ledger,
            'rollNumber' => $rollNumber,
            'payments' => $payments
        ]);

        \Illuminate\Support\Facades\Mail::to($this->student->email)->send(new \App\Mail\FeeLedgerMail($this->student, $pdf->output()));
    }
}
