"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Printer } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function CustomDropdown({
  options,
  value,
  onChange,
  placeholder = "Select...",
  name,
  className = "",
  disabled = false,
}: {
  options: { label: string; value: string | number }[];
  value: string | number;
  onChange: (name: string, value: string | number) => void;
  placeholder?: string;
  name: string;
  className?: string;
  disabled?: boolean;
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
        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-[#2563eb] transition-all font-medium flex items-center justify-between shadow-sm hover:shadow-md ${disabled ? "bg-gray-100 cursor-not-allowed text-gray-400" : "bg-white cursor-pointer"}`}
        style={{
          borderColor: isOpen ? "#2563eb" : "#e5e7eb",
          color: disabled ? "#9ca3af" : (value ? "#000" : "#9ca3af"),
          boxShadow: isOpen ? "0 0 0 4px rgba(138, 50, 24, 0.1)" : "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        }}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className="truncate pr-4">{selectedOption ? selectedOption.label : placeholder}</span>
        <svg
          className={`w-4 h-4 transition-transform duration-300 shrink-0 ${isOpen ? "rotate-180" : ""}`}
          style={{ color: disabled ? "#cbd5e1" : "#2563eb" }}
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
          style={{ borderColor: "#e5e7eb", maxHeight: "240px", overflowY: "auto", animation: "fadeIn 0.2s ease-out" }}
        >
          <div className="p-1.5 space-y-0.5">
            {options.map((option) => (
              <div
                key={option.value}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all truncate flex items-center ${
                  String(value) === String(option.value)
                    ? "bg-[#dbeafe] text-[#2563eb] font-semibold"
                    : "text-[#434655] hover:bg-gray-50 hover:text-black"
                }`}
                onClick={() => {
                  onChange(name, option.value);
                  setIsOpen(false);
                }}
              >
                {String(value) === String(option.value) && (
                  <span className="mr-2 inline-block">✓</span>
                )}
                {option.label}
              </div>
            ))}
            {options.length === 0 && (
              <div className="px-4 py-4 text-sm text-gray-400 text-center italic font-medium">
                No options available
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}function TestModal({ title, onClose, onSubmit, initialData, categories, sessions, classes, sections, majors, subjects, loading, error }: any) {
  const [data, setData] = useState({
    test_category_id: initialData?.test_category_id || "",
    academic_session_id: initialData?.academic_session_id || "",
    academy_class_id: initialData?.academy_class_id || "",
    section_id: initialData?.section_id || "",
    major_id: initialData?.major_id || "",
    subject_id: initialData?.subject_id || "",
    date: initialData?.date || "",
    total_marks: initialData?.total_marks || "",
    passing_marks: initialData?.passing_marks ?? 0,
    syllabus: initialData?.syllabus || initialData?.syllabus_english || initialData?.syllabus_urdu || "",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl shadow-2xl p-6 bg-white border border-[#bfdbfe] z-10 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-[#0f224a] mb-4">{title}</h2>
        {error && <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">{error}</div>}
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(data); }} className="space-y-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-[#1e3a8a]">Academic Session</label>
              <CustomDropdown
                name="academic_session_id"
                value={data.academic_session_id}
                onChange={(name, val) => setData({...data, [name]: val})}
                placeholder="Select Session"
                options={sessions.map((s:any) => ({ label: `${s.name} ${s.is_active ? '(Active)' : ''}`.trim(), value: s.id }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-[#1e3a8a]">Test Category</label>
              <CustomDropdown
                name="test_category_id"
                value={data.test_category_id}
                onChange={(name, val) => setData({...data, [name]: val})}
                placeholder="Select Category"
                options={categories.map((c:any) => ({ label: c.name, value: c.id }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-[#1e3a8a]">Class</label>
              <CustomDropdown
                name="academy_class_id"
                value={data.academy_class_id}
                onChange={(name, val) => setData({...data, [name]: val})}
                placeholder="Select Class"
                options={classes.map((c:any) => ({ label: c.name, value: c.id }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-[#1e3a8a]">Section (Optional)</label>
              <CustomDropdown
                name="section_id"
                value={data.section_id}
                onChange={(name, val) => setData({...data, [name]: val})}
                placeholder="All Sections"
                options={sections.map((s:any) => ({ label: s.name, value: s.id }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-[#1e3a8a]">Subject</label>
              <CustomDropdown
                name="subject_id"
                value={data.subject_id}
                onChange={(name, val) => setData({...data, [name]: val})}
                placeholder="Select Subject"
                options={subjects.map((s:any) => ({ label: s.name, value: s.id }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-[#1e3a8a]">Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-[#2563eb] flex items-center justify-between bg-white text-left font-normal ${!data.date ? "text-gray-400" : "text-black"}`}
                  >
                    {data.date ? format(new Date(data.date), "PPP") : <span>Pick a date</span>}
                    <CalendarIcon className="h-4 w-4 opacity-50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={data.date ? new Date(data.date) : undefined}
                    onSelect={(date) => setData({...data, date: date ? format(date, "yyyy-MM-dd") : ""})}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-[#1e3a8a]">Total Marks</label>
            <input type="number" min="1" value={data.total_marks} onChange={(e) => setData({...data, total_marks: e.target.value})} required className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-[#2563eb]" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-[#1e3a8a]">Syllabus</label>
            <textarea
              rows={3}
              value={data.syllabus}
              onChange={(e) => setData({ ...data, syllabus: e.target.value })}
              placeholder="Enter syllabus in English or Urdu (سلیبس درج کریں)..."
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-[#2563eb] text-xl leading-loose"
              style={{ fontFamily: "'Jameel Noori Nastaleeq', 'Jameel Noori Nastaleeq Regular', serif", direction: "rtl" }}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2 rounded-lg text-white font-semibold bg-[#2563eb] hover:bg-[#1e3a8a]">{loading ? "Saving..." : "Save Test"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteModal({ testTitle, onClose, onConfirm, loading }: { testTitle: string; onClose: () => void; onConfirm: () => void; loading: boolean; }) {
  const [confirmText, setConfirmText] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl shadow-2xl p-6 z-10 text-center" style={{ background: "#fff", border: "1px solid #fca5a5" }}>
        <h3 className="text-lg font-bold mb-2 text-[#0b1329]">Delete Test?</h3>
        <p className="text-sm mb-4 text-[#1e40af]">Are you sure you want to delete <strong>&quot;{testTitle}&quot;</strong>? This will permanently erase all marks and cannot be undone.</p>
        
        <div className="text-left mb-5">
          <label className="block text-xs font-bold mb-1" style={{ color: "#1e3a8a" }}>Type <strong>{testTitle}</strong> to confirm:</label>
          <input type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={testTitle} className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition" style={{ borderColor: "#fca5a5", background: "#fef2f2", color: "#b91c1c" }} />
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium border transition" style={{ borderColor: "#bfdbfe", color: "#1e40af", background: "#f0f4f8" }}>Cancel</button>
          <button onClick={onConfirm} disabled={confirmText !== testTitle || loading} className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition active:scale-95 disabled:opacity-50" style={{ background: "linear-gradient(135deg, #f87171, #dc2626)" }}>{loading ? "Deleting..." : "Delete"}</button>
        </div>
      </div>
    </div>
  );
}

export default function ManageTestsPage() {
  const [tests, setTests] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [majors, setMajors] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  const [filterSessionId, setFilterSessionId] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterClassId, setFilterClassId] = useState("");
  const [filterSubjectId, setFilterSubjectId] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resTests, resSess, resCat, resCls, resSec, resSubj, resMaj] = await Promise.all([
        fetch(`${API}/tests`, { headers: getAuthHeaders() }),
        fetch(`${API}/academic-sessions`, { headers: getAuthHeaders() }),
        fetch(`${API}/test-categories`, { headers: getAuthHeaders() }),
        fetch(`${API}/classes`, { headers: getAuthHeaders() }),
        fetch(`${API}/sections`, { headers: getAuthHeaders() }),
        fetch(`${API}/subjects`, { headers: getAuthHeaders() }),
        fetch(`${API}/majors`, { headers: getAuthHeaders() }),
      ]);
      setTests(await resTests.json());
      setSessions(await resSess.json());
      setCategories(await resCat.json());
      setClasses(await resCls.json());
      setSections(await resSec.json());
      setSubjects(await resSubj.json());
      setMajors(await resMaj.json());
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async (data: any) => {
    setModalLoading(true); setModalError("");
    try {
      const res = await fetch(`${API}/tests`, { method: "POST", headers: getAuthHeaders(), body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Failed to create test");
      fetchData(); setShowCreate(false);
    } catch (err: any) { setModalError(err.message); } finally { setModalLoading(false); }
  };

  const handleUpdate = async (data: any) => {
    if (!editTarget) return;
    setModalLoading(true); setModalError("");
    try {
      const res = await fetch(`${API}/tests/${editTarget.id}`, { method: "PUT", headers: getAuthHeaders(), body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Failed to update test");
      fetchData(); setEditTarget(null);
    } catch (err: any) { setModalError(err.message); } finally { setModalLoading(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setModalLoading(true);
    try {
      const res = await fetch(`${API}/tests/${deleteTarget.id}`, { method: "DELETE", headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to delete test");
      fetchData();
      setDeleteTarget(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const filteredTests = tests.filter(t => {
    let match = true;
    if (filterSessionId && String(t.academic_session_id) !== String(filterSessionId)) match = false;
    if (filterDate && t.date !== filterDate) match = false;
    if (filterClassId && String(t.academy_class_id) !== String(filterClassId)) match = false;
    if (filterSubjectId && String(t.subject_id) !== String(filterSubjectId)) match = false;
    return match;
  });

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#0f224a]">Setup Tests</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const params = new URLSearchParams();
              if (filterSessionId) params.set("academic_session_id", filterSessionId);
              if (filterDate) params.set("date", filterDate);
              if (filterClassId) params.set("academy_class_id", filterClassId);
              if (filterSubjectId) params.set("subject_id", filterSubjectId);
              
              const selectedClass = classes.find((c: any) => String(c.id) === String(filterClassId));
              if (selectedClass) params.set("class_name", selectedClass.name);

              const selectedSession = sessions.find((s: any) => String(s.id) === String(filterSessionId));
              if (selectedSession) params.set("session_name", selectedSession.name);

              if (filteredTests.length > 0) {
                params.set("test_ids", filteredTests.map((t: any) => t.id).join(","));
              }

              window.open(`/dashboard/tests/print?${params.toString()}`, "_blank");
            }}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-medium shadow-md active:scale-95 transition-all flex items-center gap-2"
          >
            <Printer size={18} /> Print Schedule / PDF
          </button>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-[#2563eb] hover:bg-[#1e3a8a] text-white rounded-lg font-medium shadow-md active:scale-95 transition-all">+ Add Test</button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-[#bfdbfe] mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-bold text-[#2563eb] uppercase tracking-wide mb-1">Filter by Session</label>
          <CustomDropdown
            name="filterSessionId"
            value={filterSessionId}
            onChange={(_, val) => setFilterSessionId(String(val))}
            placeholder="All Sessions"
            className="w-48 text-sm"
            options={[
              { label: "All Sessions", value: "" },
              ...sessions.map((s:any) => ({ label: `${s.name} ${s.is_active ? '(Active)' : ''}`.trim(), value: s.id }))
            ]}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-[#2563eb] uppercase tracking-wide mb-1">Filter by Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`w-48 px-3 py-2 border rounded-lg focus:outline-none focus:border-[#2563eb] text-sm flex items-center justify-between bg-white text-left font-normal ${!filterDate ? "text-gray-400" : "text-black"}`}
              >
                {filterDate ? format(new Date(filterDate), "PPP") : <span>Pick a date</span>}
                <CalendarIcon className="h-4 w-4 opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filterDate ? new Date(filterDate) : undefined}
                onSelect={(date) => setFilterDate(date ? format(date, "yyyy-MM-dd") : "")}

              />
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <label className="block text-xs font-bold text-[#2563eb] uppercase tracking-wide mb-1">Filter by Class</label>
          <CustomDropdown
            name="filterClassId"
            value={filterClassId}
            onChange={(_, val) => setFilterClassId(String(val))}
            placeholder="All Classes"
            className="w-48 text-sm"
            options={[
              { label: "All Classes", value: "" },
              ...classes.map((c:any) => ({ label: c.name, value: c.id }))
            ]}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-[#2563eb] uppercase tracking-wide mb-1">Filter by Subject</label>
          <CustomDropdown
            name="filterSubjectId"
            value={filterSubjectId}
            onChange={(_, val) => setFilterSubjectId(String(val))}
            placeholder="All Subjects"
            className="w-48 text-sm"
            options={[
              { label: "All Subjects", value: "" },
              ...subjects.map((s:any) => ({ label: s.name, value: s.id }))
            ]}
          />
        </div>
        {(filterSessionId || filterDate || filterClassId || filterSubjectId) && (
          <button 
            onClick={() => { setFilterSessionId(""); setFilterDate(""); setFilterClassId(""); setFilterSubjectId(""); }} 
            className="px-4 py-2 text-sm text-[#2563eb] hover:bg-[#f0f4f8] rounded-lg transition-all"
          >
            Clear Filters
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#bfdbfe] overflow-hidden">
        {loading ? <div className="p-10 text-center">Loading...</div> : (
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f0f4f8] text-[#2563eb] border-b border-[#bfdbfe]">
              <tr>
                <th className="px-5 py-3">Session</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Title</th>
                <th className="px-5 py-3">Class/Subject</th>
                <th className="px-5 py-3">Syllabus</th>
                <th className="px-5 py-3">Marks</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dbeafe]">
              {filteredTests.map(t => (
                <tr key={t.id} className="hover:bg-blue-50">
                  <td className="px-5 py-3 font-semibold text-[#1e40af]">{t.academic_session?.name}</td>
                  <td className="px-5 py-3 text-gray-600">{t.date}</td>
                  <td className="px-5 py-3 text-[#1e40af]">{t.test_category?.name}</td>
                  <td className="px-5 py-3 font-bold text-[#1e3a8a]">{t.title}</td>
                  <td className="px-5 py-3 text-sm">
                    {t.academy_class?.name} {t.section ? `(${t.section.name})` : ''} - {t.subject?.name}
                  </td>
                  <td className="px-5 py-3 text-xs max-w-xs space-y-1">
                    {t.syllabus ? (
                      <div className="text-[#1e3a8a] text-lg leading-relaxed" style={{ fontFamily: "'Jameel Noori Nastaleeq', 'Jameel Noori Nastaleeq Regular', serif", direction: "rtl" }}>{t.syllabus}</div>
                    ) : (
                      <>
                        {t.syllabus_english && <div className="text-gray-700 font-medium">{t.syllabus_english}</div>}
                        {t.syllabus_urdu && <div className="font-urdu text-base text-[#1e3a8a]">{t.syllabus_urdu}</div>}
                        {!t.syllabus_english && !t.syllabus_urdu && <span className="text-gray-400 italic">None</span>}
                      </>
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{t.total_marks}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditTarget(t)} className="text-[#2563eb] text-xs font-bold px-2 py-1 hover:bg-[#bfdbfe] rounded">Edit</button>
                      <button onClick={() => setDeleteTarget(t)} className="text-red-600 text-xs font-bold px-2 py-1 hover:bg-red-50 rounded border border-transparent hover:border-red-200">Delete</button>
                      <a href={`/dashboard/marks-entry?test_id=${t.id}`} className="bg-[#2563eb] text-white text-xs font-bold px-3 py-1.5 rounded hover:bg-[#1e3a8a] transition-colors shadow-sm">Add Marks</a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && <TestModal title="Add Test" sessions={sessions} categories={categories} classes={classes} sections={sections} majors={majors} subjects={subjects} onClose={() => setShowCreate(false)} onSubmit={handleCreate} loading={modalLoading} error={modalError} />}
      {editTarget && <TestModal title="Edit Test" initialData={editTarget} sessions={sessions} categories={categories} classes={classes} sections={sections} majors={majors} subjects={subjects} onClose={() => setEditTarget(null)} onSubmit={handleUpdate} loading={modalLoading} error={modalError} />}
      {deleteTarget && <DeleteModal testTitle={deleteTarget.title} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete} loading={modalLoading} />}
    </DashboardLayout>
  );
}
