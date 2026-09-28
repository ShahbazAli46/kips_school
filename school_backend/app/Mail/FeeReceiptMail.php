<?php

namespace App\Mail;

use App\Models\FeePayment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Number;
use Carbon\Carbon;

class FeeReceiptMail extends Mailable
{
    use Queueable, SerializesModels;

    public $payment;

    /**
     * Create a new message instance.
     */
    public function __construct(FeePayment $payment)
    {
        $this->payment = $payment;
        $this->payment->loadMissing(['student.academyClass', 'student.section', 'receiver']);
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Fee Receipt - Kips School Chunian Campus',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        $amount_words = ucwords(Number::spell($this->payment->amount_paid)) . ' Only';

        return new Content(
            view: 'emails.fee-receipt',
            with: [
                'receipt_no' => str_pad($this->payment->id, 4, '0', STR_PAD_LEFT),
                'date' => Carbon::parse($this->payment->payment_date)->format('d M Y'),
                'student_name' => $this->payment->student->name ?? '—',
                'father_name' => $this->payment->student->father_name ?? '—',
                'class' => $this->payment->student->academyClass->name ?? '—',
                'section' => $this->payment->student->section->name ?? '—',
                'amount' => $this->payment->amount_paid,
                'amount_words' => $amount_words,
                'received_by' => $this->payment->receiver->name ?? 'System',
                'month' => Carbon::parse($this->payment->month . '-01')->format('F Y'),
                'logo_url' => null, // Optional, falls back to embedded seal
                'academy_phone' => '0300-1234567', // Static for now, can be updated from settings
                'academy_address' => 'Main Bazaar Road, Chunian, Kasur',
            ]
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
