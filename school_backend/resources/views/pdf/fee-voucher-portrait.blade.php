<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Fee Voucher - KIPS School Chunian Campus</title>
    <style>
        @page {
            size: a4 portrait;
            margin: 5mm 6mm;
        }
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #111827;
            font-size: 8.5px;
            line-height: 1.25;
            background: #ffffff;
        }
        .page-container {
            width: 100%;
            height: 100%;
        }

        /* ─── Cards & Tables ─── */
        .card {
            border: 1px solid #bfdbfe;
            border-radius: 6px;
            background: #ffffff;
            margin-bottom: 5px;
            overflow: hidden;
        }
        .card-header {
            background-color: #eff6ff;
            color: #1e3a8a;
            font-size: 8px;
            font-weight: bold;
            text-transform: uppercase;
            padding: 2px 6px;
            border-bottom: 1px solid #bfdbfe;
        }
        .badge {
            background-color: #1e3a8a;
            color: #ffffff;
            font-size: 7.5px;
            font-weight: 900;
            text-transform: uppercase;
            padding: 2px 8px;
            border-radius: 12px;
            display: inline-block;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }
        .info-table td {
            padding: 3px 5px;
            font-size: 8.5px;
            border-bottom: 0.5px solid #e5e7eb;
            text-align: left;
        }
        .info-label {
            color: #6b7280;
            font-weight: 600;
            width: 32%;
            text-align: left;
        }
        .info-val {
            color: #111827;
            font-weight: bold;
            text-align: left;
        }
        .font-mono {
            font-family: monospace;
        }

        /* Fee Breakdown Table */
        .fee-table th {
            background-color: #f9fafb;
            color: #374151;
            font-size: 8.5px;
            font-weight: bold;
            padding: 3px 6px;
            border-bottom: 1px solid #bfdbfe;
        }
        .fee-table td {
            padding: 3px 6px;
            font-size: 9px;
            border-bottom: 0.5px solid #e5e7eb;
        }
        .text-right { text-align: right; }
        .text-center { text-align: center; }

        /* Total Payable Bar */
        .total-box {
            border: 1.5px solid #1e3a8a;
            border-radius: 6px;
            margin-top: 4px;
            overflow: hidden;
        }
        .total-words {
            background: #eff6ff;
            padding: 4px 6px;
            font-size: 7.5px;
            color: #1f2937;
            width: 65%;
            border-right: 1px solid #bfdbfe;
        }
        .total-amount-box {
            background: #1e3a8a;
            color: #ffffff;
            padding: 4px 6px;
            text-align: right;
            width: 35%;
        }

        /* Perforation Line */
        .perforation {
            border-top: 1.5px dashed #60a5fa;
            margin: 6px 0;
            position: relative;
            text-align: center;
        }
        .perforation-text {
            background: #ffffff;
            padding: 0 8px;
            font-size: 7px;
            font-weight: bold;
            color: #1e3a8a;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            position: relative;
            top: -6px;
        }
    </style>
</head>
<body>

