<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Salary Slip – {{ $slip->teacher->name ?? '' }} – {{ $slip->month }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: Arial, Helvetica, sans-serif;
            color: #19243a;
            background: #ffffff;
            font-size: 12px;
            padding: 24px 30px;
        }

        /* ── Top / Bottom Accent Stripes ────────────────────────────────── */
        .top-band {
            width: 100%;
            height: 6px;
            background-color: #263c83;
            margin-bottom: 2px;
        }
        .top-accent {
            width: 100%;
            height: 3px;
            background-color: #e8b84b;
            margin-bottom: 20px;
        }
        .bottom-accent {
            width: 100%;
            height: 3px;
            background-color: #e8b84b;
            margin-top: 25px;
            margin-bottom: 2px;
        }
        .bottom-band {
            width: 100%;
            height: 6px;
            background-color: #263c83;
        }

        /* ── Header ─────────────────────────────────────────────────────── */
        .header-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
        }
        .header-logo-cell {
            width: 76px;
            vertical-align: middle;
        }
        .header-logo-box {
            width: 70px;
            height: 70px;
            border: 1px solid #ccd3e0;
            border-radius: 12px;
            text-align: center;
            vertical-align: middle;
            padding: 4px;
        }
        .header-logo-box img {
            max-width: 62px;
            max-height: 62px;
            display: inline-block;
        }
        .header-divider-cell {
            width: 18px;
            vertical-align: middle;
            text-align: center;
        }
        .header-divider-line {
            width: 2px;
            height: 52px;
            background-color: #ccd3e0;
            margin: 0 auto;
        }
        .header-name-cell {
            vertical-align: middle;
            padding-left: 6px;
        }
        .academy-name {
            color: #263c83;
            font-size: 20px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: block;
            margin-bottom: 4px;
        }
        .academy-motto-badge {
            background-color: #263c83;
            color: #e8b84b;
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            display: inline-block;
            padding: 3px 10px;
            border-radius: 10px;
        }

        /* ── Double Rule ─────────────────────────────────────────────────── */
        .rule-thick {
            width: 100%;
            height: 3px;
            background-color: #263c83;
            margin-bottom: 2px;
        }
        .rule-thin {
            width: 100%;
            height: 1.5px;
            background-color: #e8b84b;
            margin-bottom: 16px;
        }

        /* ── Title Section ───────────────────────────────────────────────── */
        .title-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
        }
        .doc-title {
            color: #19243a;
            font-size: 24px;
            font-weight: 900;
            display: block;
            line-height: 1.1;
        }
        .doc-badge {
            background-color: #263c83;
            color: #ffffff;
            font-size: 8px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1.2px;
            display: inline-block;
            padding: 3px 8px;
            border-radius: 4px;
            margin-top: 4px;
        }
        .sep-line {
            width: 100%;
            height: 1px;
            background-color: #ccd3e0;
            margin-bottom: 16px;
        }

        /* ── Employee Card ───────────────────────────────────────────────── */
        .emp-card {
            width: 100%;
            border: 1.5px solid #263c83;
            border-radius: 8px;
            border-collapse: collapse;
            margin-bottom: 16px;
            background: #ffffff;
        }
        .emp-card td {
            padding: 10px 14px;
            vertical-align: middle;
        }
        .emp-label {
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #586176;
            display: block;
            margin-bottom: 2px;
        }
        .emp-val {
            font-size: 16px;
            font-weight: 700;
            color: #19243a;
            display: block;
        }

        /* ── Earnings Table ──────────────────────────────────────────────── */
        .earnings-wrap {
            width: 100%;
            border: 1px solid #ccd3e0;
            border-radius: 8px;
            overflow: hidden;
            margin-bottom: 14px;
        }
        .earnings-header {
            background-color: #263c83;
            color: #ffffff;
            padding: 7px 14px;
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1.5px;
        }
        .data-table {
            width: 100%;
            border-collapse: collapse;
        }
        .data-table th {
            background-color: #f8fafc;
            color: #263c83;
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1px;
            padding: 6px 14px;
            border-bottom: 1px solid #ccd3e0;
            text-align: left;
        }
        .data-table td {
            padding: 10px 14px;
            font-size: 12px;
            color: #19243a;
        }
        .text-right { text-align: right; }

        /* ── Summary Box ─────────────────────────────────────────────────── */
        .summary-box {
            width: 100%;
            border: 1px solid #ccd3e0;
            border-radius: 8px;
            padding: 10px 14px;
            margin-bottom: 14px;
        }
        .summary-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            color: #586176;
        }
        .summary-table td {
            padding: 3px 0;
        }
        .net-badge {
            background-color: #263c83;
            color: #ffffff;
            font-size: 13px;
            font-weight: 800;
            padding: 4px 10px;
            border-radius: 6px;
            display: inline-block;
        }

        /* ── Balance Owed Hero Card ──────────────────────────────────────── */
        .balance-hero {
            width: 100%;
            background-color: #263c83;
            border-top: 3px solid #e8b84b;
            border-radius: 8px;
            border-collapse: collapse;
            color: #ffffff;
            margin-bottom: 20px;
        }
        .balance-hero td {
            padding: 14px 18px;
            vertical-align: middle;
        }
        .balance-title {
            color: #e8b84b;
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            display: block;
            margin-bottom: 2px;
        }
        .balance-sub {
            color: #ffffff;
            opacity: 0.85;
            font-size: 9px;
            display: block;
        }
        .balance-amount {
            color: #ffffff;
            font-size: 24px;
            font-weight: 900;
            text-align: right;
        }

        /* ── Signatures & Stamp ──────────────────────────────────────────── */
        .sig-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        .sig-line {
            width: 100%;
            border-top: 1px solid #ccd3e0;
            margin-bottom: 4px;
        }
        .sig-label {
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #586176;
            display: block;
        }
        .sig-sub {
            font-size: 9px;
            color: #8a95a8;
            display: block;
            margin-top: 2px;
        }
        .stamp-box {
            width: 68px;
            height: 68px;
            border: 2px dashed #263c83;
            border-radius: 34px;
            margin: 0 auto;
            text-align: center;
            padding-top: 18px;
        }
        .stamp-text {
            color: #263c83;
            font-size: 7px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            line-height: 1.2;
        }
    </style>
