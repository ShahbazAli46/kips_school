"use client";

import React, { useState, useEffect, useMemo, useId } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const STORAGE_URL = process.env.NEXT_PUBLIC_STORAGE_URL || "http://localhost:8000/storage";

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
  email: string | null;
  contact_number: string | null;
  image?: string | null;
  designation?: { name: string } | null;
  monthly_salary?: string | number | null;
  bf_percentage?: string | number | null;
  joining_date?: string | null;
  resignation_date?: string | null;
  is_active?: boolean;
}

interface LedgerSummary {
  monthly_salary: number;
  total_salary_earned: number;
  total_salary_paid: number;
  salary_balance: number;
  total_bf_accumulated: number;
  total_bf_settled: number;
  net_bf_balance: number;
  total_advance_taken: number;
  total_advance_deducted: number;
  remaining_advance: number;
}

interface LedgerTransaction {
  id: string;
  raw_date: string;
  date: string;
  type: string;
  category: "salary" | "payment" | "bf_settlement" | "advance";
  reference: string;
  description: string;
  gross_amount?: number;
  credit: number;
  debit: number;
  bf_credit: number;
  bf_debit: number;
  running_salary_balance: number;
  running_bf_balance: number;
  status: string;
  payment_method?: string;
}

interface BfTransaction {
  id: string;
  date: string;
  type: string;
  reference: string;
  base_salary: number;
  percentage: number;
  deduction_amount: number;
  payout_amount: number;
  running_bf_balance: number;
  description: string;
}

interface StaffLedgerModalProps {
  staff: StaffMember;
  onClose: () => void;
  onOpenAdjustment?: () => void;
  onStaffUpdated?: () => void;
}

