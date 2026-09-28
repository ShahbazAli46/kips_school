"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { format } from "date-fns";
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
  const [examTitle, setExamTitle] = useState("First Term Examination 2026-2027");
  const [examCenter, setExamCenter] = useState("Main Examination Hall, KIPS School Chunian");
  const [defaultTiming, setDefaultTiming] = useState("08:30 AM - 11:30 AM");
  const [reportingTime, setReportingTime] = useState("08:00 AM Sharp");
  const [issueDate, setIssueDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
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
  const handlePrintRollNumberSlips = () => {
    if (targetStudents.length === 0) {
      alert("Please select at least one student to generate Roll Number Slips.");
      return;
    }

    if (papers.length === 0) {
      alert("Please add at least one paper/subject to the date sheet.");
      return;
    }

    const currentSessionName =
      sessions.find((s) => String(s.id) === String(selectedSessionId))?.name || "2026-2027";
    const selectedClassName =
      classes.find((c) => String(c.id) === String(selectedClassId))?.name || "All Classes";
    const formattedIssueDate = format(new Date(issueDate), "dd MMM yyyy");

    // Construct Datesheet Rows HTML
    const datesheetRowsHtml = papers
      .map((p, idx) => {
        const formattedPaperDate = p.date ? format(new Date(p.date), "dd-MMM-yyyy") : "—";
        return `
          <tr>
            <td style="text-align: center; font-family: 'JetBrains Mono', monospace; font-weight: 600; font-size: 8px;">${idx + 1}</td>
            <td style="font-weight: 700; font-size: 8.5px; padding-left: 8px;">${p.subject}</td>
            <td style="text-align: center; font-family: 'JetBrains Mono', monospace; font-size: 8px;">${formattedPaperDate}</td>
            <td style="text-align: center; font-size: 8px;">${p.day}</td>
            <td style="text-align: center; font-family: 'JetBrains Mono', monospace; font-size: 8px;">${p.timing}</td>
            <td style="text-align: center; font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 8px;">${p.maxMarks}</td>
            <td style="border-bottom: 1px solid #cbd5e1;"></td>
          </tr>
        `;
      })
      .join("");

    // Rules List HTML
    const rulesListHtml = rules
      .map(
        (r, i) =>
          `<li style="margin-bottom: 2px;"><span style="font-weight: 700; color: #0f172a;">${i + 1}.</span> ${r}</li>`
      )
      .join("");

    // Build Individual Slip HTML Helper
    const renderSingleSlip = (student: StudentUser) => {
      const rollNoDisplay =
        student.roll_number !== null && student.roll_number !== undefined
          ? String(student.roll_number).padStart(2, "0")
          : `ST-${student.id}`;
      const classNameDisplay = student.academy_class?.name || selectedClassName;
      const sectionNameDisplay = student.section?.name || "Regular";
      const majorDisplay = student.major?.name || "General Science / Matric";
      const studentPhotoUrl = student.image || "";

      return `
        <div class="slip-card">
          
          <!-- Watermark Logo (50% Opacity) -->
          <div class="watermark-logo">
            <img src="/logo.jpg" onerror="this.onerror=null; this.src='/logo.png';" alt="KIPS Watermark" />
          </div>

          <!-- Top Classification Bar -->
          <div class="slip-top-bar">
            <span class="top-tag">KIPS SCHOOL • OFFICIAL CANDIDATE ADMIT CARD • SESSION ${currentSessionName}</span>
            <span class="top-tag">HELPLINE: <strong>${helplinePhone}</strong></span>
          </div>

          <!-- Slip Header -->
          <div class="slip-header">
            <div class="header-left">
              <div class="logo-box">
                <img src="/logo.jpg" onerror="this.onerror=null; this.src='/logo.png';" alt="KIPS" />
              </div>
              <div>
                <div class="school-brand">KIPS SCHOOL</div>
                <div class="campus-sub">Chunian Campus</div>
                <div class="exam-title-badge">${examTitle}</div>
              </div>
            </div>
          </div>

          <!-- Student Profile Grid -->
          <div class="student-profile-strip">
            <div class="photo-container">
              ${
                studentPhotoUrl
                  ? `<img src="${studentPhotoUrl}" alt="Photo" class="student-img" />`
                  : `
                  <div class="photo-placeholder">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="#94a3b8">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                    <span>CANDIDATE PHOTO</span>
                  </div>
                `
              }
            </div>

            <div class="profile-details">
              <div class="details-grid">
                <div class="info-cell">
                  <span class="info-label">Candidate Name</span>
                  <span class="info-val name-val">${student.name}</span>
                </div>
                <div class="info-cell">
                  <span class="info-label">Father's Name</span>
                  <span class="info-val">${student.father_name || "—"}</span>
                </div>
                <div class="info-cell">
                  <span class="info-label">Roll Number</span>
                  <span class="info-val" style="font-family: 'JetBrains Mono', monospace; font-weight: 800; color: #0f172a;">${rollNoDisplay}</span>
                </div>
                <div class="info-cell">
                  <span class="info-label">Class &amp; Section</span>
                  <span class="info-val">${classNameDisplay} — (${sectionNameDisplay})</span>
                </div>
                <div class="info-cell full-width">
                  <span class="info-label">Study Group / Major &amp; Exam Center</span>
                  <span class="info-val" style="font-size: 8.5px; color: #1e3a8a;">${majorDisplay} • ${examCenter} (Reporting: <strong>${reportingTime}</strong>)</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Examination Datesheet Table -->
          <table class="datesheet-table">
            <thead>
              <tr>
                <th style="width: 24px;">#</th>
                <th style="text-align: left; padding-left: 8px;">Paper / Subject</th>
                <th style="width: 75px;">Date</th>
                <th style="width: 65px;">Day</th>
                <th style="width: 120px;">Paper Timing</th>
                <th style="width: 55px;">Max Marks</th>
                <th style="width: 90px;">Invigilator Sign</th>
              </tr>
            </thead>
            <tbody>
              ${datesheetRowsHtml}
            </tbody>
          </table>

          <!-- Fee Dues Warning Notice -->
          <div class="dues-notice-box">
            <div class="dues-urdu-line">اہم نوٹ: واجبات کی ادائیگی کے بغیر امتحان میں بیٹھنے کی اجازت نہیں ہے۔</div>
            <div class="dues-eng-line">IMPORTANT: Students are strictly NOT allowed to appear in the examination without clearance of all outstanding school dues.</div>
          </div>

          <!-- Important Instructions (Full Width 3 Lines) -->
          <div class="instructions-section">
            <div class="rules-head">
              <span>Important Instructions (</span><span class="urdu-span" dir="rtl">ہدایات برائے طلبہ و طالبات</span><span>):</span>
            </div>
            <div class="rules-list">
              ${rules
                .map(
                  (r, i) => `
                <div class="rule-item">
                  <span class="rule-num">${i + 1}.</span>
                  <span class="rule-text">${r}</span>
                </div>
              `
                )
                .join("")}
            </div>
          </div>

          <!-- Dual Signatures Strip -->
          <div class="signatures-strip">
            <div class="sig-box">
              ${
                controllerSign
                  ? `<div class="sig-img-container"><img src="${controllerSign}" alt="Controller Signature" class="sig-img" /></div>`
                  : `<div class="sig-empty-spacer"></div>`
              }
              <div class="sig-line"></div>
              <div class="sig-name">Controller of Exams</div>
              <div class="sig-dept">KIPS Examination Wing</div>
            </div>
            <div class="sig-box">
              ${
                principalSign
                  ? `<div class="sig-img-container"><img src="${principalSign}" alt="Principal Signature" class="sig-img" /></div>`
                  : `<div class="sig-empty-spacer"></div>`
              }
              <div class="sig-line"></div>
              <div class="sig-name">Campus Principal</div>
              <div class="sig-dept">Official Stamp &amp; Seal</div>
            </div>
          </div>

          <!-- Micro Security Strip -->
          <div class="security-strip">
            <span>Issue Date: ${formattedIssueDate} • Computer Generated Official Document</span>
            <span>Helpline: <strong>${helplinePhone}</strong></span>
          </div>

        </div>
      `;
    };

    // Pair Students 2 per A4 Page
    let pagesHtml = "";
    for (let i = 0; i < targetStudents.length; i += 2) {
      const student1 = targetStudents[i];
      const student2 = targetStudents[i + 1] || null;

      pagesHtml += `
        <div class="a4-sheet">
          ${renderSingleSlip(student1)}

          ${
            student2
              ? `
            <!-- Scissor Cut Line -->
            <div class="cut-divider">
              <div class="cut-line"></div>
              <div class="cut-badge">✂ CUT ALONG DOTTED LINE ✂</div>
              <div class="cut-line"></div>
            </div>

            ${renderSingleSlip(student2)}
          `
              : `
            <!-- Blank Second Half if odd count -->
            <div class="cut-divider" style="opacity: 0.3;">
              <div class="cut-line"></div>
              <div class="cut-badge">✂ END OF CLASS BATCH ✂</div>
              <div class="cut-line"></div>
            </div>
            <div style="height: 128mm; border: 1px dashed #cbd5e1; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 11px; font-weight: 700; letter-spacing: 0.05em;">
              INTENTIONALLY BLANK (ODD STUDENT COUNT)
            </div>
          `
          }
        </div>
      `;
    }

    const fullPrintHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Roll Number Slips - ${selectedClassName} - KIPS School Chunian</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            @font-face {
              font-family: 'Jameel Noori Nastaleeq';
              src: url('/jameel-noori-nastaleeq.ttf') format('truetype');
              font-weight: normal;
              font-style: normal;
              font-display: swap;
            }
            .font-urdu {
              font-family: 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', 'Urdu Typesetting', serif !important;
            }

            @page {
              size: A4 portrait;
              margin: 6mm 8mm 6mm 8mm;
            }
            @media print {
              html, body {
                width: 100%;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                color: #0f172a !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .a4-sheet {
                page-break-after: always !important;
                break-after: page !important;
              }
              .a4-sheet:last-child {
                page-break-after: avoid !important;
                break-after: avoid !important;
              }
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              background: #ffffff;
              color: #0f172a;
              font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 9px;
              line-height: 1.3;
            }

            .a4-sheet {
              width: 100%;
              min-height: 282mm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              box-sizing: border-box;
              padding: 2mm 0;
            }

            /* Single Half-Page Slip Card */
            .slip-card {
              position: relative;
              height: 136mm;
              border: 1.5px solid #0f172a;
              border-radius: 8px;
              padding: 6px 10px;
              background: #ffffff;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              overflow: hidden;
            }

            /* Watermark Logo (50% Opacity) */
            .watermark-logo {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 190px;
              height: 190px;
              opacity: 0.5;
              pointer-events: none;
              z-index: 0;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .watermark-logo img {
              width: 100%;
              height: 100%;
              object-fit: contain;
              opacity: 0.5;
            }

            .slip-top-bar,
            .slip-header,
            .student-profile-strip,
            .datesheet-table,
            .dues-notice-box,
            .instructions-section,
            .signatures-strip,
            .security-strip {
              position: relative;
              z-index: 1;
            }

            /* Top Tag */
            .slip-top-bar {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 2px;
              margin-bottom: 4px;
            }
            .top-tag {
              font-size: 7px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.06em;
              color: #475569;
            }

            /* Header */
            .slip-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 1.5px solid #0f172a;
              padding-bottom: 4px;
              margin-bottom: 4px;
            }
            .header-left {
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .logo-box {
              width: 40px;
              height: 40px;
              border: 1px solid #cbd5e1;
              border-radius: 6px;
              padding: 2px;
              background: #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
            }
            .logo-box img {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }
            .school-brand {
              font-size: 15px;
              font-weight: 800;
              color: #0f172a;
              letter-spacing: -0.01em;
              line-height: 1.1;
            }
            .campus-sub {
              font-size: 8px;
              font-weight: 700;
              color: #334155;
            }
            .exam-title-badge {
              display: inline-block;
              font-size: 8px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.03em;
              color: #0f172a;
              background: #f1f5f9;
              padding: 1px 6px;
              border-radius: 3px;
              margin-top: 2px;
              border: 1px solid #cbd5e1;
            }

            .header-right {
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .roll-callout {
              background: #0f172a;
              color: #ffffff;
              padding: 3px 10px;
              border-radius: 6px;
              text-align: center;
              min-width: 85px;
            }
            .roll-label {
              font-size: 6.5px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              color: #94a3b8;
            }
            .roll-number {
              font-size: 18px;
              font-weight: 900;
              font-family: 'JetBrains Mono', monospace;
              letter-spacing: 0.02em;
              line-height: 1.1;
            }
            .qr-box {
              border: 1px dashed #94a3b8;
              border-radius: 4px;
              padding: 3px 6px;
              text-align: center;
              background: #f8fafc;
            }

            /* Student Profile Strip */
            .student-profile-strip {
              display: flex;
              align-items: stretch;
              gap: 8px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              padding: 4px 6px;
              margin-bottom: 4px;
            }
            .photo-container {
              width: 58px;
              height: 58px;
              border: 1px solid #94a3b8;
              border-radius: 4px;
              overflow: hidden;
              background: #ffffff;
              flex-shrink: 0;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .student-img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
            .photo-placeholder {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              text-align: center;
              padding: 2px;
            }
            .photo-placeholder span {
              font-size: 5.5px;
              font-weight: 800;
              color: #94a3b8;
              margin-top: 1px;
            }

            .profile-details {
              flex: 1;
            }
            .details-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              row-gap: 2px;
              column-gap: 8px;
            }
            .info-cell {
              display: flex;
              flex-direction: column;
            }
            .info-cell.full-width {
              grid-column: span 2;
            }
            .info-label {
              font-size: 6.5px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.04em;
              color: #64748b;
            }
            .info-val {
              font-size: 8.5px;
              font-weight: 700;
              color: #0f172a;
            }
            .info-val.name-val {
              font-size: 9.5px;
              color: #0f172a;
              font-weight: 800;
            }

            /* Datesheet Table */
            .datesheet-table {
              width: 100%;
              border-collapse: collapse;
              border: 1px solid #cbd5e1;
              margin-bottom: 4px;
            }
            .datesheet-table th {
              background: #0f172a !important;
              color: #ffffff !important;
              font-size: 7.5px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              padding: 3.5px 4px;
              border: none;
              text-align: center;
            }
            .datesheet-table td {
              padding: 2.5px 4px;
              border: 1px solid #e2e8f0;
              font-size: 8px;
              color: #0f172a;
              vertical-align: middle;
            }
            .datesheet-table tr:nth-child(even) {
              background: #f8fafc;
            }

            /* Dues Warning Box */
            .dues-notice-box {
              background: #fff5f5;
              border: 1px solid #ef4444;
              border-radius: 4px;
              padding: 3px 8px 4px 8px;
              text-align: center;
              margin: 3px 0 3px 0;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 2px;
            }
            .dues-urdu-line {
              font-family: 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', 'Urdu Typesetting', serif !important;
              font-size: 13.5px;
              font-weight: bold;
              color: #b91c1c;
              line-height: 1.5;
              direction: rtl;
              text-align: center;
            }
            .dues-eng-line {
              font-size: 6.8px;
              font-weight: 800;
              color: #b91c1c;
              letter-spacing: 0.015em;
              text-transform: uppercase;
              text-align: center;
            }

            /* Important Instructions Full Width */
            .instructions-section {
              margin: 2px 0 3px 0;
            }
            .rules-head {
              font-size: 7.5px;
              font-weight: 800;
              color: #b91c1c;
              margin-bottom: 2px;
              display: flex;
              align-items: baseline;
              gap: 2px;
            }
            .rules-head .urdu-span {
              font-family: 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', 'Urdu Typesetting', serif !important;
              font-size: 10.5px;
              font-weight: bold;
              direction: rtl;
              unicode-bidi: isolate;
              color: #b91c1c;
            }
            .rules-list {
              display: flex;
              flex-direction: column;
              gap: 1.5px;
            }
            .rule-item {
              font-size: 7.5px;
              color: #1e293b;
              line-height: 1.35;
              display: flex;
              align-items: flex-start;
              gap: 4px;
            }
            .rule-num {
              font-weight: 800;
              color: #0f172a;
              flex-shrink: 0;
            }
            .rule-text {
              flex: 1;
            }

            /* Signatures Strip */
            .signatures-strip {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              padding: 2px 18px 2px 18px;
              margin-top: 2px;
            }
            .sig-box {
              text-align: center;
              width: 140px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: flex-end;
            }
            .sig-img-container {
              height: 28px;
              display: flex;
              align-items: flex-end;
              justify-content: center;
              margin-bottom: 2px;
            }
            .sig-img {
              max-height: 28px;
              max-width: 120px;
              object-fit: contain;
            }
            .sig-empty-spacer {
              height: 28px;
            }
            .sig-line {
              width: 100%;
              border-top: 1.2px solid #0f172a;
              margin-bottom: 2px;
            }
            .sig-name {
              font-size: 8px;
              font-weight: 800;
              color: #0f172a;
              text-transform: uppercase;
              letter-spacing: 0.02em;
            }
            .sig-dept {
              font-size: 6.5px;
              color: #64748b;
              font-weight: 600;
            }

            /* Security Strip */
            .security-strip {
              display: flex;
              justify-content: space-between;
              border-top: 1px dashed #cbd5e1;
              padding-top: 2px;
              margin-top: 2px;
              font-size: 6.5px;
              color: #64748b;
            }

            /* Scissor Cut Line Divider */
            .cut-divider {
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 4px 0;
              gap: 8px;
            }
            .cut-line {
              flex: 1;
              border-bottom: 1.5px dashed #94a3b8;
            }
            .cut-badge {
              font-size: 7.5px;
              font-weight: 800;
              letter-spacing: 0.08em;
              color: #64748b;
              background: #ffffff;
              padding: 0 6px;
            }
          </style>
        </head>
        <body>
          ${pagesHtml}
        </body>
      </html>
    `;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

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

    if (doc.fonts && doc.fonts.ready) {
      doc.fonts.ready.then(() => {
        setTimeout(triggerPrint, 350);
      }).catch(() => {
        setTimeout(triggerPrint, 400);
      });
    } else {
      setTimeout(triggerPrint, 400);
    }
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

          {/* Issue Date */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "#1e3a8a" }}>
              Slip Issue Date
            </label>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold outline-none transition"
              style={{ borderColor: "#bfdbfe", background: "#f0f4f8", color: "#0f224a" }}
            />
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
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#1e3a8a" }}>
                    Exam Title / Header
                  </label>
                  <input
                    type="text"
                    value={examTitle}
                    onChange={(e) => setExamTitle(e.target.value)}
                    placeholder="e.g. First Term Examination 2026-2027"
                    className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-bold outline-none"
                    style={{ borderColor: "#bfdbfe", background: "#f0f4f8", color: "#0f224a" }}
                  />
                  {/* Preset chips */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[
                      "Annual Examination 2026",
                      "Mid-Term Exams 2026",
                      "First Term Examination",
                      "Send-Up Examination",
                      "Grand Test Series (Session 2026)",
                    ].map((title) => (
                      <button
                        key={title}
                        type="button"
                        onClick={() => setExamTitle(title)}
                        className="text-2xs font-semibold px-2.5 py-1 rounded-lg border transition hover:border-blue-500"
                        style={{ background: "#f8fafc", borderColor: "#e2e8f0", color: "#334155" }}
                      >
                        {title}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#1e3a8a" }}>
                      Examination Venue / Hall
                    </label>
                    <input
                      type="text"
                      value={examCenter}
                      onChange={(e) => setExamCenter(e.target.value)}
                      placeholder="e.g. Main Examination Hall"
                      className="w-full px-3.5 py-2 rounded-xl border text-sm outline-none"
                      style={{ borderColor: "#bfdbfe", background: "#f0f4f8", color: "#0f224a" }}
                    />
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
                      className="w-full px-3.5 py-2 rounded-xl border text-sm outline-none"
                      style={{ borderColor: "#bfdbfe", background: "#f0f4f8", color: "#0f224a" }}
                    />
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
              Showing Print Preview for <strong>{targetStudents.length} candidate(s)</strong> (Formatted at 2 slips per A4 page).
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

          {/* Render Sample Live Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {targetStudents.slice(0, 4).map((st) => (
              <div
                key={st.id}
                className="relative overflow-hidden rounded-xl border-2 border-slate-900 p-4 bg-white shadow-sm flex flex-col justify-between"
              >
                {/* 50% Opacity Background Watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                  <img src="/logo.jpg" alt="Watermark" className="w-40 h-40 object-contain opacity-50 grayscale" />
                </div>

                {/* Header */}
                <div className="relative z-10 flex justify-between items-center border-b pb-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded border border-gray-300 p-0.5 flex items-center justify-center bg-white">
                      <img src="/logo.jpg" alt="Logo" className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <div className="text-xs font-black uppercase text-slate-900">KIPS SCHOOL</div>
                      <div className="text-2xs font-semibold text-slate-600">Chunian Campus</div>
                    </div>
                  </div>
                </div>

                {/* Candidate Info */}
                <div className="relative z-10 grid grid-cols-2 gap-2 bg-slate-50/90 p-2.5 rounded border border-slate-200 text-xs mb-3">
                  <div>
                    <span className="text-2xs text-gray-500 uppercase font-bold block">Candidate Name</span>
                    <span className="font-bold text-slate-900">{st.name}</span>
                  </div>
                  <div>
                    <span className="text-2xs text-gray-500 uppercase font-bold block">Father Name</span>
                    <span className="font-bold text-slate-900">{st.father_name || "—"}</span>
                  </div>
                  <div>
                    <span className="text-2xs text-gray-500 uppercase font-bold block">Roll Number</span>
                    <span className="font-bold font-mono text-slate-900">{st.roll_number || st.id}</span>
                  </div>
                  <div>
                    <span className="text-2xs text-gray-500 uppercase font-bold block">Class &amp; Section</span>
                    <span className="font-bold text-slate-900">
                      {st.academy_class?.name || "Class"} ({st.section?.name || "Sec"})
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-2xs text-gray-500 uppercase font-bold block">Center</span>
                    <span className="font-bold text-slate-900">{examCenter}</span>
                  </div>
                </div>

                {/* Mini Datesheet */}
                <div className="relative z-10 border border-slate-200 rounded overflow-hidden mb-2 bg-white/95">
                  <table className="w-full text-2xs text-left">
                    <thead className="bg-slate-900 text-white font-bold">
                      <tr>
                        <th className="p-1.5">Subject</th>
                        <th className="p-1.5 text-center">Date</th>
                        <th className="p-1.5 text-center">Timing</th>
                        <th className="p-1.5 text-center">Marks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {papers.slice(0, 4).map((p) => (
                        <tr key={p.id}>
                          <td className="p-1.5 font-bold">{p.subject}</td>
                          <td className="p-1.5 text-center font-mono">{p.date}</td>
                          <td className="p-1.5 text-center font-mono">{p.timing}</td>
                          <td className="p-1.5 text-center font-bold">{p.maxMarks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Fee Dues Warning Notice in Preview */}
                <div className="relative z-10 rounded border border-red-400 bg-red-50/90 px-3 py-2 text-center my-2">
                  <div
                    className="text-base font-bold text-red-700 text-center leading-normal"
                    style={{ fontFamily: "'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', serif", direction: "rtl" }}
                  >
                    اہم نوٹ: واجبات کی ادائیگی کے بغیر امتحان میں بیٹھنے کی اجازت نہیں ہے۔
                  </div>
                  <div className="text-3xs font-extrabold text-red-700 uppercase tracking-tight mt-0.5">
                    IMPORTANT: Students are strictly NOT allowed to appear in the examination without clearance of all outstanding school dues.
                  </div>
                </div>

                {/* Instructions in Preview */}
                <div className="relative z-10 text-3xs text-gray-700 mb-2">
                  <div className="font-bold text-red-800 mb-1">
                    Important Instructions (
                    <span
                      className="text-sm font-bold"
                      style={{ fontFamily: "'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', serif", direction: "rtl" }}
                    >
                      ہدایات برائے طلبہ و طالبات
                    </span>
                    ):
                  </div>
                  <ol className="list-decimal pl-3 space-y-0.5 text-gray-700">
                    {rules.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ol>
                </div>

                {/* Signatures */}
                <div className="relative z-10 flex justify-between items-end text-center pt-2 mt-1">
                  <div className="w-28 flex flex-col items-center">
                    {controllerSign ? (
                      <img src={controllerSign} alt="Controller" className="h-7 max-w-full object-contain mb-1" />
                    ) : (
                      <div className="h-7"></div>
                    )}
                    <div className="w-full border-t border-slate-800 mb-1"></div>
                    <span className="text-2xs font-bold text-slate-800">Exam Controller</span>
                  </div>
                  <div className="w-28 flex flex-col items-center">
                    {principalSign ? (
                      <img src={principalSign} alt="Principal" className="h-7 max-w-full object-contain mb-1" />
                    ) : (
                      <div className="h-7"></div>
                    )}
                    <div className="w-full border-t border-slate-800 mb-1"></div>
                    <span className="text-2xs font-bold text-slate-800">Campus Principal</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
