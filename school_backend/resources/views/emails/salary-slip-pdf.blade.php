<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Salary Slip – {{ $slip->teacher->name ?? '' }} – {{ $slip->month }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: Arial, Helvetica, sans-serif;
            color: #131b2e;
            background: #ffffff;
            font-size: 13px;
            padding: 30px 36px;
        }

        /* ── Header ─────────────────────────────────────────────────────── */
        .header-wrap {
            width: 100%;
            padding-bottom: 14px;
            margin-bottom: 18px;
        }
        .header-inner {
            width: 100%;
        }
        .header-logo {
            width: 72px;
            vertical-align: middle;
        }
        .header-logo img {
            width: 68px;
            height: 68px;
            border-radius: 34px;
            display: block;
        }
        .header-name-cell {
            vertical-align: middle;
            padding-left: 14px;
        }
        .academy-name {
            color: #1e3a8a;
            font-size: 18px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: -0.3px;
            display: block;
        }
        .academy-sub {
            color: #434655;
            font-size: 9px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            display: block;
            margin-top: 3px;
        }

        /* ── Teacher / Period info ───────────────────────────────────────── */
        .info-wrap {
            width: 100%;
            margin-bottom: 20px;
        }
        .info-label {
            display: block;
            color: #434655;
            font-size: 9px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1.2px;
            margin-bottom: 3px;
        }
        .info-value {
            display: block;
            font-size: 16px;
            font-weight: 700;
            color: #131b2e;
        }

        /* ── Subject / Earnings tables ───────────────────────────────────── */
        .subject-wrap {
            width: 100%;
            margin-bottom: 14px;
        }
        .subject-header {
            background-color: #1e3a8a;
            color: #ffffff;
            padding: 7px 12px;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .data-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #e2e8f0;
        }
        .data-table th {
            background-color: #eaedff;
            color: #434655;
            font-size: 9px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
            padding: 5px 10px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
        }
        .data-table td {
            padding: 6px 10px;
            font-size: 11px;
            border-bottom: 1px solid #f0f0f0;
            color: #131b2e;
        }
        .data-table tfoot td {
            background-color: #f2f3ff;
            border-top: 1px solid #1e3a8a;
            border-bottom: none;
            font-weight: bold;
            font-size: 11px;
        }
        .text-right { text-align: right; }
        .text-center { text-align: center; }

        /* ── Calculation summary ─────────────────────────────────────────── */
        .calc-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            color: #434655;
            margin-bottom: 10px;
        }
        .calc-table td {
            padding: 3px 0;
        }
        .calc-divider td {
            border-top: 1px solid #e2e8f0;
            padding-top: 7px;
        }

        /* ── Payment installments ────────────────────────────────────────── */
        .section-label {
            font-size: 9px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: #434655;
            margin-bottom: 6px;
            margin-top: 16px;
        }

        /* ── Balance card ────────────────────────────────────────────────── */
        .balance-card {
            width: 100%;
            border-collapse: collapse;
            margin-top: 14px;
            margin-bottom: 22px;
        }
        .balance-card td {
            padding: 13px 18px;
            vertical-align: middle;
        }

        /* ── Signatures ──────────────────────────────────────────────────── */
        .sig-table {
            width: 100%;
            margin-top: 36px;
        }
        .sig-table td {
            text-align: center;
            width: 50%;
            padding: 0 24px;
        }
        .sig-line {
            border-top: 1px solid #434655;
            margin-bottom: 4px;
        }
        .sig-text {
            font-size: 9px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #434655;
        }

        /* ── Doc footer ──────────────────────────────────────────────────── */
        .doc-footer {
            margin-top: 30px;
            padding-top: 14px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #1e3a8a;
        }
    </style>
