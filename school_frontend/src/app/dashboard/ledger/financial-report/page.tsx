"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { ArrowDownLeft, ArrowUpRight, TrendingUp, Calendar as CalendarIcon, Printer, DollarSign, Search } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders() {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };
}

interface MonthlySummary {
  month: string;
  month_name: string;
  income: number;
  expense: number;
  net_change: number;
  ending_balance: number;
}

export default function FinancialReportPage() {
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 5);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [report, setReport] = useState<MonthlySummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReport = useCallback(async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API}/ledger/financial-report?start_date=${startDate}&end_date=${endDate}`,
        { headers: getAuthHeaders() }
      );
      if (res.ok) {
        const data = await res.json();
        setReport(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const { rangeIncome, rangeExpense, rangeNetChange, finalEndingBalance } = useMemo(() => {
    let income = 0;
    let expense = 0;
    report.forEach((item) => {
      income += item.income;
      expense += item.expense;
    });
    const ending = report.length > 0 ? report[0].ending_balance : 0;
    return {
      rangeIncome: income,
      rangeExpense: expense,
      rangeNetChange: income - expense,
      finalEndingBalance: ending,
    };
  }, [report]);

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: "#0f224a" }}>
            Financial Report
          </h1>
          <p className="text-sm mt-1" style={{ color: "#2563eb" }}>
            Cumulative month-by-month financial summaries and ending balances.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex gap-2 items-center bg-white p-2 rounded-xl border shadow-sm" style={{ borderColor: "#bfdbfe" }}>
            <CalendarIcon className="w-4 h-4 ml-2 text-gray-400" />
            <input
              type="month"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-1 outline-none text-sm font-bold text-[#1e3a8a] bg-transparent cursor-pointer"
            />
          </div>
          <span className="text-gray-400 font-bold">to</span>
          <div className="flex gap-2 items-center bg-white p-2 rounded-xl border shadow-sm" style={{ borderColor: "#bfdbfe" }}>
            <CalendarIcon className="w-4 h-4 ml-2 text-gray-400" />
            <input
              type="month"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-1 outline-none text-sm font-bold text-[#1e3a8a] bg-transparent cursor-pointer"
            />
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition shadow-sm border border-gray-200 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Printable Header Details */}
      <div className="hidden print:block mb-6 border-b pb-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-extrabold text-[#1e3a8a] uppercase">Kips School Chunian Campus</h1>
            <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mt-0.5">Topper's First Choice</p>
            <h2 className="text-lg font-bold mt-3 text-gray-800">Financial Report</h2>
            <p className="text-xs text-gray-500">Period: {startDate} to {endDate}</p>
          </div>
          <div className="text-right text-xs text-gray-400">
            <p>Generated: {new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 print:grid-cols-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border relative overflow-hidden print:border-gray-300" style={{ borderColor: "#bfdbfe" }}>
          <div className="absolute top-0 right-0 p-3 opacity-10 print:hidden">
            <ArrowDownLeft className="w-14 h-14 text-green-500" />
          </div>
          <h3 className="font-bold text-gray-500 uppercase text-xs tracking-wider mb-2">Range Total Income</h3>
          <p className="text-2xl font-black text-green-600">Rs. {rangeIncome.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-2">Sum of credits</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border relative overflow-hidden print:border-gray-300" style={{ borderColor: "#bfdbfe" }}>
          <div className="absolute top-0 right-0 p-3 opacity-10 print:hidden">
            <ArrowUpRight className="w-14 h-14 text-red-500" />
          </div>
          <h3 className="font-bold text-gray-500 uppercase text-xs tracking-wider mb-2">Range Total Expense</h3>
          <p className="text-2xl font-black text-red-500">Rs. {rangeExpense.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-2">Sum of debits</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border relative overflow-hidden print:border-gray-300" style={{ borderColor: "#bfdbfe" }}>
          <div className="absolute top-0 right-0 p-3 opacity-10 print:hidden">
            <TrendingUp className="w-14 h-14 text-blue-500" />
          </div>
          <h3 className="font-bold text-gray-500 uppercase text-xs tracking-wider mb-2">Range Net Change</h3>
          <p className={`text-2xl font-black ${rangeNetChange >= 0 ? "text-blue-600" : "text-red-600"}`}>
            Rs. {rangeNetChange.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400 mt-2">Income minus expense</p>
        </div>

        <div className="rounded-2xl p-5 shadow-md border relative overflow-hidden print:bg-white print:text-black print:border-gray-300" style={{ background: "linear-gradient(135deg, #2563eb, #1e3a8a)", borderColor: "#1e3a8a" }}>
          <div className="absolute top-0 right-0 p-3 opacity-20 print:hidden">
            <DollarSign className="w-14 h-14 text-white" />
          </div>
          <h3 className="font-bold text-white/85 uppercase text-xs tracking-wider mb-2 print:text-gray-500">Final Ending Balance</h3>
          <p className="text-2xl font-black text-white print:text-gray-900">Rs. {finalEndingBalance.toLocaleString()}</p>
          <p className="text-xs text-white/60 mt-2 print:text-gray-400">At end of {endDate}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 print:hidden">
          <svg className="animate-spin w-8 h-8" style={{ color: "#2563eb" }} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
        </div>
      ) : report.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border shadow-sm" style={{ borderColor: "#bfdbfe" }}>
          <Search className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: "#2563eb" }} />
          <p className="text-lg font-bold" style={{ color: "#1e3a8a" }}>No Records Found</p>
          <p className="text-sm text-gray-500 mt-1">There are no financial records for the selected period.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden print:border-gray-300 print:shadow-none" style={{ borderColor: "#bfdbfe" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr style={{ background: "#f0f4f8", borderBottom: "1px solid #bfdbfe" }} className="print:bg-gray-100 print:border-gray-300">
                  <th className="px-5 py-4 font-semibold text-xs uppercase tracking-wide print:text-black" style={{ color: "#2563eb" }}>Month</th>
                  <th className="px-5 py-4 font-semibold text-xs uppercase tracking-wide text-right print:text-black" style={{ color: "#2563eb" }}>Income (Credits)</th>
                  <th className="px-5 py-4 font-semibold text-xs uppercase tracking-wide text-right print:text-black" style={{ color: "#2563eb" }}>Expense (Debits)</th>
                  <th className="px-5 py-4 font-semibold text-xs uppercase tracking-wide text-right print:text-black" style={{ color: "#2563eb" }}>Net Change</th>
                  <th className="px-5 py-4 font-semibold text-xs uppercase tracking-wide text-right print:text-black" style={{ color: "#2563eb" }}>Ending Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "#dbeafe" }}>
                {report.map((item) => (
                  <tr key={item.month} className="transition-colors hover:bg-blue-50/20">
                    <td className="px-5 py-4 font-bold text-gray-800">
                      {item.month_name}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-green-600">
                      Rs. {item.income.toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-red-500">
                      Rs. {item.expense.toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className={`font-black px-2.5 py-1 rounded-full text-xs ${
                        item.net_change >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                      } print:bg-transparent print:p-0`}>
                        {item.net_change >= 0 ? "+" : ""}Rs. {item.net_change.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-black text-gray-900">
                      Rs. {item.ending_balance.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
