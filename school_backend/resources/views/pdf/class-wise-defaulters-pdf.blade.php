<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Class-Wise Fee Defaulters Report - {{ $data['month_label'] ?? 'Defaulters' }}</title>
    <style>
        @page {
            margin: 6mm 8mm 6mm 8mm;
            size: a4 landscape;
        }
        * {
            box-sizing: border-box;
            font-family: 'DejaVu Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif;
        }
        body {
            color: #0f172a;
            margin: 0;
            padding: 0;
            font-size: 8px;
            line-height: 1.25;
            background: #ffffff;
        }

        /* Top Header */
        .report-header {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
            border-bottom: 2px solid #0f224a;
            padding-bottom: 6px;
        }
        .school-title {
            font-size: 16px;
            font-weight: bold;
            color: #0f224a;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }
        .school-subtitle {
            font-size: 8px;
            color: #3b82f6;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 1px;
        }
        .report-title {
            font-size: 12px;
            font-weight: bold;
            color: #b91c1c;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 2px;
        }
        .meta-table {
            text-align: right;
            font-size: 7.5px;
            color: #475569;
        }
        .meta-table strong {
            color: #0f172a;
        }

        /* Summary Stats Cards */
        .kpi-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 4px;
            margin-bottom: 8px;
        }
        .kpi-card {
            background-color: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            padding: 4px 6px;
            text-align: center;
        }
        .kpi-card.danger {
            background-color: #fef2f2;
            border-color: #fecaca;
        }
        .kpi-card.primary {
            background-color: #eff6ff;
            border-color: #bfdbfe;
        }
        .kpi-card.success {
            background-color: #f0fdf4;
            border-color: #bbf7d0;
        }
        .kpi-label {
            font-size: 6.5px;
            text-transform: uppercase;
            font-weight: 700;
            color: #64748b;
            letter-spacing: 0.5px;
        }
        .kpi-value {
            font-size: 10px;
            font-weight: 800;
            color: #0f224a;
            margin-top: 1px;
        }
        .kpi-card.danger .kpi-value {
            color: #b91c1c;
        }
        .kpi-card.primary .kpi-value {
            color: #1d4ed8;
        }
        .kpi-card.success .kpi-value {
            color: #15803d;
        }

        /* Class Section */
        .class-block {
            margin-bottom: 12px;
        }
        .class-header-table {
            width: 100%;
            border-collapse: collapse;
            background-color: #0f224a;
            color: #ffffff;
            border-radius: 3px 3px 0 0;
            margin-bottom: 0;
            page-break-after: avoid;
        }
        .class-header-table tr {
            page-break-inside: avoid;
            page-break-after: avoid;
        }
        .class-header-table td {
            padding: 4px 8px;
            font-size: 8.5px;
        }
        .class-name-badge {
            font-weight: 800;
            font-size: 9.5px;
            letter-spacing: 0.5px;
        }
        .class-meta-badge {
            text-align: right;
            font-size: 7.5px;
            color: #93c5fd;
        }

        /* Defaulters Data Table */
        .data-table {
            width: 100%;
            border-collapse: collapse;
            border-left: 1px solid #cbd5e1;
            border-right: 1px solid #cbd5e1;
            border-bottom: 1px solid #cbd5e1;
            font-size: 7.5px;
        }
        .data-table thead {
            display: table-header-group;
        }
        .data-table tfoot {
            display: table-footer-group;
        }
        .data-table tr {
            page-break-inside: avoid;
        }
        .data-table th {
            background-color: #f1f5f9;
            color: #1e293b;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 6.5px;
            letter-spacing: 0.3px;
            padding: 4px 3px;
            border: 1px solid #cbd5e1;
            text-align: left;
        }
        .data-table td {
            padding: 3px 3px;
            border: 1px solid #e2e8f0;
            vertical-align: middle;
        }
        .data-table tr:nth-child(even) {
            background-color: #fafbfc;
        }
        .text-right {
            text-align: right;
        }
        .text-center {
            text-align: center;
        }
        .text-bold {
            font-weight: 700;
        }
        .text-danger {
            color: #b91c1c;
            font-weight: 700;
        }
        .text-amber {
            color: #b45309;
            font-weight: 700;
        }
        .text-blue {
            color: #1d4ed8;
            font-weight: 600;
        }
        .subtotal-row {
            background-color: #e2e8f0 !important;
            font-weight: 800;
            border-top: 1.5px solid #64748b;
            border-bottom: 1.5px solid #64748b;
        }
        .grandtotal-row {
            background-color: #fee2e2 !important;
            color: #7f1d1d;
            font-weight: 800;
            font-size: 8.5px;
            border: 2px solid #b91c1c;
        }

        /* Badge Pills */
        .pill {
            display: inline-block;
            padding: 1px 4px;
            border-radius: 3px;
            font-size: 6px;
            font-weight: 700;
            text-transform: uppercase;
        }
        .pill-critical {
            background-color: #fee2e2;
            color: #991b1b;
            border: 0.5px solid #f87171;
        }
        .pill-unpaid {
            background-color: #fef3c7;
            color: #92400e;
            border: 0.5px solid #fcd34d;
        }
        .pill-arrears {
            background-color: #ede9fe;
            color: #5b21b6;
            border: 0.5px solid #c4b5fd;
        }

        .empty-class-notice {
            padding: 6px;
            text-align: center;
            color: #15803d;
            background-color: #f0fdf4;
            font-size: 7.5px;
            font-weight: 600;
            border: 1px solid #bbf7d0;
            border-top: none;
        }

        /* Signatures & Footer */
        .footer-section {
            margin-top: 14px;
            width: 100%;
            page-break-inside: avoid;
        }
        .signature-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px;
        }
        .signature-table td {
            width: 33.33%;
            text-align: center;
            vertical-align: bottom;
            padding: 0 10px;
        }
        .signature-line {
            border-top: 1px solid #475569;
            margin-top: 32px;
            padding-top: 3px;
            font-size: 7px;
            font-weight: 700;
            text-transform: uppercase;
            color: #334155;
        }
        .notice-text {
            font-size: 6.5px;
            color: #64748b;
            text-align: center;
            margin-top: 10px;
            border-top: 0.5px dashed #cbd5e1;
            padding-top: 4px;
        }
    </style>
