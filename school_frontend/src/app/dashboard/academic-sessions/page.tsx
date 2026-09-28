"use client";

import React, { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { DatePicker } from "@/components/ui/date-picker";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AcademicSession {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Modal Component ──────────────────────────────────────────────────────────
interface ModalProps {
  title: string;
  onClose: () => void;
  onSubmit: (data: { name: string; start_date: string; end_date: string; is_active: boolean }) => void;
  initialData?: AcademicSession;
  loading: boolean;
  error: string;
}

function SessionModal({
  title,
  onClose,
  onSubmit,
  initialData,
  loading,
  error,
}: ModalProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [isActive, setIsActive] = useState(initialData ? initialData.is_active : false);

  const defaultStartDate = initialData?.start_date || "2000-01-01";
  const defaultEndDate = initialData?.end_date || "2100-12-31";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl shadow-2xl p-6 z-10" style={{ background: "#fff", border: "1px solid #bfdbfe" }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold" style={{ color: "#0f224a" }}>{title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 transition" style={{ background: "#f0f4f8" }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm border" style={{ background: "rgba(220,38,38,0.08)", borderColor: "rgba(220,38,38,0.3)", color: "#991b1b" }}>
            {error}
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); onSubmit({ name: name.trim(), start_date: defaultStartDate, end_date: defaultEndDate, is_active: isActive }); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "#1e3a8a" }}>Session Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 2024-2025" required className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition" style={{ borderColor: "#bfdbfe", color: "#0f224a", background: "#f0f4f8" }} onFocus={(e) => (e.target.style.borderColor = "#2563eb")} onBlur={(e) => (e.target.style.borderColor = "#bfdbfe")} />
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer mt-2">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 text-[#2563eb] rounded" style={{ accentColor: "#2563eb" }} />
              <span className="text-sm font-medium" style={{ color: "#1e3a8a" }}>Is Active Session?</span>
            </label>
            <p className="text-xs text-gray-500 mt-1">Checking this will automatically deactivate any other active session.</p>
          </div>

          <div className="flex gap-3 mt-6 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium border transition" style={{ borderColor: "#bfdbfe", color: "#1e40af", background: "#f0f4f8" }}>Cancel</button>
            <button type="submit" disabled={loading || !name.trim()} className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50" style={{ background: "linear-gradient(135deg, #2563eb, #1e3a8a)" }}>{loading ? "Saving..." : "Save Session"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ──────────────────────────────────────────────────────
function DeleteModal({ name, onClose, onConfirm, loading }: { name: string; onClose: () => void; onConfirm: () => void; loading: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl shadow-2xl p-6 z-10 text-center" style={{ background: "#fff", border: "1px solid #fca5a5" }}>
        <h3 className="text-lg font-bold mb-2 text-red-600">Delete Session?</h3>
        <p className="text-sm mb-6 text-gray-600">Are you sure you want to delete <strong>&quot;{name}&quot;</strong>?</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium border text-gray-600 bg-gray-50">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white bg-red-600">Delete</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ManageAcademicSessionsPage() {
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<AcademicSession | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AcademicSession | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/academic-sessions`, { headers: getAuthHeaders() });
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async (data: any) => {
    setModalLoading(true); setModalError("");
    try {
      const res = await fetch(`${API}/academic-sessions`, { method: "POST", headers: getAuthHeaders(), body: JSON.stringify(data) });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to create session");
      fetchData(); setShowCreate(false);
    } catch (err: any) { setModalError(err.message); } finally { setModalLoading(false); }
  };

  const handleUpdate = async (data: any) => {
    if (!editTarget) return;
    setModalLoading(true); setModalError("");
    try {
      const res = await fetch(`${API}/academic-sessions/${editTarget.id}`, { method: "PUT", headers: getAuthHeaders(), body: JSON.stringify(data) });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to update session");
      fetchData(); setEditTarget(null);
    } catch (err: any) { setModalError(err.message); } finally { setModalLoading(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setModalLoading(true);
    try {
      await fetch(`${API}/academic-sessions/${deleteTarget.id}`, { method: "DELETE", headers: getAuthHeaders() });
      setSessions((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
    } finally { setModalLoading(false); }
  };

  const filtered = sessions.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "#0f224a" }}>Academic Sessions</h2>
          <p className="text-sm mt-1" style={{ color: "#2563eb" }}>Manage academic years for tests and marks.</p>
        </div>
        <button onClick={() => { setModalError(""); setShowCreate(true); }} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all shadow-md active:scale-95 hover:shadow-lg" style={{ background: "linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%)" }}>
          + Add New Session
        </button>
      </div>

      <div className="relative mb-5 max-w-sm">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search sessions..." className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition" style={{ borderColor: "#bfdbfe" }} />
      </div>

      <div className="rounded-2xl overflow-hidden shadow-sm border bg-white border-[#bfdbfe]">
        {loading ? (
          <div className="p-10 text-center text-gray-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-[#38bdf8]">No sessions found.</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-[#f0f4f8] text-[#2563eb] border-b border-[#bfdbfe]">
              <tr>
                <th className="px-5 py-3 font-semibold uppercase">Session Name</th>
                <th className="px-5 py-3 font-semibold uppercase">Status</th>
                <th className="px-5 py-3 font-semibold uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dbeafe]">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-[#f0f4f8] transition-colors">
                  <td className="px-5 py-3 font-bold text-[#1e3a8a]">{s.name}</td>
                  <td className="px-5 py-3">
                    {s.is_active ? <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold">Active</span> : <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-bold">Inactive</span>}
                  </td>
                  <td className="px-5 py-3 text-right space-x-2">
                    <button onClick={() => setEditTarget(s)} className="text-[#2563eb] text-xs font-bold px-2 py-1 rounded hover:bg-blue-100 transition">Edit</button>
                    <button onClick={() => setDeleteTarget(s)} className="text-red-600 text-xs font-bold px-2 py-1 rounded hover:bg-red-50 transition">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && <SessionModal title="Add Academic Session" onClose={() => setShowCreate(false)} onSubmit={handleCreate} loading={modalLoading} error={modalError} />}
      {editTarget && <SessionModal title="Edit Academic Session" initialData={editTarget} onClose={() => setEditTarget(null)} onSubmit={handleUpdate} loading={modalLoading} error={modalError} />}
      {deleteTarget && <DeleteModal name={deleteTarget.name} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} loading={modalLoading} />}
    </DashboardLayout>
  );
}
