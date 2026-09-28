"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DatePicker } from "@/components/ui/date-picker";

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
}

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onRequestCategoryModal?: () => void; // Optional: to let parent know we want to manage categories
}

export default function ExpenseModal({ isOpen, onClose, onSuccess, onRequestCategoryModal }: ExpenseModalProps) {
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  
  const [selectedSession, setSelectedSession] = useState("");
  const [expTitle, setExpTitle] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expDate, setExpDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [expCatId, setExpCatId] = useState("");
  const [expDesc, setExpDesc] = useState("");
  
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [savingExp, setSavingExp] = useState(false);
  const [error, setError] = useState("");

  const fetchMetadata = useCallback(async () => {
    setLoadingMeta(true);
    try {
      const [resSess, resCat] = await Promise.all([
        fetch(`${API}/academic-sessions`, { headers: getAuthHeaders() }),
        fetch(`${API}/expense-categories`, { headers: getAuthHeaders() }),
      ]);
      if (resSess.ok) {
        const data = await resSess.json();
        setSessions(data);
        const active = data.find((s: AcademicSession) => s.is_active);
        if (active) setSelectedSession(active.id.toString());
        else if (data.length > 0) setSelectedSession(data[0].id.toString());
      }
      if (resCat.ok) {
        setCategories(await resCat.json());
      }
    } catch (err) {
      console.error("Error fetching metadata for expense modal", err);
    } finally {
      setLoadingMeta(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchMetadata();
      setExpTitle("");
      setExpAmount("");
      setExpDate(new Date().toISOString().split("T")[0]);
      setExpCatId("");
      setExpDesc("");
      setError("");
    }
  }, [isOpen, fetchMetadata]);

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession) {
      setError("No active academic session found.");
      return;
    }
    
    setSavingExp(true);
    setError("");
    try {
      const res = await fetch(`${API}/expenses`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          academic_session_id: selectedSession,
          title: expTitle,
          amount: parseFloat(expAmount),
          expense_date: expDate,
          expense_category_id: expCatId,
          description: expDesc,
        }),
      });
      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        const data = await res.json();
        setError(data.message || "Failed to save expense");
      }
    } catch (err: any) {
      setError(err.message || "Error saving expense");
    } finally {
      setSavingExp(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 z-10 border" style={{ borderColor: "#bfdbfe" }}>
        <h3 className="text-xl font-black mb-4" style={{ color: "#0f224a" }}>Record Expense</h3>
        
        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm border" style={{ background: "rgba(220,38,38,0.08)", borderColor: "rgba(220,38,38,0.3)", color: "#991b1b" }}>
            {error}
          </div>
        )}

        {loadingMeta ? (
          <div className="flex justify-center py-8">
            <svg className="animate-spin w-8 h-8" style={{ color: "#2563eb" }} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
          </div>
        ) : (
          <form onSubmit={handleSaveExpense} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "#2563eb" }}>Title *</label>
              <input required type="text" value={expTitle} onChange={(e) => setExpTitle(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border outline-none font-medium transition focus:ring-2 focus:ring-[#2563eb]/20" style={{ borderColor: "#bfdbfe", color: "#0f224a", background: "#f0f4f8" }} placeholder="e.g. November Electricity Bill" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "#2563eb" }}>Amount (Rs) *</label>
                <input required type="number" min="1" step="0.01" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border outline-none font-medium transition focus:ring-2 focus:ring-[#2563eb]/20" style={{ borderColor: "#bfdbfe", color: "#0f224a", background: "#f0f4f8" }} placeholder="0.00" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "#2563eb" }}>Date *</label>
                <DatePicker value={expDate} onChange={setExpDate} />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-end mb-1">
                <label className="block text-xs font-bold uppercase tracking-wide" style={{ color: "#2563eb" }}>Category *</label>
                {onRequestCategoryModal && (
                  <button type="button" onClick={() => { onClose(); onRequestCategoryModal(); }} className="text-[10px] font-bold text-blue-600 hover:text-blue-800">
                    + Manage Categories
                  </button>
                )}
              </div>
              {categories.length === 0 ? (
                <div className="text-sm text-red-500 font-medium py-2">
                  No categories found. Please manage categories first.
                </div>
              ) : (
                <select required value={expCatId} onChange={(e) => setExpCatId(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border outline-none font-medium transition focus:ring-2 focus:ring-[#2563eb]/20 bg-white" style={{ borderColor: "#bfdbfe", color: "#0f224a" }}>
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>
            
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "#2563eb" }}>Description (Optional)</label>
              <textarea rows={2} value={expDesc} onChange={(e) => setExpDesc(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border outline-none font-medium transition focus:ring-2 focus:ring-[#2563eb]/20" style={{ borderColor: "#bfdbfe", color: "#0f224a", background: "#f0f4f8" }} placeholder="Additional notes..." />
            </div>
            
            <div className="pt-2 flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl font-bold border transition hover:bg-gray-50 text-gray-600" style={{ borderColor: "#bfdbfe" }}>Cancel</button>
              <button type="submit" disabled={savingExp || categories.length === 0} className="flex-1 py-2.5 rounded-xl font-bold text-white transition active:scale-95 disabled:opacity-50" style={{ background: "linear-gradient(135deg, #2563eb, #1e3a8a)" }}>{savingExp ? "Saving..." : "Save Expense"}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