export default function StaffLedgerModal({
  staff,
  onClose,
  onOpenAdjustment,
  onStaffUpdated,
}: StaffLedgerModalProps) {
  const payoutAmountId = useId();
  const payoutDateId = useId();
  const paymentMethodId = useId();
  const payoutNotesId = useId();
  const markResignedId = useId();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [ledger, setLedger] = useState<LedgerTransaction[]>([]);
  const [bfLedger, setBfLedger] = useState<BfTransaction[]>([]);
  const [staffInfo, setStaffInfo] = useState<any>(null);

  const [activeTab, setActiveTab] = useState<"statement" | "bf" | "adjustments">("statement");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  // BF Settlement (Resignation payout) modal state
  const [showSettleModal, setShowSettleModal] = useState<boolean>(false);
  const [settleAmount, setSettleAmount] = useState<string>("");
  const [settleDate, setSettleDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [settleMethod, setSettleMethod] = useState<string>("Cash");
  const [settleNotes, setSettleNotes] = useState<string>("");
  const [markAsResigned, setMarkAsResigned] = useState<boolean>(true);
  const [settleLoading, setSettleLoading] = useState<boolean>(false);
  const [settleError, setSettleError] = useState<string>("");

  const fetchLedger = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/staff/${staff.id}/ledger`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load staff ledger");

      setSummary(data.summary);
      setLedger(data.ledger || []);
      setBfLedger(data.bf_ledger || []);
      setStaffInfo(data.staff);
      setSettleAmount(String(data.summary.net_bf_balance || ""));
    } catch (err: any) {
      setError(err.message || "Error loading ledger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [staff.id]);

  const handleSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(settleAmount);
    if (!amt || amt <= 0) {
      setSettleError("Please enter a valid settlement amount.");
      return;
    }

    setSettleLoading(true);
    setSettleError("");

    try {
      const res = await fetch(`${API}/staff/${staff.id}/bf-settlement`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          amount: amt,
          settlement_date: settleDate,
          payment_method: settleMethod,
          notes: settleNotes.trim() || null,
          is_resignation: true,
          mark_as_resigned: markAsResigned,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to record BF settlement");

      setShowSettleModal(false);
      setSettleNotes("");
      await fetchLedger();
      if (onStaffUpdated) onStaffUpdated();
    } catch (err: any) {
      setSettleError(err.message || "An error occurred");
    } finally {
      setSettleLoading(false);
    }
  };

  const handleDeleteSettlement = async (settlementId: number) => {
    if (!confirm("Are you sure you want to revert this BF settlement?")) return;
    try {
      const res = await fetch(`${API}/staff/${staff.id}/bf-settlement/${settlementId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete settlement");
      await fetchLedger();
      if (onStaffUpdated) onStaffUpdated();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePrint = () => {
    window.open(`/dashboard/staff/ledger/print?id=${staff.id}`, "_blank");
  };

  const filteredTransactions = useMemo(() => {
    return ledger.filter((item) => {
      if (filterCategory !== "all" && item.category !== filterCategory) return false;
      if (search) {
        const query = search.toLowerCase();
        return (
          item.description.toLowerCase().includes(query) ||
          item.reference.toLowerCase().includes(query) ||
          item.date.toLowerCase().includes(query) ||
          item.type.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [ledger, filterCategory, search]);

  const photoUrl = staff.image
    ? staff.image.startsWith("http")
      ? staff.image
      : `${STORAGE_URL}/${staff.image}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 print:p-0 print:static print:bg-white">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm print:hidden"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-[#bfdbfe] z-10 max-h-[96vh] flex flex-col overflow-hidden print:border-none print:shadow-none print:max-h-none print:rounded-none">
        {/* ── Modal Header ── */}
        <div
          className="px-6 py-4 border-b flex flex-wrap items-center justify-between gap-4 shrink-0"
          style={{ borderColor: "#bfdbfe", background: "#f0f4f8" }}
        >
          <div className="flex items-center gap-3.5">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={staff.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm shrink-0"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center font-black text-white text-base shadow-sm shrink-0"
                style={{ background: "linear-gradient(135deg, #38bdf8, #2563eb)" }}
              >
                {staff.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-extrabold text-[#0f224a]">
                  {staff.name}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-[#1e40af] border border-blue-200">
                  {staff.designation?.name || "Staff Member"}
                </span>
                {staffInfo && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      staffInfo.is_active
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : "bg-red-100 text-red-800 border border-red-300"
                    }`}
                  >
                    {staffInfo.is_active ? "● Active Staff" : "○ Resigned / Inactive"}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Staff ID #{staff.id} · Monthly Base: Rs {summary ? summary.monthly_salary.toLocaleString() : (staff.monthly_salary ? Number(staff.monthly_salary).toLocaleString() : "0")} · Contact: {staff.contact_number || "N/A"} · Email: {staff.email || "N/A"}
              </p>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl text-xs font-bold border border-blue-200 bg-white text-[#1e40af] hover:bg-blue-50 transition shadow-xs flex items-center gap-1.5"
              title="Print official staff ledger statement"
            >
              <span>🖨️</span>
              <span>Print Statement</span>
            </button>

            {onOpenAdjustment && (
              <button
                onClick={onOpenAdjustment}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-white transition hover:opacity-90 active:scale-95 shadow-xs flex items-center gap-1.5"
                style={{ background: "linear-gradient(135deg, #2563eb, #1e3a8a)" }}
              >
                <span>📈</span>
                <span>Adjust Salary</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>



        {/* ── Sub Navigation Tabs ── */}
        <div
          className="px-6 py-2 border-b flex items-center justify-between shrink-0 bg-white print:hidden"
          style={{ borderColor: "#dbeafe" }}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("statement")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === "statement"
                  ? "bg-[#2563eb] text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span>📑</span>
              <span>Account Ledger Statement ({ledger.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("bf")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === "bf"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-amber-900 hover:bg-amber-50"
              }`}
            >
              <span>🛡️</span>
              <span>Benevolent Fund (BF) Details ({bfLedger.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("adjustments")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === "adjustments"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-indigo-900 hover:bg-indigo-50"
              }`}
            >
              <span>📈</span>
              <span>Salary Adjustment History</span>
            </button>
          </div>

          {activeTab === "statement" && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search transactions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs outline-none w-44 focus:border-blue-400"
              />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold outline-none bg-white text-slate-700"
              >
                <option value="all">All Types</option>
                <option value="salary">Salary Generated</option>
                <option value="payment">Salary Payments</option>
                <option value="bf_settlement">BF Settlements</option>
              </select>
            </div>
          )}
        </div>

        {/* ── Main Tab Contents (Scrollable) ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="py-24 text-center text-slate-400">
              <svg className="animate-spin w-8 h-8 text-[#2563eb] mx-auto mb-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm font-medium">Loading ledger statement...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-50 text-red-700 border border-red-200 text-center text-sm">
              {error}
            </div>
          ) : activeTab === "statement" ? (
            /* TAB 1: Complete Statement Table */
            <div className="space-y-4">
              <div className="border border-[#bfdbfe] rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#f0f4f8] text-[#1e3a8a] font-bold uppercase tracking-wider border-b border-[#bfdbfe]">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Ref / Type</th>
                      <th className="py-3 px-4">Description Breakdown</th>
                      <th className="py-3 px-4 text-right">Credit (Earned)</th>
                      <th className="py-3 px-4 text-right">Debit (Paid)</th>
                      <th className="py-3 px-4 text-right">BF Contrib.</th>
                      <th className="py-3 px-4 text-right">Salary Balance</th>
                      <th className="py-3 px-4 text-right">BF Balance</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#dbeafe]">
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-400">
                          No transactions found for this staff member.
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-blue-50/40 transition">
                          <td className="py-3 px-4 font-semibold text-slate-700 whitespace-nowrap">
                            {tx.date}
                          </td>

                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                tx.category === "salary"
                                  ? "bg-blue-100 text-[#1e40af]"
                                  : tx.category === "payment"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-900"
                              }`}
                            >
                              {tx.type}
                            </span>
                            <span className="block text-[10px] text-slate-400 mt-0.5">
                              {tx.reference}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-slate-600 max-w-xs">
                            <p className="line-clamp-2">{tx.description}</p>
                          </td>

                          {/* Credit (Earned) */}
                          <td className="py-3 px-4 text-right font-black text-[#2563eb]">
                            {tx.credit > 0 ? `+ Rs ${tx.credit.toLocaleString()}` : "—"}
                          </td>

                          {/* Debit (Paid) */}
                          <td className="py-3 px-4 text-right font-black text-emerald-700">
                            {tx.debit > 0 ? `− Rs ${tx.debit.toLocaleString()}` : "—"}
                          </td>

                          {/* BF Contribution */}
                          <td className="py-3 px-4 text-right font-bold text-amber-800">
                            {tx.bf_credit > 0 ? (
                              <span>+ Rs {tx.bf_credit.toLocaleString()}</span>
                            ) : tx.bf_debit > 0 ? (
                              <span className="text-red-700">− Rs {tx.bf_debit.toLocaleString()}</span>
                            ) : (
                              "—"
                            )}
                          </td>

                          {/* Running Salary Balance */}
                          <td className="py-3 px-4 text-right font-extrabold text-[#0f224a]">
                            Rs {tx.running_salary_balance.toLocaleString()}
                          </td>

                          {/* Running BF Balance */}
                          <td className="py-3 px-4 text-right font-bold text-amber-900">
                            Rs {tx.running_bf_balance.toLocaleString()}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                                tx.status === "paid" || tx.status === "completed" || tx.status === "settled"
                                  ? "bg-green-100 text-green-800"
                                  : tx.status === "partial"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {tx.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {summary && (
                    <tfoot className="bg-[#f0f4f8] font-bold text-xs text-[#0f224a] border-t-2 border-[#bfdbfe]">
                      <tr>
                        <td colSpan={3} className="py-3 px-4 uppercase text-[11px] tracking-wider text-slate-600">
                          Total Summary
                        </td>
                        <td className="py-3 px-4 text-right text-[#2563eb]">
                          Rs {summary.total_salary_earned.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-emerald-700">
                          Rs {summary.total_salary_paid.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-amber-900">
                          Rs {summary.total_bf_accumulated.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-[#0f224a]">
                          Rs {summary.salary_balance.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-amber-950">
                          Rs {summary.net_bf_balance.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {summary.salary_balance > 0 ? (
                            <span className="text-[10px] px-2 py-0.5 rounded font-extrabold bg-red-100 text-red-800">
                              Dues Pending
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded font-extrabold bg-green-100 text-green-800">
                              Cleared
                            </span>
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          ) : activeTab === "bf" ? (
            /* TAB 2: Benevolent Fund (BF) Details & Resignation Settlement */
            <div className="space-y-6">
              {/* BF Info Banner */}
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-300 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🛡️</span>
                    <h3 className="text-base font-extrabold text-amber-950">
                      Benevolent Fund (BF) Policy &amp; Accumulation
                    </h3>
                  </div>
                  <p className="text-xs text-amber-900 max-w-2xl leading-relaxed">
                    A fixed percentage is deducted from the staff member&apos;s monthly salary and credited to this Benevolent Fund reserve.
                    When the staff member resigns or their contract concludes, the accumulated fund is disbursed to them.
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs flex items-center justify-between gap-4 shrink-0">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-amber-800 block">
                      Total Available for Collection
                    </span>
                    <p className="text-2xl font-black text-amber-950">
                      Rs {summary ? summary.net_bf_balance.toLocaleString() : "0"}
                    </p>
                  </div>
                  {summary && summary.net_bf_balance > 0 && (
                    <button
                      onClick={() => setShowSettleModal(true)}
                      className="px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-amber-600 hover:bg-amber-700 transition active:scale-95 shadow-sm"
                    >
                      Collect / Settle Upon Resignation
                    </button>
                  )}
                </div>
              </div>

              {/* BF Contributions Table */}
              <div className="border border-amber-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="px-5 py-3.5 bg-amber-100/60 border-b border-amber-200 flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                    Benevolent Fund Transaction History ({bfLedger.length})
                  </h4>
                  <span className="text-[11px] text-amber-800 font-semibold">
                    Running Pool Audit
                  </span>
                </div>

                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#fdf9f7] text-amber-900 font-bold uppercase tracking-wider border-b border-amber-200">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Transaction Type</th>
                      <th className="py-3 px-4">Reference / Month</th>
                      <th className="py-3 px-4 text-right">Base Salary &amp; %</th>
                      <th className="py-3 px-4 text-right">Deducted (Added +)</th>
                      <th className="py-3 px-4 text-right">Settled (Paid −)</th>
                      <th className="py-3 px-4 text-right">BF Pool Balance</th>
                      <th className="py-3 px-4 text-right print:hidden">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100">
                    {bfLedger.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          No Benevolent Fund transactions recorded yet.
                        </td>
                      </tr>
                    ) : (
                      bfLedger.map((bf) => {
                        const isSettlement = bf.payout_amount > 0;
                        const settlementIdMatch = bf.id.match(/\d+/);
                        const settlementId = settlementIdMatch ? parseInt(settlementIdMatch[0], 10) : null;

                        return (
                          <tr key={bf.id} className="hover:bg-amber-50/40 transition">
                            <td className="py-3 px-4 font-semibold text-slate-700 whitespace-nowrap">
                              {bf.date}
                            </td>

                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isSettlement
                                    ? "bg-red-100 text-red-800"
                                    : "bg-amber-100 text-amber-900"
                                }`}
                              >
                                {bf.type}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-slate-600">
                              {bf.reference}
                            </td>

                            <td className="py-3 px-4 text-right text-slate-600">
                              {bf.base_salary > 0
                                ? `Rs ${bf.base_salary.toLocaleString()} @ ${bf.percentage}%`
                                : "—"}
                            </td>

                            <td className="py-3 px-4 text-right font-black text-amber-900">
                              {bf.deduction_amount > 0 ? `+ Rs ${bf.deduction_amount.toLocaleString()}` : "—"}
                            </td>

                            <td className="py-3 px-4 text-right font-black text-red-700">
                              {bf.payout_amount > 0 ? `− Rs ${bf.payout_amount.toLocaleString()}` : "—"}
                            </td>

                            <td className="py-3 px-4 text-right font-black text-amber-950">
                              Rs {bf.running_bf_balance.toLocaleString()}
                            </td>

                            <td className="py-3 px-4 text-right print:hidden">
                              {isSettlement && settlementId && (
                                <button
                                  onClick={() => handleDeleteSettlement(settlementId)}
                                  className="text-[11px] text-red-600 hover:underline font-bold"
                                  title="Revert settlement"
                                >
                                  Revert
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* TAB 3: Salary Adjustments History */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-[#0f224a]">
                    Salary Increment &amp; Decrement History
                  </h4>
                  <p className="text-xs text-slate-500">
                    Audit trail of all base monthly salary alterations
                  </p>
                </div>
                {onOpenAdjustment && (
                  <button
                    onClick={onOpenAdjustment}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#2563eb] hover:bg-[#1e3a8a] transition flex items-center gap-1.5 shadow-sm"
                  >
                    <span>+</span>
                    <span>Adjust Salary Now</span>
                  </button>
                )}
              </div>

              <div className="border border-[#bfdbfe] rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#f0f4f8] text-[#1e3a8a] font-bold uppercase tracking-wider border-b border-[#bfdbfe]">
                      <th className="py-3 px-4">Effective Date</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4 text-right">Adjustment Amount</th>
                      <th className="py-3 px-4 text-right">Previous Salary</th>
                      <th className="py-3 px-4 text-right">New Salary</th>
                      <th className="py-3 px-4">Reason / Remarks</th>
                      <th className="py-3 px-4 text-right">Recorded By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#dbeafe]">
                    {!staffInfo?.salary_adjustments || staffInfo.salary_adjustments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          No salary adjustments recorded yet for this staff member.
                        </td>
                      </tr>
                    ) : (
                      staffInfo.salary_adjustments.map((adj: any) => (
                        <tr key={adj.id} className="hover:bg-blue-50/40 transition">
                          <td className="py-3 px-4 font-semibold text-slate-700">
                            {adj.effective_date}
                          </td>

                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                adj.type === "increment"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {adj.type === "increment" ? "+ Increment" : "− Decrement"}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right font-black text-[#0f224a]">
                            Rs {parseFloat(adj.amount).toLocaleString()}
                          </td>

                          <td className="py-3 px-4 text-right text-slate-500">
                            Rs {parseFloat(adj.previous_salary).toLocaleString()}
                          </td>

                          <td className="py-3 px-4 text-right font-black text-[#2563eb]">
                            Rs {parseFloat(adj.new_salary).toLocaleString()}
                          </td>

                          <td className="py-3 px-4 text-slate-600 max-w-xs">
                            {adj.reason || "—"}
                          </td>

                          <td className="py-3 px-4 text-right text-slate-400">
                            {adj.created_by?.name || "Admin"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ── Modal Footer ── */}
        <div
          className="px-6 py-3 border-t bg-[#f0f4f8] flex items-center justify-between text-xs text-slate-500 shrink-0 print:hidden"
          style={{ borderColor: "#bfdbfe" }}
        >
          <span>KIPS School &amp; College System · Staff Financial Ledger</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 transition"
          >
            Close
          </button>
        </div>
      </div>

      {/* ── Sub-Modal: Benevolent Fund (BF) Resignation Settlement ── */}
      {showSettleModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setShowSettleModal(false)}
          />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 border border-amber-300 z-10 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-amber-200">
              <div className="flex items-center gap-2">
                <span className="text-xl">🛡️</span>
                <h3 className="text-lg font-bold text-amber-950">
                  Resignation &amp; BF Collection
                </h3>
              </div>
              <button
                onClick={() => setShowSettleModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {settleError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs font-semibold">
                {settleError}
              </div>
            )}

            <form onSubmit={handleSettleSubmit} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex justify-between items-center text-xs">
                <span className="font-semibold text-amber-900">Total Accumulated BF Pool:</span>
                <span className="font-black text-amber-950 text-base">
                  Rs {summary ? summary.net_bf_balance.toLocaleString() : "0"}
                </span>
              </div>

              <div>
                <label htmlFor={payoutAmountId} className="block text-xs font-semibold text-[#1e3a8a] mb-1">
                  Payout / Collection Amount (PKR) *
                </label>
                <input
                  id={payoutAmountId}
                  required
                  type="number"
                  min="1"
                  max={summary?.net_bf_balance || undefined}
                  step="0.01"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm font-bold text-[#0f224a] outline-none"
                  style={{ borderColor: "#bfdbfe", background: "#f0f4f8" }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor={payoutDateId} className="block text-xs font-semibold text-[#1e3a8a] mb-1">
                    Settlement Date *
                  </label>
                  <input
                    id={payoutDateId}
                    required
                    type="date"
                    value={settleDate}
                    onChange={(e) => setSettleDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-xs outline-none"
                    style={{ borderColor: "#bfdbfe", background: "#f0f4f8" }}
                  />
                </div>

                <div>
                  <label htmlFor={paymentMethodId} className="block text-xs font-semibold text-[#1e3a8a] mb-1">
                    Payment Method *
                  </label>
                  <select
                    id={paymentMethodId}
                    value={settleMethod}
                    onChange={(e) => setSettleMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-xs outline-none bg-[#f0f4f8]"
                    style={{ borderColor: "#bfdbfe" }}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Online">Online</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor={payoutNotesId} className="block text-xs font-semibold text-[#1e3a8a] mb-1">
                  Resignation Remarks / Notes
                </label>
                <input
                  id={payoutNotesId}
                  type="text"
                  placeholder="e.g. Resigned on good terms, BF fully collected"
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs outline-none"
                  style={{ borderColor: "#bfdbfe", background: "#f0f4f8" }}
                />
              </div>

              <label htmlFor={markResignedId} className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer select-none">
                <input
                  id={markResignedId}
                  type="checkbox"
                  checked={markAsResigned}
                  onChange={(e) => setMarkAsResigned(e.target.checked)}
                  className="w-4 h-4 rounded text-[#2563eb] accent-[#2563eb]"
                />
                <span className="text-xs font-semibold text-slate-700">
                  Mark Staff Member as Resigned (Inactive)
                </span>
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSettleModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={settleLoading}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition active:scale-95 disabled:opacity-50 shadow-sm"
                >
                  {settleLoading ? "Recording Payout..." : "Confirm & Settle BF"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
