"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import NumberInput from "@/components/NumberInput";
import { DatePicker } from "@/components/ui/date-picker";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { format, parse } from "date-fns";
import { cn } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };
}

interface SalaryItem {
  id: number;
  subject_id: number;
  class_id: number | null;
  major_id: number | null;
  payment_type: "fixed" | "percentage";
  fixed_amount: string | null;
  student_id: number | null;
  student_fee_paid: string | null;
  student_active_subjects_count: number | null;
  subject_share: string | null;
  percentage: string | null;
  teacher_cut: string;
  subject?: { id: number; name: string };
  academyClass?: { id: number; name: string };
  major?: { id: number; name: string };
  student?: { id: number; name: string };
}

interface SalaryPayment {
  id: number;
  amount_paid: string;
  payment_date: string;
  payment_method: string;
  notes: string | null;
  created_at: string;
}

interface SalarySlip {
  id: number;
  teacher_id: number;
  month: string;
  total_amount: string;
  attendance_percentage: string;
  permitted_off_days: number;
  taken_off_days: number;
  bonus: string;
  advance_deducted: string;
  payable_salary: string;
  total_paid: string;
  payment_status: "unpaid" | "partial" | "paid";
  status: "draft" | "final" | "approved";
  previous_arrears?: string;
  bf_percentage?: string | number;
  bf_deduction?: string | number;
  needs_recalculation?: boolean;
  teacher?: { id: number; name: string; advance_balance?: string; arrears_balance?: string };
  items: SalaryItem[];
  payments?: SalaryPayment[];
}

