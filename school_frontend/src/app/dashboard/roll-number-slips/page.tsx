"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { format } from "date-fns";
import { buildRollNumberSlips } from "@/lib/rollNumberSlip";
import {
  FileText,
  Printer,
  Plus,
  Trash2,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  Users,
  Search,
  CheckSquare,
  Square,
  ChevronDown,
  Layers,
  BookOpen,
  Award,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  Eye,
  RefreshCw,
  Upload,
} from "lucide-react";

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface AcademyClass {
  id: number;
  name: string;
}

interface Section {
  id: number;
  name: string;
}

interface AcademicSession {
  id: number;
  name: string;
  is_active?: boolean;
}

interface SubjectItem {
  id: number;
  name: string;
}

interface StudentUser {
  id: number;
  name: string;
  father_name: string | null;
  roll_number: number | string | null;
  class_id: number;
  section_id: number;
  major_id?: number | null;
  image?: string | null;
  gender?: string | null;
  monthly_fee?: number | string | null;
  total_paid?: number | string | null;
  total_received?: number | string | null;
  total_payable?: number | string | null;
  total_receivable?: number | string | null;
  pending_amount?: number | string | null;
  previous_arrears?: number | string | null;
  current_month_paid?: number | string | null;
  admission_balance?: number | string | null;
  computed_status?: string | null;
  academy_class?: { id: number; name: string };
  section?: { id: number; name: string };
  major?: { id: number; name: string };
}

interface ExamPaper {
  id: string;
  subject: string;
  date: string; // YYYY-MM-DD
  day: string; // Monday, Tuesday, etc.
  timing: string; // e.g., "08:30 AM - 11:30 AM"
  maxMarks: string; // e.g., "75"
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function RollNumberSlipsPage() {
  // ─── Dropdowns & Master Data ──────────────────────────────────────────────
  const [classes, setClasses] = useState<AcademyClass[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [dbSubjects, setDbSubjects] = useState<SubjectItem[]>([]);
  const [students, setStudents] = useState<StudentUser[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // ─── Selection Filters ───────────────────────────────────────────────────
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [searchStudentQuery, setSearchStudentQuery] = useState("");

  // ─── Exam Metadata State ─────────────────────────────────────────────────
  const [examCenter, setExamCenter] = useState("Main Examination Hall");
  const [defaultTiming, setDefaultTiming] = useState("08:30 AM - 11:30 AM");
  const [reportingTime, setReportingTime] = useState("08:00 AM Sharp");
  const helplinePhone = "0300 39 39 581";

  // ─── Digital Signatures State ─────────────────────────────────────────────
  const [controllerSign, setControllerSign] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("kips_roll_slip_controller_sign") || null;
    }
    return null;
  });

