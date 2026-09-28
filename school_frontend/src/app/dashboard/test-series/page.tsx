"use client";

import React, { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";

// ─── Types ────────────────────────────────────────────────────────────────────
interface TestSeries {
  id: number;
  name: string;
  test_category_id: number;
  academic_session_id: number;
  category?: { id: number; name: string };
  academic_session?: { id: number; name: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// ─── Modal Component ──────────────────────────────────────────────────────────
interface ModalProps {
  title: string;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: TestSeries;
  sessions: any[];
  categories: any[];
  loading: boolean;
  error: string;
}

function SeriesModal({ title, onClose, onSubmit, initialData, sessions, categories, loading, error }: ModalProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [sessionId, setSessionId] = useState(initialData?.academic_session_id || (sessions[0]?.id || ""));
  const [categoryId, setCategoryId] = useState(initialData?.test_category_id || (categories[0]?.id || ""));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl shadow-2xl p-6 bg-white border border-[#bfdbfe] z-10">
        <h2 className="text-lg font-bold text-[#0f224a] mb-4">{title}</h2>
        {error && <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">{error}</div>}
        <form onSubmit={(e) => { e.preventDefault(); onSubmit({ name: name.trim(), academic_session_id: sessionId, test_category_id: categoryId }); }} className="space-y-4">
          
          <div>
            <label className="block text-sm font-medium mb-1 text-[#1e3a8a]">Session</label>
            <select value={sessionId} onChange={(e) => setSessionId(e.target.value)} required className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-[#2563eb]">
              <option value="">Select Session</option>
              {sessions.map(s => <option key={s.id} value={s.id}>{s.name} {s.is_active ? '(Active)' : ''}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-[#1e3a8a]">Category</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-[#2563eb]">
              <option value="">Select Category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-[#1e3a8a]">Series Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Golden 1, CT 1" required className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-[#2563eb]" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border">Cancel</button>
            <button type="submit" disabled={loading || !name || !sessionId || !categoryId} className="flex-1 py-2 rounded-lg text-white font-semibold bg-[#2563eb] hover:bg-[#1e3a8a]">{loading ? "Saving..." : "Save"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ManageTestSeriesPage() {
  const [seriesList, setSeriesList] = useState<TestSeries[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<TestSeries | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resSeries, resSess, resCat] = await Promise.all([
        fetch(`${API}/test-series`, { headers: getAuthHeaders() }),
        fetch(`${API}/academic-sessions`, { headers: getAuthHeaders() }),
        fetch(`${API}/test-categories`, { headers: getAuthHeaders() }),
      ]);
      setSeriesList(await resSeries.json());
      setSessions(await resSess.json());
      setCategories(await resCat.json());
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async (data: any) => {
    setModalLoading(true); setModalError("");
    try {
      const res = await fetch(`${API}/test-series`, { method: "POST", headers: getAuthHeaders(), body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Failed to create");
      fetchData(); setShowCreate(false);
    } catch (err: any) { setModalError(err.message); } finally { setModalLoading(false); }
  };

  const handleUpdate = async (data: any) => {
    if (!editTarget) return;
    setModalLoading(true); setModalError("");
    try {
      const res = await fetch(`${API}/test-series/${editTarget.id}`, { method: "PUT", headers: getAuthHeaders(), body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Failed to update");
      fetchData(); setEditTarget(null);
    } catch (err: any) { setModalError(err.message); } finally { setModalLoading(false); }
  };

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#0f224a]">Test Series</h2>
        <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-[#2563eb] text-white rounded-lg font-medium">+ Add Series</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#bfdbfe] overflow-hidden">
        {loading ? <div className="p-10 text-center">Loading...</div> : (
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f0f4f8] text-[#2563eb] border-b border-[#bfdbfe]">
              <tr>
                <th className="px-5 py-3">Session</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Series Name</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dbeafe]">
              {seriesList.map(s => (
                <tr key={s.id} className="hover:bg-blue-50">
                  <td className="px-5 py-3 text-gray-700">{s.academic_session?.name}</td>
                  <td className="px-5 py-3 text-gray-700">{s.category?.name}</td>
                  <td className="px-5 py-3 font-bold text-[#1e3a8a]">{s.name}</td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => setEditTarget(s)} className="text-[#2563eb] text-xs font-bold px-2 py-1 hover:bg-[#bfdbfe] rounded">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && <SeriesModal title="Add Test Series" sessions={sessions} categories={categories} onClose={() => setShowCreate(false)} onSubmit={handleCreate} loading={modalLoading} error={modalError} />}
      {editTarget && <SeriesModal title="Edit Test Series" initialData={editTarget} sessions={sessions} categories={categories} onClose={() => setEditTarget(null)} onSubmit={handleUpdate} loading={modalLoading} error={modalError} />}
    </DashboardLayout>
  );
}
