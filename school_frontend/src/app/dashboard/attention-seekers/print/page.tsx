"use client";

import React, { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Printer,
  ArrowLeft,
  Users,
  Crown,
  AlertTriangle,
  Target,
  TrendingDown,
  TrendingUp,
  Scale,
  UserX,
  Zap,
  Activity,
  Calendar,
  BookOpen,
} from "lucide-react";
import {
  useGetAcademicSessionsQuery,
  useGetClassesQuery,
  useGetSectionsQuery,
  useGetSubjectsQuery,
  useGetAttentionSeekerStudentsQuery,
} from "@/store/apiSlice";
import CustomDropdown from "@/components/CustomDropdown";

const CATEGORY_META: Record<
  string,
  {
    label: string;
    title: string;
    subtitle: string;
    badgeBg: string;
    badgeText: string;
    borderColor: string;
    accentColor: string;
    icon: any;
    priority: "High" | "Critical" | "Normal" | "Honors" | "Watchlist";
  }
> = {
  all: {
    label: "All Monitored",
    title: "COMPREHENSIVE STUDENT ATTENTION & PERFORMANCE DIRECTORY",
    subtitle: "Complete academic monitoring profile across all tracked performance categories",
    badgeBg: "#f0f4f8",
    badgeText: "#1e3a8a",
    borderColor: "#bfdbfe",
    accentColor: "#1e3a8a",
    icon: Users,
    priority: "Normal",
  },
  top_performers: {
    label: "Top Performers",
    title: "ACADEMIC EXCELLENCE & HONORS ROLL",
    subtitle: "High achieving students demonstrating superior mastery and consistent top tier performance",
    badgeBg: "#fef3c7",
    badgeText: "#78350f",
    borderColor: "#fde68a",
    accentColor: "#d97706",
    icon: Crown,
    priority: "Honors",
  },
  average: {
    label: "Average",
    title: "AVERAGE & MODERATE ACADEMIC PERFORMERS",
    subtitle: "Students maintaining steady progress within the average performance benchmark",
    badgeBg: "#eff6ff",
    badgeText: "#1e3a8a",
    borderColor: "#bfdbfe",
    accentColor: "#2563eb",
    icon: Activity,
    priority: "Normal",
  },
  attention_seeker: {
    label: "Attention Seeker",
    title: "CRITICAL ACADEMIC INTERVENTION WATCHLIST",
    subtitle: "Students scoring below pass threshold requiring immediate academic guidance and parent consultation",
    badgeBg: "#ffe4e6",
    badgeText: "#881337",
    borderColor: "#fecdd3",
    accentColor: "#e11d48",
    icon: AlertTriangle,
    priority: "Critical",
  },
  at_risk: {
    label: "Attention Seeker (Critical)",
    title: "CRITICAL ACADEMIC INTERVENTION WATCHLIST",
    subtitle: "Students scoring below pass threshold requiring immediate academic guidance and parent consultation",
    badgeBg: "#ffe4e6",
    badgeText: "#881337",
    borderColor: "#fecdd3",
    accentColor: "#e11d48",
    icon: AlertTriangle,
    priority: "Critical",
  },
  borderline: {
    label: "Borderline",
    title: "BORDERLINE PASS/FAIL STUDENTS REPORT",
    subtitle: "Students within the borderline threshold close to failing who need structured revision",
    badgeBg: "#ffedd5",
    badgeText: "#7c2d12",
    borderColor: "#fed7aa",
    accentColor: "#ea580c",
    icon: Target,
    priority: "High",
  },
  declining: {
    label: "Declining Trajectory",
    title: "DOWNWARD PERFORMANCE TRAJECTORY AUDIT",
    subtitle: "Students exhibiting consistent score declines across recent consecutive assessments",
    badgeBg: "#fef2f2",
    badgeText: "#991b1b",
    borderColor: "#fecaca",
    accentColor: "#dc2626",
    icon: TrendingDown,
    priority: "Critical",
  },
  rising_stars: {
    label: "Rising Stars",
    title: "MOST IMPROVED STUDENTS / RISING STARS",
    subtitle: "Commended students demonstrating significant score growth in recent test series",
    badgeBg: "#ecfdf5",
    badgeText: "#065f46",
    borderColor: "#a7f3d0",
    accentColor: "#059669",
    icon: TrendingUp,
    priority: "Honors",
  },
  single_subject_laggards: {
    label: "Subject Imbalance",
    title: "SINGLE-SUBJECT LAGGARDS & ACADEMIC IMBALANCE",
    subtitle: "Students with strong overall performance but a single critical weak subject needing coaching",
    badgeBg: "#f5f3ff",
    badgeText: "#5b21b6",
    borderColor: "#ddd6fe",
    accentColor: "#7c3aed",
    icon: Scale,
    priority: "High",
  },
  frequent_absentees: {
    label: "Missing Tests",
    title: "CHRONIC TEST ABSENTEEISM & INCOMPLETE RECORDS",
    subtitle: "Students with 2+ missed academy assessments causing gaps in academic continuity",
    badgeBg: "#fff1f2",
    badgeText: "#9f1239",
    borderColor: "#fecdd3",
    accentColor: "#be123c",
    icon: UserX,
    priority: "Critical",
  },
  centum_aces: {
    label: "Single-Test Aces",
    title: "SINGLE-TEST 100% ACES (HIGH POTENTIAL)",
    subtitle: "Students who scored perfect marks in at least one assessment but lack overall consistency",
    badgeBg: "#eff6ff",
    badgeText: "#1e40af",
    borderColor: "#bfdbfe",
    accentColor: "#2563eb",
    icon: Zap,
    priority: "Watchlist",
  },
  stagnant: {
    label: "Stagnant",
    title: "FLATLINE & STAGNANT TRAJECTORY STUDENTS",
    subtitle: "Students plateauing without measurable progress across recent test cycles",
    badgeBg: "#f8fafc",
    badgeText: "#334155",
    borderColor: "#e2e8f0",
    accentColor: "#475569",
    icon: Activity,
    priority: "Watchlist",
  },
  double_trouble: {
    label: "Double Trouble",
    title: "HIGH ABSENTEEISM + CRITICAL LOW PERFORMANCE",
    subtitle: "Highest priority: Multiple test absences coupled with failing scores requiring urgent parent summit",
    badgeBg: "#450a0a",
    badgeText: "#fee2e2",
    borderColor: "#7f1d1d",
    accentColor: "#991b1b",
    icon: AlertTriangle,
    priority: "Critical",
  },
};

function AttentionSeekerPrintContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL parameters with fallbacks
  const urlSession = searchParams.get("session") || "all";
  const urlClass = searchParams.get("class") || "all";
  const urlSection = searchParams.get("section") || "all";
  const urlSubject = searchParams.get("subject_id") || "all";
  const urlCategory = searchParams.get("category") || "all";
  const urlSearch = searchParams.get("search") || "";
  const topThreshold = Number(searchParams.get("top_threshold")) || 75;
  const attentionThreshold = Number(searchParams.get("attention_threshold")) || 50;

  // Local state for on-page filter switching
  const [selectedSession, setSelectedSession] = useState<string>(urlSession);
  const [selectedClass, setSelectedClass] = useState<string>(urlClass);
  const [selectedSection, setSelectedSection] = useState<string>(urlSection);
  const [selectedSubject, setSelectedSubject] = useState<string>(urlSubject);
  const [selectedCategory, setSelectedCategory] = useState<string>(urlCategory);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");

  // Sync state if URL changes
  useEffect(() => {
    if (urlSession !== selectedSession) setSelectedSession(urlSession);
    if (urlClass !== selectedClass) setSelectedClass(urlClass);
    if (urlSection !== selectedSection) setSelectedSection(urlSection);
    if (urlSubject !== selectedSubject) setSelectedSubject(urlSubject);
    if (urlCategory !== selectedCategory) setSelectedCategory(urlCategory);
  }, [urlSession, urlClass, urlSection, urlSubject, urlCategory]);

  // Master prerequisites
  const { data: sessions = [] } = useGetAcademicSessionsQuery();
  const { data: classes = [] } = useGetClassesQuery();
  const { data: sections = [] } = useGetSectionsQuery();
  const { data: subjects = [] } = useGetSubjectsQuery();

  // Determine active session
  const activeSessionId = useMemo(() => {
    if (selectedSession && selectedSession !== "all") return selectedSession;
    const active = sessions.find((s: any) => s.is_active);
    return active ? active.id : sessions[0]?.id || 1;
  }, [sessions, selectedSession]);

  // Fetch all students for printing (limit=all) with subject filter
  const {
    data: studentsResponse,
    isLoading,
    isFetching,
    refetch,
  } = useGetAttentionSeekerStudentsQuery({
    sessionId: activeSessionId,
    classId: selectedClass,
    sectionId: selectedSection,
    subjectId: selectedSubject,
    category: selectedCategory,
    search: urlSearch,
    page: 1,
    limit: "all" as any,
    topThreshold,
    attentionThreshold,
  });

  const students: any[] = studentsResponse?.data || [];

  // Dropdown options
  const categoryOptions = useMemo(() => {
    return Object.keys(CATEGORY_META).map((key) => ({
      label: CATEGORY_META[key].label,
      value: key,
    }));
  }, []);

  const classOptions = useMemo(() => [
    { label: "All Classes", value: "all" },
    ...classes.map((c: any) => ({ label: `Class ${c.name}`, value: String(c.id) })),
  ], [classes]);

  const availableSections = useMemo(() => {
    if (selectedClass === "all") return sections;
    return sections.filter((s: any) => String(s.class_id) === String(selectedClass));
  }, [sections, selectedClass]);

  const sectionOptions = useMemo(() => [
    { label: "All Sections", value: "all" },
    ...availableSections.map((s: any) => ({
      label: `Section ${s.name}`,
      value: String(s.id),
    })),
  ], [availableSections]);

  const subjectOptions = useMemo(() => [
    { label: "All Subjects", value: "all" },
    ...subjects.map((s: any) => ({
      label: s.name,
      value: String(s.id),
    })),
  ], [subjects]);

  // Current subject object & name
  const currentSubjectObj = useMemo(() => {
    if (selectedSubject === "all") return null;
    return subjects.find((s: any) => String(s.id) === String(selectedSubject));
  }, [subjects, selectedSubject]);

  const currentSubjectName = useMemo(() => {
    if (selectedSubject === "all") return "All Subjects";
    return currentSubjectObj?.name || "Selected Subject";
  }, [selectedSubject, currentSubjectObj]);

  // Active labels
  const meta = CATEGORY_META[selectedCategory] || CATEGORY_META.all;
  const currentSessionName =
    sessions.find((s: any) => String(s.id) === String(activeSessionId))?.name || "Active Session";
  const currentClassName =
    selectedClass === "all"
      ? "All Classes"
      : classes.find((c: any) => String(c.id) === String(selectedClass))?.name
      ? `Class ${classes.find((c: any) => String(c.id) === String(selectedClass))?.name}`
      : "Selected Class";
  const currentSectionName =
    selectedSection === "all"
      ? "All Sections"
      : sections.find((s: any) => String(s.id) === String(selectedSection))?.name
      ? `Section ${sections.find((s: any) => String(s.id) === String(selectedSection))?.name}`
      : "Selected Section";

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @page {
          size: A4 ${orientation};
          margin: 6mm 6mm 6mm 6mm;
        }
        @media print {
          .no-print { display: none !important; }
          html, body {
            background: white !important;
            color: #111 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-container {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-card {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-table {
            width: 100% !important;
            table-layout: fixed !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
        }
      `,
        }}
      />

      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-16">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="no-print bg-white border-b border-[#bfdbfe] sticky top-0 z-50 shadow-xs">
          <div className="max-w-7xl mx-auto px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="p-2 rounded-lg border border-[#bfdbfe] text-[#1e3a8a] hover:bg-[#f0f4f8] transition"
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <h1 className="text-sm font-bold text-[#0f224a] flex items-center gap-2 flex-wrap">
                  <span>Print Academic Attention Report</span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#dbeafe] text-[#2563eb] border border-[#bfdbfe]">
                    {meta.label}
                  </span>
                  {selectedSubject !== "all" && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-[#2563eb] text-white">
                      Subject: {currentSubjectName}
                    </span>
                  )}
                </h1>
                <p className="text-[11px] text-gray-500">
                  {students.length} student{students.length !== 1 ? "s" : ""} in this category •{" "}
                  {currentClassName} ({currentSectionName})
                  {selectedSubject !== "all" ? ` • Subject: ${currentSubjectName}` : ""} • Session {currentSessionName}
                </p>
              </div>
            </div>

            {/* Filter controls & Print action */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-38">
                <CustomDropdown
                  name="category"
                  value={selectedCategory}
                  onChange={(_, val) => setSelectedCategory(String(val))}
                  options={categoryOptions}
                  placeholder="Category"
                  size="sm"
                />
              </div>

              <div className="w-32">
                <CustomDropdown
                  name="class"
                  value={selectedClass}
                  onChange={(_, val) => {
                    setSelectedClass(String(val));
                    setSelectedSection("all");
                  }}
                  options={classOptions}
                  placeholder="Class"
                  size="sm"
                />
              </div>

              <div className="w-32">
                <CustomDropdown
                  name="section"
                  value={selectedSection}
                  onChange={(_, val) => setSelectedSection(String(val))}
                  options={sectionOptions}
                  placeholder="Section"
                  size="sm"
                />
              </div>

              <div className="w-36">
                <CustomDropdown
                  name="subject"
                  value={selectedSubject}
                  onChange={(_, val) => setSelectedSubject(String(val))}
                  options={subjectOptions}
                  placeholder="Subject"
                  size="sm"
                />
              </div>

              {/* Layout Orientation Toggle */}
              <div className="flex items-center bg-[#f0f4f8] p-1 rounded-xl border border-[#bfdbfe] text-xs">
                <button
                  type="button"
                  onClick={() => setOrientation("portrait")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition text-[11px] ${
                    orientation === "portrait"
                      ? "bg-white text-[#2563eb] shadow-xs"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                  title="A4 Portrait layout"
                >
                  Portrait
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation("landscape")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition text-[11px] ${
                    orientation === "landscape"
                      ? "bg-white text-[#2563eb] shadow-xs"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                  title="A4 Landscape layout (extra width)"
                >
                  Landscape
                </button>
              </div>

              <button
                onClick={() => window.print()}
                disabled={isLoading}
                className="py-2 px-4 rounded-xl text-xs font-bold text-white transition flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%)" }}
              >
                <Printer className="w-4 h-4" />
                <span>Print / Save PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Printable Document Sheet */}
        <div className="max-w-6xl mx-auto mt-6 px-4 md:px-0 print:m-0 print:p-0 print-container">
          <div className="bg-white rounded-2xl shadow-sm border border-[#bfdbfe] p-8 print-card print:border-none print:shadow-none print:p-0">
            {/* 1. Official Header */}
            <div className="border-b-2 border-[#2563eb] pb-4 mb-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <img
                  src="/logo.png"
                  alt="Kips School Chunian Campus Logo"
                  className="w-16 h-16 rounded-xl object-contain border border-[#bfdbfe] p-1 bg-white shrink-0"
                  onError={(e) => {
                    // Fallback to logo.jpg if png not found
                    (e.target as HTMLImageElement).src = "/logo.jpg";
                  }}
                />
                <div>
                  <h2 className="text-2xl font-black text-[#0f224a] uppercase tracking-tight leading-none">
                    Kips School Chunian Campus
                  </h2>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-xs font-black uppercase tracking-wider text-gray-500">
                      Category:
                    </span>
                    <span
                      className="px-3 py-1 rounded-lg text-sm font-black uppercase tracking-wider border shadow-2xs"
                      style={{
                        background: meta.badgeBg,
                        color: meta.badgeText,
                        borderColor: meta.borderColor,
                      }}
                    >
                      {meta.label}
                    </span>
                    {selectedSubject !== "all" && (
                      <span className="px-3 py-1 rounded-lg text-sm font-black uppercase tracking-wider bg-[#2563eb] text-white shadow-2xs">
                        Subject: {currentSubjectName}
                      </span>
                    )}
                    <span className="text-xs font-bold text-[#2563eb] uppercase tracking-wide">
                      — {meta.title}
                    </span>
                  </div>
                </div>
              </div>

              {/* Prominent Category Badge on Right */}
              <div className="text-right shrink-0">
                <div
                  className="px-4 py-2 rounded-xl border-2 text-right"
                  style={{
                    background: meta.badgeBg,
                    borderColor: meta.borderColor,
                  }}
                >
                  <span
                    className="text-[10px] font-black uppercase tracking-widest block opacity-75"
                    style={{ color: meta.badgeText }}
                  >
                    {selectedSubject !== "all" ? `${currentSubjectName} Assessment` : "Official Category Report"}
                  </span>
                  <span
                    className="text-base font-black uppercase tracking-tight block"
                    style={{ color: meta.badgeText }}
                  >
                    {meta.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Metadata Summary Info Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-[#f0f4f8] p-3 rounded-xl border border-[#bfdbfe] mb-4 text-xs">
              <div>
                <span className="text-gray-500 font-bold block text-[10px] uppercase">Session</span>
                <span className="font-extrabold text-[#0f224a]">{currentSessionName}</span>
              </div>
              <div>
                <span className="text-gray-500 font-bold block text-[10px] uppercase">Class & Section</span>
                <span className="font-extrabold text-[#0f224a]">{currentClassName} ({currentSectionName})</span>
              </div>
              <div>
                <span className="text-gray-500 font-bold block text-[10px] uppercase">Subject Filter</span>
                <span className={`font-extrabold ${selectedSubject !== "all" ? "text-[#2563eb]" : "text-[#0f224a]"}`}>
                  {currentSubjectName}
                </span>
              </div>
              <div>
                <span className="text-gray-500 font-bold block text-[10px] uppercase">Total Evaluated</span>
                <span className="font-extrabold text-[#0f224a]">{students.length} students</span>
              </div>
            </div>

            {/* 2. Detailed Records Table */}
            {isLoading ? (
              <div className="py-20 text-center text-sm font-semibold text-[#2563eb]">
                <div className="w-8 h-8 border-3 border-[#2563eb] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                Compiling official attention records for printing...
              </div>
            ) : students.length === 0 ? (
              <div className="py-16 text-center rounded-xl border border-[#bfdbfe] bg-[#f0f4f8]">
                <p className="text-sm font-bold text-[#0f224a]">
                  No students meet this specific category criteria for the selected class/section/subject.
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Change the category, class, or subject filter above to view other records.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto print:overflow-visible">
                <table className="w-full text-left border-collapse print-table text-xs print:text-[10px] print:leading-tight">
                  <thead>
                    <tr
                      className="border-b-2 font-bold uppercase tracking-wider text-[11px] print:text-[9.5px]"
                      style={{ background: "#f0f4f8", color: "#1e3a8a", borderColor: "#bfdbfe" }}
                    >
                      <th className="py-2.5 px-1 print:py-1.5 print:px-0.5 text-center w-[4%]">#</th>
                      <th className="py-2.5 px-1 print:py-1.5 print:px-0.5 text-center w-[7%]">Roll #</th>
                      <th className="py-2.5 px-2 print:py-1.5 print:px-1 w-[21%]">Student Name</th>
                      <th className="py-2.5 px-2 print:py-1.5 print:px-1 w-[18%]">Parent / Father</th>
                      <th className="py-2.5 px-1 print:py-1.5 print:px-0.5 text-center w-[10%]">Class</th>
                      <th className="py-2.5 px-1 print:py-1.5 print:px-0.5 text-center w-[9%]">Tests</th>
                      <th className="py-2.5 px-1 print:py-1.5 print:px-0.5 text-center w-[8%]">
                        {selectedSubject !== "all" ? `${currentSubjectName} %` : "Average"}
                      </th>
                      <th className="py-2.5 px-1 print:py-1.5 print:px-0.5 text-center w-[6%]">Grade</th>
                      <th className="py-2.5 px-1.5 print:py-1.5 print:px-1 w-[11%]">Weakest</th>
                      <th className="py-2.5 px-1 print:py-1.5 print:px-0.5 text-center w-[6%]">Attnd.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#bfdbfe]/70 text-gray-800">
                    {students.map((s, idx) => (
                      <tr
                        key={s.id}
                        className={idx % 2 === 0 ? "bg-white" : "bg-[#f0f4f8]/30"}
                      >
                        <td className="py-2 px-1 print:py-1 print:px-0.5 text-center font-bold text-gray-400">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-1 print:py-1 print:px-0.5 text-center font-mono font-semibold text-[#0f224a]">
                          #{s.roll_number || s.id}
                        </td>
                        <td className="py-2 px-2 print:py-1 print:px-1 font-bold text-[#0f224a]">
                          <div className="truncate print:whitespace-normal font-semibold leading-tight text-gray-900">
                            {s.name}
                          </div>
                        </td>
                        <td className="py-2 px-2 print:py-1 print:px-1 text-gray-600">
                          <div className="truncate print:whitespace-normal text-[11px] print:text-[9.5px] leading-tight">
                            {s.father_name || "—"}
                          </div>
                        </td>
                        <td className="py-2 px-1 print:py-1 print:px-0.5 text-center text-gray-700 whitespace-nowrap font-medium">
                          <span>{s.class_name}</span>
                          {s.section_name && (
                            <span className="text-[10px] print:text-[8px] text-gray-500 block">
                              ({s.section_name})
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-1 print:py-1 print:px-0.5 text-center text-gray-700 whitespace-nowrap">
                          <strong>{s.tests_taken}</strong>/{s.total_tests}
                          {s.tests_absent > 0 && (
                            <span className="text-rose-600 font-semibold text-[10px] print:text-[8px] block">
                              ({s.tests_absent} abs)
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-1 print:py-1 print:px-0.5 text-center whitespace-nowrap font-bold">
                          <span
                            className={
                              s.avg_percentage >= 80
                                ? "text-emerald-700"
                                : s.avg_percentage >= 50
                                ? "text-blue-700"
                                : "text-rose-700"
                            }
                          >
                            {s.avg_percentage}%
                          </span>
                        </td>
                        <td className="py-2 px-1 print:py-1 print:px-0.5 text-center whitespace-nowrap">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] print:text-[8px] font-bold border ${
                              s.grade === "A+" || s.grade === "A"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : s.grade === "B"
                                ? "bg-blue-50 text-blue-800 border-blue-200"
                                : s.grade === "C"
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "bg-rose-50 text-rose-800 border-rose-200"
                            }`}
                          >
                            {s.grade}
                          </span>
                        </td>
                        <td className="py-2 px-1.5 print:py-1 print:px-1 text-gray-700">
                          {s.weakest_subject ? (
                            <div className="leading-tight">
                              <span className="text-rose-800 font-semibold text-[11px] print:text-[9px] block">
                                {s.weakest_subject.name}
                              </span>
                              <span className="text-gray-500 font-bold text-[10px] print:text-[8px]">
                                {s.weakest_subject.percentage}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-2 px-1 print:py-1 print:px-0.5 text-center whitespace-nowrap font-medium text-gray-700">
                          {s.attendance_rate !== null ? `${s.attendance_rate}%` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 4. Official Signatures Footer */}
            <div className="mt-12 pt-6 border-t border-[#bfdbfe] grid grid-cols-3 gap-8 text-center">
              <div>
                <div className="border-b border-gray-400 w-40 mx-auto mb-2" />
                <p className="text-xs font-bold text-[#0f224a]">Class Incharge / Mentor</p>
                <p className="text-[10px] text-gray-500">Sign &amp; Observation</p>
              </div>

              <div>
                <div className="border-b border-gray-400 w-40 mx-auto mb-2" />
                <p className="text-xs font-bold text-[#0f224a]">Academic Coordinator</p>
                <p className="text-[10px] text-gray-500">Verification &amp; Follow-up</p>
              </div>

              <div>
                <div className="border-b border-gray-400 w-40 mx-auto mb-2" />
                <p className="text-xs font-bold text-[#0f224a]">Principal / Director</p>
                <p className="text-[10px] text-gray-500">Executive Approval</p>
              </div>
            </div>

            {/* 5. Academy Contact / Disclaimer */}
            <div className="mt-8 text-center text-[10px] text-gray-400 border-t border-gray-100 pt-3">
              Official Academic Record • Kips School Chunian Campus • Helpline: 0300 39 39 581 • Portal: https://usachunian.com
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function AttentionSeekerPrintPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white p-12 text-center text-sm font-sans font-bold text-[#2563eb]">
          <div className="w-8 h-8 border-3 border-[#2563eb] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading printable academic attention report...
        </div>
      }
    >
      <AttentionSeekerPrintContent />
    </Suspense>
  );
}
