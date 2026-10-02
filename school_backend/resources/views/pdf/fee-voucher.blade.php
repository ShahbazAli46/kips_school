<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Fee Challan - {{ $voucher['voucher_number'] ?? 'KIPS-VCH' }}</title>
    <style>
        @page {
            margin: 4mm 5mm;
            size: a4 landscape;
        }
        * {
            box-sizing: border-box;
            font-family: 'DejaVu Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif;
        }
        body {
            color: #111827;
            margin: 0;
            padding: 0;
            font-size: 8.5px;
            line-height: 1.25;
            background: #ffffff;
        }

        /* 2-Column Master Layout Table */
        .master-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }
        .slip-col {
            width: 48.5%;
            vertical-align: top;
            padding: 0 4px;
        }
        .divider-col {
            width: 3%;
            vertical-align: top;
            border-left: 1.5px dashed #4b5563;
            padding: 0;
        }

        .slip-card {
            border: 2px solid #111827;
            border-radius: 4px;
            padding: 6px;
            background: #ffffff;
        }

        /* Top Security Accent */
        .top-accent {
            background-color: #0f224a;
            height: 3px;
            margin: -6px -6px 5px -6px;
            border-top-left-radius: 2px;
            border-top-right-radius: 2px;
        }

        /* Header */
        .header-table {
            width: 100%;
            border-collapse: collapse;
            border-bottom: 2px solid #111827;
            padding-bottom: 4px;
            margin-bottom: 5px;
        }

        /* Copy Badge */
        .copy-pill {
            background-color: #0f224a;
            color: #ffffff;
            font-size: 9px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            padding: 4px 14px;
            border-radius: 2px;
            display: inline-block;
        }

        /* Meta Cards 2-Col Table */
        .cards-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 5px;
        }
        .card-box {
            border: 1px solid #111827;
            border-radius: 3px;
            padding: 4px;
            background: #ffffff;
            vertical-align: top;
        }
        .card-header {
            font-size: 7.5px;
            font-weight: 900;
            color: #111827;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 2px;
            margin-bottom: 3px;
        }

        /* Meta Table inside cards */
        .meta-inner {
            width: 100%;
            border-collapse: collapse;
        }
        .meta-inner td {
            padding: 2px 1px;
            font-size: 8px;
            vertical-align: middle;
        }
        .meta-lbl {
            color: #4b5563;
            font-weight: bold;
            font-size: 7.5px;
            width: 44%;
        }
        .meta-val {
            color: #111827;
            font-weight: 800;
            text-align: right;
        }
        .font-mono {
            font-family: 'Courier', monospace;
        }

        /* Fee Breakdown Table */
        .fee-tbl-box {
            border: 1.5px solid #111827;
            border-radius: 3px;
            margin-bottom: 5px;
            overflow: hidden;
        }
        .fee-tbl-header {
            background-color: #f3f4f6;
            padding: 2.5px 4px;
            font-size: 7.5px;
            font-weight: 900;
            border-bottom: 1px solid #111827;
            color: #111827;
        }
        .fee-tbl {
            width: 100%;
            border-collapse: collapse;
        }
        .fee-tbl th {
            background-color: #f9fafb;
            color: #374151;
            font-size: 8px;
            font-weight: bold;
            padding: 3px 5px;
            border-bottom: 1px solid #d1d5db;
        }
        .fee-tbl td {
            padding: 3.5px 5px;
            font-size: 8.5px;
            border-bottom: 0.5px solid #f3f4f6;
        }
        .fee-tbl tr:nth-child(even) td {
            background-color: #fafafa;
        }
        .fee-total-row td {
            border-top: 1.5px solid #111827;
            background-color: #f3f4f6 !important;
            font-weight: 900;
            font-size: 9.5px;
            padding: 4px 5px;
            color: #111827;
        }

        /* Amount in Words & Total Card */
        .total-card {
            border: 1.5px solid #111827;
            border-radius: 3px;
            margin-bottom: 5px;
            width: 100%;
            border-collapse: collapse;
        }
        .words-cell {
            background: #f9fafb;
            padding: 4px 6px;
            border-right: 1.5px solid #111827;
            width: 60%;
            vertical-align: middle;
        }
        .total-cell {
            background: #0f224a;
            color: #ffffff;
            padding: 4px 6px;
            text-align: right;
            width: 40%;
            vertical-align: middle;
        }

        /* Payment Guidelines Box */
        .guide-box {
            border: 1px solid #111827;
            border-radius: 3px;
            padding: 4px;
            margin-bottom: 4px;
            background: #ffffff;
        }
        .guide-text {
            font-size: 7px;
            color: #1f2937;
            line-height: 1.35;
        }
        .guide-text p {
            margin: 0 0 2px 0;
            padding: 0;
        }
        .guide-text ul, .guide-text ol {
            margin: 0 0 2px 0;
            padding-left: 10px;
        }
        .guide-text li {
            margin-bottom: 1px;
        }

        /* Barcode simulation */
        .barcode-box {
            text-align: center;
            border-left: 1px solid #d1d5db;
            padding-left: 4px;
            vertical-align: middle;
        }

        /* Footer */
        .footer-tbl {
            width: 100%;
            border-collapse: collapse;
            font-size: 7px;
            color: #4b5563;
            margin-top: 2px;
        }
        .stamp-box {
            border: 0.5px dashed #4b5563;
            border-radius: 2px;
            padding: 2px 6px;
            text-align: center;
            font-size: 7px;
            font-weight: bold;
            background: #f9fafb;
            color: #4b5563;
            display: inline-block;
        }
        .security-bar {
            background: #111827;
            color: #ffffff;
            font-size: 6.5px;
            font-weight: bold;
            text-align: center;
            padding: 1.5px 0;
            border-radius: 1.5px;
            margin-top: 3px;
            letter-spacing: 0.5px;
            text-transform: uppercase;
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
    $dueDateFormatted = date('jS M Y', strtotime($dueDateRaw));

    $targetMonthStr = $voucher['target_month'] ?? date('Y-m');
    $monthName = $voucher['month_name'] ?? date('F Y');
    $yearStr = date('Y', strtotime($targetMonthStr . '-01'));
    $monthShort = strtoupper(date('M', strtotime($targetMonthStr . '-01')));
    $sessionFeeMonth = "{$monthShort}-{$yearStr}";

    $issueDate = date('jS M Y', strtotime('-1 month', strtotime($targetMonthStr . '-26')));

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
    if (!empty($voucher['fee_items']) && is_array($voucher['fee_items'])) {
        foreach ($voucher['fee_items'] as $fi) {
            if (!empty($fi['amount']) && (float)$fi['amount'] != 0) {
                $feeItems[] = ['label' => $fi['label'] ?? $fi['name'], 'amount' => (float)$fi['amount']];
            }
        }
    } else {
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
    }

    $totalPayable = isset($voucher['total_payable']) ? (float)$voucher['total_payable'] : array_sum(array_column($feeItems, 'amount'));
    if (empty($feeItems)) {
        $feeItems[] = ['label' => 'Tuition Fee', 'amount' => $tuitionFee];
    }

    // Number to words helper
    function numberToWordsPHP2($num) {
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

    $amountInWords = numberToWordsPHP2($totalPayable);
    $copies = ["ACCOUNTS COPY", "STUDENT COPY"];
@endphp

<table class="master-table">
    <tr>
        @foreach($copies as $cIdx => $copyTitle)
            <td class="slip-col">
                <div class="slip-card">
                    <!-- Top Accent -->
                    <div class="top-accent"></div>

                    <!-- Header -->
                    <table class="header-table">
                        <tr>
                            <td style="width: 52px; vertical-align: middle;">
                                @if(!empty($logoBase64))
                                    <img src="data:image/png;base64,{{ $logoBase64 }}" style="width: 48px; height: 48px;" alt="Logo">
                                @endif
                            </td>
                            <td style="vertical-align: middle; padding-left: 6px;">
                                <div style="font-size: 13px; font-weight: 900; color: #0f224a; text-transform: uppercase;">
                                    KIPS SCHOOL
                                </div>
                                <div style="font-size: 8px; color: #374151; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 1px;">
                                    Chunian Campus
                                </div>
                                <div style="font-size: 7px; color: #4b5563; font-family: monospace; margin-top: 2px;">
                                    Issue Date: {{ $issueDate }}
                                </div>
                            </td>
                            <td style="text-align: right; vertical-align: middle; width: 110px;">
                                <span class="copy-pill">{{ $copyTitle }}</span>
                            </td>
                        </tr>
                    </table>

                    <!-- Student Identity Profile Card (Full Width) -->
                    <div class="card-box" style="margin-bottom: 5px; padding: 5px 6px;">
                        <div class="card-header">
                            <table style="width: 100%;">
                                <tr>
                                    <td style="font-size: 7.5px; font-weight: 900;">👤 STUDENT PROFILE</td>
                                    <td style="text-align: right; font-size: 7.5px; color: #4b5563;" class="font-mono">ID: {{ $stId }}</td>
                                </tr>
                            </table>
                        </div>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="width: 48%; vertical-align: top; padding-right: 6px;">
                                    <table class="meta-inner">
                                        <tr>
                                            <td class="meta-lbl">🪪 Reg / Roll #</td>
                                            <td class="meta-val font-mono" style="font-size: 8px;">{{ $regNo }}</td>
                                        </tr>
                                        <tr>
                                            <td class="meta-lbl">🎓 Student Name</td>
                                            <td class="meta-val" style="font-size: 8.5px;">{{ $stName }}</td>
                                        </tr>
                                    </table>
                                </td>
                                <td style="width: 4%; border-left: 1px solid #e5e7eb;"></td>
                                <td style="width: 48%; vertical-align: top; padding-left: 6px;">
                                    <table class="meta-inner">
                                        <tr>
                                            <td class="meta-lbl">👨‍👦 Father Name</td>
                                            <td class="meta-val" style="font-size: 8px;">{{ $stFather }}</td>
                                        </tr>
                                        <tr>
                                            <td class="meta-lbl">🏫 Class & Section</td>
                                            <td class="meta-val" style="font-size: 8px;">{{ $stClass }} ({{ $stSection }})</td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </div>

                    <!-- Fee Breakdown Table -->
                    <div class="fee-tbl-box">
                        <div class="fee-tbl-header">
                            <table style="width: 100%;">
                                <tr>
                                    <td style="font-size: 7px; font-weight: 900;">📋 FEE HEADS & BREAKDOWN</td>
                                    <td style="text-align: right; font-size: 6.5px; color: #4b5563;">CURRENCY: PAK RUPEES (PKR)</td>
                                </tr>
                            </table>
                        </div>
                        <table class="fee-tbl">
                            <thead>
                                <tr>
                                    <th style="width: 8%; text-align: center;">#</th>
                                    <th style="width: 62%; text-align: left;">Fee Particulars</th>
                                    <th style="width: 30%; text-align: right;">Amount (PKR)</th>
                                </tr>
                            </thead>
                            <tbody>
                                @foreach($feeItems as $iIdx => $item)
                                    <tr>
                                        <td style="text-align: center; color: #6b7280; font-family: monospace; font-size: 7.5px;">{{ $iIdx + 1 }}</td>
                                        <td style="color: #111827; font-weight: 600;">{{ $item['label'] }}</td>
                                        <td style="text-align: right; font-family: monospace; font-weight: bold;">{{ number_format($item['amount'], 2) }}</td>
                                    </tr>
                                @endforeach
                                <tr class="fee-total-row">
                                    <td colspan="2" style="text-align: right; text-transform: uppercase;">Total Payable Within Due Date</td>
                                    <td style="text-align: right; font-family: monospace; font-size: 10.5px;">Rs. {{ number_format($totalPayable, 2) }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- Amount in Words & Net Payable Bar -->
                    <table class="total-card">
                        <tr>
                            <td class="words-cell">
                                <div style="font-size: 6px; font-weight: 900; color: #4b5563; text-transform: uppercase;">✍️ Amount in Words</div>
                                <div style="font-size: 7.5px; font-weight: bold; color: #111827; font-style: italic; margin-top: 1px;">
                                    {{ $amountInWords }}
                                </div>
                            </td>
                            <td class="total-cell">
                                <div style="font-size: 6px; font-weight: bold; text-transform: uppercase; color: #dbeafe;">NET PAYABLE AMOUNT</div>
                                <div style="font-size: 11px; font-weight: 900; font-family: monospace; margin-top: 1px;">
                                    Rs. {{ number_format($totalPayable, 2) }}
                                </div>
                            </td>
                        </tr>
                    </table>

                    <!-- Payment Guidelines & Barcode -->
                    <div class="guide-box">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td class="guide-text" style="width: 72%; vertical-align: top;">
                                    @php
                                        $customFooter = $voucher['footer_instructions'] ?? null;
                                        if ($customFooter) {
                                            $customFooter = str_replace('{consumer_no}', $consumerNo, $customFooter);
                                            $customFooter = str_replace('{challan_no}', $challanNo, $customFooter);
                                        }
                                    @endphp
                                    @if(!empty($customFooter))
                                        {!! $customFooter !!}
                                    @else
                                        <strong>PAYMENT INSTRUCTIONS:</strong><br>
                                        &bull; <strong>1BILL ONLINE:</strong> Pay via 1Bill Consumer #: <strong class="font-mono">{{ $consumerNo }}</strong> (EasyPaisa, JazzCash, Nayapay, SadaPay, Banking Apps).<br>
                                        &bull; <strong>BANK COUNTER:</strong> Payable at any UBL Branch nationwide (A/C: Quality Brands (Pvt) Ltd).<br>
                                        &bull; <strong>LATE SURCHARGE:</strong> Rs. 50/day applicable after due date.<br>
                                        &bull; <strong>HELPLINE:</strong> 0300 39 39 581 | info@kips.edu.pk
                                    @endif
                                </td>
                                <td class="barcode-box" style="width: 28%;">
                                    <div style="font-size: 5.5px; font-family: monospace; font-weight: bold; color: #111827; letter-spacing: 1px; border: 1px solid #111827; padding: 3px 2px; background: #ffffff;">
                                        ||||| | |||| || ||| |||| |
                                        <div style="font-size: 6px; margin-top: 1px;">*{{ $challanNo }}*</div>
                                    </div>
                                    <div style="font-size: 5px; color: #6b7280; font-weight: bold; margin-top: 2px;">SCAN TO VERIFY</div>
                                </td>
                            </tr>
                        </table>
                    </div>

                    <!-- Signatures & Microprint Baseline -->
                    <table class="footer-tbl">
                        <tr>
                            <td>Prepared By: <strong>Accounts System Portal</strong></td>
                            <td style="text-align: right;">
                                <span class="stamp-box">Authorized Stamp & Sign</span>
                            </td>
                        </tr>
                    </table>

                    <div class="security-bar">
                        &bull; KIPS SCHOOL OFFICIAL FINANCIAL INSTRUMENT &bull; COMPUTER GENERATED &bull; VALID WITHOUT MANUAL ALTERATIONS &bull;
                    </div>
                </div>
            </td>
            @if($cIdx < 1)
                <td class="divider-col"></td>
            @endif
        @endforeach
    </tr>
</table>

</body>
</html>

