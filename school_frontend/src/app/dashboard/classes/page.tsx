"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { BookOpen, Layers, Search, CheckSquare, Square, X, Plus, Edit2, Trash2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Section {
  id: number;
  name: string;
}

interface Subject {
  id: number;
  name: string;
}

interface AcademyClass {
  id: number;
  name: string;
  sections: { id: number; name: string }[];
  subjects?: { id: number; name: string }[];
  created_at: string;
  updated_at: string;
  created_by: { id: number; name: string } | null;
  updated_by: { id: number; name: string } | null;
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
  sections: Section[];
  subjects: Subject[];
  onClose: () => void;
  onSubmit: (data: { name: string; section_ids: number[]; subject_ids: number[] }) => void;
  initialName?: string;
  initialSectionIds?: number[];
  initialSubjectIds?: number[];
  loading: boolean;
  error: string;
}

function ClassModal({
  title,
  sections,
  subjects,
  onClose,
  onSubmit,
  initialName = "",
  initialSectionIds = [],
  initialSubjectIds = [],
  loading,
  error,
}: ModalProps) {
  const [name, setName] = useState(initialName);
  const [sectionIds, setSectionIds] = useState<number[]>(initialSectionIds);
  const [subjectIds, setSubjectIds] = useState<number[]>(initialSubjectIds);
  const [subjectSearch, setSubjectSearch] = useState("");

  const toggleSection = (id: number) => {
    setSectionIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSubject = (id: number) => {
    setSubjectIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAllSubjects = () => {
    setSubjectIds(subjects.map((s) => s.id));
  };

  const clearAllSubjects = () => {
    setSubjectIds([]);
  };

  const filteredSubjects = useMemo(() => {
    if (!subjectSearch.trim()) return subjects;
    return subjects.filter((s) =>
      s.name.toLowerCase().includes(subjectSearch.toLowerCase())
    );
  }, [subjects, subjectSearch]);

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
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl z-10 overflow-hidden"
        style={{ background: "#fff", border: "1px solid #bfdbfe" }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between text-white shrink-0"
          style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)" }}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-white/10">
              <BookOpen className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold">{title}</h2>
              <p className="text-xs text-white/80">Configure class details, sections, and assigned subjects</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div
              className="p-3.5 rounded-xl text-sm border flex items-center gap-2"
              style={{
                background: "rgba(220,38,38,0.08)",
                borderColor: "rgba(220,38,38,0.3)",
                color: "#991b1b",
              }}
            >
              <span>{error}</span>
            </div>
          )}

          <form
            id="class-modal-form"
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit({
                name: name.trim(),
                section_ids: sectionIds,
                subject_ids: subjectIds,
              });
            }}
            className="space-y-6"
          >
            {/* 1. Class Name */}
            <div>
              <label className="block text-sm font-bold mb-1.5" style={{ color: "#0f224a" }}>
                Class Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Grade 1, Grade 2, 9th, 10th..."
                autoFocus
                required
                className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition font-medium"
                style={{
                  borderColor: "#bfdbfe",
                  color: "#0f224a",
                  background: "#f0f4f8",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
                onBlur={(e) => (e.target.style.borderColor = "#bfdbfe")}
              />
            </div>

            {/* 2. Sections */}
            <div className="p-4 rounded-xl border bg-[#f8fafc]" style={{ borderColor: "#bfdbfe" }}>
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#1e3a8a] flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#2563eb]" />
                  Assigned Sections
                </label>
                <span className="text-xs font-bold text-[#2563eb] bg-[#dbeafe] px-2 py-0.5 rounded-full">
                  {sectionIds.length} of {sections.length} Selected
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[140px] overflow-y-auto p-1">
                {sections.map((s) => {
                  const isChecked = sectionIds.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition select-none ${
                        isChecked
                          ? "bg-white border-[#2563eb] shadow-xs ring-1 ring-[#2563eb]"
                          : "bg-white border-[#bfdbfe]/80 hover:border-[#bfdbfe]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSection(s.id)}
                        className="w-4 h-4 rounded text-[#2563eb] focus:ring-[#2563eb]"
                        style={{ accentColor: "#2563eb" }}
                      />
                      <span className="text-xs font-semibold truncate" style={{ color: isChecked ? "#1e3a8a" : "#475569" }}>
                        Section {s.name}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 3. Direct Class-to-Subject Assignment */}
            <div className="p-4 rounded-xl border bg-[#f8fafc]" style={{ borderColor: "#bfdbfe" }}>
              <div className="flex items-center justify-between mb-2.5 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#2563eb]" />
                  <label className="text-xs font-bold uppercase tracking-wider text-[#1e3a8a]">
                    Assigned Curriculum Subjects
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white bg-[#1e3a8a] px-2 py-0.5 rounded-full">
                    {subjectIds.length} Subjects Selected
                  </span>
                  <button
                    type="button"
                    onClick={selectAllSubjects}
                    className="text-xs font-semibold text-[#2563eb] hover:underline cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-gray-300">•</span>
                  <button
                    type="button"
                    onClick={clearAllSubjects}
                    className="text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Subject Search */}
              <div className="relative mb-2.5">
                <input
                  type="text"
                  placeholder="Filter subjects..."
                  value={subjectSearch}
                  onChange={(e) => setSubjectSearch(e.target.value)}
                  className="w-full py-1.5 pl-8 pr-3 rounded-lg border text-xs outline-none bg-white text-[#0f224a]"
                  style={{ borderColor: "#bfdbfe" }}
                />
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>

              {/* Subjects Checklist Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[190px] overflow-y-auto p-1">
                {filteredSubjects.map((subj) => {
                  const isChecked = subjectIds.includes(subj.id);
                  return (
                    <label
                      key={subj.id}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition select-none ${
                        isChecked
                          ? "bg-white border-[#2563eb] shadow-xs ring-1 ring-[#2563eb]"
                          : "bg-white border-[#bfdbfe]/80 hover:border-[#bfdbfe]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSubject(subj.id)}
                        className="w-4 h-4 rounded text-[#2563eb] focus:ring-[#2563eb]"
                        style={{ accentColor: "#2563eb" }}
                      />
                      <span className="text-xs font-bold truncate" style={{ color: isChecked ? "#1e3a8a" : "#334155" }}>
                        {subj.name}
                      </span>
                    </label>
                  );
                })}
                {filteredSubjects.length === 0 && (
                  <div className="col-span-full py-4 text-center text-xs text-gray-400 italic">
                    No subjects match &quot;{subjectSearch}&quot;
                  </div>
                )}
              </div>
              <p className="mt-2 text-[11px] text-gray-500">
                💡 Only these selected subjects will appear when scheduling tests or entering exam marks for this class.
              </p>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#bfdbfe] bg-[#f0f4f8] flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer"
            style={{ borderColor: "#bfdbfe", color: "#1e40af", background: "#fff" }}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="class-modal-form"
            disabled={loading || !name.trim()}
            className="px-6 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
            style={{ background: "linear-gradient(135deg, #2563eb, #1e3a8a)" }}
          >
            {loading ? "Saving Class..." : "Save Class & Subjects"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ──────────────────────────────────────────────────────
interface DeleteModalProps {
  className: string;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

function DeleteModal({ className, onClose, onConfirm, loading }: DeleteModalProps) {
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
          <Trash2 className="w-7 h-7 text-[#dc2626]" />
        </div>
        <h3 className="text-lg font-bold mb-2" style={{ color: "#0b1329" }}>
          Delete Class?
        </h3>
        <p className="text-sm mb-6" style={{ color: "#1e40af" }}>
          Are you sure you want to delete <strong>&quot;{className}&quot;</strong>? This action cannot be undone.
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
export default function ManageClassesPage() {
  const [classes, setClasses] = useState<AcademyClass[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal state
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<AcademyClass | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AcademyClass | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  // ── Fetch ────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resClasses, resSections, resSubjects] = await Promise.all([
        fetch(`${API}/classes`, { headers: getAuthHeaders() }),
        fetch(`${API}/sections`, { headers: getAuthHeaders() }),
        fetch(`${API}/subjects`, { headers: getAuthHeaders() }),
      ]);
      const dataClasses = await resClasses.json();
      const dataSections = await resSections.json();
      const dataSubjects = await resSubjects.json();
      setClasses(Array.isArray(dataClasses) ? dataClasses : []);
      setSections(Array.isArray(dataSections) ? dataSections : []);
      setSubjects(Array.isArray(dataSubjects) ? dataSubjects : []);
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Create ───────────────────────────────────────────────
  const handleCreate = async (data: { name: string; section_ids: number[]; subject_ids: number[] }) => {
    setModalLoading(true);
    setModalError("");
    try {
      const res = await fetch(`${API}/classes`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to create class");
      setClasses((prev) => [...prev, json].sort((a, b) => a.name.localeCompare(b.name)));
      setShowCreate(false);
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  // ── Update ───────────────────────────────────────────────
  const handleUpdate = async (data: { name: string; section_ids: number[]; subject_ids: number[] }) => {
    if (!editTarget) return;
    setModalLoading(true);
    setModalError("");
    try {
      const res = await fetch(`${API}/classes/${editTarget.id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to update class");
      setClasses((prev) =>
        prev.map((c) => (c.id === editTarget.id ? json : c)).sort((a, b) => a.name.localeCompare(b.name))
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
      await fetch(`${API}/classes/${deleteTarget.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      setClasses((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setModalLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return classes.filter(
      (c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.sections?.some((s) => s.name.toLowerCase().includes(search.toLowerCase())) ||
        c.subjects?.some((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    );
  }, [classes, search]);

  return (
    <DashboardLayout>
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "#0f224a" }}>
            Manage Classes
          </h2>
          <p className="text-sm mt-1" style={{ color: "#2563eb" }}>
            Add or edit classes, and assign specific sections &amp; curriculum subjects
          </p>
        </div>
        <button
          id="add-class-btn"
          onClick={() => {
            setModalError("");
            setShowCreate(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md transition-all active:scale-95 hover:shadow-lg shrink-0 cursor-pointer"
          style={{ background: "linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%)" }}
        >
          <Plus className="w-4 h-4" />
          Add New Class
        </button>
      </div>

      {/* Search bar */}
      <div className="relative mb-5 max-w-sm">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
          style={{ color: "#38bdf8" }}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search classes, sections, or subjects..."
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
            <div className="animate-spin w-8 h-8 rounded-full border-3 border-[#2563eb] border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <BookOpen className="w-14 h-14 text-[#bfdbfe]" />
            <p className="text-sm font-medium" style={{ color: "#38bdf8" }}>
              {search ? `No classes match "${search}"` : "No classes yet. Add your first one!"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#f0f4f8", borderBottom: "1px solid #bfdbfe" }}>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wide text-[#2563eb]">#</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wide text-[#2563eb]">Class Name</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wide text-[#2563eb]">Sections</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wide text-[#2563eb]">Assigned Subjects</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wide hidden md:table-cell text-[#2563eb]">Created By</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wide hidden md:table-cell text-[#2563eb]">Created On</th>
                  <th className="text-right px-5 py-3.5 font-semibold text-xs uppercase tracking-wide text-[#2563eb]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "#dbeafe" }}>
                {filtered.map((cls, idx) => (
                  <tr
                    key={cls.id}
                    className="transition-colors hover:bg-[#f0f4f8]"
                  >
                    <td className="px-5 py-3.5 font-medium text-gray-400">
                      {idx + 1}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className="inline-block px-3 py-1 rounded-full text-xs font-bold shadow-xs text-white"
                        style={{ background: "#1e3a8a" }}
                      >
                        {cls.name}
                      </span>
                    </td>
                    {/* Sections Column */}
                    <td className="px-5 py-3.5">
                      {cls.sections && cls.sections.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 max-w-xs">
                          {cls.sections.map((s) => (
                            <span
                              key={s.id}
                              className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-[#1e3a8a] border border-blue-200"
                            >
                              {s.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs italic text-gray-400">No Sections</span>
                      )}
                    </td>
                    {/* Assigned Subjects Column */}
                    <td className="px-5 py-3.5">
                      {cls.subjects && cls.subjects.length > 0 ? (
                        <div className="space-y-1 max-w-sm">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-[#1e3a8a] text-white">
                              <BookOpen className="w-3 h-3 text-amber-300" />
                              {cls.subjects.length} Subjects
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 text-[11px] text-gray-600">
                            {cls.subjects.slice(0, 5).map((subj) => (
                              <span key={subj.id} className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                {subj.name}
                              </span>
                            ))}
                            {cls.subjects.length > 5 && (
                              <span className="text-gray-400 font-semibold self-center">
                                +{cls.subjects.length - 5} more
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs italic text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                          <span>⚠️ All subjects (default)</span>
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell text-gray-600">
                      {cls.created_by?.name ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell text-gray-500">
                      {formatDate(cls.created_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        {/* Edit */}
                        <button
                          onClick={() => {
                            setModalError("");
                            setEditTarget(cls);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all active:scale-95 bg-white border-[#bfdbfe] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit &amp; Assign
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => setDeleteTarget(cls)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all active:scale-95 border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
        {!loading && classes.length > 0 && (
          <div
            className="px-5 py-3 flex items-center justify-between text-xs border-t bg-[#f0f4f8] text-gray-500"
            style={{ borderColor: "#dbeafe" }}
          >
            <span>Showing {filtered.length} of {classes.length} classes</span>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <ClassModal
          title="Add New Class"
          sections={sections}
          subjects={subjects}
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
          loading={modalLoading}
          error={modalError}
        />
      )}

      {editTarget && (
        <ClassModal
          title={`Edit Class & Subjects — ${editTarget.name}`}
          sections={sections}
          subjects={subjects}
          onClose={() => setEditTarget(null)}
          onSubmit={handleUpdate}
          initialName={editTarget.name}
          initialSectionIds={editTarget.sections?.map((s) => s.id) || []}
          initialSubjectIds={editTarget.subjects?.map((s) => s.id) || []}
          loading={modalLoading}
          error={modalError}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          className={deleteTarget.name}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          loading={modalLoading}
        />
      )}
    </DashboardLayout>
  );
}
