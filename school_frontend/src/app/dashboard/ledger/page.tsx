"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { format } from "date-fns";
import { ArrowDownLeft, ArrowUpRight, TrendingUp, DollarSign, Calendar as CalendarIcon, User, Search, Trash2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders() {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };
}

interface Transaction {
  id: string;
  date: string;
  type: "Fee" | "Expense" | "Salary" | "Advance Salary" | string;
  transaction_type: "Credit" | "Debit";
  amount: number;
  party_name: string;
  description: string;
  recorded_by: string;
}

interface DeleteModalProps {
  transaction: Transaction;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

function DeleteModal({ transaction, onClose, onConfirm, loading }: DeleteModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 animate-fade-in"
        style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-sm rounded-2xl shadow-2xl p-6 z-10 text-center animate-scale-up"
        style={{ background: "#fff", border: "1px solid #fca5a5" }}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: "rgba(220,38,38,0.1)" }}
        >
          <svg className="w-7 h-7" fill="none" stroke="#dc2626" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </div>
        <h3 className="text-lg font-bold mb-2" style={{ color: "#0b1329" }}>
          Remove Transaction?
        </h3>
        <p className="text-sm mb-3" style={{ color: "#1e40af" }}>
          Are you sure you want to remove this <strong>{transaction.type}</strong> transaction for{" "}
          <strong>&quot;{transaction.party_name}&quot;</strong>?
        </p>

        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-5 text-xs text-red-700 text-left font-medium space-y-1">
          <div className="flex justify-between">
            <span>Amount:</span>
            <strong className="text-sm">Rs. {transaction.amount.toLocaleString()}</strong>
          </div>
          <div className="flex justify-between text-[11px] text-red-600">
            <span>Type:</span>
            <span className="uppercase font-bold">{transaction.transaction_type} ({transaction.type})</span>
          </div>
          {transaction.description && (
            <div className="text-[11px] text-gray-600 border-t border-red-200/60 pt-1 mt-1 truncate">
              Note: {transaction.description}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium border transition hover:bg-gray-50"
            style={{ borderColor: "#bfdbfe", color: "#1e40af", background: "#f0f4f8" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition active:scale-95 disabled:opacity-50 shadow-md"
            style={{ background: "#dc2626" }}
          >
            {loading ? "Removing..." : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LedgerPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const fetchData = useCallback(async () => {
    if (!selectedMonth) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/ledger?month_year=${selectedMonth}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API}/ledger/${deleteTarget.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setDeleteTarget(null);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.message || "Failed to delete transaction");
      }
    } catch (e) {
      alert("Error deleting transaction");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Calculations
  const { totalCredit, totalDebit } = useMemo(() => {
    let credit = 0;
    let debit = 0;
    transactions.forEach((t) => {
      if (t.transaction_type === "Credit") credit += t.amount;
      if (t.transaction_type === "Debit") debit += t.amount;
    });
    return { totalCredit: credit, totalDebit: debit };
  }, [transactions]);

  const netBalance = totalCredit - totalDebit;

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: "#0f224a" }}>Master Ledger</h1>
          <p className="text-sm mt-1" style={{ color: "#2563eb" }}>Complete overview of incomings and outgoings.</p>
        </div>
        <div className="flex gap-2 items-center bg-white p-2 rounded-xl border shadow-sm" style={{ borderColor: "#bfdbfe" }}>
          <CalendarIcon className="w-4 h-4 ml-2 text-gray-400" />
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-2 py-1 outline-none text-sm font-bold text-[#1e3a8a] bg-transparent cursor-pointer"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border relative overflow-hidden" style={{ borderColor: "#bfdbfe" }}>
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <ArrowDownLeft className="w-16 h-16 text-green-500" />
          </div>
          <h3 className="font-bold text-gray-500 uppercase text-xs tracking-wider mb-2">Total Income (Credits)</h3>
          <p className="text-3xl font-black text-green-600">Rs. {totalCredit.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-2">From fee collections</p>
        </div>
        
        <div className="bg-white rounded-2xl p-6 shadow-sm border relative overflow-hidden" style={{ borderColor: "#bfdbfe" }}>
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <ArrowUpRight className="w-16 h-16 text-red-500" />
          </div>
          <h3 className="font-bold text-gray-500 uppercase text-xs tracking-wider mb-2">Total Outgoing (Debits)</h3>
          <p className="text-3xl font-black text-red-500">Rs. {totalDebit.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-2">Expenses, Salaries & Advance Payments</p>
        </div>

        <div className="rounded-2xl p-6 shadow-md border relative overflow-hidden" style={{ background: "linear-gradient(135deg, #2563eb, #1e3a8a)", borderColor: "#1e3a8a" }}>
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <TrendingUp className="w-16 h-16 text-white" />
          </div>
          <h3 className="font-bold text-white/80 uppercase text-xs tracking-wider mb-2">Net Balance</h3>
          <p className="text-3xl font-black text-white">Rs. {netBalance.toLocaleString()}</p>
          <p className="text-xs text-white/60 mt-2">For {format(new Date(selectedMonth + "-01"), "MMMM yyyy")}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <svg className="animate-spin w-8 h-8" style={{ color: "#2563eb" }} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border shadow-sm" style={{ borderColor: "#bfdbfe" }}>
          <Search className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: "#2563eb" }} />
          <p className="text-lg font-bold" style={{ color: "#1e3a8a" }}>No Transactions Found</p>
          <p className="text-sm text-gray-500 mt-1">There are no financial records for {format(new Date(selectedMonth + "-01"), "MMMM yyyy")}.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{ borderColor: "#bfdbfe" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr style={{ background: "#f0f4f8", borderBottom: "1px solid #bfdbfe" }}>
                  <th className="px-5 py-4 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Date</th>
                  <th className="px-5 py-4 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Transaction Details</th>
                  <th className="px-5 py-4 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Party / Reference</th>
                  <th className="px-5 py-4 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Recorded By</th>
                  <th className="px-5 py-4 font-semibold text-xs uppercase tracking-wide text-right" style={{ color: "#2563eb" }}>Credit (In)</th>
                  <th className="px-5 py-4 font-semibold text-xs uppercase tracking-wide text-right" style={{ color: "#2563eb" }}>Debit (Out)</th>
                  <th className="px-5 py-4 font-semibold text-xs uppercase tracking-wide text-right" style={{ color: "#2563eb" }}>Balance</th>
                  <th className="px-5 py-4 font-semibold text-xs uppercase tracking-wide text-center" style={{ color: "#2563eb" }}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "#dbeafe" }}>
                {(() => {
                  let runningBalance = 0;
                  return transactions.map((t) => {
                    if (t.transaction_type === "Credit") runningBalance += t.amount;
                    else runningBalance -= t.amount;

                    const isCredit = t.transaction_type === "Credit";

                    return (
                      <tr key={t.id} className="transition-colors hover:bg-blue-50/30">
                        <td className="px-5 py-4 whitespace-nowrap text-gray-600 font-medium">
                          {format(new Date(t.date), "MMM d, yyyy")}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                              t.type === "Fee" ? "bg-blue-100 text-blue-700" :
                              t.type === "Salary" ? "bg-purple-100 text-purple-700" :
                              t.type === "Advance Salary" ? "bg-amber-100 text-amber-800 border border-amber-200" :
                              "bg-blue-100 text-blue-700"
                            }`}>
                              {t.type}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 truncate max-w-[200px]" title={t.description}>
                            {t.description}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isCredit ? 'bg-green-100' : 'bg-red-100'}`}>
                              <User className={`w-3 h-3 ${isCredit ? 'text-green-700' : 'text-red-700'}`} />
                            </div>
                            <span className="font-bold text-gray-800">{t.party_name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-xs font-medium text-gray-500">
                          {t.recorded_by}
                        </td>
                        <td className="px-5 py-4 text-right">
                          {isCredit ? (
                            <span className="font-black text-green-600">Rs. {t.amount.toLocaleString()}</span>
                          ) : <span className="text-gray-300">-</span>}
                        </td>
                        <td className="px-5 py-4 text-right">
                          {!isCredit ? (
                            <span className="font-black text-red-500">Rs. {t.amount.toLocaleString()}</span>
                          ) : <span className="text-gray-300">-</span>}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className={`font-black ${runningBalance >= 0 ? "text-gray-800" : "text-red-600"}`}>
                            Rs. {runningBalance.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <button
                            onClick={() => setDeleteTarget(t)}
                            title="Remove transaction"
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors inline-flex items-center justify-center"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {deleteTarget && (
        <DeleteModal
          transaction={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
          loading={deleteLoading}
        />
      )}
    </DashboardLayout>
  );
}