  const [principalSign, setPrincipalSign] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("kips_roll_slip_principal_sign") || null;
    }
    return null;
  });

  const handleControllerSignUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setControllerSign(dataUrl);
      try {
        localStorage.setItem("kips_roll_slip_controller_sign", dataUrl);
      } catch {}
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveControllerSign = () => {
    setControllerSign(null);
    try {
      localStorage.removeItem("kips_roll_slip_controller_sign");
    } catch {}
  };

  const handlePrincipalSignUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setPrincipalSign(dataUrl);
      try {
        localStorage.setItem("kips_roll_slip_principal_sign", dataUrl);
      } catch {}
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePrincipalSign = () => {
    setPrincipalSign(null);
    try {
      localStorage.removeItem("kips_roll_slip_principal_sign");
    } catch {}
  };

  // ─── Candidate Instructions ──────────────────────────────────────────────
  const [rules, setRules] = useState<string[]>([
    "Students must bring this original slip daily. Entry into exam hall without slip is strictly prohibited.",
    "Arrive 30 minutes before the exam time and pack up time will be 12 O'clock . Bring your own geometry box, pens, and transparent clipboard.",
    "Mobile phones, smart watches, and unauthorized materials are strictly forbidden.",
  ]);

  // ─── Exam Papers / Datesheet State ───────────────────────────────────────
  const [papers, setPapers] = useState<ExamPaper[]>([
    {
      id: "p1",
      subject: "English",
      date: format(new Date(Date.now() + 86400000 * 2), "yyyy-MM-dd"),
      day: format(new Date(Date.now() + 86400000 * 2), "EEEE"),
      timing: "08:30 AM - 11:30 AM",
      maxMarks: "75",
    },
    {
      id: "p2",
      subject: "Mathematics",
      date: format(new Date(Date.now() + 86400000 * 4), "yyyy-MM-dd"),
      day: format(new Date(Date.now() + 86400000 * 4), "EEEE"),
      timing: "08:30 AM - 11:30 AM",
      maxMarks: "75",
    },
    {
      id: "p3",
      subject: "Physics",
      date: format(new Date(Date.now() + 86400000 * 6), "yyyy-MM-dd"),
      day: format(new Date(Date.now() + 86400000 * 6), "EEEE"),
      timing: "08:30 AM - 11:30 AM",
      maxMarks: "60",
    },
    {
      id: "p4",
      subject: "Chemistry",
      date: format(new Date(Date.now() + 86400000 * 8), "yyyy-MM-dd"),
      day: format(new Date(Date.now() + 86400000 * 8), "EEEE"),
      timing: "08:30 AM - 11:30 AM",
      maxMarks: "60",
    },
    {
      id: "p5",
      subject: "Biology / Computer Science",
      date: format(new Date(Date.now() + 86400000 * 10), "yyyy-MM-dd"),
      day: format(new Date(Date.now() + 86400000 * 10), "EEEE"),
      timing: "08:30 AM - 11:30 AM",
      maxMarks: "60",
    },
    {
      id: "p6",
      subject: "Urdu",
      date: format(new Date(Date.now() + 86400000 * 12), "yyyy-MM-dd"),
      day: format(new Date(Date.now() + 86400000 * 12), "EEEE"),
      timing: "08:30 AM - 11:30 AM",
      maxMarks: "75",
    },
    {
      id: "p7",
      subject: "Islamiyat / Tarjuma-tul-Quran",
      date: format(new Date(Date.now() + 86400000 * 14), "yyyy-MM-dd"),
      day: format(new Date(Date.now() + 86400000 * 14), "EEEE"),
      timing: "08:30 AM - 11:30 AM",
      maxMarks: "50",
    },
  ]);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"builder" | "preview">("builder");

  // ─── Fetch Master Data ────────────────────────────────────────────────────
  useEffect(() => {
    async function loadMasterData() {
      try {
        const [clsRes, secRes, sesRes, subRes] = await Promise.all([
          fetch(`${API_BASE}/classes`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/sections`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/academic-sessions`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/subjects`, { headers: getAuthHeaders() }),
        ]);

        if (clsRes.ok) {
          const d = await clsRes.json();
          const list = Array.isArray(d) ? d : d.data || [];
          setClasses(list);
          // Default select the first class so a heavy global API call is never made
          if (list.length > 0) {
            setSelectedClassId(String(list[0].id));
          }
        }
        if (secRes.ok) {
          const d = await secRes.json();
          setSections(Array.isArray(d) ? d : d.data || []);
        }
        if (sesRes.ok) {
          const d = await sesRes.json();
          const list = Array.isArray(d) ? d : d.data || [];
          setSessions(list);
          const activeSes = list.find((s: any) => s.is_active);
          if (activeSes) setSelectedSessionId(String(activeSes.id));
        }
        if (subRes.ok) {
          const d = await subRes.json();
          setDbSubjects(Array.isArray(d) ? d : d.data || []);
        }
      } catch (err) {
        console.error("Error loading master data:", err);
      }
    }
    loadMasterData();
  }, []);

  // ─── Fetch Students When Class/Section Changes ────────────────────────────
  const fetchStudents = useCallback(async () => {
    if (!selectedClassId) {
      setStudents([]);
      setSelectedStudentIds([]);
      return;
    }

    setLoadingStudents(true);
    try {
      // First try /fees/balances for complete live balance/receivable calculations
      let url = `${API_BASE}/fees/balances?class_id=${selectedClassId}&per_page=500`;
      if (selectedSectionId) url += `&section_id=${selectedSectionId}`;

      const res = await fetch(url, { headers: getAuthHeaders() });
      if (res.ok) {
        const d = await res.json();
        const list = Array.isArray(d) ? d : d.data || [];
        setStudents(list);
        setSelectedStudentIds(list.map((s: StudentUser) => s.id));
      } else {
        // Fallback to /students
        let fallbackUrl = `${API_BASE}/students?all=true&class_id=${selectedClassId}`;
        if (selectedSectionId) fallbackUrl += `&section_id=${selectedSectionId}`;
        const fRes = await fetch(fallbackUrl, { headers: getAuthHeaders() });
        if (fRes.ok) {
          const d = await fRes.json();
          const list = Array.isArray(d) ? d : d.data || [];
          setStudents(list);
          setSelectedStudentIds(list.map((s: StudentUser) => s.id));
        }
      }
    } catch (err) {
      console.error("Error fetching students:", err);
    } finally {
      setLoadingStudents(false);
    }
  }, [selectedClassId, selectedSectionId]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // ─── Filtered Students ────────────────────────────────────────────────────
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const q = searchStudentQuery.toLowerCase().trim();
      if (!q) return true;
      const nameMatch = (s.name || "").toLowerCase().includes(q);
      const fatherMatch = (s.father_name || "").toLowerCase().includes(q);
      const rollMatch = String(s.roll_number || "").includes(q);
      return nameMatch || fatherMatch || rollMatch;
    });
  }, [students, searchStudentQuery]);

  // Selected Students Objects
  const targetStudents = useMemo(() => {
    return students.filter((s) => selectedStudentIds.includes(s.id));
  }, [students, selectedStudentIds]);

  // ─── Student Selection Handlers ───────────────────────────────────────────
  const handleToggleSelectAll = () => {
    if (selectedStudentIds.length === filteredStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map((s) => s.id));
    }
  };

  const handleToggleStudent = (id: number) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // ─── Exam Paper Management ───────────────────────────────────────────────
  const handleAddPaper = () => {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + (papers.length + 1) * 2);
    const newP: ExamPaper = {
      id: "p_" + Date.now(),
      subject: dbSubjects[0]?.name || "General Subject",
      date: format(nextDate, "yyyy-MM-dd"),
      day: format(nextDate, "EEEE"),
      timing: defaultTiming,
      maxMarks: "75",
    };
    setPapers((prev) => [...prev, newP]);
  };

  const handleUpdatePaper = (id: string, field: keyof ExamPaper, value: string) => {
    setPapers((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const updated = { ...p, [field]: value };
        if (field === "date" && value) {
          try {
            updated.day = format(new Date(value), "EEEE");
          } catch {}
        }
        return updated;
      })
    );
  };

  const handleRemovePaper = (id: string) => {
    setPapers((prev) => prev.filter((p) => p.id !== id));
  };

  // ─── Preset Schedules ─────────────────────────────────────────────────────
  const loadPresetMatric = () => {
    const baseDate = new Date();
    const subList = [
      { name: "English", marks: "75" },
      { name: "Mathematics", marks: "75" },
      { name: "Physics", marks: "60" },
      { name: "Chemistry", marks: "60" },
      { name: "Biology / Computer Science", marks: "60" },
      { name: "Urdu", marks: "75" },
      { name: "Islamiyat", marks: "50" },
      { name: "Tarjuma-tul-Quran", marks: "50" },
      { name: "Pakistan Studies", marks: "50" },
    ];

    const generated = subList.map((sub, idx) => {
      const pDate = new Date(baseDate.getTime() + (idx + 1) * 86400000 * 2);
      return {
        id: "p_mat_" + idx + "_" + Date.now(),
        subject: sub.name,
        date: format(pDate, "yyyy-MM-dd"),
        day: format(pDate, "EEEE"),
        timing: defaultTiming,
        maxMarks: sub.marks,
      };
    });
    setPapers(generated);
  };

  const loadPresetFSc = () => {
    const baseDate = new Date();
    const subList = [
      { name: "English", marks: "100" },
      { name: "Urdu", marks: "100" },
      { name: "Islamiyat / Pak Studies", marks: "50" },
      { name: "Physics", marks: "85" },
      { name: "Chemistry / Computer", marks: "85" },
      { name: "Mathematics / Biology", marks: "100" },
      { name: "Tarjuma-tul-Quran", marks: "50" },
    ];

    const generated = subList.map((sub, idx) => {
      const pDate = new Date(baseDate.getTime() + (idx + 1) * 86400000 * 2);
      return {
        id: "p_fsc_" + idx + "_" + Date.now(),
        subject: sub.name,
        date: format(pDate, "yyyy-MM-dd"),
        day: format(pDate, "EEEE"),
        timing: defaultTiming,
        maxMarks: sub.marks,
      };
    });
    setPapers(generated);
  };

  // ─── Generate & Print 2-Slips-per-A4 PDF ──────────────────────────────────
  const getSlipOptions = (students: StudentUser[]) => ({
    students,
    papers,
    className: classes.find(c => String(c.id) === String(selectedClassId))?.name || "All Classes",
    sessionName: sessions.find(session => String(session.id) === String(selectedSessionId))?.name
      || sessions.find(session => session.is_active)?.name || "2026-2027",
    examCenter,
    reportingTime,
    helpline: helplinePhone,
    rules,
    controllerSign,
    principalSign,
  });

  const handlePrintRollNumberSlips = () => {
    if (targetStudents.length === 0) {
      alert("Please select at least one student to generate Roll Number Slips.");
      return;
    }

    if (papers.length === 0) {
      alert("Please add at least one paper/subject to the date sheet.");
      return;
    }

    const fullPrintHtml = buildRollNumberSlips(getSlipOptions(targetStudents));

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      iframe.remove();
      return;
    }

    doc.open();
    doc.write(fullPrintHtml);
    doc.close();

    const triggerPrint = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1500);
    };

    const imagesReady = Promise.all(Array.from(doc.images).map(image => {
      if (image.complete) return Promise.resolve();
      return new Promise<void>(resolve => {
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener("error", () => resolve(), { once: true });
      });
    }));
    Promise.all([doc.fonts?.ready, imagesReady]).then(triggerPrint).catch(triggerPrint);
  };

  return (
    <DashboardLayout>
      {/* ─── Page Title Header ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#0f224a" }}>
              Roll Number Slips &amp; Admit Cards
            </h1>
            <span
              className="px-2.5 py-0.5 text-xs font-bold rounded-full uppercase"
              style={{ background: "#dbeafe", color: "#1e40af" }}
            >
              2 Slips / A4
            </span>
          </div>
          <p className="text-sm mt-1" style={{ color: "#2563eb" }}>
            Design and bulk-print modern examination admit cards with customized datesheets.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex rounded-xl p-1 border shadow-xs" style={{ background: "#f0f4f8", borderColor: "#bfdbfe" }}>
            <button
              onClick={() => setActiveTab("builder")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === "builder"
                  ? "bg-white text-blue-900 shadow-xs"
                  : "text-blue-700 hover:text-blue-900"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Datesheet &amp; Setup
            </button>
            <button
              onClick={() => setActiveTab("preview")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === "preview"
                  ? "bg-white text-blue-900 shadow-xs"
                  : "text-blue-700 hover:text-blue-900"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Live Preview ({targetStudents.length})
            </button>
          </div>

          <button
            onClick={handlePrintRollNumberSlips}
            disabled={targetStudents.length === 0 || papers.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md transition-all active:scale-95 disabled:opacity-50 hover:shadow-lg"
            style={{ background: "linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%)" }}
          >
            <Printer className="w-4 h-4" />
            Print Roll Number Slips ({targetStudents.length})
          </button>
        </div>
      </div>

      {/* ─── Top Filter & Class Configuration Bar ─── */}
      <div
        className="rounded-2xl p-5 mb-6 border shadow-xs"
        style={{ background: "#ffffff", borderColor: "#bfdbfe" }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Class Select */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "#1e3a8a" }}>
              Target Class
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold outline-none transition"
              style={{ borderColor: "#bfdbfe", background: "#f0f4f8", color: "#0f224a" }}
            >
              {classes.length === 0 ? (
                <option value="">Loading Classes...</option>
              ) : (
                classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Section Select */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "#1e3a8a" }}>
              Section
            </label>
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold outline-none transition"
              style={{ borderColor: "#bfdbfe", background: "#f0f4f8", color: "#0f224a" }}
            >
              <option value="">All Sections</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Academic Session */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "#1e3a8a" }}>
              Academic Session
            </label>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold outline-none transition"
              style={{ borderColor: "#bfdbfe", background: "#f0f4f8", color: "#0f224a" }}
            >
              <option value="">Current Session</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.is_active ? "(Active)" : ""}
                </option>
              ))}
            </select>
          </div>


        </div>
      </div>

      {activeTab === "builder" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* ─── Left Column: Exam Details & Datesheet Setup (7 Cols) ─── */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Exam Details Card */}
            <div
              className="rounded-2xl p-5 border shadow-xs"
              style={{ background: "#ffffff", borderColor: "#bfdbfe" }}
            >
              <h3 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: "#0f224a" }}>
                <FileText className="w-4 h-4 text-blue-600" />
                Examination Identification
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#1e3a8a" }}>
                      Examination Hall Name
                    </label>
                    <input
                      type="text"
                      value={examCenter}
                      onChange={(e) => setExamCenter(e.target.value)}
                      placeholder="e.g. Main Examination Hall"
                      className="w-full px-3.5 py-2 rounded-xl border text-sm font-semibold outline-none"
                      style={{ borderColor: "#bfdbfe", background: "#f0f4f8", color: "#0f224a" }}
                    />
                    {/* Preset chips for Examination Hall */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {[
                        "Main Examination Hall",
                        "Campus Examination Hall",
                        "Hall A",
                        "Hall B",
                        "Junior Examination Hall",
                        "Senior Examination Hall",
                      ].map((hall) => (
                        <button
                          key={hall}
                          type="button"
                          onClick={() => setExamCenter(hall)}
                          className={`text-2xs font-semibold px-2 py-0.5 rounded-lg border transition ${
                            examCenter === hall
                              ? "bg-blue-100 border-blue-400 text-blue-800 font-bold"
                              : "bg-slate-50 border-slate-200 text-slate-700 hover:border-blue-400"
                          }`}
                        >
                          {hall}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#1e3a8a" }}>
                      Candidate Reporting Time
                    </label>
                    <input
                      type="text"
                      value={reportingTime}
                      onChange={(e) => setReportingTime(e.target.value)}
                      placeholder="e.g. 08:00 AM Sharp"
                      className="w-full px-3.5 py-2 rounded-xl border text-sm font-semibold outline-none"
                      style={{ borderColor: "#bfdbfe", background: "#f0f4f8", color: "#0f224a" }}
                    />
                    {/* Preset chips for Reporting Time */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {[
                        "08:00 AM Sharp",
                        "08:30 AM Sharp",
                        "09:00 AM Sharp",
                        "01:30 PM Sharp",
                        "02:00 PM Sharp",
                      ].map((time) => (
                        <button
                          key={time}
                          type="button"
                          onClick={() => setReportingTime(time)}
                          className={`text-2xs font-semibold px-2 py-0.5 rounded-lg border transition ${
                            reportingTime === time
                              ? "bg-blue-100 border-blue-400 text-blue-800 font-bold"
                              : "bg-slate-50 border-slate-200 text-slate-700 hover:border-blue-400"
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Datesheet Schedule Builder */}
            <div
              className="rounded-2xl p-5 border shadow-xs"
              style={{ background: "#ffffff", borderColor: "#bfdbfe" }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2" style={{ color: "#0f224a" }}>
                    <Calendar className="w-4 h-4 text-blue-600" />
                    Date Sheet &amp; Paper Schedule ({papers.length} Papers)
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>
                    Configure the papers that will appear on every student&apos;s slip.
                  </p>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={loadPresetMatric}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg border text-blue-700 bg-blue-50 hover:bg-blue-100 transition"
                    style={{ borderColor: "#bfdbfe" }}
                  >
                    Matric Preset
                  </button>
                  <button
                    type="button"
                    onClick={loadPresetFSc}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg border text-blue-700 bg-blue-50 hover:bg-blue-100 transition"
                    style={{ borderColor: "#bfdbfe" }}
                  >
                    FSc Preset
                  </button>
                  <button
                    type="button"
                    onClick={handleAddPaper}
                    className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Paper
                  </button>
                </div>
              </div>

              {/* Papers Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: "#f0f4f8", borderBottom: "1px solid #bfdbfe" }}>
                      <th className="px-3 py-2 text-left font-bold uppercase tracking-wider" style={{ color: "#1e3a8a" }}>
                        #
                      </th>
                      <th className="px-3 py-2 text-left font-bold uppercase tracking-wider" style={{ color: "#1e3a8a" }}>
                        Subject
                      </th>
                      <th className="px-3 py-2 text-left font-bold uppercase tracking-wider" style={{ color: "#1e3a8a" }}>
                        Date
                      </th>
                      <th className="px-3 py-2 text-left font-bold uppercase tracking-wider" style={{ color: "#1e3a8a" }}>
                        Day
                      </th>
                      <th className="px-3 py-2 text-left font-bold uppercase tracking-wider" style={{ color: "#1e3a8a" }}>
                        Timing
                      </th>
                      <th className="px-3 py-2 text-center font-bold uppercase tracking-wider" style={{ color: "#1e3a8a" }}>
                        Marks
                      </th>
                      <th className="px-3 py-2 text-right font-bold uppercase tracking-wider" style={{ color: "#1e3a8a" }}>
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-100">
                    {papers.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-blue-50/50 transition">
                        <td className="px-3 py-2 font-mono font-bold text-gray-500">{idx + 1}</td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={p.subject}
                            onChange={(e) => handleUpdatePaper(p.id, "subject", e.target.value)}
                            list={`sub-list-${p.id}`}
                            className="w-full px-2 py-1 rounded border text-xs font-bold outline-none"
                            style={{ borderColor: "#bfdbfe", background: "#fff", color: "#0f224a" }}
                          />
                          <datalist id={`sub-list-${p.id}`}>
                            {dbSubjects.map((s) => (
                              <option key={s.id} value={s.name} />
                            ))}
                          </datalist>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="date"
                            value={p.date}
                            onChange={(e) => handleUpdatePaper(p.id, "date", e.target.value)}
                            className="px-2 py-1 rounded border text-xs font-mono outline-none"
                            style={{ borderColor: "#bfdbfe", background: "#fff" }}
                          />
                        </td>
                        <td className="px-3 py-2 font-semibold text-gray-700">{p.day}</td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={p.timing}
                            onChange={(e) => handleUpdatePaper(p.id, "timing", e.target.value)}
                            className="w-32 px-2 py-1 rounded border text-xs font-mono outline-none"
                            style={{ borderColor: "#bfdbfe", background: "#fff" }}
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="text"
                            value={p.maxMarks}
                            onChange={(e) => handleUpdatePaper(p.id, "maxMarks", e.target.value)}
                            className="w-14 px-1 py-1 rounded border text-xs text-center font-mono font-bold outline-none"
                            style={{ borderColor: "#bfdbfe", background: "#fff" }}
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemovePaper(p.id)}
                            className="p-1 rounded text-red-600 hover:bg-red-50 transition"
                            title="Remove Paper"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Candidate Rules & Instructions Customizer */}
            <div
              className="rounded-2xl p-5 border shadow-xs"
              style={{ background: "#ffffff", borderColor: "#bfdbfe" }}
            >
              <h3 className="text-base font-bold mb-3 flex items-center gap-2" style={{ color: "#0f224a" }}>
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Examination Instructions (Printed on Slips)
              </h3>
              <div className="space-y-2">
                {rules.map((rule, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-5 text-xs font-bold text-gray-500">{idx + 1}.</span>
                    <input
                      type="text"
                      value={rule}
                      onChange={(e) => {
                        const next = [...rules];
                        next[idx] = e.target.value;
                        setRules(next);
                      }}
                      className="flex-1 px-3 py-1.5 rounded-lg border text-xs outline-none"
                      style={{ borderColor: "#bfdbfe", background: "#f0f4f8", color: "#0f224a" }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Official Digital Signatures Upload Card */}
            <div
              className="rounded-2xl p-5 border shadow-xs"
              style={{ background: "#ffffff", borderColor: "#bfdbfe" }}
            >
              <h3 className="text-base font-bold mb-1 flex items-center gap-2" style={{ color: "#0f224a" }}>
                <Sparkles className="w-4 h-4 text-blue-600" />
                Official Signatures &amp; Seal (Optional)
              </h3>
              <p className="text-xs mb-4" style={{ color: "#64748b" }}>
                Upload signature images (PNG/JPG). If left empty, blank lines will be printed for manual signing.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Controller of Exams Signature */}
                <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/50 flex flex-col justify-between">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#1e3a8a" }}>
                      Controller of Exams Signature
                    </label>
                    <p className="text-2xs text-gray-500 mb-2">Upload sign image (transparent PNG recommended)</p>
                  </div>

                  {controllerSign ? (
                    <div className="space-y-2">
                      <div className="h-16 bg-white border border-blue-200 rounded-lg p-1.5 flex items-center justify-center">
                        <img src={controllerSign} alt="Controller Sign Preview" className="max-h-full max-w-full object-contain" />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-2xs text-green-700 font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" /> Signature Ready
                        </span>
                        <button
                          type="button"
                          onClick={handleRemoveControllerSign}
                          className="text-2xs text-red-600 hover:text-red-800 font-bold flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="cursor-pointer border-2 border-dashed border-blue-200 hover:border-blue-400 bg-white rounded-xl p-3 flex flex-col items-center justify-center text-center transition">
                      <Upload className="w-5 h-5 text-blue-500 mb-1" />
                      <span className="text-xs font-bold text-blue-900">Upload Signature</span>
                      <span className="text-3xs text-gray-400 mt-0.5">PNG, JPG, WebP</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleControllerSignUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Campus Principal Signature */}
                <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/50 flex flex-col justify-between">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#1e3a8a" }}>
                      Campus Principal Signature / Seal
                    </label>
                    <p className="text-2xs text-gray-500 mb-2">Upload principal signature or official seal</p>
                  </div>

                  {principalSign ? (
                    <div className="space-y-2">
                      <div className="h-16 bg-white border border-blue-200 rounded-lg p-1.5 flex items-center justify-center">
                        <img src={principalSign} alt="Principal Sign Preview" className="max-h-full max-w-full object-contain" />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-2xs text-green-700 font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" /> Signature Ready
                        </span>
                        <button
                          type="button"
                          onClick={handleRemovePrincipalSign}
                          className="text-2xs text-red-600 hover:text-red-800 font-bold flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="cursor-pointer border-2 border-dashed border-blue-200 hover:border-blue-400 bg-white rounded-xl p-3 flex flex-col items-center justify-center text-center transition">
                      <Upload className="w-5 h-5 text-blue-500 mb-1" />
                      <span className="text-xs font-bold text-blue-900">Upload Signature / Seal</span>
                      <span className="text-3xs text-gray-400 mt-0.5">PNG, JPG, WebP</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePrincipalSignUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* ─── Right Column: Student Batch Selection (5 Cols) ─── */}
          <div className="lg:col-span-5 space-y-6">
            <div
              className="rounded-2xl p-5 border shadow-xs"
              style={{ background: "#ffffff", borderColor: "#bfdbfe" }}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="text-base font-bold flex items-center gap-2" style={{ color: "#0f224a" }}>
                  <Users className="w-4 h-4 text-blue-600" />
                  Candidate Selection ({selectedStudentIds.length} / {students.length})
                </h3>
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800"
                >
                  {selectedStudentIds.length === filteredStudents.length ? "Deselect All" : "Select All"}
                </button>
              </div>

              {/* Student Search */}
              <div className="relative mb-3">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchStudentQuery}
                  onChange={(e) => setSearchStudentQuery(e.target.value)}
                  placeholder="Search candidate by name / roll #..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border text-xs outline-none"
                  style={{ borderColor: "#bfdbfe", background: "#f0f4f8" }}
                />
              </div>

              {/* Student List */}
              {loadingStudents ? (
                <div className="flex items-center justify-center py-12 text-sm text-gray-500">
                  <RefreshCw className="w-5 h-5 animate-spin mr-2 text-blue-600" />
                  Loading students...
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="text-center py-10 text-xs text-gray-500">
                  No students found in this class/section filter.
                </div>
              ) : (
                <div className="max-h-[520px] overflow-y-auto space-y-2 pr-1">
                  {filteredStudents.map((st) => {
                    const isSelected = selectedStudentIds.includes(st.id);
                    const receivableVal = Number(st.total_receivable ?? st.total_payable ?? st.pending_amount ?? 0);
                    const receivedVal = Number(st.total_received ?? st.total_paid ?? st.current_month_paid ?? 0);
                    const monthlyFeeVal = Number(st.monthly_fee ?? 0);

                    return (
                      <div
                        key={st.id}
                        onClick={() => handleToggleStudent(st.id)}
                        className={`p-3 rounded-xl cursor-pointer transition-all border ${
                          isSelected
                            ? "bg-blue-50/90 border-blue-400 shadow-xs ring-1 ring-blue-300"
                            : "bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className="text-blue-600 mt-0.5 flex-shrink-0">
                              {isSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-slate-900 truncate">{st.name}</span>
                                <span className="font-mono text-3xs font-extrabold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200 flex-shrink-0">
                                  Roll: {st.roll_number || `#${st.id}`}
                                </span>
                              </div>
                              <div className="text-2xs text-slate-500 mt-0.5 truncate">
                                Father: <span className="font-semibold text-slate-700">{st.father_name || "—"}</span> • {st.academy_class?.name || "Class"} ({st.section?.name || "Regular"})
                              </div>
                              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                <span className="text-3xs font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                  Monthly Fee: Rs. {monthlyFeeVal.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Financial Details (Current Receivable & Total Received) */}
                          <div className="flex flex-col items-end gap-1 flex-shrink-0 text-right">
                            {/* Current Receivable / Outstanding Dues Badge */}
                            {receivableVal > 0 ? (
                              <span className="inline-flex items-center gap-1 text-2xs font-black px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-300 shadow-xs">
                                <AlertCircle className="w-3 h-3 text-rose-600" />
                                Receivable: Rs. {receivableVal.toLocaleString()}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-2xs font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                Dues: Rs. 0 (Cleared)
                              </span>
                            )}

                            {/* Total Received Amount */}
                            <span className="inline-flex items-center gap-1 text-3xs font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Received: <strong className="font-black text-emerald-900">Rs. {receivedVal.toLocaleString()}</strong>
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      ) : (
        /* ─── Live In-Browser Preview Mode ─── */
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-xl bg-blue-50 border border-blue-200">
            <div className="text-sm font-semibold text-blue-900">
              Showing the first {Math.min(targetStudents.length, 4)} of <strong>{targetStudents.length} candidate(s)</strong>. Printing groups two slips per A4 page.
            </div>
            <button
              onClick={handlePrintRollNumberSlips}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white shadow-md transition hover:bg-blue-700"
              style={{ background: "#2563eb" }}
            >
              <Printer className="w-4 h-4" />
              Print All Slips Now
            </button>
          </div>

          {/* The preview uses the same document renderer as printing. */}
          <div className="space-y-6">
            {targetStudents.slice(0, 4).map(student => (
              <div key={student.id} className="overflow-x-auto rounded-xl border border-blue-200 bg-white p-3">
                <iframe
                  title={`Roll number slip preview — ${student.name}`}
                  srcDoc={buildRollNumberSlips(getSlipOptions([student]), true)}
                  sandbox="allow-same-origin"
                  className="block border-0"
                  style={{ width: "760px", height: `${Math.max(560, 380 + Math.ceil(papers.length / 2) * 40 + rules.length * 25)}px` }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