export default function SalariesPage() {
  const router = useRouter();
  const [monthStr, setMonthStr] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [slips, setSlips] = useState<SalarySlip[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [search, setSearch] = useState("");
  const [defaultBfPercentage, setDefaultBfPercentage] = useState("");
  
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const currentYear = parseInt(monthStr.split("-")[0]);
  const currentMonth = parseInt(monthStr.split("-")[1]);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const handleMonthChange = (year: number, month: number) => {
    setMonthStr(`${year}-${String(month).padStart(2, '0')}`);
    setMonthPickerOpen(false);
  };

  // ── Modal: Adjust (attendance / bonus) ──────────────────────────────────────
  const [adjustTarget, setAdjustTarget] = useState<SalarySlip | null>(null);
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [adjustError, setAdjustError] = useState("");

  // ── Modal: Pay Amount ───────────────────────────────────────────────────────
  const [payTarget, setPayTarget] = useState<SalarySlip | null>(null);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split("T")[0]);

  // ── Drawer: Payment History / Ledger ───────────────────────────────────────
  const [historyTarget, setHistoryTarget] = useState<SalarySlip | null>(null);

  const [includePreviousArrears, setIncludePreviousArrears] = useState(true);

  const currentMonthStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, []);
  const isCurrentOrFutureMonth = monthStr >= currentMonthStr;

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const fetchSlips = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/salaries?month=${monthStr}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      setSlips(Array.isArray(data) ? data : []);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }, [monthStr]);

  useEffect(() => {
    fetchSlips();
  }, [fetchSlips]);

  // ── Generate ────────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (
      !confirm(
        `Generate salaries for ${monthStr}? This will overwrite existing drafts for this month.`
      )
    )
      return;
    setGenerating(true);
    try {
      const res = await fetch(`${API}/salaries/generate`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ 
          month: monthStr, 
          include_previous_arrears: includePreviousArrears,
          bf_percentage: defaultBfPercentage !== "" ? parseFloat(defaultBfPercentage) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to generate");
      await fetchSlips();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setGenerating(false);
    }
  };

  // ── Adjust Submit ───────────────────────────────────────────────────────────
  const handleAdjustSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!adjustTarget) return;
    setAdjustLoading(true);
    setAdjustError("");
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch(`${API}/salaries/${adjustTarget.id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          permitted_off_days: fd.get("permitted_off_days"),
          taken_off_days: fd.get("taken_off_days"),
          bonus: fd.get("bonus"),
          bf_percentage: fd.get("bf_percentage"),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to adjust");
      setSlips((prev) =>
        prev.map((s) => (s.id === adjustTarget.id ? data.slip : s))
      );
      setAdjustTarget(null);
    } catch (err: any) {
      setAdjustError(err.message);
    } finally {
      setAdjustLoading(false);
    }
  };

  // ── Pay Amount Submit ───────────────────────────────────────────────────────
  const handlePaySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!payTarget) return;
    setPayLoading(true);
    setPayError("");
    const fd = new FormData(e.currentTarget);
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) {
      setPayError("Please enter a valid amount greater than 0.");
      setPayLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API}/salaries/${payTarget.id}/payments`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          amount_paid: payAmount,
          payment_date: fd.get("payment_date"),
          payment_method: fd.get("payment_method"),
          notes: fd.get("notes") || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to record payment");
      // Close modal, refresh list
      setPayAmount("");
      setPayTarget(null);
      await fetchSlips();
    } catch (err: any) {
      setPayError(err.message);
    } finally {
      setPayLoading(false);
    }
  };

  // ── Derived ─────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search) return slips;
    return slips.filter((s) =>
      s.teacher?.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [slips, search]);

  const totalPayroll = slips.reduce(
    (sum, s) => sum + parseFloat(s.payable_salary || s.total_amount),
    0
  );
  const totalPaidOut = slips.reduce(
    (sum, s) => sum + parseFloat(s.total_paid || "0"),
    0
  );
  const totalPending = Math.max(0, totalPayroll - totalPaidOut);

  // helper – payTarget refreshed from slips when historyTarget is open
  const liveHistorySlip = historyTarget
    ? slips.find((s) => s.id === historyTarget.id) ?? historyTarget
    : null;

  return (
    <DashboardLayout>
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1
            className="text-3xl font-extrabold tracking-tight"
            style={{ color: "#0f224a" }}
          >
            Salary Management
          </h1>
          <p
            className="mt-1 text-sm font-medium"
            style={{ color: "#38bdf8" }}
          >
            Generate, adjust, and record teacher salary payments for any month.
          </p>
        </div>

        <div className="flex items-end gap-3">
          <div className="flex flex-col gap-1">
            <label
              className="text-xs font-semibold"
              style={{ color: "#1e3a8a" }}
            >
              Salary Month
            </label>
            <Popover open={monthPickerOpen} onOpenChange={setMonthPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[180px] justify-start text-left font-semibold h-[46px] px-4 rounded-xl border-2 hover:bg-gray-50",
                    !monthStr && "text-muted-foreground"
                  )}
                  style={{ borderColor: '#bfdbfe', color: '#1e3a8a' }}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" style={{ color: '#2563eb' }} />
                  {format(parse(monthStr, "yyyy-MM", new Date()), "MMMM yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" align="start">
                <div className="flex items-center justify-between mb-4">
                  <Button variant="ghost" size="icon" onClick={() => setMonthStr(`${currentYear - 1}-${String(currentMonth).padStart(2, '0')}`)} className="h-7 w-7 p-0 hover:bg-gray-100">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="font-bold text-sm" style={{ color: '#0f224a' }}>{currentYear}</div>
                  <Button variant="ghost" size="icon" onClick={() => setMonthStr(`${currentYear + 1}-${String(currentMonth).padStart(2, '0')}`)} className="h-7 w-7 p-0 hover:bg-gray-100">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {months.map((m, idx) => (
                    <Button
                      key={m}
                      variant="ghost"
                      onClick={() => handleMonthChange(currentYear, idx + 1)}
                      className={cn(
                        "h-9 text-xs font-semibold hover:bg-gray-100 hover:text-gray-900",
                        currentMonth === idx + 1 && "bg-[#2563eb] text-white hover:bg-[#2563eb] hover:text-white"
                      )}
                    >
                      {m}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center">
            <label 
              className="flex items-center gap-2 text-xs font-semibold cursor-pointer px-3.5 py-2.5 rounded-xl border-2 transition-colors select-none"
              style={{ borderColor: "#bfdbfe", color: "#1e3a8a", background: "#fff" }}
              title="When checked, previous month unpaid balances will be carried forward as arrears."
            >
              <input
                type="checkbox"
                checked={includePreviousArrears}
                onChange={(e) => setIncludePreviousArrears(e.target.checked)}
                className="w-4 h-4 rounded text-[#2563eb] focus:ring-0 cursor-pointer accent-[#2563eb]"
              />
              <span>Include Previous Arrears</span>
            </label>
          </div>

          <div className="flex flex-col gap-1">
            <label
              className="text-xs font-semibold"
              style={{ color: "#1e3a8a" }}
              title="Benevolent Fund % deducted into staff ledger pool, collected upon resignation"
            >
              Default BF Ded (%)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              placeholder="e.g. 5"
              value={defaultBfPercentage}
              onChange={(e) => setDefaultBfPercentage(e.target.value)}
              className="w-28 px-3 py-2.5 rounded-xl border-2 text-sm font-semibold outline-none"
              style={{
                borderColor: "#bfdbfe",
                color: "#1e3a8a",
                background: "#fff",
              }}
              title="Enter Benevolent Fund deduction percentage to apply across generated slips"
            />
          </div>

          <div 
            title={isCurrentOrFutureMonth ? "Salaries can only be generated for past months." : ""}
          >
            <button
              onClick={handleGenerate}
              disabled={generating || isCurrentOrFutureMonth}
              className="px-6 py-2.5 rounded-xl font-bold text-white transition hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed h-[46px] flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #2563eb, #1e3a8a)" }}
            >
            {generating ? (
              <svg
                className="animate-spin w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : (
              <>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                  />
                </svg>
                Generate Salaries
              </>
            )}
          </button>
          </div>
        </div>
      </div>

      {/* ── Warning Banner for Stale Salaries ───────────────────────────────── */}
      {slips.some(s => s.needs_recalculation) && (
        <div className="mb-6 p-4 rounded-2xl flex items-start gap-3 shadow-sm border" style={{ background: '#fffbeb', borderColor: '#fef3c7' }}>
          <div className="mt-0.5 text-yellow-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <div>
            <h4 className="text-sm font-bold text-yellow-800">Salaries Out of Date</h4>
            <p className="text-xs text-yellow-700 mt-1 leading-relaxed">
              New fee installments or adjustments have been recorded since salaries were last generated. 
              Please click <strong>Generate Salaries</strong> to refresh the teacher cuts and recalculate payables.
            </p>
          </div>
        </div>
      )}

      {/* ── Summary Cards ───────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Net Payable */}
        <div
          className="p-5 rounded-2xl flex items-center justify-between shadow-sm"
          style={{
            background: "linear-gradient(135deg, #f0f4f8, #fff)",
            border: "1px solid #bfdbfe",
          }}
        >
          <div>
            <p
              className="text-xs font-semibold mb-1 uppercase tracking-wide"
              style={{ color: "#38bdf8" }}
            >
              Net Payable · {monthStr}
            </p>
            <p
              className="text-2xl font-black"
              style={{ color: "#2563eb" }}
            >
              Rs {totalPayroll.toLocaleString(undefined, { minimumFractionDigits: 0 })}
            </p>
          </div>
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "#bfdbfe", color: "#2563eb" }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>

        {/* Total Paid */}
        <div
          className="p-5 rounded-2xl flex items-center justify-between shadow-sm"
          style={{
            background: "linear-gradient(135deg, #f0fdf4, #fff)",
            border: "1px solid #bbf7d0",
          }}
        >
          <div>
            <p className="text-xs font-semibold mb-1 uppercase tracking-wide text-green-700">
              Total Paid Out
            </p>
            <p className="text-2xl font-black text-green-700">
              Rs {totalPaidOut.toLocaleString(undefined, { minimumFractionDigits: 0 })}
            </p>
          </div>
          <div className="w-11 h-11 rounded-full flex items-center justify-center bg-green-100 text-green-600 shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        {/* Pending */}
        <div
          className="p-5 rounded-2xl flex items-center justify-between shadow-sm"
          style={{
            background: "linear-gradient(135deg, #fff7ed, #fff)",
            border: "1px solid #fed7aa",
          }}
        >
          <div>
            <p className="text-xs font-semibold mb-1 uppercase tracking-wide text-blue-700">
              Still Pending
            </p>
            <p className="text-2xl font-black text-blue-700">
              Rs {totalPending.toLocaleString(undefined, { minimumFractionDigits: 0 })}
            </p>
          </div>
          <div className="w-11 h-11 rounded-full flex items-center justify-center bg-blue-100 text-blue-600 shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* ── Teacher Table ────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl overflow-hidden shadow-sm border"
        style={{ background: "#fff", borderColor: "#bfdbfe" }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg
              className="animate-spin w-8 h-8"
              style={{ color: "#2563eb" }}
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : slips.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-2"
              style={{ background: "#f0f4f8", color: "#bfdbfe" }}
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-base font-medium" style={{ color: "#38bdf8" }}>
              No salary slips generated for {monthStr}.
            </p>
            <div title={isCurrentOrFutureMonth ? "Salaries can only be generated for past months." : ""}>
              <button
                onClick={handleGenerate}
                disabled={generating || isCurrentOrFutureMonth}
                className="text-sm font-bold underline transition disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ color: "#2563eb" }}
              >
                Generate Now
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Search bar */}
            <div
              className="px-4 py-3 border-b flex items-center gap-2"
              style={{ background: "#f0f4f8", borderColor: "#bfdbfe" }}
            >
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search teacher…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent border-none outline-none text-sm w-full placeholder-gray-400 font-medium"
                style={{ color: "#0f224a" }}
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "#fff", borderBottom: "1px solid #bfdbfe" }}>
                    <th className="text-left px-5 py-4 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Teacher</th>
                    <th className="text-left px-5 py-4 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Status</th>
                    <th className="text-right px-5 py-4 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Net Payable</th>
                    <th className="text-right px-5 py-4 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Paid So Far</th>
                    <th className="text-right px-5 py-4 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Balance / Advance</th>
                    <th className="text-right px-5 py-4 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: "#dbeafe" }}>
                  {filtered.map((s) => {
                    const netPay = parseFloat(s.payable_salary || s.total_amount);
                    const paid = parseFloat(s.total_paid || "0");
                    const balance = netPay - paid; // positive = still owed, negative = advance paid

                    return (
                      <tr key={s.id} className="hover:bg-[#fdf9f7] transition-colors">
                        {/* Teacher */}
                        <td className="px-5 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold" style={{ color: "#0b1329" }}>
                              {s.teacher?.name || "Unknown Teacher"}
                            </span>
                            {Number(s.taken_off_days) > Number(s.permitted_off_days) && (
                              <span className="text-[10px] text-red-500 font-medium mt-0.5">
                                Offs: {s.taken_off_days} (Max: {s.permitted_off_days})
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold capitalize ${
                              s.payment_status === "paid"
                                ? "bg-green-100 text-green-700"
                                : s.payment_status === "partial"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {s.payment_status === "paid"
                              ? "✓ Paid"
                              : s.payment_status === "partial"
                              ? "⟳ Partial"
                              : "○ Unpaid"}
                          </span>
                        </td>

                        {/* Net Payable */}
                        <td className="px-5 py-4 text-right">
                          <p className="font-black text-sm" style={{ color: "#2563eb" }}>
                            Rs {netPay.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                          </p>
                          {parseFloat(s.advance_deducted || "0") > 0 && (
                            <p className="text-[10px] text-blue-600 font-semibold mt-0.5">
                              Earned: Rs {parseFloat(s.total_amount).toLocaleString(undefined, { minimumFractionDigits: 0 })} | Adv: −Rs {parseFloat(s.advance_deducted).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                            </p>
                          )}
                          {parseFloat(String(s.bf_deduction || "0")) > 0 && (
                            <p className="text-[10px] text-amber-700 font-bold mt-0.5" title="Benevolent Fund deduction added to Staff Ledger">
                              BF Ded: −Rs {parseFloat(String(s.bf_deduction)).toLocaleString(undefined, { minimumFractionDigits: 0 })} ({s.bf_percentage}%)
                            </p>
                          )}
                          {parseFloat(s.bonus || "0") > 0 && (
                            <p className="text-[10px] text-green-600 font-semibold mt-0.5">
                              +{parseFloat(s.bonus || "0")} Bonus
                            </p>
                          )}
                          {parseFloat(s.previous_arrears || "0") > 0 && (
                            <p className="text-[10px] text-purple-600 font-semibold mt-0.5">
                              +{parseFloat(s.previous_arrears || "0")} Arrears
                            </p>
                          )}
                        </td>

                        {/* Paid So Far */}
                        <td className="px-5 py-4 text-right">
                          <p className="font-bold text-sm text-green-700">
                            Rs {paid.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                          </p>
                          {(s.payments?.length ?? 0) > 0 && (
                            <p className="text-[10px] text-gray-400 font-medium">
                              {s.payments!.length} installment{s.payments!.length !== 1 ? "s" : ""}
                            </p>
                          )}
                        </td>

                        {/* Balance / Advance */}
                        <td className="px-5 py-4 text-right">
                          {balance > 0.005 ? (
                            <p className="font-bold text-sm text-red-600">
                              − Rs {balance.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                            </p>
                          ) : balance < -0.005 ? (
                            <p className="font-bold text-sm text-green-600">
                              + Rs {Math.abs(balance).toLocaleString(undefined, { minimumFractionDigits: 0 })} <span className="text-[10px]">(advance)</span>
                            </p>
                          ) : (
                            <p className="font-bold text-sm text-gray-400">Cleared</p>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {/* Adjust */}
                            <button
                              onClick={() => {
                                setAdjustError("");
                                setAdjustTarget(s);
                              }}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold border transition hover:bg-gray-50 active:scale-95"
                              style={{ borderColor: "#bfdbfe", color: "#1e40af" }}
                              title="Adjust attendance & bonus"
                            >
                              Adjust
                            </button>

                            {/* History */}
                            <button
                              onClick={() => setHistoryTarget(s)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold border transition hover:bg-gray-50 active:scale-95"
                              style={{ borderColor: "#60a5fa", color: "#60a5fa" }}
                              title="View payment history"
                            >
                              History
                            </button>

                            {/* Slip */}
                            <button
                              onClick={() => router.push(`/dashboard/salaries/print?id=${s.id}`)}
                              className="p-1.5 rounded-lg border transition hover:bg-gray-50 active:scale-95"
                              style={{ borderColor: "#bfdbfe", color: "#1e40af" }}
                              title="View salary slip"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>

                            {/* PAY AMOUNT — the main CTA */}
                            <button
                              onClick={() => {
                                setPayError("");
                                setPayAmount("");
                                setPayTarget(s);
                              }}
                              className="px-4 py-1.5 rounded-lg text-xs font-bold text-white transition hover:opacity-90 active:scale-95 shadow-sm flex items-center gap-1.5"
                              style={{ background: "linear-gradient(135deg, #16a34a, #15803d)" }}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                              Pay Amount
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          MODAL: Adjust Salary (attendance / bonus)
      ════════════════════════════════════════════════════════════════════ */}
      {adjustTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setAdjustTarget(null)}
          />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 border border-orange-100">
            <h3 className="text-lg font-bold mb-1" style={{ color: "#0f224a" }}>
              Adjust Salary
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              {adjustTarget.teacher?.name} · {adjustTarget.month}
            </p>

            {adjustError && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-200">
                {adjustError}
              </div>
            )}

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div
                className="p-3 rounded-lg border flex justify-between"
                style={{ borderColor: "#bfdbfe", background: "#fdf9f7" }}
              >
                <span className="text-sm font-medium" style={{ color: "#1e40af" }}>
                  Base Earned:
                </span>
                <span className="text-sm font-black" style={{ color: "#2563eb" }}>
                  Rs {parseFloat(adjustTarget.total_amount).toLocaleString()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "#1e3a8a" }}>
                    Permitted Offs
                  </label>
                  <input
                    type="number"
                    min="0"
                    name="permitted_off_days"
                    defaultValue={adjustTarget.permitted_off_days}
                    className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
                    style={{ borderColor: "#bfdbfe", background: "#f0f4f8" }}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "#1e3a8a" }}>
                    Taken Offs
                  </label>
                  <input
                    type="number"
                    min="0"
                    name="taken_off_days"
                    defaultValue={adjustTarget.taken_off_days}
                    className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
                    style={{ borderColor: "#bfdbfe", background: "#f0f4f8" }}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "#1e3a8a" }}>
                  Bonus (Rs)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="bonus"
                  defaultValue={parseFloat(adjustTarget.bonus)}
                  className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
                  style={{ borderColor: "#bfdbfe", background: "#f0f4f8" }}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "#1e3a8a" }}>
                  BF Deduction (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    name="bf_percentage"
                    defaultValue={adjustTarget.bf_percentage !== undefined ? parseFloat(String(adjustTarget.bf_percentage)) : 0}
                    className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none pr-8"
                    style={{ borderColor: "#bfdbfe", background: "#f0f4f8" }}
                    placeholder="e.g. 5"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">%</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Benevolent Fund deduction is added to the staff member&apos;s ledger and collected upon resignation.
                </p>
              </div>

              <div
                className="flex gap-3 pt-4 border-t"
                style={{ borderColor: "#dbeafe" }}
              >
                <button
                  type="button"
                  onClick={() => setAdjustTarget(null)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium border"
                  style={{ borderColor: "#bfdbfe", color: "#1e40af", background: "#f0f4f8" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustLoading}
                  className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white transition active:scale-95 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #2563eb, #1e3a8a)" }}
                >
                  {adjustLoading ? "Saving…" : "Save Adjustments"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          MODAL: Pay Amount  ← the focused, real-world payment modal
      ════════════════════════════════════════════════════════════════════ */}
      {payTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setPayTarget(null)}
          />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-green-100 overflow-hidden">

            {/* Modal header */}
            <div className="px-6 pt-6 pb-4 border-b" style={{ borderColor: "#f0fdf4" }}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold" style={{ color: "#14532d" }}>
                    Record Payment
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {payTarget.teacher?.name} · {payTarget.month}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setPayTarget(null);
                    setPaymentDate(new Date().toISOString().split("T")[0]);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Mini salary summary */}
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg" style={{ background: "#f0f4f8", border: "1px solid #bfdbfe" }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#38bdf8" }}>Net Payable</p>
                  <p className="text-base font-black mt-0.5" style={{ color: "#2563eb" }}>
                    Rs {parseFloat(payTarget.payable_salary || payTarget.total_amount).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                  </p>
                  {parseFloat(payTarget.advance_deducted || "0") > 0 && (
                    <p className="text-[9px] text-blue-600 font-semibold mt-0.5">
                      Earned: {parseFloat(payTarget.total_amount).toLocaleString(undefined, { minimumFractionDigits: 0 })} | Adv: −{parseFloat(payTarget.advance_deducted).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                    </p>
                  )}
                </div>
                <div className="p-2 rounded-lg bg-green-50 border border-green-100">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-green-700">Paid So Far</p>
                  <p className="text-base font-black mt-0.5 text-green-700">
                    Rs {parseFloat(payTarget.total_paid || "0").toLocaleString(undefined, { minimumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="p-2 rounded-lg" style={{
                  background: parseFloat(payTarget.payable_salary || payTarget.total_amount) - parseFloat(payTarget.total_paid || "0") > 0 ? "#fff7ed" : "#f0fdf4",
                  border: "1px solid",
                  borderColor: parseFloat(payTarget.payable_salary || payTarget.total_amount) - parseFloat(payTarget.total_paid || "0") > 0 ? "#fed7aa" : "#bbf7d0"
                }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide" style={{
                    color: parseFloat(payTarget.payable_salary || payTarget.total_amount) - parseFloat(payTarget.total_paid || "0") > 0 ? "#c2410c" : "#15803d"
                  }}>
                    {parseFloat(payTarget.payable_salary || payTarget.total_amount) - parseFloat(payTarget.total_paid || "0") > 0 ? "Still Owed" : "Advance"}
                  </p>
                  <p className="text-base font-black mt-0.5" style={{
                    color: parseFloat(payTarget.payable_salary || payTarget.total_amount) - parseFloat(payTarget.total_paid || "0") > 0 ? "#c2410c" : "#15803d"
                  }}>
                    Rs {Math.abs(parseFloat(payTarget.payable_salary || payTarget.total_amount) - parseFloat(payTarget.total_paid || "0")).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                  </p>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handlePaySubmit} className="px-6 py-5 space-y-4">
              {payError && (
                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-200">
                  {payError}
                </div>
              )}

              {/* Amount — the hero field */}
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: "#0b1329" }}>
                  Amount to Pay (Rs) <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-400 mb-2">
                  You can pay any amount — less than salary (partial), full, or more than salary (advance).
                </p>
                <NumberInput
                  value={payAmount}
                  onChange={setPayAmount}
                  placeholder="Enter amount…"
                  prefix="Rs"
                  min={0}
                  className="text-base"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "#1e3a8a" }}>
                    Payment Date <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    name="payment_date"
                    value={paymentDate}
                    onChange={setPaymentDate}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "#1e3a8a" }}>
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="payment_method"
                    className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition"
                    style={{ borderColor: "#bfdbfe", background: "#f0f4f8" }}
                    required
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Online">Online</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "#1e3a8a" }}>
                  Notes <span className="text-gray-300">(optional)</span>
                </label>
                <input
                  type="text"
                  name="notes"
                  placeholder="e.g. Advance against July, partial clearance…"
                  className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition"
                  style={{ borderColor: "#bfdbfe", background: "#f0f4f8" }}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPayTarget(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium border"
                  style={{ borderColor: "#bfdbfe", color: "#1e40af", background: "#f0f4f8" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={payLoading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg, #16a34a, #15803d)" }}
                >
                  {payLoading ? (
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Confirm Payment
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          DRAWER: Payment History
      ════════════════════════════════════════════════════════════════════ */}
      {historyTarget && liveHistorySlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-end p-0">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setHistoryTarget(null)}
          />
          <div
            className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col overflow-hidden"
            style={{ borderLeft: "1px solid #bfdbfe" }}
          >
            {/* Drawer header */}
            <div
              className="px-6 py-5 border-b flex items-center justify-between shrink-0"
              style={{ borderColor: "#bfdbfe", background: "#f0f4f8" }}
            >
              <div>
                <h3 className="text-base font-bold" style={{ color: "#0f224a" }}>
                  Payment History
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {liveHistorySlip.teacher?.name} · {liveHistorySlip.month}
                </p>
              </div>
              <button
                onClick={() => setHistoryTarget(null)}
                className="p-2 rounded-lg hover:bg-blue-50 transition text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Summary strip */}
            <div className="px-6 py-4 grid grid-cols-3 gap-3 shrink-0" style={{ borderBottom: "1px solid #dbeafe" }}>
              <div>
                <p className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: "#38bdf8" }}>Net Payable</p>
                <p className="text-sm font-black mt-0.5" style={{ color: "#2563eb" }}>
                  Rs {parseFloat(liveHistorySlip.payable_salary).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide font-semibold text-green-700">Total Paid</p>
                <p className="text-sm font-black mt-0.5 text-green-700">
                  Rs {parseFloat(liveHistorySlip.total_paid || "0").toLocaleString()}
                </p>
              </div>
              <div>
                {(() => {
                  const bal = parseFloat(liveHistorySlip.payable_salary) - parseFloat(liveHistorySlip.total_paid || "0");
                  return bal > 0 ? (
                    <div>
                      <p className="text-[10px] uppercase tracking-wide font-semibold text-red-600">Balance</p>
                      <p className="text-sm font-black mt-0.5 text-red-600">Rs {bal.toLocaleString()}</p>
                    </div>
                  ) : bal < 0 ? (
                    <div>
                      <p className="text-[10px] uppercase tracking-wide font-semibold text-green-600">Advance</p>
                      <p className="text-sm font-black mt-0.5 text-green-600">Rs {Math.abs(bal).toLocaleString()}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-[10px] uppercase tracking-wide font-semibold text-gray-400">Status</p>
                      <p className="text-sm font-black mt-0.5 text-gray-400">Cleared</p>
                    </div>
                  );
                })()}
              </div>
            </div>

            {parseFloat(String(liveHistorySlip.bf_deduction || "0")) > 0 && (
              <div className="px-6 py-2 bg-amber-50/70 border-b border-amber-200 flex items-center justify-between text-xs">
                <span className="font-semibold text-amber-900">
                  BF Deduction: Rs {parseFloat(String(liveHistorySlip.bf_deduction)).toLocaleString()} ({liveHistorySlip.bf_percentage}%)
                </span>
                <Link
                  href={`/dashboard/staff?ledger=${liveHistorySlip.teacher_id}`}
                  className="font-bold text-[#2563eb] hover:underline"
                >
                  View Staff Ledger →
                </Link>
              </div>
            )}

            {/* Payments list */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {!liveHistorySlip.payments || liveHistorySlip.payments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ background: "#f0f4f8", color: "#bfdbfe" }}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-400 font-medium">No payments recorded yet.</p>
                  <button
                    onClick={() => {
                      setHistoryTarget(null);
                      setPayError("");
                      setPayAmount("");
                      setPayTarget(liveHistorySlip);
                    }}
                    className="text-xs font-bold underline"
                    style={{ color: "#16a34a" }}
                  >
                    Record first payment →
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-gray-400 font-medium mb-2">
                    {liveHistorySlip.payments.length} payment{liveHistorySlip.payments.length !== 1 ? "s" : ""} recorded
                  </p>
                  {liveHistorySlip.payments.map((pay, idx) => (
                    <div
                      key={pay.id}
                      className="flex items-center justify-between p-4 rounded-xl border"
                      style={{ borderColor: "#dbeafe", background: "#fafafa" }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0"
                          style={{ background: "linear-gradient(135deg, #16a34a, #15803d)" }}
                        >
                          {idx + 1}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500">
                            {new Date(pay.payment_date).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}{" "}
                            · {pay.payment_method}
                          </p>
                          {pay.notes && (
                            <p className="text-[10px] text-gray-400 italic mt-0.5">{pay.notes}</p>
                          )}
                        </div>
                      </div>
                      <p className="font-black text-green-700 text-sm shrink-0">
                        Rs {parseFloat(pay.amount_paid).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Pay from drawer */}
            <div
              className="px-6 py-4 border-t shrink-0"
              style={{ borderColor: "#bfdbfe", background: "#f0f4f8" }}
            >
              <button
                onClick={() => {
                  setHistoryTarget(null);
                  setPayError("");
                  setPayAmount("");
                  setPayTarget(liveHistorySlip);
                }}
                className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition hover:opacity-90 active:scale-95"
                style={{ background: "linear-gradient(135deg, #16a34a, #15803d)" }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Another Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
