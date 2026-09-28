<?php

namespace App\Jobs;

use App\Models\FeePayment;
use App\Mail\FeeReceiptMail;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class SendFeeReceiptEmailJob implements ShouldQueue
{
    use Queueable;

    protected $payment;

    /**
     * Create a new job instance.
     */
    public function __construct(FeePayment $payment)
    {
        $this->payment = $payment;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $this->payment->loadMissing('student');

        if ($this->payment->student && $this->payment->student->email) {
            try {
                Mail::to($this->payment->student->email)->send(new FeeReceiptMail($this->payment));
            } catch (\Exception $e) {
                Log::error('Failed to send fee receipt email: ' . $e->getMessage());
            }
        }
    }
}
