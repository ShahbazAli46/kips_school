"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Plus, Settings2, Trash2, Tag, Calendar, DollarSign, FileText } from "lucide-react";
import { format } from "date-fns";
import CustomDropdown from "@/components/CustomDropdown";
import ExpenseModal from "@/components/ExpenseModal";
import { useSearchParams } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders() {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };
}

interface AcademicSession {
  id: number;
  name: string;
  is_active: boolean;
}

interface ExpenseCategory {
  id: number;
  name: string;
  description: string | null;
}

interface Expense {
  id: number;
  expense_category_id: number;
  amount: string | number;
  expense_date: string;
  title: string;
  description: string | null;
  category?: ExpenseCategory;
  recorder?: { name: string };
}

function ExpensesPageContent() {
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [selectedFilterCategory, setSelectedFilterCategory] = useState<string>("all");

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  // Form states
  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");
  const [savingCat, setSavingCat] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("action") === "add_expense") {
      setShowExpenseModal(true);
    }
  }, [searchParams]);

  const fetchData = useCallback(async () => {
    if (!selectedSession || !selectedMonth) return;
    setLoading(true);
    try {
      let expensesUrl = `${API}/expenses?academic_session_id=${selectedSession}&month_year=${selectedMonth}`;
      if (selectedFilterCategory && selectedFilterCategory !== "all") {
        expensesUrl += `&category_id=${selectedFilterCategory}`;
      }

      const [catRes, expRes] = await Promise.all([
        fetch(`${API}/expense-categories`, { headers: getAuthHeaders() }),
        fetch(expensesUrl, { headers: getAuthHeaders() }),
      ]);
      if (catRes.ok) setCategories(await catRes.json());
      if (expRes.ok) {
        const data = await expRes.json();
        setExpenses(data.expenses || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedSession, selectedMonth, selectedFilterCategory]);

  useEffect(() => {
    fetch(`${API}/academic-sessions`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((data) => {
        setSessions(data);
        const active = data.find((s: AcademicSession) => s.is_active);
        if (active) setSelectedSession(active.id.toString());
        else if (data.length > 0) setSelectedSession(data[0].id.toString());
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName) return;
    setSavingCat(true);
    try {
      const res = await fetch(`${API}/expense-categories`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: catName, description: catDesc }),
      });
      if (res.ok) {
        setCatName("");
        setCatDesc("");
        fetchData();
      } else {
        const data = await res.json();
        alert(data.message || "Failed to save category");
      }
    } catch (err) {
      alert("Error saving category");
    } finally {
      setSavingCat(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    try {
      const res = await fetch(`${API}/expense-categories/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setCategories(categories.filter((c) => c.id !== id));
      } else {
        const data = await res.json();
        alert(data.message || "Failed to delete");
      }
    } catch (err) {
      alert("Error deleting category");
    }
  };


  const handleDeleteExpense = async (id: number) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    try {
      const res = await fetch(`${API}/expenses/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setExpenses(expenses.filter((e) => e.id !== id));
      }
    } catch (err) {
      alert("Error deleting expense");
    }
  };

  const thisMonthExpenses = useMemo(() => {
    return expenses.reduce((acc, curr) => acc + parseFloat(curr.amount.toString()), 0);
  }, [expenses]);

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: "#1e3a8a" }}>Expenses Management</h1>
          <p className="text-sm mt-1" style={{ color: "#2563eb" }}>Track academy expenditures efficiently.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="px-4 py-2 bg-white rounded-lg border shadow-sm font-semibold text-sm transition hover:bg-blue-50 flex items-center gap-2"
            style={{ color: "#2563eb", borderColor: "#bfdbfe" }}
          >
            <Settings2 className="w-4 h-4" /> Manage Categories
          </button>
          <button
            onClick={() => {
              if (categories.length === 0) {
                alert("Please create at least one Expense Category first.");
                setShowCategoryModal(true);
                return;
              }
              setShowExpenseModal(true);
            }}
            className="px-4 py-2 rounded-lg text-white shadow-sm font-semibold text-sm transition active:scale-95 flex items-center gap-2"
            style={{ background: "linear-gradient(135deg, #2563eb, #1e3a8a)" }}
          >
            <Plus className="w-4 h-4" /> Record Expense
          </button>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-sm border mb-6 flex flex-wrap gap-4 items-end" style={{ borderColor: "#bfdbfe" }}>
        <div className="w-56">
          <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "#2563eb" }}>Academic Session</label>
          <CustomDropdown
            name="session"
            value={selectedSession}
            onChange={(name, val) => setSelectedSession(val as string)}
            placeholder="Select Session"
            options={sessions.map((s) => ({ label: s.name, value: s.id.toString() }))}
          />
        </div>
        <div className="w-48">
          <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "#2563eb" }}>Month</label>
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border outline-none font-medium transition cursor-pointer"
            style={{ background: "#f0f4f8", borderColor: "#bfdbfe", color: "#0f224a" }}
          />
        </div>
        <div className="w-56">
          <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "#2563eb" }}>Category Filter</label>
          <CustomDropdown
            name="category"
            value={selectedFilterCategory}
            onChange={(name, val) => setSelectedFilterCategory(val as string)}
            placeholder="All Categories"
            options={[
              { label: "All Categories", value: "all" },
              ...categories.map((c) => ({ label: c.name, value: c.id.toString() }))
            ]}
          />
        </div>
      </div>

      <div className="mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border" style={{ borderColor: "#bfdbfe" }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "#f0f4f8" }}>
              <DollarSign className="w-5 h-5" style={{ color: "#2563eb" }} />
            </div>
            <h3 className="font-bold text-gray-500 uppercase text-xs tracking-wider">Selected Month</h3>
          </div>
          <p className="text-3xl font-black ml-13" style={{ color: "#0f224a" }}>Rs. {thisMonthExpenses.toLocaleString()}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <svg className="animate-spin w-8 h-8" style={{ color: "#2563eb" }} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
        </div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border shadow-sm" style={{ borderColor: "#bfdbfe" }}>
          <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: "#2563eb" }} />
          <p className="text-lg font-bold" style={{ color: "#1e3a8a" }}>No Expenses Recorded</p>
          <p className="text-sm text-gray-500 mt-1">Start by clicking "Record Expense" above.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{ borderColor: "#bfdbfe" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr style={{ background: "#f0f4f8", borderBottom: "1px solid #bfdbfe" }}>
                  <th className="px-5 py-4 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Date</th>
                  <th className="px-5 py-4 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Title</th>
                  <th className="px-5 py-4 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Category</th>
                  <th className="px-5 py-4 font-semibold text-xs uppercase tracking-wide text-right" style={{ color: "#2563eb" }}>Amount</th>
                  <th className="px-5 py-4 font-semibold text-xs uppercase tracking-wide text-right" style={{ color: "#2563eb" }}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "#dbeafe" }}>
                {expenses.map((expense) => (
                  <tr key={expense.id} className="transition-colors hover:bg-blue-50/50">
                    <td className="px-5 py-4 whitespace-nowrap text-gray-600 font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {format(new Date(expense.expense_date), "MMM d, yyyy")}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-bold" style={{ color: "#0f224a" }}>{expense.title}</p>
                      {expense.description && <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{expense.description}</p>}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-white border shadow-sm" style={{ borderColor: "#bfdbfe", color: "#1e40af" }}>
                        <Tag className="w-3 h-3" />
                        {expense.category?.name || "Uncategorized"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <p className="font-black text-lg" style={{ color: "#2563eb" }}>Rs. {parseFloat(expense.amount.toString()).toLocaleString()}</p>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => handleDeleteExpense(expense.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EXPENSE MODAL */}
      <ExpenseModal
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        onSuccess={fetchData}
        onRequestCategoryModal={() => setShowCategoryModal(true)}
      />

      {/* CATEGORIES MODAL */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCategoryModal(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 z-10 border max-h-[90vh] flex flex-col" style={{ borderColor: "#bfdbfe" }}>
            <h3 className="text-xl font-black mb-1" style={{ color: "#0f224a" }}>Expense Categories</h3>
            <p className="text-xs text-gray-500 mb-4">Manage types of expenses you track.</p>
            
            <form onSubmit={handleSaveCategory} className="flex gap-2 mb-6">
              <input required type="text" value={catName} onChange={(e) => setCatName(e.target.value)} className="flex-1 px-4 py-2 rounded-xl border outline-none text-sm transition focus:ring-2 focus:ring-[#2563eb]/20" style={{ borderColor: "#bfdbfe", background: "#f0f4f8" }} placeholder="New Category Name (e.g. Utilities)" />
              <button type="submit" disabled={savingCat} className="px-4 py-2 rounded-xl font-bold text-white text-sm transition active:scale-95 disabled:opacity-50 whitespace-nowrap" style={{ background: "#2563eb" }}>
                Add
              </button>
            </form>

            <div className="flex-1 overflow-y-auto pr-2">
              {categories.length === 0 ? (
                <p className="text-center text-sm text-gray-500 py-4 italic">No categories created yet.</p>
              ) : (
                <div className="space-y-2">
                  {categories.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-3 rounded-xl border bg-white" style={{ borderColor: "#dbeafe" }}>
                      <span className="font-bold" style={{ color: "#1e3a8a" }}>{c.name}</span>
                      <button onClick={() => handleDeleteCategory(c.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 mt-2 border-t flex justify-end" style={{ borderColor: "#bfdbfe" }}>
              <button onClick={() => setShowCategoryModal(false)} className="px-5 py-2.5 rounded-xl font-bold border transition hover:bg-gray-50 text-gray-600" style={{ borderColor: "#bfdbfe" }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default function ExpensesPage() {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <ExpensesPageContent />
    </React.Suspense>
  );
}
