"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Designation {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  users_count?: number;
  teachers_count?: number;
  created_at?: string;
  updated_at?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// ─── Designation Modal ────────────────────────────────────────────────────────
interface DesignationModalProps {
  title: string;
  initialData?: Designation | null;
  onClose: () => void;
  onSubmit: (data: { name: string; description: string; is_active: boolean }) => Promise<void>;
  loading: boolean;
  error?: string;
}

function DesignationModal({
  title,
  initialData,
  onClose,
  onSubmit,
  loading,
  error,
}: DesignationModalProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [isActive, setIsActive] = useState<boolean>(initialData ? initialData.is_active : true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onSubmit({
      name: name.trim(),
      description: description.trim(),
      is_active: isActive,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-md rounded-2xl shadow-2xl p-6 z-10 bg-white border border-[#bfdbfe] transition-all transform animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#dbeafe]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#2563eb]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#0f224a]">{title}</h3>
              <p className="text-xs text-slate-500">Designation details and privileges</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition p-1 rounded-lg hover:bg-slate-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200 flex items-start gap-2">
            <svg className="w-5 h-5 shrink-0 text-red-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1 text-[#1e3a8a]">
              Designation Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Senior Lecturer, Head of Department"
              className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563eb]"
              style={{ borderColor: "#bfdbfe", background: "#f0f4f8" }}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1 text-[#1e3a8a]">
              Description / Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Responsibilities, grade, department or role summary..."
              className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563eb] resize-none"
              style={{ borderColor: "#bfdbfe", background: "#f0f4f8" }}
            />
          </div>

          <div className="pt-1">
            <label className="flex items-center gap-3 cursor-pointer select-none p-3 rounded-xl border border-blue-100 bg-blue-50/50 hover:bg-blue-50 transition">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 text-[#2563eb] rounded border-gray-300 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-semibold text-[#0f224a] block">Active Designation</span>
                <span className="text-xs text-slate-500">Available to assign to staff members across the system</span>
              </div>
            </label>
          </div>

          <div className="flex gap-3 pt-3 border-t border-[#dbeafe]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition hover:bg-slate-50 text-[#1e40af]"
              style={{ borderColor: "#bfdbfe", background: "#f0f4f8" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition active:scale-95 disabled:opacity-50 shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #2563eb, #1e3a8a)" }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </>
              ) : (
                "Save Designation"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────
interface DeleteModalProps {
  designation: Designation;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  loading: boolean;
}

function DeleteModal({ designation, onClose, onConfirm, loading }: DeleteModalProps) {
  const staffCount = designation.users_count ?? designation.teachers_count ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl shadow-2xl p-6 z-10 bg-white border border-red-200 text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>

        <h3 className="text-lg font-bold text-[#0b1329] mb-1">Delete Designation?</h3>
        <p className="text-sm text-slate-600 mb-3">
          Are you sure you want to remove <strong>&ldquo;{designation.name}&rdquo;</strong>?
        </p>

        {staffCount > 0 && (
          <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 text-left flex items-start gap-2">
            <svg className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>
              <strong>{staffCount} staff member(s)</strong> are currently assigned to this designation. Their designation will be unlinked safely.
            </span>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition hover:bg-slate-50 text-[#1e40af]"
            style={{ borderColor: "#bfdbfe", background: "#f0f4f8" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition active:scale-95 bg-red-600 hover:bg-red-700 shadow-md shadow-red-600/20 flex items-center justify-center gap-1.5"
          >
            {loading ? "Deleting..." : "Confirm Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ManageDesignationsPage() {
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [selectedDesignation, setSelectedDesignation] = useState<Designation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Designation | null>(null);

  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  // Fetch designations
  const fetchDesignations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/designations`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to load designations");
      const data = await res.json();
      setDesignations(Array.isArray(data) ? data : []);
    } catch (err: any) {
      showToast(err.message || "Failed to fetch designations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDesignations();
  }, [fetchDesignations]);

  // Filtered designations
  const filteredDesignations = useMemo(() => {
    return designations.filter((d) => {
      const matchesSearch =
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        (d.description && d.description.toLowerCase().includes(search.toLowerCase()));

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
          ? d.is_active
          : !d.is_active;

      return matchesSearch && matchesStatus;
    });
  }, [designations, search, statusFilter]);

  // Overall statistics
  const stats = useMemo(() => {
    const total = designations.length;
    const active = designations.filter((d) => d.is_active).length;
    const totalAssignedStaff = designations.reduce(
      (sum, d) => sum + (d.users_count ?? d.teachers_count ?? 0),
      0
    );
    return { total, active, totalAssignedStaff };
  }, [designations]);

  // Handle Save (Create or Edit)
  const handleSave = async (payload: { name: string; description: string; is_active: boolean }) => {
    setFormLoading(true);
    setFormError("");

    try {
      const isEdit = modalMode === "edit" && selectedDesignation;
      const url = isEdit
        ? `${API}/designations/${selectedDesignation.id}`
        : `${API}/designations`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || (json.errors ? Object.values(json.errors).flat().join(", ") : "Failed to save designation"));
      }

      showToast(isEdit ? "✨ Designation updated successfully!" : "🎉 Designation created successfully!");
      setModalMode(null);
      setSelectedDesignation(null);
      fetchDesignations();
    } catch (err: any) {
      setFormError(err.message || "Something went wrong.");
    } finally {
      setFormLoading(false);
    }
  };

  // Handle Delete
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setFormLoading(true);
    try {
      const res = await fetch(`${API}/designations/${deleteTarget.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || "Failed to delete designation");
      }

      showToast("🗑️ Designation deleted successfully!");
      setDeleteTarget(null);
      fetchDesignations();
    } catch (err: any) {
      showToast(err.message || "Failed to delete designation");
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-50 bg-[#0f224a] text-white px-5 py-3 rounded-2xl shadow-2xl border border-blue-400/30 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
            <span className="text-lg">🔔</span>
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        )}

        {/* Header Banner */}
        <div
          className="rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl"
          style={{
            background: "linear-gradient(135deg, #0b1329 0%, #1e3a8a 60%, #2563eb 100%)",
          }}
        >
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 text-blue-200 border border-white/20">
                  Staff Hierarchy & Titles
                </span>
                <span className="text-xs text-blue-200/80">• School & College</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Staff Designations Management
              </h1>
              <p className="mt-1.5 text-sm text-blue-100/90 max-w-2xl leading-relaxed">
                Create, customize, and manage institutional designations (e.g. Senior Lecturer, Subject Specialist, Head of Department). Assign these designations directly to staff members.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard/staff"
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-white/10 hover:bg-white/20 border border-white/20 text-white transition flex items-center gap-2 backdrop-blur-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                View Staff Members
              </Link>

              <button
                onClick={() => {
                  setFormError("");
                  setSelectedDesignation(null);
                  setModalMode("create");
                }}
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-white text-[#1e3a8a] hover:bg-blue-50 transition shadow-lg shadow-black/10 flex items-center gap-2 active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Add New Designation
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-[#bfdbfe] shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#2563eb]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Designations</p>
              <h3 className="text-2xl font-black text-[#0f224a] mt-0.5">{stats.total}</h3>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-emerald-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Designations</p>
              <h3 className="text-2xl font-black text-emerald-700 mt-0.5">{stats.active}</h3>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-indigo-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Staff Assigned</p>
              <h3 className="text-2xl font-black text-indigo-700 mt-0.5">{stats.totalAssignedStaff}</h3>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 rounded-2xl bg-white border border-[#bfdbfe] shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <svg
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
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
              placeholder="Search designation or description..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none transition focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563eb]"
              style={{ borderColor: "#bfdbfe", background: "#f0f4f8" }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Filter:</span>
            <div className="flex bg-[#f0f4f8] p-1 rounded-xl border border-[#bfdbfe]">
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  statusFilter === "all"
                    ? "bg-[#2563eb] text-white shadow-sm"
                    : "text-slate-600 hover:text-[#0f224a]"
                }`}
              >
                All ({designations.length})
              </button>
              <button
                onClick={() => setStatusFilter("active")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  statusFilter === "active"
                    ? "bg-[#2563eb] text-white shadow-sm"
                    : "text-slate-600 hover:text-[#0f224a]"
                }`}
              >
                Active ({stats.active})
              </button>
              <button
                onClick={() => setStatusFilter("inactive")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  statusFilter === "inactive"
                    ? "bg-[#2563eb] text-white shadow-sm"
                    : "text-slate-600 hover:text-[#0f224a]"
                }`}
              >
                Inactive ({stats.total - stats.active})
              </button>
            </div>
          </div>
        </div>

        {/* Designations Table Card */}
        <div className="bg-white rounded-2xl border border-[#bfdbfe] shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-500">
              <svg className="animate-spin w-8 h-8 text-[#2563eb] mb-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm font-medium">Loading designations...</p>
            </div>
          ) : filteredDesignations.length === 0 ? (
            <div className="py-16 text-center text-slate-500 px-4">
              <div className="w-16 h-16 rounded-full bg-blue-50 text-[#2563eb] flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h4 className="text-base font-bold text-[#0f224a]">No designations found</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {search ? `No designation matched "${search}".` : "No designations have been defined yet."}
              </p>
              <button
                onClick={() => {
                  setFormError("");
                  setSelectedDesignation(null);
                  setModalMode("create");
                }}
                className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#2563eb] hover:bg-[#1e3a8a] transition inline-flex items-center gap-1.5"
              >
                + Add Designation Now
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f0f4f8] text-[#1e3a8a] text-xs font-bold uppercase tracking-wider border-b border-[#bfdbfe]">
                    <th className="py-3.5 px-5">Designation Title</th>
                    <th className="py-3.5 px-5">Description</th>
                    <th className="py-3.5 px-5 text-center">Status</th>
                    <th className="py-3.5 px-5 text-center">Staff Members</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dbeafe] text-sm">
                  {filteredDesignations.map((designation) => {
                    const count = designation.users_count ?? designation.teachers_count ?? 0;
                    return (
                      <tr
                        key={designation.id}
                        className="hover:bg-blue-50/40 transition-colors group"
                      >
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-100/70 text-[#2563eb] font-bold flex items-center justify-center text-xs shrink-0">
                              {designation.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-bold text-[#0f224a] group-hover:text-[#2563eb] transition">
                                {designation.name}
                              </span>
                              <span className="block text-[11px] text-slate-400">
                                ID #{designation.id}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-5">
                          <p className="text-xs text-slate-600 line-clamp-2 max-w-md">
                            {designation.description || <span className="text-slate-400 italic">No description provided</span>}
                          </p>
                        </td>

                        <td className="py-4 px-5 text-center">
                          {designation.is_active ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              Inactive
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-5 text-center">
                          <Link
                            href={`/dashboard/staff?designation_id=${designation.id}`}
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition hover:scale-105 ${
                              count > 0
                                ? "bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100"
                                : "bg-slate-50 text-slate-400 border border-slate-200"
                            }`}
                          >
                            <span>{count}</span>
                            <span className="text-[10px] font-normal">assigned</span>
                          </Link>
                        </td>

                        <td className="py-4 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setFormError("");
                                setSelectedDesignation(designation);
                                setModalMode("edit");
                              }}
                              title="Edit Designation"
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-100/60 transition"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>

                            <button
                              onClick={() => setDeleteTarget(designation)}
                              title="Delete Designation"
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      {modalMode && (
        <DesignationModal
          title={modalMode === "edit" ? "Edit Designation" : "Create New Designation"}
          initialData={selectedDesignation}
          onClose={() => {
            setModalMode(null);
            setSelectedDesignation(null);
          }}
          onSubmit={handleSave}
          loading={formLoading}
          error={formError}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <DeleteModal
          designation={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          loading={formLoading}
        />
      )}
    </DashboardLayout>
  );
}
