"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { 
  useGetClassesQuery, 
  useGetMajorsQuery, 
  useGetSectionsQuery, 
  useGetAcademicSessionsQuery, 
  useGetStudentsQuery 
} from "@/store/apiSlice";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AcademyClass {
  id: number;
  name: string;
  sections?: Section[];
}

interface Major {
  id: number;
  name: string;
}

interface Section {
  id: number;
  name: string;
}

interface Student {
  id: number;
  roll_number?: number;
  name: string;
  email: string;
  student_cnic?: string | null;
  erp_reg?: string | null;
  father_name: string | null;
  gender: string | null;
  contact_number: string | null;
  class_id: number | null;
  major_id: number | null;
  section_id: number | null;
  monthly_fee: string | null;
  pending_amount: string | null;
  image: string | null;
  is_active: boolean;
  active_subjects_count?: number;
  academy_class: AcademyClass | null;
  major: Major | null;
  section: Section | null;
  created_at: string;
  remarks?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const STORAGE_URL = process.env.NEXT_PUBLIC_STORAGE_URL || "http://localhost:8000/storage";

function getAuthHeaders(isFormData = false) {
  const token = localStorage.getItem("token");
  const headers: any = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Custom Dropdown ──────────────────────────────────────────────────────────
function CustomDropdown({
  options,
  value,
  onChange,
  placeholder = "Select...",
  name,
  className = "",
}: {
  options: { label: string; value: string | number }[];
  value: string | number;
  onChange: (name: string, value: string | number) => void;
  placeholder?: string;
  name: string;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => String(o.value) === String(value));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div
        className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all cursor-pointer font-medium flex items-center justify-between shadow-sm hover:shadow-md"
        style={{
          borderColor: isOpen ? "#2563eb" : "#bfdbfe",
          background: "#fff",
          color: value ? "#0f224a" : "#38bdf8",
          boxShadow: isOpen ? "0 0 0 4px rgba(138, 50, 24, 0.1)" : "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate pr-4">{selectedOption ? selectedOption.label : placeholder}</span>
        <svg
          className={`w-4 h-4 transition-transform duration-300 shrink-0 ${isOpen ? "rotate-180" : ""}`}
          style={{ color: "#2563eb" }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isOpen && (
        <div
          className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border overflow-hidden"
          style={{ borderColor: "#bfdbfe", maxHeight: "240px", overflowY: "auto", animation: "fadeIn 0.2s ease-out" }}
        >
          <div className="p-1.5 space-y-0.5">
            {options.map((option) => (
              <div
                key={option.value}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all truncate ${
                  String(value) === String(option.value)
                    ? "bg-[#dbeafe] text-[#2563eb] font-semibold"
                    : "text-[#434655] hover:bg-[#f0f4f8] hover:text-[#0f224a]"
                }`}
                onClick={() => {
                  onChange(name, option.value);
                  setIsOpen(false);
                }}
              >
                {option.label}
              </div>
            ))}
            {options.length === 0 && (
              <div className="px-4 py-4 text-sm text-[#38bdf8] text-center italic font-medium">
                No options available
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}



// ─── Delete Confirm Modal ──────────────────────────────────────────────────────
interface DeleteModalProps {
  studentName: string;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

function DeleteModal({ studentName, onClose, onConfirm, loading }: DeleteModalProps) {
  const [confirmText, setConfirmText] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl shadow-2xl p-6 z-10 text-center" style={{ background: "#fff", border: "1px solid #fca5a5" }}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(220,38,38,0.1)" }}>
          <svg className="w-7 h-7" fill="none" stroke="#dc2626" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </div>
        <h3 className="text-lg font-bold mb-2" style={{ color: "#0b1329" }}>Delete Student?</h3>
        <p className="text-sm mb-4" style={{ color: "#1e40af" }}>Are you sure you want to delete <strong>&quot;{studentName}&quot;</strong>? This action will move them to the trash bin.</p>
        
        <div className="mb-6 text-left">
          <label className="block text-xs font-medium mb-1.5" style={{ color: "#1e3a8a" }}>Type <strong>{studentName}</strong> to confirm:</label>
          <input 
            type="text" 
            value={confirmText} 
            onChange={(e) => setConfirmText(e.target.value)} 
            className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition" 
            style={{ borderColor: "#fca5a5", background: "#fef2f2", color: "#991b1b" }} 
            placeholder={studentName}
          />
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium border transition" style={{ borderColor: "#bfdbfe", color: "#1e40af", background: "#f0f4f8" }}>Cancel</button>
          <button onClick={onConfirm} disabled={loading || confirmText !== studentName} className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition active:scale-95 disabled:opacity-50" style={{ background: "#dc2626" }}>{loading ? "Deleting..." : "Delete"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Bulk Delete Modal ────────────────────────────────────────────────────────
interface BulkDeleteModalProps {
  selectedCount: number;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

function BulkDeleteModal({ selectedCount, onClose, onConfirm, loading }: BulkDeleteModalProps) {
  const [confirmText, setConfirmText] = useState("");
  const requiredText = `delete ${selectedCount}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl shadow-2xl p-6 z-10 text-center" style={{ background: "#fff", border: "1px solid #fca5a5" }}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(220,38,38,0.1)" }}>
          <svg className="w-7 h-7" fill="none" stroke="#dc2626" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </div>
        <h3 className="text-lg font-bold mb-2" style={{ color: "#0b1329" }}>Bulk Delete Students?</h3>
        <p className="text-sm mb-4" style={{ color: "#1e40af" }}>You are about to move <strong>{selectedCount}</strong> students to the trash bin.</p>
        
        <div className="mb-6 text-left">
          <label className="block text-xs font-medium mb-1.5" style={{ color: "#1e3a8a" }}>Type <strong>{requiredText}</strong> to confirm:</label>
          <input 
            type="text" 
            value={confirmText} 
            onChange={(e) => setConfirmText(e.target.value)} 
            className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition" 
            style={{ borderColor: "#fca5a5", background: "#fef2f2", color: "#991b1b" }} 
            placeholder={requiredText}
          />
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium border transition" style={{ borderColor: "#bfdbfe", color: "#1e40af", background: "#f0f4f8" }}>Cancel</button>
          <button onClick={onConfirm} disabled={loading || confirmText !== requiredText} className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition active:scale-95 disabled:opacity-50" style={{ background: "#dc2626" }}>{loading ? "Deleting..." : "Delete All"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Promote Modal ─────────────────────────────────────────────────────────────
interface PromoteModalProps {
  selectedCount: number;
  classes: AcademyClass[];
  majors: Major[];
  sections: Section[];
  sessions: any[];
  onClose: () => void;
  onSubmit: (newClassId: number | "", newMajorId: number | "", newSectionId: number | "", newSessionId: number | "") => void;
  loading: boolean;
}

function PromoteModal({ selectedCount, classes, majors, sections, sessions, onClose, onSubmit, loading }: PromoteModalProps) {
  const [newClassId, setNewClassId] = useState<number | "">("");
  const [newMajorId, setNewMajorId] = useState<number | "">("");
  const [newSectionId, setNewSectionId] = useState<number | "">("");
  const [newSessionId, setNewSessionId] = useState<number | "">(() => {
    const active = sessions.find(s => s.is_active == 1);
    return active ? active.id : "";
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl shadow-2xl p-6 z-10" style={{ background: "#fff", border: "1px solid #bfdbfe" }}>
        <h3 className="text-lg font-bold mb-2 text-center" style={{ color: "#0f224a" }}>Promote Students</h3>
        <p className="text-sm mb-5 text-center" style={{ color: "#2563eb" }}>
          You are about to promote <strong>{selectedCount}</strong> student(s) to a new class.
        </p>

        <label className="block text-sm font-medium mb-1.5" style={{ color: "#1e3a8a" }}>Select New Class (Optional)</label>
        <div className="mb-4">
          <CustomDropdown
            name="newClassId"
            value={newClassId}
            onChange={(n, v) => setNewClassId(Number(v) || "")}
            placeholder="-- No Change --"
            options={[{ label: "-- No Change --", value: "" }, ...classes.map(c => ({ label: c.name, value: c.id }))]}
          />
        </div>

        <label className="block text-sm font-medium mb-1.5" style={{ color: "#1e3a8a" }}>Select New Major (Optional)</label>
        <div className="mb-4">
          <CustomDropdown
            name="newMajorId"
            value={newMajorId}
            onChange={(n, v) => setNewMajorId(Number(v) || "")}
            placeholder="-- No Change --"
            options={[{ label: "-- No Change --", value: "" }, ...majors.map(m => ({ label: m.name, value: m.id }))]}
          />
        </div>

        <label className="block text-sm font-medium mb-1.5" style={{ color: "#1e3a8a" }}>Select New Section (Optional)</label>
        <div className="mb-6">
          <CustomDropdown
            name="newSectionId"
            value={newSectionId}
            onChange={(n, v) => setNewSectionId(Number(v) || "")}
            placeholder="-- No Change --"
            options={[{ label: "-- No Change --", value: "" }, ...sections.map(s => ({ label: s.name, value: s.id }))]}
          />
        </div>

        <label className="block text-sm font-medium mb-1.5" style={{ color: "#1e3a8a" }}>Select New Session (Optional)</label>
        <div className="mb-6">
          <CustomDropdown
            name="newSessionId"
            value={newSessionId}
            onChange={(n, v) => setNewSessionId(Number(v) || "")}
            placeholder="-- No Change --"
            options={[{ label: "-- No Change --", value: "" }, ...sessions.map(s => ({ label: s.name, value: s.id }))]}
          />
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium border transition" style={{ borderColor: "#bfdbfe", color: "#1e40af", background: "#f0f4f8" }}>Cancel</button>
          <button onClick={() => (newClassId || newMajorId || newSectionId || newSessionId) && onSubmit(newClassId, newMajorId, newSectionId, newSessionId)} disabled={loading || (!newClassId && !newMajorId && !newSectionId && !newSessionId)} className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition active:scale-95 disabled:opacity-50" style={{ background: "linear-gradient(135deg, #2563eb, #1e3a8a)" }}>{loading ? "Updating..." : "Update"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Subject Enrollment Modal ──────────────────────────────────────────────────
interface SubjectItem {
  id: number;
  name: string;
}

interface EnrollmentEntry {
  subject_id: number;
  is_active: boolean;
  percentage: string;
}

function SubjectEnrollmentModal({ student, onClose, onSuccess }: { student: Student; onClose: () => void; onSuccess?: () => void }) {
  const isFixedClass = student.academy_class?.name?.toLowerCase().includes('9th') || student.academy_class?.name?.toLowerCase().includes('10th');

  const [monthStr, setMonthStr] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [feeType, setFeeType] = useState<'fixed' | 'subject_wise'>(isFixedClass ? 'fixed' : 'subject_wise');
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [entries, setEntries] = useState<Record<number, EnrollmentEntry>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async (month: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/students/${student.id}/enrollments?month=${month}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load');

      const subjectList: SubjectItem[] = Array.isArray(data.subjects) ? data.subjects : [];
      setSubjects(subjectList);

      // Build entries map
      const map: Record<number, EnrollmentEntry> = {};
      subjectList.forEach((s) => {
        const existing = data.enrollments?.[s.id];
        map[s.id] = {
          subject_id: s.id,
          is_active: existing?.is_active ?? false,
          percentage: existing?.percentage?.toString() ?? '',
        };
      });
      setEntries(map);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [student.id]);

  useEffect(() => { fetchData(monthStr); }, [fetchData, monthStr]);

  const handleToggle = (subjectId: number) => {
    setEntries(prev => {
      const current = prev[subjectId] || { is_active: false, percentage: '' };
      const willBeActive = !current.is_active;
      return {
        ...prev,
        [subjectId]: {
          ...current,
          is_active: willBeActive,
          percentage: willBeActive && !current.percentage ? '70' : current.percentage
        },
      };
    });
  };

  const handlePercentage = (subjectId: number, value: string) => {
    setEntries(prev => ({
      ...prev,
      [subjectId]: { ...prev[subjectId], percentage: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      // If fixed, clear all subject enrollments
      const enrollments = feeType === 'fixed'
        ? []
        : Object.values(entries).map(e => ({
            subject_id: e.subject_id,
            is_active: e.is_active,
            percentage: e.percentage !== '' ? parseFloat(e.percentage) : null,
          }));

      const res = await fetch(`${API}/students/${student.id}/enrollments/sync`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ month: monthStr, fee_type: feeType, enrollments }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to save');
      await fetchData(monthStr);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };



  const activeCount = useMemo(() => Object.values(entries).filter(e => e.is_active).length, [entries]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div className="relative w-full max-w-xl rounded-2xl shadow-2xl z-10 flex flex-col max-h-[90vh]" style={{ background: '#fff', border: '1px solid #bfdbfe' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: '#dbeafe' }}>
          <div>
            <h3 className="text-lg font-bold" style={{ color: '#0f224a' }}>Subject Enrollment</h3>
            <p className="text-xs mt-0.5" style={{ color: '#38bdf8' }}>{student.name} · {student.academy_class?.name} · {student.major?.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Month + Controls */}
        <div className="px-6 pt-5 pb-3">
          <label className="block text-xs font-medium mb-1" style={{ color: '#1e3a8a' }}>Month</label>
          <input type="month" value={monthStr} onChange={e => setMonthStr(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none" style={{ borderColor: '#bfdbfe', background: '#f0f4f8' }} />
          <p className="text-[11px] mt-1.5 mb-4" style={{ color: '#38bdf8' }}>If no settings are saved for this month, previous values are automatically used.</p>
        </div>

        {/* Subject List — only shown when Subject Wise */}
        {feeType === 'subject_wise' && (
          <div className="flex-1 overflow-y-auto px-6 pb-4">
            {error && <div className="mb-3 p-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">{error}</div>}
            {loading ? (
              <div className="flex justify-center py-10">
                <svg className="animate-spin w-7 h-7 text-[#2563eb]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              </div>
            ) : subjects.length === 0 ? (
              <div className="text-center py-10 text-sm" style={{ color: '#38bdf8' }}>No subjects found for this student's major.</div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-3 px-3 pb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: '#2563eb' }}>
                  <span className="col-span-1"></span>
                  <span className="col-span-7">Subject</span>
                  <span className="col-span-4 text-right">Teacher %</span>
                </div>
                {subjects.map((subject) => {
                  const entry = entries[subject.id] || { is_active: false, percentage: '' };
                  return (
                    <div key={subject.id} onClick={() => handleToggle(subject.id)} className={`grid grid-cols-12 gap-3 items-center px-3 py-3 rounded-xl border cursor-pointer transition-all ${entry.is_active ? 'border-[#bfdbfe] bg-[#f0f4f8]' : 'border-transparent bg-gray-50 hover:bg-[#f0f4f8]'}`}>
                      <div className="col-span-1">
                        <input type="checkbox" checked={entry.is_active} onChange={() => {}} className="w-4 h-4 rounded pointer-events-none" style={{ accentColor: '#2563eb' }} />
                      </div>
                      <div className="col-span-7">
                        <p className="text-sm font-semibold" style={{ color: '#0f224a' }}>{subject.name}</p>
                      </div>
                      <div className="col-span-4" onClick={e => e.stopPropagation()}>
                        {entry.is_active ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={entry.percentage}
                              onChange={e => handlePercentage(subject.id, e.target.value)}
                              placeholder="0–100"
                              className="w-full px-2 py-1.5 rounded-lg border text-sm outline-none text-right"
                              style={{ borderColor: '#bfdbfe', background: '#fff' }}
                            />
                            <span className="text-sm text-gray-500 shrink-0">%</span>
                          </div>
                        ) : (
                          <span className="block text-right text-xs text-gray-400">—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Fixed message */}
        {feeType === 'fixed' && (
          <div className="flex-1 flex items-center justify-center py-10 px-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: '#f0f4f8' }}>
                <svg className="w-6 h-6" style={{ color: '#38bdf8' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
              </div>
              <p className="text-sm font-medium" style={{ color: '#1e3a8a' }}>Fixed Fee Mode</p>
              <p className="text-xs mt-1" style={{ color: '#38bdf8' }}>Teacher salaries will be calculated as fixed amounts — no subject tracking needed for this month.</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-between" style={{ borderColor: '#dbeafe' }}>
          <p className="text-sm" style={{ color: '#1e40af' }}>
            {feeType === 'subject_wise' ? <><strong>{activeCount}</strong> subject{activeCount !== 1 ? 's' : ''} active</> : <span className="text-gray-400 text-xs">Fixed fee mode</span>}
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-sm font-medium border transition" style={{ borderColor: '#bfdbfe', color: '#1e40af', background: '#f0f4f8' }}>Cancel</button>
            <button onClick={handleSave} disabled={saving || loading} className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition active:scale-95 disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #2563eb, #1e3a8a)' }}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ManageStudentsPageContent() {
  const [search, setSearch] = useState("");
  const [filterClassId, setFilterClassId] = useState<number | "">("");
  const [filterMajorId, setFilterMajorId] = useState<number | "">("");
  const [filterSectionId, setFilterSectionId] = useState<number | "">("");
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    setUserRole(localStorage.getItem("userRole"));
  }, []);
  
  const [currentPage, setCurrentPage] = useState(1);

  const { data: classes = [] } = useGetClassesQuery();
  const { data: majors = [] } = useGetMajorsQuery();
  const { data: sections = [] } = useGetSectionsQuery();
  const { data: sessions = [] } = useGetAcademicSessionsQuery();

  const { data: stuData, isFetching: loading, refetch: refetchStudents } = useGetStudentsQuery({
    page: currentPage,
    search,
    classId: filterClassId,
    majorId: filterMajorId,
    sectionId: filterSectionId,
  });

  const students: Student[] = useMemo(() => {
    if (!stuData?.data) return [];
    return [...stuData.data].sort((a: any, b: any) => {
      const rollA = a.roll_number ?? 999999;
      const rollB = b.roll_number ?? 999999;
      if (rollA !== rollB) return rollA - rollB;
      return a.id - b.id;
    });
  }, [stuData]);

  const lastPage = stuData?.last_page || 1;
  const totalStudents = stuData?.total || 0;

  const [showPromote, setShowPromote] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [enrollTarget, setEnrollTarget] = useState<Student | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  const [isSendingBulkLedger, setIsSendingBulkLedger] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get("action") === "add_student") {
      router.push("/dashboard/students/admission");
    }
  }, [searchParams, router]);

  const handleToggleStatus = async (student: Student) => {
    try {
      const res = await fetch(`${API}/students/${student.id}/toggle-status`, {
        method: "PATCH",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        refetchStudents();
      }
    } catch (err) {
      console.error(err);
    }
  };


  const handleDelete = async () => {
    if (!deleteTarget) return;
    setModalLoading(true);
    try {
      await fetch(`${API}/students/${deleteTarget.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      refetchStudents();
      setSelectedStudentIds((prev) => prev.filter((id) => id !== deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setModalLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    setModalLoading(true);
    try {
      await fetch(`${API}/students/bulk-delete`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ student_ids: selectedStudentIds }),
      });
      refetchStudents();
      setSelectedStudentIds([]);
      setShowBulkDelete(false);
    } finally {
      setModalLoading(false);
    }
  };

  const handlePromote = async (newClassId: number | "", newMajorId: number | "", newSectionId: number | "", newSessionId: number | "") => {
    setModalLoading(true);
    setModalError("");
    try {
      const payload: any = { student_ids: selectedStudentIds };
      if (newClassId) payload.new_class_id = newClassId;
      if (newMajorId) payload.new_major_id = newMajorId;
      if (newSectionId) payload.new_section_id = newSectionId;
      if (newSessionId) payload.new_session_id = newSessionId;

      const res = await fetch(`${API}/students/promote`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to promote students");

      // Refresh data to get updated class info
      refetchStudents();
      setSelectedStudentIds([]);
      setShowPromote(false);
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const handleSendBulkLedger = async () => {
    if (selectedStudentIds.length === 0) return;
    setIsSendingBulkLedger(true);
    setShowBulkMenu(false);
    try {
      const res = await fetch(`${API}/fees/ledger/bulk-email`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ student_ids: selectedStudentIds })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send bulk emails');
      alert(`Success: ${data.message} (${data.dispatched_count} emails queued)`);
      setSelectedStudentIds([]);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSendingBulkLedger(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "#0f224a" }}>Manage Students</h2>
          <p className="text-sm mt-1" style={{ color: "#2563eb" }}>Register students, assign classes/majors, and upload photos</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => window.location.href = '/dashboard/students/trashed'}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all active:scale-95 hover:shadow-md mr-2"
            style={{ borderColor: "#fca5a5", color: "#dc2626", background: "#fef2f2" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            Trash Bin
          </button>
          {selectedStudentIds.length > 0 && (
            <div className="relative mr-2">
              <button
                onClick={() => setShowBulkMenu(!showBulkMenu)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md transition-all active:scale-95 hover:shadow-lg"
                style={{ background: "linear-gradient(135deg, #0f224a 0%, #1e3a8a 100%)" }}
              >
                Bulk Actions ({selectedStudentIds.length})
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              
              {showBulkMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowBulkMenu(false)}></div>
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl z-50 border overflow-hidden" style={{ borderColor: "#bfdbfe" }}>
                    <button
                      onClick={() => { setShowBulkMenu(false); setShowPromote(true); }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-left transition-colors hover:bg-gray-50 text-[#047857]"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                      Promote Students
                    </button>
                    {userRole !== "5" && (
                      <button
                        onClick={handleSendBulkLedger}
                        disabled={isSendingBulkLedger}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-left transition-colors hover:bg-gray-50 disabled:opacity-50 text-[#2563eb] border-t"
                        style={{ borderColor: "#dbeafe" }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        {isSendingBulkLedger ? 'Sending Ledgers...' : 'Send Ledgers'}
                      </button>
                    )}
                    <button
                      onClick={() => { setShowBulkMenu(false); setShowBulkDelete(true); }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-left transition-colors hover:bg-gray-50 text-red-600 border-t"
                      style={{ borderColor: "#dbeafe" }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      Delete Students
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          {userRole !== "5" && (
            <>
              <button
                onClick={() => router.push('/dashboard/students/import')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all active:scale-95 hover:shadow-md"
                style={{ borderColor: "#bfdbfe", color: "#1e3a8a", background: "#f0f4f8" }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                Import CSV
              </button>
              <button
                onClick={() => router.push('/dashboard/students/import-portal')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all active:scale-95 hover:shadow-md"
                style={{ borderColor: "#93c5fd", color: "#1d4ed8", background: "#eff6ff" }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Import Portal Excel
              </button>
              <button
                onClick={() => router.push("/dashboard/students/admission")}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md transition-all active:scale-95 hover:shadow-lg cursor-pointer"
                style={{ background: "linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%)" }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Add Student
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-5">
        {/* Search */}
        <div className="relative max-w-sm flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#38bdf8" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email..." className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none transition" style={{ background: "#fff", borderColor: "#bfdbfe", color: "#0f224a" }} />
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <CustomDropdown
            name="filterClassId"
            value={filterClassId}
            onChange={(n, v) => setFilterClassId(v ? Number(v) : "")}
            placeholder="All Classes"
            className="min-w-[160px]"
            options={[{ label: "All Classes", value: "" }, ...classes.map(c => ({ label: c.name, value: c.id }))]}
          />
          
          <CustomDropdown
            name="filterMajorId"
            value={filterMajorId}
            onChange={(n, v) => setFilterMajorId(v ? Number(v) : "")}
            placeholder="All Majors"
            className="min-w-[160px]"
            options={[{ label: "All Majors", value: "" }, ...majors.map(m => ({ label: m.name, value: m.id }))]}
          />
          
          <CustomDropdown
            name="filterSectionId"
            value={filterSectionId}
            onChange={(n, v) => setFilterSectionId(v ? Number(v) : "")}
            placeholder="All Sections"
            className="min-w-[160px]"
            options={[{ label: "All Sections", value: "" }, ...sections.map(s => ({ label: s.name, value: s.id }))]}
          />
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden shadow-sm border" style={{ background: "#fff", borderColor: "#bfdbfe" }}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin w-8 h-8" style={{ color: "#2563eb" }} fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          </div>
        ) : students.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <svg className="w-14 h-14" style={{ color: "#bfdbfe" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            <p className="text-sm font-medium" style={{ color: "#38bdf8" }}>{search ? `No students match "${search}"` : "No students yet. Register the first one!"}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#f0f4f8", borderBottom: "1px solid #bfdbfe" }}>
                  <th className="text-left px-5 py-3.5 w-12">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded text-[#2563eb] focus:ring-[#2563eb]" 
                      style={{ accentColor: "#2563eb" }}
                      checked={students.length > 0 && selectedStudentIds.length === students.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStudentIds(students.map(s => s.id));
                        } else {
                          setSelectedStudentIds([]);
                        }
                      }}
                    />
                  </th>
                  <th className="text-left px-3 py-3.5 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Reg No</th>
                  <th className="text-left px-1 py-3.5 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Student</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wide hidden sm:table-cell" style={{ color: "#2563eb" }}>Father's Name</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Class</th>
                  <th className="hidden text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Major</th>
                  <th className="hidden text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Subjects</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wide hidden md:table-cell" style={{ color: "#2563eb" }}>Section</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wide hidden lg:table-cell" style={{ color: "#2563eb" }}>Contact</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Status</th>
                  <th className="text-right px-5 py-3.5 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "#dbeafe" }}>
                {students.map((student) => (
                  <tr key={student.id} className={`transition-colors ${selectedStudentIds.includes(student.id) ? 'bg-[#dbeafe]' : 'hover:bg-[#f0f4f8]'}`}>
                    <td className="px-5 py-3.5">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded text-[#2563eb] focus:ring-[#2563eb]" 
                        style={{ accentColor: "#2563eb" }}
                        checked={selectedStudentIds.includes(student.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudentIds(prev => [...prev, student.id]);
                          } else {
                            setSelectedStudentIds(prev => prev.filter(id => id !== student.id));
                          }
                        }}
                      />
                    </td>
                    <td className="px-3 py-3.5 text-xs font-mono font-semibold" style={{ color: "#0f224a" }}>
                      {student.erp_reg || student.student_cnic || (student.email?.startsWith('erp_') ? student.email.replace('@kips.edu.pk', '').replace('erp_', '') : (student.roll_number ? String(student.roll_number) : String(student.id)))}
                    </td>
                    <td className="px-1 py-3.5">
                      <div className="flex items-center gap-3">
                        {student.image ? (
                          <img 
                            src={student.image.startsWith('http') ? student.image : `${STORAGE_URL}/${student.image}`} 
                            alt={student.name} 
                            className="w-10 h-10 rounded-full object-cover border" 
                            style={{ borderColor: "#bfdbfe" }} 
                            onError={(e) => {
                              // Fallback if image fails to load
                              (e.target as HTMLImageElement).style.display = 'none';
                              const parent = (e.target as HTMLImageElement).parentElement;
                              if (parent) {
                                const div = document.createElement('div');
                                div.className = "w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-xs";
                                div.style.background = "linear-gradient(135deg, #38bdf8, #2563eb)";
                                div.innerText = student.name.charAt(0).toUpperCase();
                                parent.insertBefore(div, parent.firstChild);
                              }
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-xs" style={{ background: "linear-gradient(135deg, #38bdf8, #2563eb)" }}>
                            {student.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-[#0f224a]">{student.name}</p>
                          {student.email && !student.email.startsWith('erp_') && (
                            <p className="text-xs text-[#38bdf8]">{student.email}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell text-[#1e40af]">
                      {student.father_name || "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      {student.academy_class ? (
                        <span className="inline-block px-2.5 py-1 rounded text-[11px] font-bold bg-[#1e3a8a] text-white">
                          {student.academy_class.name}
                        </span>
                      ) : <span className="text-xs text-[#38bdf8] italic">No Class</span>}
                    </td>
                    <td className="hidden px-5 py-3.5">
                      {student.major ? (
                        <span className="inline-block px-2.5 py-1 rounded text-[11px] font-semibold border border-[#bfdbfe] bg-white text-[#1e3a8a]">
                          {student.major.name}
                        </span>
                      ) : <span className="text-xs text-[#38bdf8] italic">—</span>}
                    </td>
                    <td className="hidden px-5 py-3.5">
                      {(student.academy_class?.name?.toLowerCase().includes('11th') || student.academy_class?.name?.toLowerCase().includes('12th')) ? (
                        <span className="inline-block px-2.5 py-1 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          {Number(student.active_subjects_count) || 0} Active
                        </span>
                      ) : <span className="text-xs text-[#38bdf8] italic">—</span>}
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      {student.section ? (
                        <span className="inline-block px-2.5 py-1 rounded text-[11px] font-semibold bg-[#f0f4f8] text-[#1e40af] border" style={{ borderColor: "#bfdbfe" }}>
                          {student.section.name}
                        </span>
                      ) : <span className="text-xs text-[#38bdf8] italic">—</span>}
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell text-[#1e40af]">
                      {student.contact_number || "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <button 
                        onClick={() => handleToggleStatus(student)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2 ${student.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${student.is_active ? 'translate-x-4' : 'translate-x-1'}`} />
                      </button>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setEnrollTarget(student)} className="p-1.5 rounded-md border text-blue-600 hover:bg-blue-600 hover:text-white transition-colors border-blue-200" title="Subject Enrollment">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                        </button>
                        <button onClick={() => router.push(`/dashboard/students/admission?edit=${student.id}`)} className="p-1.5 rounded-md border text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white transition-colors" style={{ borderColor: "#bfdbfe" }} title="Edit Student">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        {userRole !== "5" && (
                          <button onClick={() => setDeleteTarget(student)} className="p-1.5 rounded-md border text-red-600 hover:bg-red-600 hover:text-white transition-colors border-red-200">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination UI */}
        {!loading && students.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Showing page <span className="font-semibold">{currentPage}</span> of <span className="font-semibold">{lastPage}</span>
              {" "} (<span className="font-semibold">{totalStudents}</span> total records)
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border rounded-md text-sm font-medium transition hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none"
              >
                Previous
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(lastPage, prev + 1))}
                disabled={currentPage === lastPage}
                className="px-4 py-2 border rounded-md text-sm font-medium transition hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>


      {deleteTarget && <DeleteModal studentName={deleteTarget.name} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} loading={modalLoading} />}
      {showBulkDelete && <BulkDeleteModal selectedCount={selectedStudentIds.length} onClose={() => setShowBulkDelete(false)} onConfirm={handleBulkDelete} loading={modalLoading} />}
      {showPromote && (
        <PromoteModal
          selectedCount={selectedStudentIds.length}
          classes={classes}
          majors={majors}
          sections={sections}
          sessions={sessions}
          loading={modalLoading}
          onClose={() => setShowPromote(false)}
          onSubmit={handlePromote}
        />
      )}
      {enrollTarget && <SubjectEnrollmentModal student={enrollTarget} onClose={() => setEnrollTarget(null)} onSuccess={() => refetchStudents()} />}
    </DashboardLayout>
  );
}

import PageLoader from "@/components/PageLoader";

export default function ManageStudentsPageWrapper() {
  return (
    <Suspense fallback={<PageLoader text="Loading students..." />}>
      <ManageStudentsPageContent />
    </Suspense>
  );
}
