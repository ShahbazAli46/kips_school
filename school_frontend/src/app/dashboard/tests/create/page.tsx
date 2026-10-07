"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import CustomDropdown from "@/components/CustomDropdown";
import { format, addDays } from "date-fns";
import {
  Calendar as CalendarIcon,
  ArrowLeft,
  BookOpen,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  CheckSquare,
  Square,
  CalendarCheck,
  Save,
  RotateCcw,
  PlusCircle,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

interface SubjectItem {
  id: number;
  name: string;
}

interface SubjectTestRow {
  subject_id: number;
  subject_name: string;
  enabled: boolean;
  date: string;
  total_marks: string | number;
  passing_marks: string | number;
  syllabus: string;
}

export default function CreateTestBatchPage() {
  const router = useRouter();

  // Reference data
  const [sessions, setSessions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [allSubjects, setAllSubjects] = useState<SubjectItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);

  // Form setup state
  const [sessionId, setSessionId] = useState<string | number>("");
  const [categoryId, setCategoryId] = useState<string | number>("");
  const [classId, setClassId] = useState<string | number>("");
  const [sectionId, setSectionId] = useState<string | number>("");
  const [title, setTitle] = useState<string>("");

  // Subjects & Test details
  const [subjectRows, setSubjectRows] = useState<SubjectTestRow[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);

  // Quick fill / bulk helpers
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const [bulkDate, setBulkDate] = useState<string>(todayStr);
  const [bulkTotalMarks, setBulkTotalMarks] = useState<string>("25");
  const [bulkPassingMarks, setBulkPassingMarks] = useState<string>("0");

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Fetch base configuration data
  const fetchBaseData = useCallback(async () => {
    setInitialLoading(true);
    try {
      const [resSess, resCat, resCls, resSec, resSubj] = await Promise.all([
        fetch(`${API}/academic-sessions`, { headers: getAuthHeaders() }),
        fetch(`${API}/test-categories`, { headers: getAuthHeaders() }),
        fetch(`${API}/classes`, { headers: getAuthHeaders() }),
        fetch(`${API}/sections`, { headers: getAuthHeaders() }),
        fetch(`${API}/subjects`, { headers: getAuthHeaders() }),
      ]);

      const dataSess = await resSess.json();
      const dataCat = await resCat.json();
      const dataCls = await resCls.json();
      const dataSec = await resSec.json();
      const dataSubj = await resSubj.json();

      const sessList = Array.isArray(dataSess) ? dataSess : [];
      const catList = Array.isArray(dataCat) ? dataCat : [];
      const clsList = Array.isArray(dataCls) ? dataCls : [];
      const secList = Array.isArray(dataSec) ? dataSec : [];
      const subjList = Array.isArray(dataSubj) ? dataSubj : [];

      setSessions(sessList);
      setCategories(catList);
      setClasses(clsList);
      setSections(secList);
      setAllSubjects(subjList);

      // Default to active session
      const activeSess = sessList.find((s: any) => s.is_active) || sessList[0];
      if (activeSess) setSessionId(activeSess.id);

      // Default to first category
      if (catList.length > 0) setCategoryId(catList[0].id);
    } catch {
      setErrorMsg("Failed to load initial form options. Please check network connection.");
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBaseData();
  }, [fetchBaseData]);

  // When class changes, fetch and layout all subjects for this class
  useEffect(() => {
    if (!classId) {
      setSubjectRows([]);
      return;
    }

    let isCancelled = false;
    const loadClassSubjects = async () => {
      setSubjectsLoading(true);
      setErrorMsg("");
      try {
        const res = await fetch(`${API}/classes/${classId}/subjects`, { headers: getAuthHeaders() });
        let subjectsData: SubjectItem[] = [];
        if (res.ok) {
          subjectsData = await res.json();
        }

        // If no subjects mapped, fallback to all subjects
        if (!Array.isArray(subjectsData) || subjectsData.length === 0) {
          subjectsData = allSubjects;
        }

        if (!isCancelled) {
          const initialRows: SubjectTestRow[] = subjectsData.map((subj) => {
            const rowDate = bulkDate || todayStr;
            return {
              subject_id: subj.id,
              subject_name: subj.name,
              enabled: true,
              date: rowDate,
              total_marks: bulkTotalMarks || "25",
              passing_marks: bulkPassingMarks || "0",
              syllabus: "",
            };
          });
          setSubjectRows(initialRows);
        }
      } catch {
        if (!isCancelled) {
          const initialRows: SubjectTestRow[] = allSubjects.map((subj) => ({
            subject_id: subj.id,
            subject_name: subj.name,
            enabled: true,
            date: bulkDate || todayStr,
            total_marks: bulkTotalMarks || "25",
            passing_marks: bulkPassingMarks || "0",
            syllabus: "",
          }));
          setSubjectRows(initialRows);
        }
      } finally {
        if (!isCancelled) setSubjectsLoading(false);
      }
    };

    loadClassSubjects();

    return () => {
      isCancelled = true;
    };
  }, [classId, allSubjects]);

  // Bulk Apply Functions
  const applyBulkDate = (dateVal: string) => {
    setBulkDate(dateVal);
    setSubjectRows((prev) =>
      prev.map((row) => (row.enabled ? { ...row, date: dateVal } : row))
    );
  };

  const applySequentialDates = () => {
    if (!bulkDate) return;
    const startDate = new Date(bulkDate);
    let offset = 0;
    setSubjectRows((prev) =>
      prev.map((row) => {
        if (!row.enabled) return row;
        let curDate = addDays(startDate, offset);
        if (curDate.getDay() === 0) {
          offset += 1;
          curDate = addDays(startDate, offset);
        }
        offset += 1;
        return {
          ...row,
          date: format(curDate, "yyyy-MM-dd"),
        };
      })
    );
  };

  const applyBulkTotalMarks = (marksVal: string) => {
    setBulkTotalMarks(marksVal);
    setSubjectRows((prev) =>
      prev.map((row) => (row.enabled ? { ...row, total_marks: marksVal } : row))
    );
  };

  const applyBulkPassingMarks = (marksVal: string) => {
    setBulkPassingMarks(marksVal);
    setSubjectRows((prev) =>
      prev.map((row) => (row.enabled ? { ...row, passing_marks: marksVal } : row))
    );
  };

  const toggleSelectAll = (selectAll: boolean) => {
    setSubjectRows((prev) => prev.map((row) => ({ ...row, enabled: selectAll })));
  };

  const updateSubjectRow = (index: number, patch: Partial<SubjectTestRow>) => {
    setSubjectRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...patch };
      return copy;
    });
  };

  const enabledCount = subjectRows.filter((r) => r.enabled).length;

  // Filter sections dynamically based on selected class
  const selectedClassObj = classes.find((c: any) => String(c.id) === String(classId));
  const availableSections: any[] = selectedClassObj?.sections && Array.isArray(selectedClassObj.sections)
    ? selectedClassObj.sections
    : [];

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!sessionId) {
      setErrorMsg("Please select an Academic Session.");
      return;
    }
    if (!categoryId) {
      setErrorMsg("Please select a Test Category.");
      return;
    }
    if (!classId) {
      setErrorMsg("Please select a Class.");
      return;
    }

    const selectedTests = subjectRows.filter((r) => r.enabled);
    if (selectedTests.length === 0) {
      setErrorMsg("Please select at least one subject to create tests.");
      return;
    }

    for (const t of selectedTests) {
      if (!t.date) {
        setErrorMsg(`Please specify a test date for ${t.subject_name}.`);
        return;
      }
      if (!t.total_marks || Number(t.total_marks) <= 0) {
        setErrorMsg(`Please specify a valid total marks (> 0) for ${t.subject_name}.`);
        return;
      }
    }

    setSubmitting(true);

    try {
      const payload = {
        academic_session_id: Number(sessionId),
        test_category_id: Number(categoryId),
        academy_class_id: Number(classId),
        section_id: sectionId ? Number(sectionId) : null,
        title: title.trim() || undefined,
        tests: selectedTests.map((t) => ({
          subject_id: t.subject_id,
          date: t.date,
          total_marks: Number(t.total_marks),
          passing_marks: Number(t.passing_marks) || 0,
          syllabus: t.syllabus.trim() || null,
        })),
      };

      const res = await fetch(`${API}/tests/batch`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.message || "Failed to create tests");
      }

      setSuccessMsg(`Successfully created ${selectedTests.length} tests! Redirecting...`);
      setTimeout(() => {
        router.push("/dashboard/tests");
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred while saving tests.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 pb-20">
        {/* Top Breadcrumb & Navigation */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#bfdbfe] pb-4">
          <div>
            <Link
              href="/dashboard/tests"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2563eb] hover:text-[#1e3a8a] transition mb-1 uppercase tracking-wider"
            >
              <ArrowLeft size={14} /> Back to Tests List
            </Link>
            <h1 className="text-2xl sm:text-3xl font-black text-[#0f224a] flex items-center gap-2">
              <Layers className="text-[#2563eb]" size={28} /> Add Tests for Class
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Select a class to automatically load all its subjects and configure dates, total marks, and syllabus in one unified view.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/tests"
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold transition"
            >
              Cancel
            </Link>
            <button
              onClick={handleSubmit}
              disabled={submitting || initialLoading || enabledCount === 0}
              className="px-5 py-2.5 bg-[#2563eb] hover:bg-[#1e3a8a] text-white rounded-lg text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              <Save size={16} />
              {submitting ? "Creating Tests..." : `Save All Tests (${enabledCount})`}
            </button>
          </div>
        </div>

        {/* Error / Success Alerts */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-3 text-sm animate-in fade-in">
            <AlertCircle className="shrink-0 text-red-500" size={20} />
            <span className="font-semibold">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-3 text-sm animate-in fade-in">
            <CheckCircle2 className="shrink-0 text-emerald-500" size={20} />
            <span className="font-bold">{successMsg}</span>
          </div>
        )}

        {/* SECTION 1: Batch Configuration Details */}
        <div className="bg-white rounded-2xl border border-[#bfdbfe] shadow-sm relative z-30">
          <div className="bg-gradient-to-r from-[#eff6ff] to-[#f8fafc] px-6 py-4 border-b border-[#bfdbfe] rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#2563eb] text-white text-xs font-black">
                1
              </span>
              <h2 className="text-base font-bold text-[#0f224a]">Test Series & Class Setup</h2>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-blue-100 text-[#1e3a8a] rounded-full">
              Required Info
            </span>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Academic Session */}
            <div className="relative z-40">
              <label className="block text-xs font-bold text-[#1e3a8a] uppercase tracking-wide mb-1.5">
                Academic Session <span className="text-red-500">*</span>
              </label>
              <CustomDropdown
                name="sessionId"
                value={sessionId}
                onChange={(_, val) => setSessionId(val)}
                placeholder="Select Session"
                options={sessions.map((s) => ({
                  label: `${s.name} ${s.is_active ? "(Active)" : ""}`.trim(),
                  value: s.id,
                }))}
              />
            </div>

            {/* Test Category */}
            <div className="relative z-30">
              <label className="block text-xs font-bold text-[#1e3a8a] uppercase tracking-wide mb-1.5">
                Test Category <span className="text-red-500">*</span>
              </label>
              <CustomDropdown
                name="categoryId"
                value={categoryId}
                onChange={(_, val) => setCategoryId(val)}
                placeholder="Select Category"
                options={categories.map((c) => ({
                  label: c.name,
                  value: c.id,
                }))}
              />
            </div>

            {/* Class Selection */}
            <div className="relative z-20">
              <label className="block text-xs font-bold text-[#1e3a8a] uppercase tracking-wide mb-1.5">
                Class <span className="text-red-500">*</span>
              </label>
              <CustomDropdown
                name="classId"
                value={classId}
                onChange={(_, val) => {
                  setClassId(val);
                  setSectionId(""); // Reset section when class changes
                }}
                placeholder="Select Class"
                options={classes.map((c) => ({
                  label: c.name,
                  value: c.id,
                }))}
              />
            </div>

            {/* Section Selection (Optional - Filtered by Class) */}
            <div className="relative z-10">
              <label className="block text-xs font-bold text-[#1e3a8a] uppercase tracking-wide mb-1.5">
                Section <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <CustomDropdown
                name="sectionId"
                value={sectionId}
                onChange={(_, val) => setSectionId(val)}
                placeholder={
                  !classId
                    ? "Select class first"
                    : availableSections.length === 0
                    ? "No sections for this class"
                    : "All Sections"
                }
                options={
                  !classId
                    ? [{ label: "Select class first", value: "" }]
                    : availableSections.length === 0
                    ? [{ label: "No sections for this class", value: "" }]
                    : [
                        { label: "All Sections", value: "" },
                        ...availableSections.map((s: any) => ({
                          label: `Section ${s.name}`,
                          value: s.id,
                        })),
                      ]
                }
              />
            </div>

            {/* Custom Title / Round Name */}
            <div className="lg:col-span-4 pt-2 relative z-0">
              <label className="block text-xs font-bold text-[#1e3a8a] uppercase tracking-wide mb-1.5">
                Test Title / Name <span className="text-slate-400 font-normal">(Optional - e.g. &quot;CT 1&quot;, &quot;Round 1&quot;, &quot;First Term&quot;)</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Leave blank to use category name or auto-number (e.g. Round 2, CT 1)"
                className="w-full h-[38px] px-3.5 py-2 text-sm border rounded-lg border-slate-300 focus:outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-100 transition font-medium"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: Class Subjects & Test Details */}
        <div className="bg-white rounded-2xl border border-[#bfdbfe] shadow-sm relative z-10">
          <div className="bg-gradient-to-r from-[#eff6ff] to-[#f8fafc] px-6 py-4 border-b border-[#bfdbfe] rounded-t-2xl flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#2563eb] text-white text-xs font-black">
                2
              </span>
              <div>
                <h2 className="text-base font-bold text-[#0f224a]">
                  Subjects & Schedule Configuration
                </h2>
                <p className="text-xs text-slate-500">
                  {classId
                    ? `Configuring ${subjectRows.length} subjects for class ${
                        classes.find((c) => String(c.id) === String(classId))?.name || ""
                      }`
                    : "Select a class above to layout all subjects"}
                </p>
              </div>
            </div>

            {classId && subjectRows.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleSelectAll(true)}
                  className="px-2.5 py-1 text-xs font-bold text-[#2563eb] hover:bg-blue-50 rounded-md border border-[#bfdbfe] transition flex items-center gap-1"
                >
                  <CheckSquare size={13} /> Select All
                </button>
                <button
                  type="button"
                  onClick={() => toggleSelectAll(false)}
                  className="px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-md border border-slate-300 transition flex items-center gap-1"
                >
                  <Square size={13} /> Deselect All
                </button>
              </div>
            )}
          </div>

          {/* Quick-Fill & Bulk Tool Bar */}
          {classId && subjectRows.length > 0 && (
            <div className="bg-[#f0f7ff] border-b border-[#bfdbfe] p-4 px-6 flex flex-wrap items-center gap-4 text-xs font-semibold text-[#1e3a8a]">
              <div className="flex items-center gap-1.5 font-bold text-[#0f224a]">
                <Sparkles size={16} className="text-[#2563eb]" /> Quick Fill:
              </div>

              {/* Quick Fill Date */}
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-[#bfdbfe] shadow-2xs">
                <span className="text-slate-500 font-medium">Date:</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="px-2 py-0.5 rounded border border-slate-200 text-xs font-bold text-[#0f224a] hover:border-[#2563eb] flex items-center gap-1.5"
                    >
                      <CalendarIcon size={13} className="text-[#2563eb]" />
                      {bulkDate ? format(new Date(bulkDate), "dd MMM yyyy") : "Pick Date"}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-50" align="start">
                    <Calendar
                      mode="single"
                      selected={bulkDate ? new Date(bulkDate) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          const formatted = format(date, "yyyy-MM-dd");
                          applyBulkDate(formatted);
                        }
                      }}
                    />
                  </PopoverContent>
                </Popover>

                <button
                  type="button"
                  onClick={() => applyBulkDate(bulkDate)}
                  className="ml-1 px-2 py-0.5 bg-[#2563eb] hover:bg-[#1e3a8a] text-white rounded text-[11px] font-bold transition"
                  title="Set this date on all selected subjects"
                >
                  Apply to All
                </button>
                <button
                  type="button"
                  onClick={applySequentialDates}
                  className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-bold transition flex items-center gap-1"
                  title="Assign sequential days (skipping Sundays) starting from this date"
                >
                  <CalendarCheck size={11} /> Sequential Dates
                </button>
              </div>

              {/* Quick Fill Total Marks */}
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-[#bfdbfe] shadow-2xs">
                <span className="text-slate-500 font-medium">Total Marks:</span>
                <input
                  type="number"
                  min="1"
                  value={bulkTotalMarks}
                  onChange={(e) => setBulkTotalMarks(e.target.value)}
                  className="w-16 h-6 px-1.5 border rounded text-xs font-bold text-[#0f224a] outline-none focus:border-[#2563eb]"
                />
                <button
                  type="button"
                  onClick={() => applyBulkTotalMarks(bulkTotalMarks)}
                  className="px-2 py-0.5 bg-[#2563eb] hover:bg-[#1e3a8a] text-white rounded text-[11px] font-bold transition"
                >
                  Apply to All
                </button>
              </div>

              {/* Quick Fill Passing Marks */}
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-[#bfdbfe] shadow-2xs">
                <span className="text-slate-500 font-medium">Passing:</span>
                <input
                  type="number"
                  min="0"
                  value={bulkPassingMarks}
                  onChange={(e) => setBulkPassingMarks(e.target.value)}
                  className="w-14 h-6 px-1.5 border rounded text-xs font-bold text-[#0f224a] outline-none focus:border-[#2563eb]"
                />
                <button
                  type="button"
                  onClick={() => applyBulkPassingMarks(bulkPassingMarks)}
                  className="px-2 py-0.5 bg-[#2563eb] hover:bg-[#1e3a8a] text-white rounded text-[11px] font-bold transition"
                >
                  Apply to All
                </button>
              </div>
            </div>
          )}

          {/* Subjects Body Content */}
          <div className="p-6">
            {!classId ? (
              <div className="text-center py-16 px-4">
                <div className="w-16 h-16 rounded-full bg-blue-50 text-[#2563eb] mx-auto flex items-center justify-center mb-4 shadow-inner">
                  <BookOpen size={30} />
                </div>
                <h3 className="text-lg font-bold text-[#0f224a] mb-1">No Class Selected</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  Please select an Academic Session and Class in the section above. All associated subjects will automatically appear here with inputs for Total Marks, Date, and Syllabus.
                </p>
              </div>
            ) : subjectsLoading ? (
              <div className="text-center py-16">
                <div className="inline-block animate-spin rounded-full h-9 w-9 border-4 border-blue-200 border-t-[#2563eb] mb-3"></div>
                <p className="text-sm font-semibold text-[#1e3a8a]">Loading subjects for this class...</p>
              </div>
            ) : subjectRows.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-slate-500 font-medium">No subjects found for this class.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {subjectRows.map((row, index) => (
                  <div
                    key={row.subject_id}
                    className={`rounded-xl border transition-all p-5 ${
                      row.enabled
                        ? "bg-white border-[#bfdbfe] shadow-sm hover:shadow-md hover:border-[#2563eb]"
                        : "bg-slate-50 border-slate-200 opacity-60"
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                      {/* Checkbox and Subject Title */}
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={row.enabled}
                          onChange={(e) => updateSubjectRow(index, { enabled: e.target.checked })}
                          className="w-5 h-5 rounded text-[#2563eb] focus:ring-blue-500 cursor-pointer accent-[#2563eb]"
                          id={`subj-check-${row.subject_id}`}
                        />
                        <label
                          htmlFor={`subj-check-${row.subject_id}`}
                          className="text-base font-bold text-[#0f224a] cursor-pointer flex items-center gap-2 select-none"
                        >
                          <span className="w-2.5 h-2.5 rounded-full bg-[#2563eb]"></span>
                          {row.subject_name}
                        </label>
                      </div>

                      {/* Date, Total Marks, Passing Marks Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
                        {/* Date Picker */}
                        <div className="w-full sm:w-48">
                          <label className="block text-[11px] font-bold text-[#1e3a8a] uppercase tracking-wide mb-1">
                            Test Date <span className="text-red-500">*</span>
                          </label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                disabled={!row.enabled}
                                className={`w-full h-[36px] px-3 py-1.5 border rounded-lg text-xs font-semibold flex items-center justify-between bg-white text-left transition ${
                                  !row.date ? "text-gray-400" : "text-[#0f224a]"
                                } ${!row.enabled ? "cursor-not-allowed bg-slate-100" : "hover:border-[#2563eb]"}`}
                              >
                                <span>{row.date ? format(new Date(row.date), "dd MMM yyyy") : "Select date"}</span>
                                <CalendarIcon className="h-4 w-4 text-[#2563eb]" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 z-50" align="start">
                              <Calendar
                                mode="single"
                                selected={row.date ? new Date(row.date) : undefined}
                                onSelect={(date) => {
                                  if (date) {
                                    updateSubjectRow(index, { date: format(date, "yyyy-MM-dd") });
                                  }
                                }}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        {/* Total Marks */}
                        <div className="w-full sm:w-28">
                          <label className="block text-[11px] font-bold text-[#1e3a8a] uppercase tracking-wide mb-1">
                            Total Marks <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            min="1"
                            disabled={!row.enabled}
                            value={row.total_marks}
                            onChange={(e) => updateSubjectRow(index, { total_marks: e.target.value })}
                            className="w-full h-[36px] px-3 py-1.5 border rounded-lg text-xs font-bold text-[#0f224a] outline-none focus:border-[#2563eb] disabled:bg-slate-100 disabled:cursor-not-allowed"
                          />
                        </div>

                        {/* Passing Marks */}
                        <div className="w-full sm:w-28">
                          <label className="block text-[11px] font-bold text-[#1e3a8a] uppercase tracking-wide mb-1">
                            Passing Marks
                          </label>
                          <input
                            type="number"
                            min="0"
                            disabled={!row.enabled}
                            value={row.passing_marks}
                            onChange={(e) => updateSubjectRow(index, { passing_marks: e.target.value })}
                            className="w-full h-[36px] px-3 py-1.5 border rounded-lg text-xs font-bold text-[#0f224a] outline-none focus:border-[#2563eb] disabled:bg-slate-100 disabled:cursor-not-allowed"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Syllabus Textarea */}
                    <div className="mt-3.5">
                      <label className="block text-xs font-bold text-[#1e3a8a] uppercase tracking-wide mb-1 flex items-center justify-between">
                        <span>Syllabus for {row.subject_name}</span>
                        <span className="text-[11px] text-slate-400 font-normal font-sans">
                          Supports English & Urdu Nastaleeq (سلیبس)
                        </span>
                      </label>
                      <textarea
                        rows={2}
                        disabled={!row.enabled}
                        value={row.syllabus}
                        onChange={(e) => updateSubjectRow(index, { syllabus: e.target.value })}
                        placeholder={`Enter syllabus for ${row.subject_name} (سلیبس درج کریں)...`}
                        className="w-full px-3.5 py-2 border rounded-lg focus:outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-100 text-sm leading-relaxed transition disabled:bg-slate-100 disabled:cursor-not-allowed"
                        style={{
                          fontFamily: "'Jameel Noori Nastaleeq', 'Jameel Noori Nastaleeq Regular', system-ui, sans-serif",
                          direction: row.syllabus && /[\u0600-\u06FF]/.test(row.syllabus) ? "rtl" : "ltr",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Floating/Sticky Action Bar */}
        {classId && subjectRows.length > 0 && (
          <div className="sticky bottom-4 z-40 bg-white/95 backdrop-blur-md border border-[#bfdbfe] shadow-2xl rounded-2xl p-4 px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-50 text-[#2563eb] font-bold text-sm border border-blue-200">
                {enabledCount}
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#0f224a]">
                  {enabledCount} of {subjectRows.length} subjects included
                </h4>
                <p className="text-xs text-slate-500">
                  Clicking Save will generate all {enabledCount} tests simultaneously in the database.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Link
                href="/dashboard/tests"
                className="flex-1 sm:flex-initial text-center px-4 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold transition"
              >
                Cancel
              </Link>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || enabledCount === 0}
                className="flex-1 sm:flex-initial px-6 py-2.5 bg-[#2563eb] hover:bg-[#1e3a8a] text-white rounded-lg text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                <Save size={16} />
                {submitting ? "Creating Tests..." : `Create All Tests (${enabledCount})`}
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