@php
    $logoPath = public_path('logo.png');
    if (!file_exists($logoPath)) {
        $logoPath = public_path('logo.jpg');
    }
    $logoBase64 = file_exists($logoPath) ? base64_encode(file_get_contents($logoPath)) : '';

    // Student data
    $stName = strtoupper($voucher['name'] ?? ($voucher['students'][0]['name'] ?? 'STUDENT'));
    $stFather = strtoupper($voucher['father_name'] ?? 'GUARDIAN');
    $stClass = strtoupper($voucher['class_name'] ?? ($voucher['students'][0]['class_name'] ?? 'GRADE 9'));
    $stSection = strtoupper($voucher['section_name'] ?? ($voucher['students'][0]['section_name'] ?? 'ACHIEVERS'));
    $stId = $voucher['student_id'] ?? ($voucher['students'][0]['student_id'] ?? 1);
    $stRoll = $voucher['roll_number'] ?? ($voucher['students'][0]['roll_number'] ?? '');

    $regNo = !empty($stRoll) && str_contains((string)$stRoll, '-') ? $stRoll : ('24-3-539-67-' . str_pad($stId, 7, '0', STR_PAD_LEFT));
    $voucherNo = $voucher['voucher_number'] ?? ('KIPS-VCH-' . $stId);

    $digits = preg_replace('/\D/', '', $voucherNo);
    $consumerNo = '26720027503263' . (!empty($digits) ? str_pad(substr($digits, -6), 6, '0', STR_PAD_LEFT) : str_pad($stId, 6, '0', STR_PAD_LEFT));
    $challanNo = '0326' . (!empty($digits) ? str_pad(substr($digits, -8), 8, '0', STR_PAD_LEFT) : str_pad($stId, 8, '0', STR_PAD_LEFT));

    $dueDateRaw = $voucher['due_date'] ?? date('Y-m-10');
    $dueDateFormatted = date('jS F Y', strtotime($dueDateRaw));

    $targetMonthStr = $voucher['target_month'] ?? date('Y-m');
    $monthName = $voucher['month_name'] ?? date('F Y');
    $yearStr = date('Y', strtotime($targetMonthStr . '-01'));
    $monthShort = strtoupper(date('M', strtotime($targetMonthStr . '-01')));
    $sessionFeeMonth = "{$yearStr} / {$monthShort}-{$yearStr}";

    $issueDate = date('jS F Y', strtotime('-1 month', strtotime($targetMonthStr . '-26')));

    $tuitionFee = (float)($voucher['monthly_fee'] ?? ($voucher['total_current_fee'] ?? ($voucher['tuition_fee'] ?? 0)));
    $previousArrears = (float)($voucher['previous_arrears'] ?? ($voucher['total_previous_arrears'] ?? ($voucher['arrears'] ?? 0)));
    $admissionFee = (float)($voucher['admission_fee'] ?? ($voucher['admission_charges'] ?? 0));
    $securityFee = (float)($voucher['security_fee'] ?? 0);
    $limCharges = (float)($voucher['lim_charges'] ?? 0);
    $acCharges = (float)($voucher['ac_charges'] ?? 0);
    $idCardCharges = (float)($voucher['id_card_charges'] ?? ($voucher['id_card_fee'] ?? 0));
    $boardRegFee = (float)($voucher['board_reg_fee'] ?? ($voucher['board_fee'] ?? ($voucher['registration_fee'] ?? 0)));
    $adminCharges = (float)($voucher['admin_charges'] ?? ($voucher['administrative_charges'] ?? ($voucher['late_fee'] ?? 0)));
    $transportFee = (float)($voucher['transport_fee'] ?? 0);

    $feeItems = [];
    if ($admissionFee > 0) $feeItems[] = ['label' => 'Admission Fee', 'amount' => $admissionFee];
    if ($securityFee > 0) $feeItems[] = ['label' => 'Security Fee', 'amount' => $securityFee];
    if ($limCharges > 0) $feeItems[] = ['label' => 'LIM Charges', 'amount' => $limCharges];
    if ($acCharges > 0) $feeItems[] = ['label' => 'AC Charges', 'amount' => $acCharges];
    if ($idCardCharges > 0) $feeItems[] = ['label' => 'ID Card Charges', 'amount' => $idCardCharges];
    if ($tuitionFee > 0) $feeItems[] = ['label' => 'Tuition Fee', 'amount' => $tuitionFee];
    if ($boardRegFee > 0) $feeItems[] = ['label' => 'Board Reg Fee', 'amount' => $boardRegFee];
    if ($previousArrears > 0) $feeItems[] = ['label' => 'Previous Outstanding Balance', 'amount' => $previousArrears];
    if ($adminCharges > 0) $feeItems[] = ['label' => 'Administrative Charges', 'amount' => $adminCharges];
    if ($transportFee > 0) $feeItems[] = ['label' => 'Transport Fee', 'amount' => $transportFee];
    if (!empty($voucher['current_month_paid']) && (float)$voucher['current_month_paid'] > 0) {
        $feeItems[] = ['label' => 'Paid Amount', 'amount' => -(float)$voucher['current_month_paid']];
    }
    if (!empty($voucher['current_month_discount']) && (float)$voucher['current_month_discount'] > 0) {
        $feeItems[] = ['label' => 'Discount', 'amount' => -(float)$voucher['current_month_discount']];
    }

    if (!empty($voucher['fee_items']) && is_array($voucher['fee_items'])) {
        foreach ($voucher['fee_items'] as $fi) {
            if (!empty($fi['amount']) && (float)$fi['amount'] != 0) {
                $feeItems[] = ['label' => $fi['label'] ?? $fi['name'], 'amount' => (float)$fi['amount']];
            }
        }
    }

    $totalPayable = isset($voucher['total_payable']) ? (float)$voucher['total_payable'] : array_sum(array_column($feeItems, 'amount'));
    if (empty($feeItems)) {
        $feeItems[] = ['label' => 'Tuition Fee', 'amount' => $tuitionFee];
    }

    // Number to words helper (PKR)
    function numberToWordsPHP($num) {
        $num = (int)$num;
        if ($num <= 0) return 'Zero Rupees Only';
        $ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
        $tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

        $chunk = function($n) use ($ones, $tens) {
            $s = '';
            if ($n >= 100) {
                $s .= $ones[floor($n / 100)] . ' Hundred ';
                $n %= 100;
            }
            if ($n >= 20) {
                $s .= $tens[floor($n / 10)] . ($n % 10 != 0 ? ' ' . $ones[$n % 10] : '') . ' ';
            } elseif ($n > 0) {
                $s .= $ones[$n] . ' ';
            }
            return trim($s);
        };

        $crore = floor($num / 10000000);
        $rem = $num % 10000000;
        $lakh = floor($rem / 100000);
        $rem = $rem % 100000;
        $thousand = floor($rem / 1000);
        $rem = $rem % 1000;
        $hundred = $rem;

        $words = '';
        if ($crore > 0) $words .= $chunk($crore) . ' Crore ';
        if ($lakh > 0) $words .= $chunk($lakh) . ' Lakh ';
        if ($thousand > 0) $words .= $chunk($thousand) . ' Thousand ';
        if ($hundred > 0) $words .= $chunk($hundred) . ' ';

        return trim($words) . ' Rupees Only';
    }

    $amountInWords = numberToWordsPHP($totalPayable);
