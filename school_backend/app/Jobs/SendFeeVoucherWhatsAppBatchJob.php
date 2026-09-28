<?php

namespace App\Jobs;

use App\Services\WhatsAppGatewayService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendFeeVoucherWhatsAppBatchJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $timeout = 7200;

    protected array $vouchers;
    protected string $voucherType;
    protected string $billingMonth;
    protected int $startIndex;

    /**
     * @param array $vouchers Pre-computed voucher records
     * @param string $voucherType 'family' or 'individual'
     * @param string $billingMonth 'YYYY-MM'
     * @param int $startIndex Index for resumable batches
     */
    public function __construct(array $vouchers, string $voucherType = 'family', string $billingMonth = '', int $startIndex = 0)
    {
        $this->vouchers = array_values($vouchers);
        $this->voucherType = $voucherType;
        $this->billingMonth = $billingMonth ?: date('Y-m');
        $this->startIndex = $startIndex;
    }

    public function handle(WhatsAppGatewayService $whatsAppService): void
    {
        $total = count($this->vouchers);
        if ($total === 0 || $this->startIndex >= $total) {
            return;
        }

        Log::info("[WhatsApp Voucher Job] Starting batch for {$total} vouchers from index {$this->startIndex}.");

        $batchSentCount = 0;
        $maxPerBatch = 100;

        for ($i = $this->startIndex; $i < $total; $i++) {
            $voucher = $this->vouchers[$i];

            $recipientPhone = $voucher['phone_number'] ?? ($voucher['contact_number'] ?? null);
            $voucherNo = $voucher['voucher_number'] ?? ('KIPS-VCH-' . ($i + 1));
            $guardianName = $voucher['father_name'] ?? ($voucher['name'] ?? 'Guardian');
            $monthName = $voucher['month_name'] ?? date('F Y');
            $dueDate = $voucher['due_date'] ?? date('Y-m-10');
            $totalPayable = number_format($voucher['total_payable'] ?? 0);

            if ($recipientPhone && $recipientPhone !== 'no-phone' && ($voucher['total_payable'] ?? 0) > 0) {
                try {
                    // Generate PDF on the fly (2-Copy Landscape layout)
                    $pdf = Pdf::loadView('pdf.fee-voucher', ['voucher' => $voucher])
                        ->setPaper('a4', 'landscape');

                    $pdfOutput = $pdf->output();
                    $base64Pdf = base64_encode($pdfOutput);
                    unset($pdf); // Free memory immediately

                    $stName = $voucher['name'] ?? 'Student';
                    $stClass = $voucher['class_name'] ?? 'Class';
                    $studentsSummary = "👤 *طالب علم / Student:* {$stName} ({$stClass})\n";

                    $caption = "📢 *KIPS SCHOOL CHUNIAN CAMPUS*\n"
                        . "*فیس واؤچر / Official Fee Voucher*\n\n"
                        . "محترم والدین / سرپرست،\n"
                        . "ماہ *{$monthName}* کا فیس واؤچر بذریعہ PDF منسلک ہے۔ برائے مہربانی مقررہ تاریخ سے قبل فیس جمع کروائیں۔\n\n"
                        . "👤 *سرپرست / Guardian:* {$guardianName}\n"
                        . "🔢 *واؤچر نمبر / Voucher No:* {$voucherNo}\n"
                        . $studentsSummary
                        . "💰 *کل واجب الادا رقم / Total Payable:* Rs. {$totalPayable}\n"
                        . "📅 *آخری تاریخ / Due Date:* {$dueDate}\n\n"
                        . "⚠️ *نوٹ:* برائے مہربانی تاریخ گزرنے سے قبل فیس جمع کروا کر رسید حاصل کریں۔\n\n"
                        . "📞 *Helpline:* 0300 39 39 581\n"
                        . "🌐 *Portal:* https://kips.edu.pk";

                    $fileName = "Fee_Voucher_{$voucherNo}.pdf";

                    $result = $whatsAppService->sendPdfDocument($recipientPhone, $base64Pdf, $fileName, $caption, false, 'normal');

                    Log::info("[WhatsApp Voucher Job] Sent PDF to {$guardianName} ({$recipientPhone}) [{$voucherNo}] [Item " . ($i + 1) . "/{$total}]", [
                        'response' => $result
                    ]);

                    $batchSentCount++;
                } catch (\Throwable $e) {
                    Log::error("[WhatsApp Voucher Job Error] Voucher {$voucherNo}: " . $e->getMessage());
                } finally {
                    // Trigger garbage collector to keep memory low on shared hosting
                    gc_collect_cycles();
                }
            }

            $isLastItem = ($i === $total - 1);

            if ($batchSentCount >= $maxPerBatch && !$isLastItem) {
                $nextIndex = $i + 1;
                Log::info("[WhatsApp Voucher Job] Reached 100 vouchers limit. 5-min cooldown before index {$nextIndex}.");
                self::dispatch($this->vouchers, $this->voucherType, $this->billingMonth, $nextIndex)->delay(now()->addMinutes(5));
                return;
            }

            if (!$isLastItem) {
                $sleepSeconds = rand(12, 22);
                Log::info("[WhatsApp Voucher Job] Waiting {$sleepSeconds}s before generating next PDF...");
                sleep($sleepSeconds);
            }
        }

        Log::info("[WhatsApp Voucher Job] Finished batch processing for {$total} vouchers.");
    }
}
