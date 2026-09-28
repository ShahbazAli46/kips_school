<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Mail\Mailables\Attachment;

class FeeLedgerMail extends Mailable
{
    use Queueable, SerializesModels;

    public $student;
    public $pdfContent;

    /**
     * Create a new message instance.
     */
    public function __construct($student, $pdfContent)
    {
        $this->student = $student;
        $this->pdfContent = $pdfContent;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Fee Ledger - Kips School Chunian Campus (' . $this->student->name . ')',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.fee-ledger-body',
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [
            Attachment::fromData(fn () => $this->pdfContent, 'Fee_Ledger_' . str_replace(' ', '_', $this->student->name) . '.pdf')
                ->withMime('application/pdf'),
        ];
    }
}