@endphp

<div class="page-container">
    <!-- ══════════════════════════════════════════════════════════════════════
         1. TOP 60% — STUDENT / PARENT COPY
    ══════════════════════════════════════════════════════════════════════ -->
    <div style="border: 1.5px solid #bfdbfe; border-radius: 6px; padding: 6px; background: #ffffff; margin-bottom: 4px;">
        <!-- Header -->
        <table style="border-bottom: 1.5px solid #dbeafe; padding-bottom: 4px; margin-bottom: 4px;">
            <tr>
                <td style="width: 44px; vertical-align: middle;">
                    @if(!empty($logoBase64))
                        <img src="data:image/png;base64,{{ $logoBase64 }}" style="width: 38px; height: 38px;" alt="Logo">
                    @endif
                </td>
                <td style="vertical-align: middle; padding-left: 6px;">
                    <div style="font-size: 12px; font-weight: 900; color: #1e3a8a; text-transform: uppercase;">
                        KIPS School Chunian Campus
                    </div>
                    <div style="font-size: 8px; color: #4b5563; font-weight: 600; margin-top: 1px;">
                        Kallar Road, Chunian
                    </div>
                    <div style="font-size: 8px; font-weight: 900; color: #1e3a8a; text-transform: uppercase; margin-top: 1px;">
                        Student Fee Invoice ({{ $monthName }})
                    </div>
                </td>
                <td style="text-align: right; vertical-align: middle; width: 130px;">
                    <div class="badge">Student / Parent Copy</div>
                    <div style="font-size: 7px; color: #6b7280; font-weight: bold; margin-top: 2px;">
                        Issue Date: {{ $issueDate }}
                    </div>
                </td>
            </tr>
        </table>

        <!-- Student Info -->
        <div class="card">
            <div class="card-header">Student Information</div>
            <table class="info-table">
                <tr>
                    <td class="info-label">Registration #</td>
                    <td class="info-val font-mono">{{ $regNo }}</td>
                    <td class="info-label">Voucher #</td>
                    <td class="info-val font-mono">{{ $voucherNo }}</td>
                </tr>
                <tr>
                    <td class="info-label">Student Name</td>
                    <td class="info-val">{{ $stName }}</td>
                    <td class="info-label">Father Name</td>
                    <td class="info-val">{{ $stFather }}</td>
                </tr>
                <tr>
                    <td class="info-label">Class & Section</td>
                    <td class="info-val">{{ $stClass }} ({{ $stSection }})</td>
                    <td class="info-label" style="color: #991b1b;">Payment Due Date</td>
                    <td class="info-val" style="color: #991b1b;">{{ $dueDateFormatted }}</td>
                </tr>
            </table>
        </div>

        <!-- Fee Details Table -->
        <div class="card">
            <table style="width: 100%;">
                <tr class="card-header">
                    <td style="border: none;">Fee Breakdown</td>
                    <td style="border: none; text-align: right; font-size: 7.5px; color: #1e40af;">Session: {{ $sessionFeeMonth }}</td>
                </tr>
            </table>
            <table class="fee-table">
                <thead>
                    <tr>
                        <th style="width: 8%; text-align: center;">#</th>
                        <th style="width: 62%; text-align: left;">Particulars</th>
                        <th style="width: 30%; text-align: right;">Amount (PKR)</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($feeItems as $idx => $item)
                        <tr>
                            <td class="text-center" style="color: #6b7280; font-family: monospace;">{{ $idx + 1 }}</td>
                            <td style="font-weight: 500; color: #1f2937;">{{ $item['label'] }}</td>
                            <td class="text-right" style="font-family: monospace; font-weight: bold;">{{ number_format($item['amount'], 2) }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>

        <!-- Total Payable Bar -->
        <table class="total-box">
            <tr>
                <td class="total-words">
                    <div style="font-size: 6.5px; font-weight: bold; color: #6b7280; text-transform: uppercase;">Amount in Words</div>
                    <div style="font-size: 8px; font-weight: bold; color: #111827; font-style: italic; margin-top: 1px;">
                        {{ $amountInWords }}
                    </div>
                </td>
                <td class="total-amount-box">
                    <div style="font-size: 7px; font-weight: bold; text-transform: uppercase; color: #bfdbfe;">Total Payable Amount</div>
                    <div style="font-size: 11px; font-weight: 900; font-family: monospace; margin-top: 1px;">
                        Rs. {{ number_format($totalPayable, 2) }}
                    </div>
                </td>
            </tr>
        </table>

        <!-- Notes & Signature -->
        <table style="margin-top: 4px; padding-top: 4px; border-top: 0.5px solid #e5e7eb;">
            <tr>
                <td style="font-size: 6.8px; color: #4b5563; line-height: 1.25; width: 75%;">
                    <div style="font-weight: bold; color: #111827;">Important Instructions:</div>
                    1. A late fee of Rs. 50/- per day will be applicable after the due date.<br>
                    2. Keep this Student Copy in your safe record as official proof of fee deposit.<br>
                    3. Pay via 1Bill Consumer #: <strong style="font-family: monospace; color: #1e3a8a;">{{ $consumerNo }}</strong>
                </td>
                <td style="text-align: right; vertical-align: bottom; width: 25%;">
                    <div style="font-size: 7px; color: #6b7280;">Authorized Signature</div>
                    <div style="border-bottom: 0.5px solid #9ca3af; width: 90px; margin: 3px 0 1px auto;"></div>
                    <div style="font-size: 6.5px; font-weight: bold; color: #1e3a8a;">Accounts Office</div>
                </td>
            </tr>
        </table>
    </div>

    <!-- ─── Perforation Line 1 ─── -->
    <div class="perforation">
        <span class="perforation-text">✂️ Cut Line (Accounts Copy)</span>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════════
         2. MIDDLE 20% — ACCOUNTS / OFFICE COPY (Full 210mm Width)
    ══════════════════════════════════════════════════════════════════════ -->
    <div style="border: 1px solid #bfdbfe; border-radius: 5px; padding: 4px 6px; background: #ffffff; margin-bottom: 4px;">
        <table style="border-bottom: 0.5px solid #e5e7eb; padding-bottom: 2px; margin-bottom: 2px;">
            <tr>
                <td style="vertical-align: middle;">
                    <strong style="font-size: 8.5px; color: #1e3a8a; text-transform: uppercase;">KIPS School Chunian</strong>
                    <span style="font-size: 7px; color: #6b7280; margin-left: 6px;">• Fee Month: {{ $monthName }}</span>
                </td>
                <td style="text-align: right; vertical-align: middle;">
                    <span class="badge" style="font-size: 6.5px; padding: 1px 6px;">Accounts Copy</span>
                </td>
            </tr>
        </table>
        <table style="width: 100%; font-size: 7.5px;">
            <tr>
                <td style="width: 25%;">
                    <div style="color: #6b7280; font-size: 6.5px;">Student / Reg #</div>
                    <strong style="color: #111827;">{{ $stName }}</strong><br>
                    <span style="font-family: monospace; color: #4b5563;">{{ $regNo }}</span>
                </td>
                <td style="width: 25%;">
                    <div style="color: #6b7280; font-size: 6.5px;">Father / Class</div>
                    <strong>{{ $stFather }}</strong><br>
                    <span>{{ $stClass }} ({{ $stSection }})</span>
                </td>
                <td style="width: 25%;">
                    <div style="color: #6b7280; font-size: 6.5px;">Voucher # / Due Date</div>
                    <span style="font-family: monospace; font-weight: bold;">{{ $voucherNo }}</span><br>
                    <span style="color: #991b1b; font-weight: bold;">Due: {{ $dueDateFormatted }}</span>
                </td>
                <td style="width: 25%; text-align: right; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 4px; padding: 2px 4px;">
                    <div style="font-size: 6px; color: #4b5563; font-weight: bold; text-transform: uppercase;">Payable Amount</div>
                    <div style="font-size: 9px; font-weight: 900; font-family: monospace; color: #1e3a8a;">
                        Rs. {{ number_format($totalPayable, 2) }}
                    </div>
                </td>
            </tr>
        </table>
        <table style="border-top: 0.5px solid #f3f4f6; margin-top: 2px; padding-top: 2px; font-size: 6.5px; color: #6b7280;">
            <tr>
                <td>Received by Accounts: _____________________</td>
                <td style="text-align: center;">Date: ____ / ____ / 2026</td>
                <td style="text-align: right; font-weight: bold;">[ Accounts Stamp Box ]</td>
            </tr>
        </table>
    </div>

    <!-- ─── Perforation Line 2 ─── -->
    <div class="perforation">
        <span class="perforation-text">✂️ Cut Line (Bank Copy)</span>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════════
         3. BOTTOM 20% — BANK / CASHIER COPY (Full 210mm Width)
    ══════════════════════════════════════════════════════════════════════ -->
    <div style="border: 1px solid #bfdbfe; border-radius: 5px; padding: 4px 6px; background: #ffffff;">
        <table style="border-bottom: 0.5px solid #e5e7eb; padding-bottom: 2px; margin-bottom: 2px;">
            <tr>
                <td style="vertical-align: middle;">
                    <strong style="font-size: 8.5px; color: #1e3a8a; text-transform: uppercase;">KIPS School Chunian</strong>
                    <span style="font-size: 7px; color: #6b7280; margin-left: 6px;">• 1Bill / Bank Collection</span>
                </td>
                <td style="text-align: right; vertical-align: middle;">
                    <span class="badge" style="font-size: 6.5px; padding: 1px 6px;">Bank Copy</span>
                </td>
            </tr>
        </table>
        <table style="width: 100%; font-size: 7.5px;">
            <tr>
                <td style="width: 28%;">
                    <div style="color: #6b7280; font-size: 6.5px;">1Bill Consumer #</div>
                    <strong style="font-family: monospace; font-size: 8px; color: #111827;">{{ $consumerNo }}</strong><br>
                    <span style="color: #6b7280; font-size: 6px;">Campus Code: 539</span>
                </td>
                <td style="width: 24%;">
                    <div style="color: #6b7280; font-size: 6.5px;">Student / Class</div>
                    <strong>{{ $stName }}</strong><br>
                    <span>{{ $stClass }} ({{ $stSection }})</span>
                </td>
                <td style="width: 24%;">
                    <div style="color: #6b7280; font-size: 6.5px;">Challan # / Due Date</div>
                    <span style="font-family: monospace; font-weight: bold;">{{ $challanNo }}</span><br>
                    <span style="color: #991b1b; font-weight: bold;">Due: {{ $dueDateFormatted }}</span>
                </td>
                <td style="width: 24%; text-align: right; background: #1e3a8a; color: #ffffff; border-radius: 4px; padding: 2px 4px;">
                    <div style="font-size: 6px; color: #bfdbfe; font-weight: bold; text-transform: uppercase;">Payable Amount</div>
                    <div style="font-size: 9.5px; font-weight: 900; font-family: monospace;">
                        Rs. {{ number_format($totalPayable, 2) }}
                    </div>
                </td>
            </tr>
        </table>
        <table style="border-top: 0.5px solid #f3f4f6; margin-top: 2px; padding-top: 2px; font-size: 6.5px; color: #6b7280;">
            <tr>
                <td>Bank Branch: _____________________</td>
                <td style="text-align: center;">Scroll # / Trx ID: _______________</td>
                <td style="text-align: right; font-weight: bold;">[ Bank Stamp Box ]</td>
            </tr>
        </table>
    </div>
</div>

</body>
</html>
