"use client";

import React, { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Section {
  id: number;
  name: string;
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
  onClose: () => void;
  onSubmit: (name: string) => void;
  initialValue?: string;
  loading: boolean;
  error: string;
}

function SectionModal({ title, onClose, onSubmit, initialValue = "", loading, error }: ModalProps) {
  const [name, setName] = useState(initialValue);

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
        className="relative w-full max-w-md rounded-2xl shadow-2xl p-6 z-10"
        style={{ background: "#fff", border: "1px solid #bfdbfe" }}
      >
        <div className="flex items-center justify-between mb-5">
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
            className="mb-4 p-3 rounded-lg text-sm border"
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
            onSubmit(name.trim());
          }}
        >
          <label className="block text-sm font-medium mb-1.5" style={{ color: "#1e3a8a" }}>
            Section Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Pink, Blue, Gray"
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

          <div className="flex gap-3 mt-6">
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
              {loading ? "Saving..." : "Save Section"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ──────────────────────────────────────────────────────
interface DeleteModalProps {
  sectionName: string;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

function DeleteModal({ sectionName, onClose, onConfirm, loading }: DeleteModalProps) {
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
          Delete Section?
        </h3>
        <p className="text-sm mb-6" style={{ color: "#1e40af" }}>
          Are you sure you want to delete <strong>&quot;{sectionName}&quot;</strong>? This action cannot be undone.
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
export default function ManageSectionsPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal state
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Section | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Section | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  // ── Fetch ────────────────────────────────────────────────
  const fetchSections = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/sections`, { headers: getAuthHeaders() });
      const data = await res.json();
      setSections(Array.isArray(data) ? data : []);
    } catch {
      // handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSections(); }, [fetchSections]);

  // ── Create ───────────────────────────────────────────────
  const handleCreate = async (name: string) => {
    setModalLoading(true);
    setModalError("");
    try {
      const res = await fetch(`${API}/sections`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create section");
      setSections((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setShowCreate(false);
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  // ── Update ───────────────────────────────────────────────
  const handleUpdate = async (name: string) => {
    if (!editTarget) return;
    setModalLoading(true);
    setModalError("");
    try {
      const res = await fetch(`${API}/sections/${editTarget.id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update section");
      setSections((prev) =>
        prev.map((s) => (s.id === editTarget.id ? data : s)).sort((a, b) => a.name.localeCompare(b.name))
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
      await fetch(`${API}/sections/${deleteTarget.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      setSections((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setModalLoading(false);
    }
  };

  const filtered = sections.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "#0f224a" }}>
            Manage Sections
          </h2>
          <p className="text-sm mt-1" style={{ color: "#2563eb" }}>
            Add or edit class sections (e.g. Pink, Blue, Gray)
          </p>
        </div>
        <button
          id="add-section-btn"
          onClick={() => { setModalError(""); setShowCreate(true); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md transition-all active:scale-95 hover:shadow-lg shrink-0"
          style={{ background: "linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%)" }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add New Section
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
          placeholder="Search sections..."
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <p className="text-sm font-medium" style={{ color: "#38bdf8" }}>
              {search ? `No sections match "${search}"` : "No sections yet. Add your first one!"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#f0f4f8", borderBottom: "1px solid #bfdbfe" }}>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>#</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Section Name</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wide hidden md:table-cell" style={{ color: "#2563eb" }}>Created By</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wide hidden md:table-cell" style={{ color: "#2563eb" }}>Created On</th>
                  <th className="text-right px-5 py-3.5 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "#dbeafe" }}>
                {filtered.map((sec, idx) => (
                  <tr
                    key={sec.id}
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
                        style={{ background: "rgba(107,37,20,0.1)", color: "#1e3a8a", border: "1px solid rgba(107,37,20,0.2)" }}
                      >
                        {sec.name}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell" style={{ color: "#1e40af" }}>
                      {sec.created_by?.name ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell" style={{ color: "#1e40af" }}>
                      {formatDate(sec.created_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        {/* Edit */}
                        <button
                          onClick={() => { setModalError(""); setEditTarget(sec); }}
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
                          onClick={() => setDeleteTarget(sec)}
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
        {!loading && sections.length > 0 && (
          <div
            className="px-5 py-3 flex items-center justify-between text-xs border-t"
            style={{ borderColor: "#dbeafe", color: "#38bdf8", background: "#f0f4f8" }}
          >
            <span>Showing {filtered.length} of {sections.length} sections</span>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <SectionModal
          title="Add New Section"
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
          loading={modalLoading}
          error={modalError}
        />
      )}

      {editTarget && (
        <SectionModal
          title={`Edit Section — ${editTarget.name}`}
          onClose={() => setEditTarget(null)}
          onSubmit={handleUpdate}
          initialValue={editTarget.name}
          loading={modalLoading}
          error={modalError}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          sectionName={deleteTarget.name}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          loading={modalLoading}
        />
      )}
    </DashboardLayout>
  );
}
