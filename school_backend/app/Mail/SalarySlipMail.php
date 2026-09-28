<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Mail\Mailables\Attachment;

class SalarySlipMail extends Mailable
{
    use Queueable, SerializesModels;

    public $slip;
    public $pdfContent;

    /**
     * Create a new message instance.
     */
    public function __construct($slip, $pdfContent)
    {
        $this->slip = $slip;
        $this->pdfContent = $pdfContent;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Salary Slip ' . $this->slip->month . ' - Kips School Chunian Campus',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.salary-slip-body',
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
            Attachment::fromData(fn () => $this->pdfContent, 'Salary_Slip_' . $this->slip->month . '.pdf')
                ->withMime('application/pdf'),
        ];
    }
}
