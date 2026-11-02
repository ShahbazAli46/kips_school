"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { CalendarDays, Printer, ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8001/api";

type Credit = {
  id: number;
  description: string;
  reference: string;
  amount: number;
  recorded_by: string;
};

type Debit = {
  id: number;
  item: string;
  category: string;
  description?: string | null;
  amount: number;
  recorded_by: string;
};

type Report = {
  date: string;
  opening_balance: number;
  credit_total: number;
  debit_total: number;
  closing_balance: number;
  credits: Credit[];
  debits: Debit[];
};

type LedgerRow = {
  id: string;
  date: string;
  particulars: string;
  reference: string;
  credit: number;
  debit: number;
  balance: number;
};

const money = (value: number) => `Rs. ${Number(value || 0).toLocaleString()}`;

function authHeaders() {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
  };
}

export default function DailyFinanceReportPage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API}/ledger/daily-finance-report?date=${date}`, {
        headers: authHeaders(),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to load daily finance report");
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load report");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const ledgerRows = useMemo<LedgerRow[]>(() => {
    if (!report) return [];
    const rows = [
      ...report.credits.map((row) => ({
        id: `credit-${row.id}`,
        date: report.date,
        particulars: row.description,
        reference: row.reference,
        credit: Number(row.amount),
        debit: 0,
      })),
      ...report.debits.map((row) => ({
        id: `debit-${row.id}`,
        date: report.date,
        particulars: row.item,
        reference: row.category,
        credit: 0,
        debit: Number(row.amount),
      })),
    ];
    let balance = Number(report.opening_balance);
    return rows.map((row) => {
      balance += row.credit - row.debit;
      return { ...row, balance };
    });
  }, [report]);

  return (
    <DashboardLayout>
      <div className="daily-finance-report space-y-6 print:min-h-[260mm] print:p-3 print:space-y-2">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { size: A4 portrait; margin: 34mm 5mm 5mm; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            body, main { background: #fff !important; }
            .daily-finance-report { padding: 25mm 2mm 22mm !important; }
            .daily-finance-report, .daily-finance-report * { scrollbar-width: none; }
            .daily-finance-report .overflow-x-auto { overflow: visible !important; }
            .report-running-header { display: block !important; position: fixed; top: 0; left: 0; right: 0; height: 31mm; background: #fff; z-index: 20; }
            .report-running-header .report-wave { display: block; width: 100%; height: 11mm !important; }
            .report-running-footer { display: block !important; position: fixed; bottom: 0; left: 0; right: 0; height: 12mm; background: #fff; z-index: 20; }
            .daily-finance-report { position: relative; z-index: 1; }
            .print-watermark { display: block !important; position: fixed; top: 50%; left: 50%; width: 105mm; height: 105mm; transform: translate(-50%, -50%); opacity: .045; filter: grayscale(1); z-index: 0; object-fit: contain; }
            .daily-finance-report { color: #000 !important; background: #fff !important; }
            .daily-finance-report .print-card { color: #000 !important; background: #fff !important; border-color: #1e3a8a !important; }
            .daily-finance-report .print-card p { color: #000 !important; }
            .daily-finance-report .ledger-table th { color: #000 !important; background: #f3f4f6 !important; }
            .daily-finance-report .ledger-table td { color: #000 !important; background: #fff !important; }
            .daily-finance-report .ledger-table { font-size: 10px !important; }
            .daily-finance-report .ledger-table th,
            .daily-finance-report .ledger-table td { padding: 5px 7px !important; }
            .daily-finance-report table { page-break-inside: auto; }
            .daily-finance-report .ledger-table thead { display: table-header-group; }
            .daily-finance-report .ledger-table tfoot { display: table-footer-group; }
            .daily-finance-report tr { page-break-inside: avoid; page-break-after: auto; }
          }
        ` }} />
        <img src="/logo.jpg" alt="" className="print-watermark hidden" aria-hidden="true" />
        <div className="report-running-footer hidden" aria-hidden="true">
          <svg viewBox="0 0 1200 55" preserveAspectRatio="none" className="h-full w-full">
            <path d="M0 55 H1200 V20 C1030 10 930 38 760 28 C560 15 420 11 250 26 C140 36 65 26 0 34 Z" fill="#2563eb" opacity=".88" />
            <path d="M0 55 H1200 V32 C1030 22 930 50 760 40 C560 27 420 23 250 38 C140 48 65 38 0 46 Z" fill="#dbeafe" />
          </svg>
        </div>
        <div className="report-running-header hidden" aria-hidden="true">
          <svg viewBox="0 0 1200 55" preserveAspectRatio="none" className="report-wave w-full">
            <path d="M0 0 H1200 V35 C1030 46 930 18 760 28 C560 41 420 45 250 30 C140 20 65 30 0 22 Z" fill="#dbeafe" />
            <path d="M0 0 H1200 V27 C1030 38 930 10 760 20 C560 33 420 37 250 22 C140 12 65 22 0 14 Z" fill="#2563eb" opacity=".88" />
          </svg>
          <div className="flex items-center justify-between border-b-2 border-[#1e3a8a] px-3 pb-2 pt-1">
            <div className="flex items-center gap-3">
              <img src="/logo.jpg" alt="KIPS School logo" className="h-10 w-10 object-contain" />
              <div>
                <h1 className="text-lg font-black tracking-tight text-[#1e3a8a]">KIPS School Chunian Campus</h1>
                <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">Daily Finance Report</p>
              </div>
            </div>
            <div className="text-right text-[10px] text-slate-600">
              <p className="font-bold text-slate-800">Report Date</p>
              <p>{report?.date}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <div>
            <h1 className="text-2xl font-black text-[#0f224a]">Daily Finance Report</h1>
            <p className="mt-1 text-sm text-[#2563eb]">Fee receivings as credit and expenses as debit.</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2 shadow-sm">
              <CalendarDays className="h-4 w-4 text-blue-500" />
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="font-semibold text-[#1e3a8a] outline-none" />
            </label>
            <button onClick={() => window.print()} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-100 px-4 py-2.5 font-bold text-gray-700">
              <Printer className="h-4 w-4" /> Print / Save PDF
            </button>
          </div>
        </div>

        {loading ? <div className="rounded-2xl bg-white p-12 text-center text-gray-500">Loading report...</div> : error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div> : report && (
          <>
            <div className="grid grid-cols-4 gap-2 print:mb-2">
              <Summary label="Opening Balance" value={report.opening_balance} icon={<Wallet />} color="text-blue-700" />
              <Summary label="Fee Receivings (Credit)" value={report.credit_total} icon={<ArrowDownLeft />} color="text-emerald-600" />
              <Summary label="Expenses (Debit)" value={report.debit_total} icon={<ArrowUpRight />} color="text-red-600" />
              <Summary label="Closing Balance" value={report.closing_balance} icon={<Wallet />} color="text-[#1e3a8a]" emphasized />
            </div>

            <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-none print:overflow-visible">
              <div className="overflow-x-auto">
                <table className="ledger-table w-full text-xs">
                  <thead className="bg-gray-50 text-left text-[11px] uppercase text-gray-500">
                    <tr>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Particulars</th>
                      <th className="px-5 py-3">Reference</th>
                      <th className="px-5 py-3 text-right">Credit</th>
                      <th className="px-5 py-3 text-right">Debit</th>
                      <th className="px-5 py-3 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr className="bg-blue-50/40 font-bold print:bg-white print:text-black">
                      <td className="px-5 py-3">{report.date}</td>
                      <td className="px-5 py-3" colSpan={4}>Opening Balance</td>
                      <td className="px-5 py-3 text-right text-blue-700">{money(report.opening_balance)}</td>
                    </tr>
                    {ledgerRows.map((row) => (
                      <tr key={row.id}>
                        <td className="whitespace-nowrap px-5 py-3 text-gray-500">{row.date}</td>
                        <td className="px-5 py-3 font-semibold text-gray-800">{row.particulars}</td>
                        <td className="px-5 py-3 text-gray-500">{row.reference}</td>
                        <td className="px-5 py-3 text-right font-bold text-emerald-600">{row.credit ? money(row.credit) : "—"}</td>
                        <td className="px-5 py-3 text-right font-bold text-red-600">{row.debit ? money(row.debit) : "—"}</td>
                        <td className="px-5 py-3 text-right font-black text-[#1e3a8a]">{money(row.balance)}</td>
                      </tr>
                    ))}
                    {ledgerRows.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-500">No transactions for this date.</td></tr>}
                    <tr className="border-t-2 border-blue-800 bg-blue-800 font-black text-white print:border-blue-800 print:bg-white print:text-black">
                      <td className="px-5 py-3">{report.date}</td>
                      <td className="px-5 py-3" colSpan={4}>Closing Balance</td>
                      <td className="px-5 py-3 text-right">{money(report.closing_balance)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function Summary({ label, value, icon, color, emphasized = false }: { label: string; value: number; icon: React.ReactNode; color: string; emphasized?: boolean }) {
  return <div className={`print-card relative min-w-0 overflow-hidden rounded-lg border p-2 shadow-sm ${emphasized ? "border-blue-800 bg-blue-800 text-white" : "border-blue-100 bg-white"}`}>
    <div className={`absolute right-2 top-2 scale-75 opacity-15 ${emphasized ? "text-white" : color}`}>{icon}</div>
    <p className={`truncate text-[9px] font-bold uppercase tracking-wide ${emphasized ? "text-blue-100" : "text-gray-500"}`}>{label}</p>
    <p className={`mt-1 truncate text-lg font-black ${emphasized ? "text-white" : color}`}>{money(value)}</p>
  </div>;
}