</head>
<body>

    @php
        $logoPath = public_path('logo.jpg');
        $logoData = file_exists($logoPath) ? base64_encode(file_get_contents($logoPath)) : '';
        $logoSrc  = $logoData ? 'data:image/jpeg;base64,' . $logoData : '';
    @endphp

    {{-- ══════════════════════════════════════════════════════════════════ --}}
    {{-- HEADER                                                             --}}
    {{-- ══════════════════════════════════════════════════════════════════ --}}
    <div class="header-wrap">
        <table class="header-inner" cellpadding="0" cellspacing="0">
            <tr>
                <td class="header-logo">
                    @if($logoSrc)
                        <img src="{{ $logoSrc }}" alt="Logo">
                    @endif
                </td>
                <td class="header-name-cell">
                    <span class="academy-name">Kips School Chunian Campus</span>
                    <span class="academy-sub">Topper's First Choice</span>
                </td>
            </tr>
        </table>
    </div>

    {{-- ══════════════════════════════════════════════════════════════════ --}}
    {{-- TEACHER / PAY PERIOD                                               --}}
    {{-- ══════════════════════════════════════════════════════════════════ --}}
    <table class="info-wrap" cellpadding="0" cellspacing="0">
        <tr>
            <td style="width:50%;">
                <span class="info-label">Teacher Name</span>
                <span class="info-value">{{ $slip->teacher->name }}</span>
            </td>
            <td style="width:50%; text-align:right;">
                <span class="info-label">Pay Period</span>
                <span class="info-value">{{ $slip->month }}</span>
            </td>
        </tr>
    </table>

    {{-- ══════════════════════════════════════════════════════════════════ --}}
    {{-- EARNINGS TABLES                                                    --}}
    {{-- ══════════════════════════════════════════════════════════════════ --}}
    @php
        $percentageItems = $slip->items->filter(fn($i) => $i->payment_type === 'percentage');
        $pctBySubject = [];
        foreach ($percentageItems as $item) {
            $classInfo = trim(
                ($item->academyClass->name ?? '') . ' ' .
                ($item->major->name ?? '') . ' ' .
                ($item->section->name ?? '')
            );
            $key = ($item->subject->name ?? 'Unknown') . ($classInfo ? " ($classInfo)" : '');
            $pctBySubject[$key][] = $item;
        }
        $fixedItems = $slip->items->filter(fn($i) => $i->payment_type === 'fixed');
    @endphp

    {{-- Percentage-based subjects --}}
    @foreach($pctBySubject as $subjectName => $items)
        @php $totalCut = array_reduce($items, fn($sum, $i) => $sum + $i->teacher_cut, 0); @endphp
        <div class="subject-wrap">
            <div class="subject-header">{{ $subjectName }}</div>
            <table class="data-table">
                <thead>
                    <tr>
                        <th style="width:40%;">Student</th>
                        <th class="text-right" style="width:22%;">Fee</th>
                        <th class="text-center" style="width:12%;">%</th>
                        <th class="text-right" style="width:26%;">Cut</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($items as $item)
                    <tr>
                        <td style="width:40%;">
                            {{ $item->student->name ?? 'N/A' }}
                            @php
                                $studentClassInfo = trim(
                                    ($item->student->academyClass->name ?? '') . ' ' .
                                    ($item->student->section->name ?? '')
                                );
                            @endphp
                            @if($studentClassInfo)
                                <span style="font-size:9px; color:#434655; margin-left:4px;">({{ $studentClassInfo }})</span>
                            @endif
                        </td>
                        <td class="text-right" style="width:22%;">Rs {{ number_format($item->student_fee_paid) }}</td>
                        <td class="text-center" style="width:12%;">{{ (float)$item->percentage }}%</td>
                        <td class="text-right" style="width:26%; font-weight:600;">Rs {{ number_format($item->teacher_cut, 2) }}</td>
                    </tr>
                    @endforeach
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="3" class="text-right" style="color:#434655; font-size:10px; text-transform:uppercase;">Total</td>
                        <td class="text-right" style="color:#1e3a8a;">Rs {{ number_format($totalCut, 2) }}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    @endforeach

    {{-- Fixed allowances --}}
    @if($fixedItems->count() > 0)
        @php $totalFixed = $fixedItems->sum('teacher_cut'); @endphp
        <div class="subject-wrap">
            <div class="subject-header">Fixed Allowances</div>
            <table class="data-table">
                <thead>
                    <tr>
                        <th style="width:70%;">Detail</th>
                        <th class="text-right" style="width:30%;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($fixedItems as $item)
                    @php
                        $classInfo = trim(
                            ($item->academyClass->name ?? '') . ' ' .
                            ($item->major->name ?? '') . ' ' .
                            ($item->section->name ?? '')
                        );
                        $title = ($item->subject->name ?? 'Fixed Payment') . ($classInfo ? " ($classInfo)" : '');
                    @endphp
                    <tr>
                        <td style="width:70%;">{{ $title }}</td>
                        <td class="text-right" style="width:30%; font-weight:600;">Rs {{ number_format($item->teacher_cut, 2) }}</td>
                    </tr>
                    @endforeach
                </tbody>
                <tfoot>
                    <tr>
                        <td class="text-right" style="color:#434655; font-size:10px; text-transform:uppercase;">Total</td>
                        <td class="text-right" style="color:#1e3a8a;">Rs {{ number_format($totalFixed, 2) }}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    @endif

    {{-- ══════════════════════════════════════════════════════════════════ --}}
    {{-- CALCULATION SUMMARY                                                --}}
    {{-- ══════════════════════════════════════════════════════════════════ --}}
    @php
        $netPayable      = (float) ($slip->payable_salary ?: $slip->total_amount);
        $totalPaid       = (float) ($slip->total_paid ?? 0);
        $balanceOwed     = $netPayable - $totalPaid;
        $previousArrears = (float) ($slip->previous_arrears ?? 0);
        $advanceDeducted = (float) ($slip->advance_deducted ?? 0);
        $bonus           = (float) ($slip->bonus ?? 0);
        $extraOffDays    = max(0, $slip->taken_off_days - $slip->permitted_off_days);
        $offDeduction    = $extraOffDays > 0 ? ($extraOffDays * ((float) $slip->total_amount / 30)) : 0;
    @endphp

    <div style="border-top: 2px dashed #e2e8f0; margin-top: 18px; padding-top: 14px;">
        <table class="calc-table" cellpadding="0" cellspacing="0">
            <tr>
                <td>Base Earned Total:</td>
                <td class="text-right" style="font-weight:600;">Rs {{ number_format((float)$slip->total_amount, 2) }}</td>
            </tr>
            @if($offDeduction > 0)
            <tr style="color:#dc2626;">
                <td>Unpaid Offs Deduction ({{ $extraOffDays }} extra days):</td>
                <td class="text-right" style="font-weight:600;">&minus; Rs {{ number_format($offDeduction, 2) }}</td>
            </tr>
            @endif
            @if($bonus > 0)
            <tr style="color:#16a34a;">
                <td>Bonus:</td>
                <td class="text-right" style="font-weight:600;">+ Rs {{ number_format($bonus, 2) }}</td>
            </tr>
            @endif
            @if($previousArrears > 0)
            <tr style="color:#7c3aed;">
                <td>Previous Arrears Included:</td>
                <td class="text-right" style="font-weight:600;">+ Rs {{ number_format($previousArrears, 2) }}</td>
            </tr>
            @endif
            @if($advanceDeducted > 0)
            <tr style="color:#2563eb;">
                <td>Previous Advance Recovered:</td>
                <td class="text-right" style="font-weight:600;">&minus; Rs {{ number_format($advanceDeducted, 2) }}</td>
            </tr>
            @endif
            {{-- Net Payable — small, not the hero --}}
            <tr class="calc-divider">
                <td style="font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#434655;">Net Payable:</td>
                <td class="text-right" style="font-size:14px; font-weight:700; color:#1e3a8a;">Rs {{ number_format($netPayable, 2) }}</td>
            </tr>
        </table>
    </div>

    {{-- ══════════════════════════════════════════════════════════════════ --}}
    {{-- PAYMENT INSTALLMENTS                                               --}}
    {{-- ══════════════════════════════════════════════════════════════════ --}}
    @if($slip->payments && $slip->payments->count() > 0)
    <div class="section-label">Payment Installments</div>
    <table class="data-table" style="font-size:11px; margin-bottom:0;">
        <thead>
            <tr>
                <th style="width:6%;">#</th>
                <th style="width:26%;">Date</th>
                <th style="width:20%;">Method</th>
                <th style="width:32%;">Note</th>
                <th class="text-right" style="width:16%;">Amount</th>
            </tr>
        </thead>
        <tbody>
            @foreach($slip->payments as $i => $pay)
            <tr>
                <td>{{ $i + 1 }}</td>
                <td>{{ \Carbon\Carbon::parse($pay->payment_date)->format('d M Y') }}</td>
                <td>{{ $pay->payment_method }}</td>
                <td style="color:#888; font-style:italic;">{{ $pay->notes ?: '—' }}</td>
                <td class="text-right" style="font-weight:700; color:#15803d;">Rs {{ number_format((float)$pay->amount_paid, 0) }}</td>
            </tr>
            @endforeach
        </tbody>
        <tfoot>
            <tr>
                <td colspan="4" class="text-right" style="font-size:10px; text-transform:uppercase; color:#434655;">Total Paid</td>
                <td class="text-right" style="color:#15803d; font-weight:900;">Rs {{ number_format($totalPaid, 0) }}</td>
            </tr>
        </tfoot>
    </table>
    @endif

    {{-- ══════════════════════════════════════════════════════════════════ --}}
    {{-- BALANCE CARD — THE HERO                                            --}}
    {{-- ══════════════════════════════════════════════════════════════════ --}}
    @php
        $isDebt     = $balanceOwed > 0.005;
        $isAdvance  = $balanceOwed < -0.005;
        $cardBg     = $isDebt ? '#fff7ed' : ($isAdvance ? '#f0fdf4' : '#f8fafc');
        $cardBorder = $isDebt ? '#fed7aa' : ($isAdvance ? '#bbf7d0' : '#e2e8f0');
        $cardColor  = $isDebt ? '#c2410c' : ($isAdvance ? '#15803d' : '#64748b');
        $cardLabel  = $isDebt ? 'Balance Owed' : ($isAdvance ? 'Advance (Overpaid)' : 'Status');
    @endphp

    <table class="balance-card" cellpadding="0" cellspacing="0"
           style="border: 2px solid {{ $cardBorder }}; background: {{ $cardBg }}; border-radius: 8px;">
        <tr>
            <td style="padding:13px 18px; vertical-align:middle;">
                <span style="font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px; color:{{ $cardColor }};">
                    {{ $cardLabel }}
                </span>
                @if(!$isDebt && !$isAdvance)
                    <br><span style="font-size:12px; font-weight:600; color:#9ca3af;">Fully Paid &amp; Cleared</span>
                @endif
            </td>
            @if($isDebt || $isAdvance)
            <td class="text-right" style="padding:13px 18px; vertical-align:middle;">
                <span style="font-size:20px; font-weight:900; color:{{ $cardColor }};">
                    Rs {{ number_format(abs($balanceOwed), 0) }}
                </span>
            </td>
            @endif
        </tr>
    </table>

    {{-- ══════════════════════════════════════════════════════════════════ --}}
    {{-- SIGNATURES                                                         --}}
    {{-- ══════════════════════════════════════════════════════════════════ --}}
    <table class="sig-table" cellpadding="0" cellspacing="0">
        <tr>
            <td style="width:50%; text-align:center; padding:0 24px;">
                <div class="sig-line"></div>
                <div class="sig-text">Teacher Signature</div>
            </td>
            <td style="width:50%; text-align:center; padding:0 24px;">
                <div class="sig-line"></div>
                <div class="sig-text">Admin Signature</div>
            </td>
        </tr>
    </table>

    <div class="doc-footer">Kips School Chunian Campus</div>

</body>
</html>
