<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Student Fee Ledger</title>
    <style>
        body {
            font-family: Arial, Helvetica, sans-serif;
            color: #131b2e;
            margin: 0;
            padding: 20px;
            font-size: 14px;
        }
        .header {
            background-color: #1e3a8a;
            color: #ffffff;
            padding: 20px;
            text-align: center;
            border-bottom: 4px solid #943700;
            margin-bottom: 20px;
        }
        .header h1 {
            margin: 0;
            text-transform: uppercase;
            font-size: 24px;
        }
        .header p {
            margin: 5px 0 0 0;
            text-transform: uppercase;
            font-size: 12px;
            letter-spacing: 2px;
        }
        .doc-id {
            float: right;
            text-align: right;
            margin-top: -40px;
        }
        
        .section {
            margin-bottom: 20px;
        }
        
        /* Details Grid using Table */
        .details-table, .summary-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .details-table td {
            background-color: #f2f3ff;
            padding: 15px;
            border: 1px solid #c3c6d7;
            width: 25%;
            vertical-align: top;
        }
        .label {
            font-size: 10px;
            text-transform: uppercase;
            color: #434655;
            margin-bottom: 5px;
            display: block;
        }
        .value {
            font-size: 14px;
            font-weight: bold;
        }
        
        /* Summary Grid */
        .summary-table td {
            padding: 15px;
            border: 1px solid #c3c6d7;
            width: 25%;
            text-align: center;
        }
        .summary-table .paid-box {
            background-color: #f0fdf4;
            border-color: #bbf7d0;
        }
        .summary-table .arrears-box {
            background-color: #fef2f2;
            border-color: #fecaca;
        }
        .amount {
            font-size: 20px;
            font-weight: bold;
        }
        
        /* Ledger Table */
        .ledger-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #c3c6d7;
            font-size: 12px;
        }
        .ledger-table th {
            background-color: #e2e7ff;
            color: #131b2e;
            text-transform: uppercase;
            font-size: 11px;
            padding: 8px;
            text-align: left;
            border-bottom: 1px solid #c3c6d7;
        }
        .ledger-table td {
            padding: 8px;
            border-bottom: 1px solid #c3c6d7;
        }
        .text-right {
            text-align: right;
        }
        .text-center {
            text-align: center;
        }
        
        /* Badges */
        .badge {
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .badge-paid { background-color: #dcfce7; color: #15803d; }
        .badge-unpaid { background-color: #fee2e2; color: #b91c1c; }
        .badge-partial { background-color: #ffedd5; color: #c2410c; }
        .badge-advance { background-color: #dbeafe; color: #1d4ed8; }

        .footer {
            margin-top: 40px;
            border-top: 1px solid #c3c6d7;
            padding-top: 20px;
        }
        .footer-left {
            float: left;
            width: 60%;
        }
        .footer-right {
            float: right;
            width: 35%;
            text-align: center;
        }
        .signature-line {
            border-bottom: 2px solid #1e3a8a;
            margin-bottom: 5px;
            height: 40px;
        }
    </style>
</head>
<body>

    <div class="header">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
                <td width="20%" style="text-align: left;">
                    <div style="background-color: white; border-radius: 48px; width: 96px; height: 96px; display: inline-block; text-align: center; overflow: hidden;">
                        @php
                            $logoPath = public_path('logo.jpg');
                            $logoData = file_exists($logoPath) ? base64_encode(file_get_contents($logoPath)) : '';
                            $logoSrc = $logoData ? 'data:image/jpeg;base64,' . $logoData : '';
                        @endphp
                        <img src="{{ $logoSrc }}" width="96" height="96" alt="Logo" style="border-radius: 48px;">
                    </div>
                </td>
                <td width="60%" style="text-align: center; vertical-align: middle;">
                    <h1>Kips School Chunian Campus</h1>
                    <p>Topper's First Choice</p>
                </td>
                <td width="20%" style="text-align: right; vertical-align: middle;">
                </td>
            </tr>
        </table>
    </div>

    <table class="details-table">
        <tr>
            <td>
                <span class="label">Student Name</span>
                <span class="value" style="color: #1e3a8a;">{{ $student->name }}</span>
            </td>
            <td>
                <span class="label">Enrollment Date</span>
                <span class="value">{{ \Carbon\Carbon::parse($student->created_at)->format('n/j/Y') }}</span>
            </td>
            <td>
                <span class="label">Roll Number</span>
                <span class="value">{{ $rollNumber }}</span>
            </td>
            <td>
                <span class="label">Academic Year</span>
                <span class="value">{{ date('Y') }} - {{ date('Y') + 1 }}</span>
            </td>
        </tr>
        <tr>
            <td>
                <span class="label">Class</span>
                <span class="value">{{ $student->academyClass ? $student->academyClass->name : '—' }}</span>
            </td>
            <td>
                <span class="label">Section</span>
                <span class="value">{{ $student->section ? $student->section->name : '—' }}</span>
            </td>
            <td colspan="2">
                <span class="label">Major</span>
                <span class="value">{{ $student->major ? $student->major->name : '—' }}</span>
            </td>
        </tr>
    </table>

    <table class="summary-table">
        <tr>
            <td>
                <span class="label">Monthly Fee</span>
                <span class="amount">Rs {{ number_format($student->monthly_fee) }}</span>
            </td>
            <td>
                <span class="label">Total Expected</span>
                <span class="amount">Rs {{ number_format($summary['total_due']) }}</span>
            </td>
            <td class="paid-box">
                <span class="label" style="color: #15803d;">Total Received</span>
                <span class="amount" style="color: #166534;">Rs {{ number_format($summary['total_paid']) }}</span>
            </td>
            <td class="arrears-box">
                <span class="label" style="color: #1e3a8a;">Total Arrears</span>
                <span class="amount" style="color: #0284c7;">Rs {{ number_format($summary['arrears']) }}</span>
            </td>
        </tr>
    </table>

    <table class="ledger-table">
        <thead>
            <tr>
                <th>Month / Period</th>
                <th>Expected (Rs)</th>
                <th class="text-center">Received (Rs)</th>
                <th class="text-right">Payment Status</th>
            </tr>
        </thead>
        <tbody>
            @foreach($ledger as $row)
            <tr>
                <td><strong>{{ $row['month_name'] }}</strong></td>
                <td>{{ number_format($row['amount_due']) }}</td>
                <td class="text-center">
                    <strong style="color: #15803d;">{{ number_format($row['amount_paid']) }}</strong>
                    @if(count($row['payments']) > 0)
                        <br>
                        <span style="font-size: 10px; color: #737686;">{{ \Carbon\Carbon::parse($row['payments'][0]['payment_date'])->format('M j, Y') }}</span>
                    @endif
                </td>
                <td class="text-right">
                    @php
                        $badgeClass = 'badge-unpaid';
                        if($row['status'] === 'Received') $badgeClass = 'badge-paid';
                        elseif($row['status'] === 'Partial') $badgeClass = 'badge-partial';
                        elseif($row['status'] === 'Advance') $badgeClass = 'badge-advance';
                    @endphp
                    <span class="badge {{ $badgeClass }}">{{ $row['status'] }}</span>
                </td>
            </tr>
            @endforeach
        </tbody>
    </table>

    @php
        $currentMonth = count($ledger) > 0 ? $ledger[0]['month'] : date('Y-m');
        $currentPayments = collect($payments ?? [])->filter(function($p) use ($currentMonth) {
            return $p['month'] === $currentMonth;
        });
        
        $formatMonth = function($monthStr) {
            try {
                return \Carbon\Carbon::parse($monthStr . '-01')->format('F Y');
            } catch (\Exception $e) {
                return $monthStr;
            }
        };
        
        $formatDate = function($dateStr) {
            try {
                return \Carbon\Carbon::parse($dateStr)->format('M j, Y');
            } catch (\Exception $e) {
                return $dateStr;
            }
        };
    @endphp

    @if($currentPayments->count() > 0)
    <div class="section" style="margin-top: 25px;">
        <h3 style="color: #1e3a8a; font-size: 14px; margin-bottom: 10px; text-transform: uppercase; border-bottom: 2px solid #e2e7ff; padding-bottom: 5px; font-weight: bold;">
            Current Month's Transactions ({{ $formatMonth($currentMonth) }})
        </h3>
        <table class="ledger-table" style="font-size: 12px; width: 100%;">
            <thead>
                <tr style="background-color: #f8fafc;">
                    <th style="padding: 8px;">Payment Date</th>
                    <th style="padding: 8px;">For Month</th>
                    <th style="padding: 8px; text-align: right;">Amount Paid (Rs)</th>
                    <th style="padding: 8px; text-align: right;">Discount (Rs)</th>
                </tr>
            </thead>
            <tbody>
                @foreach($currentPayments as $p)
                <tr>
                    <td style="padding: 8px;">{{ $formatDate($p['payment_date']) }}</td>
                    <td style="padding: 8px;">{{ $formatMonth($p['month']) }}</td>
                    <td style="padding: 8px; text-align: right; font-weight: bold; color: #15803d;">Rs {{ number_format($p['amount_paid']) }}</td>
                    <td style="padding: 8px; text-align: right; color: #c2410c;">
                        {{ $p['discount_amount'] > 0 ? 'Rs ' . number_format($p['discount_amount']) : '—' }}
                    </td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>
    @endif

    <div class="footer">
        <div class="footer-left">
            <span class="label">Date of Issue</span>
            <strong>{{ date('F j, Y') }}</strong>
        </div>
        <div class="footer-right">
            <div class="signature-line"></div>
            <strong style="color: #1e3a8a; font-size: 12px; text-transform: uppercase;">Academy Administrator</strong><br>
            <span style="font-size: 10px; color: #505f76;">Signature & Official Stamp</span>
        </div>
        <div style="clear: both;"></div>
    </div>

</body>
</html>