</head>
<body>

    <!-- Header -->
    <table class="report-header">
        <tr>
            <td style="width: 60%; vertical-align: middle;">
                <div class="school-title">KIPS School & Academy</div>
                <div class="school-subtitle">Excellence in Education & Fee Management System</div>
                <div class="report-title">Class-Wise Fee Defaulters Statement</div>
            </td>
            <td style="width: 40%; vertical-align: middle;">
                <table class="meta-table" align="right">
                    <tr>
                        <td><strong>Billing Month:</strong></td>
                        <td style="padding-left: 5px; font-weight: bold; color: #1e3a8a;">{{ $data['month_label'] ?? $data['month'] }}</td>
                    </tr>
                    <tr>
                        <td><strong>Report Generated:</strong></td>
                        <td style="padding-left: 5px;">{{ now()->format('d M Y, h:i A') }}</td>
                    </tr>
                    <tr>
                        <td><strong>Criteria:</strong></td>
                        <td style="padding-left: 5px; text-transform: capitalize;">{{ str_replace('_', ' ', $data['defaulter_type'] ?? 'All Defaulters') }}</td>
                    </tr>
                    @if(!empty($classFilterName))
                    <tr>
                        <td><strong>Class Filter:</strong></td>
                        <td style="padding-left: 5px; font-weight: bold; color: #0f224a;">{{ $classFilterName }}</td>
                    </tr>
                    @endif
                </table>
            </td>
        </tr>
    </table>

    <!-- Overall KPI Summary -->
    <table class="kpi-table">
        <tr>
            <td class="kpi-card" style="width: 14%;">
                <div class="kpi-label">Total Enrolled</div>
                <div class="kpi-value">{{ number_format($data['summary']['total_enrolled'] ?? 0) }}</div>
            </td>
            <td class="kpi-card danger" style="width: 14%;">
                <div class="kpi-label">Defaulters Count</div>
                <div class="kpi-value">{{ number_format($data['summary']['total_defaulters'] ?? 0) }} <span style="font-size: 7px; font-weight: 600;">({{ $data['summary']['overall_defaulter_rate'] ?? 0 }}%)</span></div>
            </td>
            <td class="kpi-card success" style="width: 14%;">
                <div class="kpi-label">Paid Students</div>
                <div class="kpi-value">{{ number_format($data['summary']['total_paid_students'] ?? 0) }}</div>
            </td>
            <td class="kpi-card primary" style="width: 14%;">
                <div class="kpi-label">Expected Month Fee</div>
                <div class="kpi-value">Rs. {{ number_format($data['summary']['total_expected_revenue'] ?? 0) }}</div>
            </td>
            <td class="kpi-card success" style="width: 14%;">
                <div class="kpi-label">Month Collected</div>
                <div class="kpi-value">Rs. {{ number_format($data['summary']['total_collected_month'] ?? 0) }}</div>
            </td>
            <td class="kpi-card" style="width: 15%;">
                <div class="kpi-label">Prior Arrears Due</div>
                <div class="kpi-value">Rs. {{ number_format($data['summary']['previous_arrears_outstanding'] ?? 0) }}</div>
            </td>
            <td class="kpi-card danger" style="width: 15%;">
                <div class="kpi-label">Total Outstanding Dues</div>
                <div class="kpi-value">Rs. {{ number_format($data['summary']['total_outstanding_amount'] ?? 0) }}</div>
            </td>
        </tr>
    </table>

    <!-- Class-Wise Tables -->
    @php
        $grandTotalExpected = 0;
        $grandTotalPaid = 0;
        $grandTotalCurrentDue = 0;
        $grandTotalArrears = 0;
        $grandTotalOutstanding = 0;
        $grandTotalDefaulters = 0;
    @endphp

    @forelse($data['classes'] as $cls)
        @php
            $students = $cls['students'] ?? [];
            $hasDefaulters = count($students) > 0;
            if (!$hasDefaulters && !empty($hideZeroDefaultersClasses)) {
                continue;
            }
            $grandTotalDefaulters += count($students);
        @endphp

        <div class="class-block">
            <!-- Class Header Banner -->
            <table class="class-header-table">
                <tr>
                    <td style="width: 50%;">
                        <span class="class-name-badge">CLASS: {{ strtoupper($cls['class_name']) }}</span>
                    </td>
                    <td class="class-meta-badge" style="width: 50%;">
                        Enrolled: <strong>{{ $cls['total_enrolled'] }}</strong> | 
                        Defaulters: <strong style="color: #fca5a5;">{{ $cls['defaulters_count'] }}</strong> ({{ $cls['defaulter_rate'] }}%) | 
                        Class Outstanding: <strong style="color: #ffffff;">Rs. {{ number_format($cls['total_pending_amount']) }}</strong>
                    </td>
                </tr>
            </table>

            @if($hasDefaulters)
                <table class="data-table">
                    <thead>
                        <tr>
                            <th style="width: 3%; text-align: center;">#</th>
                            <th style="width: 8%;">Roll No</th>
                            <th style="width: 19%;">Student & Father Name</th>
                            <th style="width: 10%;">Contact #</th>
                            <th style="width: 7%;" class="text-right">Monthly Fee</th>
                            <th style="width: 7%;" class="text-right">Paid (This M.)</th>
                            <th style="width: 7%;" class="text-right">Month Due</th>
                            <th style="width: 7%;" class="text-right">Past Arrears</th>
                            <th style="width: 8%;" class="text-right">Total Payable</th>
                            <th style="width: 7%; text-align: center;">Status</th>
                            <th style="width: 17%;">Follow-Up / Commitment</th>
                        </tr>
                    </thead>
                    <tbody>
                        @php
                            $subMonthly = 0;
                            $subPaid = 0;
                            $subMonthDue = 0;
                            $subArrears = 0;
                            $subTotal = 0;
                        @endphp

                        @foreach($students as $idx => $st)
                            @php
                                $subMonthly += (float)($st['monthly_fee'] ?? 0);
                                $subPaid += (float)($st['current_month_paid'] ?? 0);
                                $subMonthDue += (float)($st['current_month_net_due'] ?? 0);
                                $subArrears += (float)($st['previous_arrears'] ?? 0);
                                $subTotal += (float)($st['total_payable'] ?? 0);

                                $grandTotalExpected += (float)($st['monthly_fee'] ?? 0);
                                $grandTotalPaid += (float)($st['current_month_paid'] ?? 0);
                                $grandTotalCurrentDue += (float)($st['current_month_net_due'] ?? 0);
                                $grandTotalArrears += (float)($st['previous_arrears'] ?? 0);
                                $grandTotalOutstanding += (float)($st['total_payable'] ?? 0);

                                $followUp = $st['latest_follow_up'] ?? null;
                            @endphp
                            <tr>
                                <td class="text-center">{{ $idx + 1 }}</td>
                                <td class="text-bold text-blue">{{ $st['roll_number'] ?? '-' }}</td>
                                <td>
                                    <strong style="color: #0f172a;">{{ $st['name'] }}</strong>
                                    @if(!empty($st['father_name']))
                                        <br><span style="color: #64748b; font-size: 6.5px;">S/O {{ $st['father_name'] }}</span>
                                    @endif
                                </td>
                                <td>
                                    {{ $st['contact_number'] ?: ($st['emergency_contact'] ?: ($st['father_cell'] ?: 'N/A')) }}
                                </td>
                                <td class="text-right">Rs. {{ number_format($st['monthly_fee'] ?? 0) }}</td>
                                <td class="text-right" style="color: #16a34a;">Rs. {{ number_format($st['current_month_paid'] ?? 0) }}</td>
                                <td class="text-right text-amber">Rs. {{ number_format($st['current_month_net_due'] ?? 0) }}</td>
                                <td class="text-right" style="color: #7c3aed;">Rs. {{ number_format($st['previous_arrears'] ?? 0) }}</td>
                                <td class="text-right text-danger" style="font-size: 8px;">Rs. {{ number_format($st['total_payable'] ?? 0) }}</td>
                                <td class="text-center">
                                    @if(!empty($st['is_critical']))
                                        <span class="pill pill-critical">{{ $st['months_overdue'] ?? 1 }}M Overdue</span>
                                    @elseif(!empty($st['is_this_month_unpaid']))
                                        <span class="pill pill-unpaid">Unpaid</span>
                                    @elseif(!empty($st['is_this_month_partial']))
                                        <span class="pill pill-unpaid">Partial</span>
                                    @else
                                        <span class="pill pill-arrears">Arrears</span>
                                    @endif
                                </td>
                                <td>
                                    @if($followUp)
                                        <div style="font-size: 6.5px; color: #1e3a8a;">
                                            <strong>Promise:</strong> {{ !empty($followUp['next_promise_date']) ? \Carbon\Carbon::parse($followUp['next_promise_date'])->format('d M Y') : (\Carbon\Carbon::parse($followUp['promise_date'])->format('d M Y')) }}
                                        </div>
                                        @if(!empty($followUp['comments']))
                                            <div style="font-size: 6px; color: #475569; font-style: italic; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                                "{{ $followUp['comments'] }}"
                                            </div>
                                        @endif
                                    @else
                                        <span style="color: #94a3b8; font-size: 6px;">No follow-up logged</span>
                                    @endif
                                </td>
                            </tr>
                        @endforeach

                        <!-- Class Subtotal Row -->
                        <tr class="subtotal-row">
                            <td colspan="4" style="text-align: right; padding-right: 8px;">
                                <strong>SUBTOTAL — {{ strtoupper($cls['class_name']) }} ({{ count($students) }} Defaulters):</strong>
                            </td>
                            <td class="text-right">Rs. {{ number_format($subMonthly) }}</td>
                            <td class="text-right" style="color: #16a34a;">Rs. {{ number_format($subPaid) }}</td>
                            <td class="text-right text-amber">Rs. {{ number_format($subMonthDue) }}</td>
                            <td class="text-right" style="color: #7c3aed;">Rs. {{ number_format($subArrears) }}</td>
                            <td class="text-right text-danger" style="font-size: 8.5px;">Rs. {{ number_format($subTotal) }}</td>
                            <td colspan="2" class="text-center" style="font-size: 7px; color: #475569;">
                                Total Due: <strong>Rs. {{ number_format($subTotal) }}</strong>
                            </td>
                        </tr>
                    </tbody>
                </table>
            @else
                <div class="empty-class-notice">
                    ✓ All enrolled students in {{ $cls['class_name'] }} have cleared their dues for this period (0 Defaulters).
                </div>
            @endif
        </div>
    @empty
        <div style="padding: 20px; text-align: center; color: #64748b; font-size: 10px;">
            No fee defaulters found for the selected period and filters.
        </div>
    @endforelse

    <!-- Grand Total Bar (If multiple classes) -->
    @if(count($data['classes']) > 1 && $grandTotalDefaulters > 0)
        <table class="data-table" style="margin-top: 8px;">
            <tr class="grandtotal-row">
                <td style="width: 40%; padding: 6px 8px; text-align: right;">
                    GRAND TOTAL ALL CLASSES ({{ number_format($grandTotalDefaulters) }} DEFAULTERS):
                </td>
                <td style="width: 7%; padding: 6px 3px;" class="text-right">Rs. {{ number_format($grandTotalExpected) }}</td>
                <td style="width: 7%; padding: 6px 3px;" class="text-right">Rs. {{ number_format($grandTotalPaid) }}</td>
                <td style="width: 7%; padding: 6px 3px;" class="text-right">Rs. {{ number_format($grandTotalCurrentDue) }}</td>
                <td style="width: 7%; padding: 6px 3px;" class="text-right">Rs. {{ number_format($grandTotalArrears) }}</td>
                <td style="width: 8%; padding: 6px 3px;" class="text-right" style="font-size: 9.5px; color: #991b1b;">
                    Rs. {{ number_format($grandTotalOutstanding) }}
                </td>
                <td colspan="2" style="width: 24%; padding: 6px 8px; text-align: center; font-size: 7.5px;">
                    Total Outstanding Recovery Amount: <strong>Rs. {{ number_format($grandTotalOutstanding) }}</strong>
                </td>
            </tr>
        </table>
    @endif

    <!-- Signatures & Disclaimer -->
    <div class="footer-section">
        <table class="signature-table">
            <tr>
                <td>
                    <div class="signature-line">Prepared By (Fee Clerk / Accountant)</div>
                </td>
                <td>
                    <div class="signature-line">Verified By (Admin / Incharge)</div>
                </td>
                <td>
                    <div class="signature-line">Approved By (Principal / Director)</div>
                </td>
            </tr>
        </table>
        <div class="notice-text">
            CONFIDENTIAL • Computer Generated Report • KIPS School & Academy Management System • {{ now()->format('Y-m-d H:i:s') }}
        </div>
    </div>

</body>
</html>