</head>
<body>

    {{-- Top Decorative Bands --}}
    <div class="top-band"></div>
    <div class="top-accent"></div>

    @php
        $logoPath = public_path('logo.jpg');
        $logoData = file_exists($logoPath) ? base64_encode(file_get_contents($logoPath)) : '';
        $logoSrc  = $logoData ? 'data:image/jpeg;base64,' . $logoData : '';

        $netPayable      = (float) ($slip->payable_salary ?: $slip->total_amount);
        $totalPaid       = (float) ($slip->total_paid ?? 0);
        $balanceOwed     = $netPayable - $totalPaid;
        $previousArrears = (float) ($slip->previous_arrears ?? 0);
        $advanceDeducted = (float) ($slip->advance_deducted ?? 0);
        $bonus           = (float) ($slip->bonus ?? 0);
        $extraOffDays    = max(0, $slip->taken_off_days - $slip->permitted_off_days);
        $offDeduction    = $extraOffDays > 0 ? ($extraOffDays * ((float) $slip->total_amount / 30)) : 0;
    @endphp

    {{-- Header --}}
    <table class="header-table" cellpadding="0" cellspacing="0">
        <tr>
            <td class="header-logo-cell">
                <div class="header-logo-box">
                    @if($logoSrc)
                        <img src="{{ $logoSrc }}" alt="Logo">
                    @endif
                </div>
            </td>
            <td class="header-divider-cell">
                <div class="header-divider-line"></div>
            </td>
            <td class="header-name-cell">
                <span class="academy-name">KIPS SCHOOL CHUNIAN CAMPUS</span>
                <span class="academy-motto-badge">TOPPER'S FIRST CHOICE</span>
            </td>
        </tr>
    </table>

    {{-- Double Rule --}}
    <div class="rule-thick"></div>
    <div class="rule-thin"></div>

    {{-- Title Section --}}
    <table class="title-table" cellpadding="0" cellspacing="0">
        <tr>
            <td>
                <span class="doc-title">Salary Slip</span>
                <span class="doc-badge">OFFICIAL PAYROLL DOCUMENT</span>
            </td>
            <td class="text-right" style="vertical-align:bottom;">
                <span style="font-size:10px; font-weight:700; color:#586176;">PAYROLL RECORD</span>
            </td>
        </tr>
    </table>

    <div class="sep-line"></div>

    {{-- Employee & Period Card --}}
    <table class="emp-card" cellpadding="0" cellspacing="0">
        <tr>
            <td style="width:50%; border-right:1px solid #ccd3e0;">
                <span class="emp-label">TEACHER NAME</span>
                <span class="emp-val">{{ $slip->teacher->name }}</span>
            </td>
            <td class="text-right" style="width:50%;">
                <span class="emp-label">PAY PERIOD</span>
                <span class="emp-val">{{ $slip->month }}</span>
            </td>
        </tr>
    </table>

    {{-- Earnings Section --}}
    <div class="earnings-wrap">
        <div class="earnings-header">EARNINGS</div>
        <table class="data-table">
            <thead>
                <tr>
                    <th style="width:70%;">DESCRIPTION</th>
                    <th class="text-right" style="width:30%;">AMOUNT</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="font-weight:600;">Fixed Salary</td>
                    <td class="text-right" style="font-weight:700; color:#263c83;">
                        Rs {{ number_format((float)$slip->total_amount, 2) }}
                    </td>
                </tr>
            </tbody>
        </table>
    </div>

    {{-- Calculation Summary Box --}}
    <div class="summary-box">
        <table class="summary-table" cellpadding="0" cellspacing="0">
            <tr>
                <td>Fixed Salary:</td>
                <td class="text-right" style="font-weight:600; color:#19243a;">Rs {{ number_format((float)$slip->total_amount, 2) }}</td>
            </tr>
            @if($offDeduction > 0)
            <tr style="color:#dc2626;">
                <td>Unpaid Offs ({{ $extraOffDays }} extra days):</td>
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
            <tr style="color:#d97706;">
                <td>Advance Deducted:</td>
                <td class="text-right" style="font-weight:600;">&minus; Rs {{ number_format($advanceDeducted, 2) }}</td>
            </tr>
            @endif
            <tr>
                <td style="padding-top:6px; font-size:10px; font-weight:800; text-transform:uppercase; color:#19243a;">
                    NET PAYABLE:
                </td>
                <td class="text-right" style="padding-top:6px;">
                    <span class="net-badge">Rs {{ number_format($netPayable, 2) }}</span>
                </td>
            </tr>
        </table>
    </div>

    {{-- Balance Owed Hero Card --}}
    <table class="balance-hero" cellpadding="0" cellspacing="0">
        <tr>
            <td style="width:60%;">
                <span class="balance-title">BALANCE OWED</span>
                <span class="balance-sub">Net payable for {{ $slip->month }}</span>
            </td>
            <td style="width:40%;">
                <div class="balance-amount">
                    Rs {{ number_format(max(0, $balanceOwed), 0) }}
                </div>
            </td>
        </tr>
    </table>

    {{-- Signatures Section --}}
    <table class="sig-table" cellpadding="0" cellspacing="0">
        <tr>
            <td style="width:38%; text-align:left; vertical-align:bottom;">
                <div class="sig-line"></div>
                <span class="sig-label">TEACHER SIGNATURE</span>
                <span class="sig-sub">{{ $slip->teacher->name }}</span>
            </td>
            <td style="width:24%; text-align:center; vertical-align:middle;">
                <div class="stamp-box">
                    <span class="stamp-text">OFFICIAL<br>STAMP</span>
                </div>
            </td>
            <td style="width:38%; text-align:right; vertical-align:bottom;">
                <div class="sig-line"></div>
                <span class="sig-label">ADMIN SIGNATURE</span>
                <span class="sig-sub">Authorized Signatory</span>
            </td>
        </tr>
    </table>

    {{-- Bottom Decorative Bands --}}
    <div class="bottom-accent"></div>
    <div class="bottom-band"></div>

</body>
</html>
