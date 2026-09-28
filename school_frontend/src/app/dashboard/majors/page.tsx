"use client";

import React, { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Subject {
  id: number;
  name: string;
}

interface Major {
  id: number;
  name: string;
  subjects: Subject[];
  created_at: string;
  updated_at: string;
  created_by: { id: number; name: string } | null;
  updated_by: { id: number; name: string } | null;
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
  allSubjects: Subject[];
  onClose: () => void;
  onSubmit: (data: { name: string; subject_ids: number[] }) => void;
  initialName?: string;
  initialSubjectIds?: number[];
  loading: boolean;
  error: string;
}

function MajorModal({
  title,
  allSubjects,
  onClose,
  onSubmit,
  initialName = "",
  initialSubjectIds = [],
  loading,
  error,
}: ModalProps) {
  const [name, setName] = useState(initialName);
  const [subjectIds, setSubjectIds] = useState<number[]>(initialSubjectIds);

  const toggleSubject = (id: number) => {
    setSubjectIds((prev) =>
      prev.includes(id) ? prev.filter((sId) => sId !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />

      {/* Modal card */}
      <div
        className="relative w-full max-w-md rounded-2xl shadow-2xl p-6 z-10 max-h-[90vh] flex flex-col"
        style={{ background: "#fff", border: "1px solid #bfdbfe" }}
      >
        <div className="flex items-center justify-between mb-5 shrink-0">
          <h2 className="text-lg font-bold" style={{ color: "#0f224a" }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 transition"
            style={{ background: "#f0f4f8" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div
            className="mb-4 p-3 rounded-lg text-sm border shrink-0"
            style={{
              background: "rgba(220,38,38,0.08)",
              borderColor: "rgba(220,38,38,0.3)",
              color: "#991b1b",
            }}
          >
            {error}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({ name: name.trim(), subject_ids: subjectIds });
          }}
          className="flex-1 overflow-y-auto space-y-5"
        >
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "#1e3a8a" }}>
              Major Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Medical, Engineering, ICS"
              autoFocus
              required
              className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition"
              style={{
                borderColor: "#bfdbfe",
                color: "#0f224a",
                background: "#f0f4f8",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
              onBlur={(e) => (e.target.style.borderColor = "#bfdbfe")}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "#1e3a8a" }}>
              Assign Subjects
            </label>
            {allSubjects.length === 0 ? (
              <p className="text-xs italic" style={{ color: "#38bdf8" }}>No subjects available. Please create some first.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-[30vh] overflow-y-auto p-1">
                {allSubjects.map((sub) => (
                  <label
                    key={sub.id}
                    className="flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors"
                    style={{
                      borderColor: subjectIds.includes(sub.id) ? "#2563eb" : "#bfdbfe",
                      background: subjectIds.includes(sub.id) ? "rgba(138,50,24,0.05)" : "#f0f4f8",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={subjectIds.includes(sub.id)}
                      onChange={() => toggleSubject(sub.id)}
                      className="w-4 h-4 text-[#2563eb] border-[#bfdbfe] rounded focus:ring-[#2563eb]"
                      style={{ accentColor: "#2563eb" }}
                    />
                    <span className="text-sm font-medium" style={{ color: "#0f224a" }}>
                      {sub.name}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium border transition"
              style={{ borderColor: "#bfdbfe", color: "#1e40af", background: "#f0f4f8" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #2563eb, #1e3a8a)" }}
            >
              {loading ? "Saving..." : "Save Major"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ──────────────────────────────────────────────────────
interface DeleteModalProps {
  majorName: string;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

function DeleteModal({ majorName, onClose, onConfirm, loading }: DeleteModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-sm rounded-2xl shadow-2xl p-6 z-10 text-center"
        style={{ background: "#fff", border: "1px solid #fca5a5" }}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: "rgba(220,38,38,0.1)" }}
        >
          <svg className="w-7 h-7" fill="none" stroke="#dc2626" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <h3 className="text-lg font-bold mb-2" style={{ color: "#0b1329" }}>
          Delete Major?
        </h3>
        <p className="text-sm mb-6" style={{ color: "#1e40af" }}>
          Are you sure you want to delete <strong>&quot;{majorName}&quot;</strong>? This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium border transition"
            style={{ borderColor: "#bfdbfe", color: "#1e40af", background: "#f0f4f8" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition active:scale-95 disabled:opacity-50"
            style={{ background: "#dc2626" }}
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ManageMajorsPage() {
  const [majors, setMajors] = useState<Major[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal state
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Major | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Major | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  // ── Fetch ────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resMajors, resSubjects] = await Promise.all([
        fetch(`${API}/majors`, { headers: getAuthHeaders() }),
        fetch(`${API}/subjects`, { headers: getAuthHeaders() }),
      ]);
      const dataMajors = await resMajors.json();
      const dataSubjects = await resSubjects.json();
      setMajors(dataMajors);
      setAllSubjects(dataSubjects);
    } catch {
      // handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Create ───────────────────────────────────────────────
  const handleCreate = async (data: { name: string; subject_ids: number[] }) => {
    setModalLoading(true);
    setModalError("");
    try {
      const res = await fetch(`${API}/majors`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to create major");
      setMajors((prev) => [...prev, json].sort((a, b) => a.name.localeCompare(b.name)));
      setShowCreate(false);
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  // ── Update ───────────────────────────────────────────────
  const handleUpdate = async (data: { name: string; subject_ids: number[] }) => {
    if (!editTarget) return;
    setModalLoading(true);
    setModalError("");
    try {
      const res = await fetch(`${API}/majors/${editTarget.id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to update major");
      setMajors((prev) =>
        prev.map((m) => (m.id === editTarget.id ? json : m)).sort((a, b) => a.name.localeCompare(b.name))
      );
      setEditTarget(null);
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setModalLoading(true);
    try {
      await fetch(`${API}/majors/${deleteTarget.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      setMajors((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setModalLoading(false);
    }
  };

  const filtered = majors.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.subjects.some(s => s.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <DashboardLayout>
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "#0f224a" }}>
            Manage Majors
          </h2>
          <p className="text-sm mt-1" style={{ color: "#2563eb" }}>
            Add or edit academic majors and assign subjects (e.g. Medical, Engineering)
          </p>
        </div>
        <button
          id="add-major-btn"
          onClick={() => { setModalError(""); setShowCreate(true); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md transition-all active:scale-95 hover:shadow-lg shrink-0"
          style={{ background: "linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%)" }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add New Major
        </button>
      </div>

      {/* Search bar */}
      <div className="relative mb-5 max-w-sm">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
          style={{ color: "#38bdf8" }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search majors or subjects..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none transition"
          style={{
            background: "#fff",
            borderColor: "#bfdbfe",
            color: "#0f224a",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
          onBlur={(e) => (e.target.style.borderColor = "#bfdbfe")}
        />
      </div>

      {/* Table card */}
      <div
        className="rounded-2xl overflow-hidden shadow-sm border"
        style={{ background: "#fff", borderColor: "#bfdbfe" }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin w-8 h-8" style={{ color: "#2563eb" }} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <svg className="w-14 h-14" style={{ color: "#bfdbfe" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-sm font-medium" style={{ color: "#38bdf8" }}>
              {search ? `No majors match "${search}"` : "No majors yet. Add your first one!"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#f0f4f8", borderBottom: "1px solid #bfdbfe" }}>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>#</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Major Name</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Subjects</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wide hidden md:table-cell" style={{ color: "#2563eb" }}>Created By</th>
                  <th className="text-right px-5 py-3.5 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "#dbeafe" }}>
                {filtered.map((m, idx) => (
                  <tr
                    key={m.id}
                    className="transition-colors"
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#f0f4f8")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                  >
                    <td className="px-5 py-3.5 font-medium" style={{ color: "#38bdf8" }}>
                      {idx + 1}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className="inline-block px-3 py-1 rounded-full text-xs font-bold"
                        style={{ background: "#1e3a8a", color: "#fff" }}
                      >
                        {m.name}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {m.subjects.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {m.subjects.map(sub => (
                            <span
                              key={sub.id}
                              className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold"
                              style={{ background: "rgba(107,37,20,0.1)", color: "#1e3a8a", border: "1px solid rgba(107,37,20,0.2)" }}
                            >
                              {sub.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs italic" style={{ color: "#38bdf8" }}>No subjects</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell" style={{ color: "#1e40af" }}>
                      {m.created_by?.name ?? "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        {/* Edit */}
                        <button
                          onClick={() => { setModalError(""); setEditTarget(m); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all active:scale-95"
                          style={{ borderColor: "#bfdbfe", color: "#1e3a8a", background: "#f0f4f8" }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.background = "#1e3a8a";
                            (e.currentTarget as HTMLElement).style.color = "#fff";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.background = "#f0f4f8";
                            (e.currentTarget as HTMLElement).style.color = "#1e3a8a";
                          }}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => setDeleteTarget(m)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all active:scale-95"
                          style={{ borderColor: "#fca5a5", color: "#dc2626", background: "rgba(220,38,38,0.05)" }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.background = "#dc2626";
                            (e.currentTarget as HTMLElement).style.color = "#fff";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.background = "rgba(220,38,38,0.05)";
                            (e.currentTarget as HTMLElement).style.color = "#dc2626";
                          }}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer count */}
        {!loading && majors.length > 0 && (
          <div
            className="px-5 py-3 flex items-center justify-between text-xs border-t"
            style={{ borderColor: "#dbeafe", color: "#38bdf8", background: "#f0f4f8" }}
          >
            <span>Showing {filtered.length} of {majors.length} majors</span>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <MajorModal
          title="Add New Major"
          allSubjects={allSubjects}
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
          loading={modalLoading}
          error={modalError}
        />
      )}

      {editTarget && (
        <MajorModal
          title={`Edit Major — ${editTarget.name}`}
          allSubjects={allSubjects}
          onClose={() => setEditTarget(null)}
          onSubmit={handleUpdate}
          initialName={editTarget.name}
          initialSubjectIds={editTarget.subjects.map((s) => s.id)}
          loading={modalLoading}
          error={modalError}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          majorName={deleteTarget.name}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          loading={modalLoading}
        />
      )}
    </DashboardLayout>
  );
}
