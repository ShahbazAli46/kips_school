"use client";

import React, { useState, useEffect, useId } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

interface StaffMember {
  id: number;
  name: string;
  monthly_salary: string | number | null;
  designation?: { name: string } | null;
}

interface SalaryAdjustment {
  id: number;
  user_id: number;
  type: "increment" | "decrement";
  amount: string;
  previous_salary: string;
  new_salary: string;
  effective_date: string;
  reason: string | null;
  created_at: string;
  created_by?: { name: string } | null;
}

interface SalaryAdjustmentModalProps {
  staff: StaffMember;
  onClose: () => void;
  onSuccess: (newSalary: number) => void;
}

export default function SalaryAdjustmentModal({
  staff,
  onClose,
  onSuccess,
}: SalaryAdjustmentModalProps) {
  const amountInputId = useId();
  const dateInputId = useId();
  const reasonInputId = useId();

  const [type, setType] = useState<"increment" | "decrement">("increment");
  const [amount, setAmount] = useState<string>("");
  const [effectiveDate, setEffectiveDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [reason, setReason] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const [history, setHistory] = useState<SalaryAdjustment[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);

  const currentSalary = parseFloat(String(staff.monthly_salary || "0"));
  const numAmount = parseFloat(amount || "0") || 0;
  const newSalary =
    type === "increment"
      ? currentSalary + numAmount
      : Math.max(0, currentSalary - numAmount);
  const percentageChange =
    currentSalary > 0 && numAmount > 0
      ? ((numAmount / currentSalary) * 100).toFixed(1)
      : null;

  // Fetch adjustments history
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`${API}/staff/${staff.id}/salary-adjustments`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setHistory(data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [staff.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numAmount || numAmount <= 0) {
      setError("Please enter a valid amount greater than 0.");
      return;
    }
    if (type === "decrement" && numAmount > currentSalary) {
      setError("Decrement cannot be greater than the current monthly salary.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API}/staff/${staff.id}/salary-adjustments`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          type,
          amount: numAmount,
          effective_date: effectiveDate,
          reason: reason.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to adjust salary");
      }

      onSuccess(newSalary);
      await fetchHistory();
      setAmount("");
      setReason("");
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAdjustment = async (adjId: number) => {
    if (!confirm("Are you sure you want to revert this salary adjustment? This will restore the previous salary.")) {
      return;
    }

    try {
      const res = await fetch(`${API}/staff/${staff.id}/salary-adjustments/${adjId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete adjustment");

      if (data.current_salary !== undefined) {
        onSuccess(parseFloat(data.current_salary));
      }
      await fetchHistory();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const quickReasons = [
    "Annual Increment",
    "Performance Review",
    "Promotion",
    "Department Reassessment",
    "Disciplinary Deduction",
    "Contract Renewal",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-6 border border-[#bfdbfe] z-10 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 mb-4 border-b border-[#dbeafe]">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-100 text-[#2563eb] text-sm">📈</span>
              <h3 className="text-xl font-bold text-[#0f224a]">
                Salary Increment / Decrement
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {staff.name} · {staff.designation?.name || "Staff Member"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            {error}
          </div>
        )}

        {/* Current Salary Banner */}
        <div className="p-4 rounded-xl border border-blue-200 bg-[#f0f4f8] flex items-center justify-between mb-5">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#1e3a8a]">
              Current Base Monthly Salary
            </span>
            <p className="text-2xl font-black text-[#0f224a] mt-0.5">
              Rs {currentSalary.toLocaleString()}
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-white text-[#2563eb] border border-[#bfdbfe] shadow-xs">
            Active Baseline
          </span>
        </div>

        {/* Adjustment Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Increment vs Decrement Selector */}
          <div>
            <label className="block text-xs font-bold text-[#1e3a8a] mb-2 uppercase tracking-wider">
              Adjustment Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType("increment")}
                className={`py-3 px-4 rounded-xl font-bold text-sm border flex items-center justify-center gap-2 transition active:scale-98 ${
                  type === "increment"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm ring-2 ring-emerald-500/20"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span className="text-base">➕</span>
                <span>Increment (Increase)</span>
              </button>

              <button
                type="button"
                onClick={() => setType("decrement")}
                className={`py-3 px-4 rounded-xl font-bold text-sm border flex items-center justify-center gap-2 transition active:scale-98 ${
                  type === "decrement"
                    ? "bg-amber-50 border-amber-500 text-amber-800 shadow-sm ring-2 ring-amber-500/20"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span className="text-base">➖</span>
                <span>Decrement (Decrease)</span>
              </button>
            </div>
          </div>

          {/* Amount and Effective Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor={amountInputId} className="block text-xs font-semibold text-[#1e3a8a] mb-1">
                Adjustment Amount (PKR) *
              </label>
              <input
                id={amountInputId}
                required
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 5000"
                className="w-full px-4 py-2.5 rounded-xl border text-sm font-bold text-[#0f224a] outline-none"
                style={{ borderColor: "#bfdbfe", background: "#f0f4f8" }}
              />
            </div>

            <div>
              <label htmlFor={dateInputId} className="block text-xs font-semibold text-[#1e3a8a] mb-1">
                Effective Date *
              </label>
              <input
                id={dateInputId}
                required
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none"
                style={{ borderColor: "#bfdbfe", background: "#f0f4f8" }}
              />
            </div>
          </div>

          {/* Live Calculation Preview Card */}
          {numAmount > 0 && (
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between text-sm transition-all ${
                type === "increment"
                  ? "bg-emerald-50/70 border-emerald-300 text-emerald-950"
                  : "bg-amber-50/70 border-amber-300 text-amber-950"
              }`}
            >
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider block">
                  New Monthly Salary Preview
                </span>
                <span className="font-extrabold text-base">
                  Rs {currentSalary.toLocaleString()} {type === "increment" ? "+" : "−"} Rs {numAmount.toLocaleString()} =
                  {" "}
                  <span className="underline font-black text-lg">
                    Rs {newSalary.toLocaleString()}
                  </span>
                </span>
              </div>
              {percentageChange && (
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    type === "increment"
                      ? "bg-emerald-200 text-emerald-900"
                      : "bg-amber-200 text-amber-900"
                  }`}
                >
                  {type === "increment" ? "+" : "−"}{percentageChange}%
                </span>
              )}
            </div>
          )}

          {/* Reason / Remarks */}
          <div>
            <label htmlFor={reasonInputId} className="block text-xs font-semibold text-[#1e3a8a] mb-1">
              Reason / Remarks (Optional)
            </label>
            <input
              id={reasonInputId}
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Annual revision 2026, promotion to Senior Lecturer"
              className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none"
              style={{ borderColor: "#bfdbfe", background: "#f0f4f8" }}
            />
            {/* Quick chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {quickReasons.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-50 text-[#1e40af] hover:bg-blue-100 border border-blue-200 transition"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold border text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={loading || numAmount <= 0}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition active:scale-95 disabled:opacity-50 shadow-sm"
              style={{
                background:
                  type === "increment"
                    ? "linear-gradient(135deg, #10b981, #047857)"
                    : "linear-gradient(135deg, #f59e0b, #d97706)",
              }}
            >
              {loading
                ? "Applying..."
                : `Apply ${type === "increment" ? "Increment" : "Decrement"}`}
            </button>
          </div>
        </form>

        {/* Adjustments History */}
        <div className="mt-8 pt-5 border-t border-[#dbeafe]">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-[#1e3a8a] uppercase tracking-wider">
              Adjustment Audit History ({history.length})
            </h4>
            <span className="text-[11px] text-slate-400">Chronological Record</span>
          </div>

          {loadingHistory ? (
            <p className="text-xs text-slate-400 py-3 text-center">Loading history...</p>
          ) : history.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-400">
              No salary adjustments recorded yet for this staff member.
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {history.map((adj) => (
                <div
                  key={adj.id}
                  className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-xs hover:border-blue-300 transition"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-md font-extrabold uppercase text-[10px] ${
                          adj.type === "increment"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {adj.type === "increment" ? "+ Increment" : "− Decrement"}
                      </span>
                      <span className="font-black text-[#0f224a]">
                        Rs {parseFloat(adj.amount).toLocaleString()}
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        (Rs {parseFloat(adj.previous_salary).toLocaleString()} → Rs {parseFloat(adj.new_salary).toLocaleString()})
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px]">
                      {adj.reason || "No remarks"} · Effective: {adj.effective_date}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">
                      {adj.created_by?.name ? `By ${adj.created_by.name}` : ""}
                    </span>
                    <button
                      onClick={() => handleDeleteAdjustment(adj.id)}
                      className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition"
                      title="Revert adjustment"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
