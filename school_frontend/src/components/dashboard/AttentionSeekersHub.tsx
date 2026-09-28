"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Zap,
  Target,
  Scale,
  UserX,
  Activity,
  Search,
  Filter,
  Users,
  Award,
  BookOpen,
  CheckCircle2,
  RefreshCw,
  LayoutGrid,
  List,
  MessageCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BarChart3,
  Loader2,
  Check,
  Printer,
  SlidersHorizontal,
  Settings2,
  X,
  RotateCcw,
  Info,
} from "lucide-react";
import StudentAttentionCard, {
  StudentAttentionData,
} from "./StudentAttentionCard";
import CustomDropdown from "@/components/CustomDropdown";
import {
  useGetAcademicSessionsQuery,
  useGetClassesQuery,
  useGetSectionsQuery,
  useGetAttentionSeekersSummaryQuery,
  useGetAttentionSeekerStudentsQuery,
  useGetAttentionSeekerThresholdsQuery,
  useUpdateAttentionSeekerThresholdsMutation,
  useSendAttentionSeekerWhatsAppAlertMutation,
} from "@/store/apiSlice";

interface PerformanceThresholds {
  topThreshold: number;
  attentionThreshold: number;
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  topThreshold: 75,
  attentionThreshold: 50,
};

export default function AttentionSeekersHub() {
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [showSectionComparison, setShowSectionComparison] = useState<boolean>(true);

  // Dynamic percentage thresholds for categories (synced with database / server API)
  const { data: serverThresholds } = useGetAttentionSeekerThresholdsQuery();
  const [updateThresholdsMutation, { isLoading: isSavingThresholds }] = useUpdateAttentionSeekerThresholdsMutation();

  const [thresholds, setThresholds] = useState<PerformanceThresholds>(DEFAULT_THRESHOLDS);
  const [showThresholdModal, setShowThresholdModal] = useState<boolean>(false);
  const [tempTopThreshold, setTempTopThreshold] = useState<number>(DEFAULT_THRESHOLDS.topThreshold);
  const [tempAttentionThreshold, setTempAttentionThreshold] = useState<number>(DEFAULT_THRESHOLDS.attentionThreshold);

  // Synchronize state when server thresholds load
  useEffect(() => {
    if (serverThresholds?.top_threshold && serverThresholds?.attention_threshold) {
      setThresholds({
        topThreshold: serverThresholds.top_threshold,
        attentionThreshold: serverThresholds.attention_threshold,
      });
      setTempTopThreshold(serverThresholds.top_threshold);
      setTempAttentionThreshold(serverThresholds.attention_threshold);
    }
  }, [serverThresholds]);

  // 1. Fetch dropdown prerequisites
  const { data: sessions = [] } = useGetAcademicSessionsQuery();
  const { data: classes = [] } = useGetClassesQuery();
  const { data: sections = [] } = useGetSectionsQuery();

  // Determine active session ID
  const activeSessionId = useMemo(() => {
    const active = sessions.find((s: any) => s.is_active);
    return active ? active.id : sessions[0]?.id || 1;
  }, [sessions]);

  // 2. Fetch Attention Seekers Summary with dynamic criteria & optional subject filtering
  const {
    data: summaryData,
    isLoading: isLoadingSummary,
    isFetching: isFetchingSummary,
    refetch: refetchSummary,
    error: summaryError,
  } = useGetAttentionSeekersSummaryQuery({
    sessionId: activeSessionId,
    classId: selectedClass,
    sectionId: selectedSection,
    subjectId: selectedSubject,
    topThreshold: thresholds.topThreshold,
    attentionThreshold: thresholds.attentionThreshold,
  });

  // Sync thresholds from summaryData if available
  useEffect(() => {
    if (summaryData?.thresholds?.top_threshold && summaryData?.thresholds?.attention_threshold) {
      setThresholds({
        topThreshold: summaryData.thresholds.top_threshold,
        attentionThreshold: summaryData.thresholds.attention_threshold,
      });
      setTempTopThreshold(summaryData.thresholds.top_threshold);
      setTempAttentionThreshold(summaryData.thresholds.attention_threshold);
    }
  }, [summaryData?.thresholds]);

  // 3. Fetch Student Cards for the active category (paginated) with dynamic criteria & optional subject filtering
  const {
    data: studentsResponse,
    isLoading: isLoadingStudents,
    isFetching: isFetchingStudents,
    refetch: refetchStudents,
  } = useGetAttentionSeekerStudentsQuery({
    sessionId: activeSessionId,
    classId: selectedClass,
    sectionId: selectedSection,
    subjectId: selectedSubject,
    category: activeCategory,
    search: searchQuery,
    page: currentPage,
    limit: 12,
    topThreshold: thresholds.topThreshold,
    attentionThreshold: thresholds.attentionThreshold,
  });

  const counts = summaryData?.counts || {};
  const overallStats = summaryData?.overall_stats || {};
  const classComparison = summaryData?.class_comparison || [];
  const sectionComparison = summaryData?.section_comparison || [];
  const subjectDifficulty = summaryData?.subject_difficulty || [];
  const studentList: StudentAttentionData[] = studentsResponse?.data || [];
  const totalStudents = studentsResponse?.total || 0;
  const lastPage = studentsResponse?.last_page || 1;

  // Selected class object and human-readable name
  const selectedClassObj = useMemo(() => {
    return classComparison.find((c: any) => String(c.class_id) === String(selectedClass));
  }, [classComparison, selectedClass]);

  const selectedClassName = useMemo(() => {
    if (selectedClass === "all") return "All Classes";
    const found = classes.find((c: any) => String(c.id) === String(selectedClass));
    return found ? found.name : selectedClassObj?.class_name || "";
  }, [classes, selectedClass, selectedClassObj]);

  const selectedSectionName = useMemo(() => {
    if (selectedSection === "all") return "All Sections";
    const found = sections.find((s: any) => String(s.id) === String(selectedSection));
    return found ? `Section ${found.name}` : "Selected Section";
  }, [sections, selectedSection]);

  // Sections that belong to the selected class
  const sectionsForSelectedClass = useMemo(() => {
    if (selectedClass === "all") return [];
    return sectionComparison.filter((s: any) => String(s.class_id) === String(selectedClass));
  }, [sectionComparison, selectedClass]);

  // Available sections for the top dropdown filter
  const availableSectionsForDropdown = useMemo(() => {
    if (selectedClass === "all") {
      return sections;
    }
    if (sectionsForSelectedClass.length > 0) {
      return sectionsForSelectedClass.map((s: any) => ({
        id: s.section_id,
        name: s.section_name,
      }));
    }
    return sections;
  }, [selectedClass, sectionsForSelectedClass, sections]);

  // Options for CustomDropdown
  const classOptions = useMemo(() => [
    { label: "All Classes", value: "all" },
    ...classes.map((c: any) => ({ label: `Class ${c.name}`, value: String(c.id) })),
  ], [classes]);

  const sectionOptions = useMemo(() => [
    {
      label: selectedClass === "all" ? "All Sections" : `All Sections (${selectedClassName})`,
      value: "all",
    },
    ...availableSectionsForDropdown.map((s: any) => ({
      label: `Section ${s.name}`,
      value: String(s.id),
    })),
  ], [selectedClass, selectedClassName, availableSectionsForDropdown]);

  const [sendAlert] = useSendAttentionSeekerWhatsAppAlertMutation();
  const [tableSendingId, setTableSendingId] = useState<number | null>(null);
  const [tableSentIds, setTableSentIds] = useState<Record<number, boolean>>({});

  const handleTableSendAlert = async (s: any) => {
    if (tableSendingId) return;
    setTableSendingId(s.id);
    try {
      const res = await sendAlert({
        studentId: s.id,
        phone: s.contact_number || s.emergency_contact,
        avg_percentage: s.avg_percentage,
        grade: s.grade,
        diagnostic_note: s.diagnostic_note,
        tests_taken: s.tests_taken,
        total_tests: s.total_tests,
        weakest_subject: s.weakest_subject?.name,
      }).unwrap();

      if (res.success) {
        setTableSentIds((prev) => ({ ...prev, [s.id]: true }));
        setTimeout(() => {
          setTableSentIds((prev) => ({ ...prev, [s.id]: false }));
        }, 3000);
      }
    } catch (e) {
      console.error("WhatsApp delivery error:", e);
    } finally {
      setTableSendingId(null);
    }
  };

  // Dynamic category tabs with user-defined threshold percentages
  const categoryTabs = useMemo(() => [
    { id: "all", label: "All Monitored", icon: Users, badge: "" },
    {
      id: "top_performers",
      label: "Top Performers",
      icon: Crown,
      badge: `≥${thresholds.topThreshold}%`,
      isPrimary: true,
      accentColor: "#d97706",
    },
    {
      id: "average",
      label: "Average",
      icon: Activity,
      badge: `${thresholds.attentionThreshold}%–${thresholds.topThreshold - 1}%`,
      isPrimary: true,
      accentColor: "#2563eb",
    },
    {
      id: "attention_seeker",
      label: "Attention Seeker",
      icon: AlertTriangle,
      badge: `<${thresholds.attentionThreshold}%`,
      isPrimary: true,
      accentColor: "#e11d48",
    },
    { id: "declining", label: "Declining Score", icon: TrendingDown, badge: "" },
    { id: "rising_stars", label: "Rising Stars", icon: TrendingUp, badge: "" },
    { id: "single_subject_laggards", label: "Subject Imbalance", icon: Scale, badge: "" },
    { id: "frequent_absentees", label: "Missing Tests", icon: UserX, badge: "" },
    { id: "double_trouble", label: "Double Trouble", icon: AlertTriangle, badge: "" },
    { id: "centum_aces", label: "Single-Test Aces", icon: Zap, badge: "" },
    { id: "borderline", label: "Borderline", icon: Target, badge: "" },
    { id: "stagnant", label: "Stagnant", icon: Activity, badge: "" },
  ], [thresholds]);

  const currentCategoryLabel = useMemo(() => {
    return categoryTabs.find((t) => t.id === activeCategory)?.label || "All Monitored";
  }, [activeCategory, categoryTabs]);

  const selectedSubjectObj = useMemo(() => {
    if (selectedSubject === "all") return null;
    return subjectDifficulty.find((s: any) => String(s.subject_id) === String(selectedSubject));
  }, [subjectDifficulty, selectedSubject]);

  const selectedSubjectName = useMemo(() => {
    if (selectedSubject === "all") return "";
    return selectedSubjectObj?.subject_name || "Selected Subject";
  }, [selectedSubject, selectedSubjectObj]);

  const handleSubjectClick = (subjectId: string | number) => {
    const strId = String(subjectId);
    if (selectedSubject === strId) {
      // Toggle off when tapped again
      setSelectedSubject("all");
    } else {
      setSelectedSubject(strId);
      // Clear other active filters as requested
      setSelectedClass("all");
      setSelectedSection("all");
      setActiveCategory("all");
      setSearchQuery("");
      setCurrentPage(1);
    }
  };

  const handlePrintCategory = () => {
    const params = new URLSearchParams({
      session: String(activeSessionId),
      class: selectedClass,
      section: selectedSection,
      category: activeCategory,
      top_threshold: String(thresholds.topThreshold),
      attention_threshold: String(thresholds.attentionThreshold),
    });
    if (selectedSubject !== "all") params.append("subject_id", selectedSubject);
    if (searchQuery) params.append("search", searchQuery);
    window.open(`/dashboard/attention-seekers/print?${params.toString()}`, "_blank");
  };

  const handleSaveThresholds = async (top: number, att: number) => {
    let validatedTop = Math.min(99, Math.max(20, top));
    let validatedAtt = Math.min(95, Math.max(10, att));
    if (validatedTop <= validatedAtt) {
      validatedTop = validatedAtt + 5;
    }
    const newThresholds = { topThreshold: validatedTop, attentionThreshold: validatedAtt };
    setThresholds(newThresholds);
    try {
      await updateThresholdsMutation({
        top_threshold: validatedTop,
        attention_threshold: validatedAtt,
      }).unwrap();
    } catch (e) {
      console.error("Error updating thresholds on server:", e);
    }
    setShowThresholdModal(false);
    setCurrentPage(1);
  };

  // Reset pagination on filter change
  const handleClassChange = (classId: string) => {
    setSelectedClass(classId);
    setSelectedSection("all");
    setCurrentPage(1);
  };

  const handleSectionChange = (sectionId: string) => {
    setSelectedSection(sectionId);
    setCurrentPage(1);
  };

  const handleCategoryChange = (categoryId: string) => {
    setActiveCategory(categoryId);
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    refetchSummary();
    refetchStudents();
  };

  return (
    <div
      className="p-6 rounded-2xl border shadow-sm mb-8 transition-all"
      style={{
        background: "#ffffff",
        borderColor: "#bfdbfe",
      }}
    >
      {/* 1. Header & Controls Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#bfdbfe]/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs"
              style={{ background: "#1e3a8a" }}
            >
              <Activity className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight" style={{ color: "#0f224a" }}>
                Student Attention & Performance Intelligence
              </h3>
              <p className="text-xs" style={{ color: "#2563eb" }}>
                Live academic intelligence across classes, sections, and customizable performance criteria
              </p>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search student / roll #..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="py-2 pl-8 pr-3 rounded-lg border text-xs w-40 sm:w-48 transition focus:outline-hidden focus:ring-2 focus:ring-[#2563eb]"
              style={{
                background: "#f0f4f8",
                color: "#1e3a8a",
                borderColor: "#bfdbfe",
              }}
            />
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#2563eb]" />
          </div>

          {/* Threshold % Configuration Button */}
          <button
            onClick={() => {
              setTempTopThreshold(thresholds.topThreshold);
              setTempAttentionThreshold(thresholds.attentionThreshold);
              setShowThresholdModal(true);
            }}
            className="py-2 px-3 rounded-lg border text-xs font-bold transition flex items-center gap-1.5 shadow-xs hover:shadow-md active:scale-95 shrink-0"
            style={{
              background: "#f0f4f8",
              borderColor: "#bfdbfe",
              color: "#1e3a8a",
            }}
            title="Configure Category % Cutoffs (Top Performers, Average, Attention Seekers)"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#2563eb]" />
            <span className="hidden md:inline">Criteria:</span>
            <span className="font-extrabold text-[#2563eb]">
              ≥{thresholds.topThreshold}% / &lt;{thresholds.attentionThreshold}%
            </span>
          </button>

          {/* View Toggle */}
          <div
            className="flex items-center rounded-lg border p-0.5"
            style={{ background: "#f0f4f8", borderColor: "#bfdbfe" }}
          >
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md transition ${
                viewMode === "grid"
                  ? "bg-[#1e3a8a] text-white shadow-xs"
                  : "text-[#2563eb] hover:bg-white"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-md transition ${
                viewMode === "table"
                  ? "bg-[#1e3a8a] text-white shadow-xs"
                  : "text-[#2563eb] hover:bg-white"
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isFetchingSummary || isFetchingStudents}
            className="p-2 rounded-lg border transition hover:shadow-xs active:scale-95 disabled:opacity-50"
            style={{
              background: "#f0f4f8",
              borderColor: "#bfdbfe",
              color: "#1e3a8a",
            }}
            title="Refresh Metrics"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                isFetchingSummary || isFetchingStudents ? "animate-spin text-[#2563eb]" : ""
              }`}
            />
          </button>

          {/* Print PDF Button */}
          <button
            onClick={handlePrintCategory}
            className="py-2 px-3 rounded-lg border text-xs font-bold text-white transition flex items-center gap-1.5 shadow-xs hover:shadow-md active:scale-95 shrink-0"
            style={{
              background: "linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%)",
              borderColor: "#bfdbfe",
            }}
            title={`Print & Save PDF Report for ${currentCategoryLabel}`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print PDF</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-5">
        {/* Total Monitored */}
        <div
          className="p-4 rounded-xl border flex items-center justify-between"
          style={{ background: "#f0f4f8", borderColor: "#bfdbfe" }}
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Students Monitored
            </p>
            <p className="text-2xl font-black text-[#0f224a] mt-1">
              {isLoadingSummary ? "..." : overallStats.total_monitored || 0}
            </p>
            <span className="text-[10px] text-gray-500">
              {overallStats.active_with_tests || 0} assessed with tests
            </span>
          </div>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
            style={{ background: "#1e3a8a" }}
          >
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Overall Average */}
        <div
          className="p-4 rounded-xl border flex items-center justify-between"
          style={{ background: "#f0f4f8", borderColor: "#bfdbfe" }}
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Academic Average
            </p>
            <p className="text-2xl font-black text-[#0f224a] mt-1">
              {isLoadingSummary ? "..." : `${overallStats.overall_average || 0}%`}
            </p>
            <span className="text-[10px] text-emerald-700 font-semibold">
              Institute Benchmark
            </span>
          </div>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
            style={{ background: "#2563eb" }}
          >
            <BarChart3 className="w-5 h-5" />
          </div>
        </div>

        {/* Critical Attention Needed */}
        <div
          className="p-4 rounded-xl border border-rose-200 bg-rose-50/60 flex items-center justify-between"
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
              Urgent Attention
            </p>
            <p className="text-2xl font-black text-rose-900 mt-1">
              {isLoadingSummary ? "..." : overallStats.critical_attention || 0}
            </p>
            <span className="text-[10px] text-rose-700 font-medium">
              At-Risk & Declining
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-rose-600 text-white">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Excellence / High Achievers */}
        <div
          className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 flex items-center justify-between"
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
              Excellence Stars
            </p>
            <p className="text-2xl font-black text-amber-900 mt-1">
              {isLoadingSummary ? "..." : overallStats.excellence_count || 0}
            </p>
            <span className="text-[10px] text-amber-700 font-medium">
              Toppers & Aces
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500 text-white">
            <Crown className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Class Academic Comparison Bar & Selected Class Sections */}
      {classComparison.length > 0 && (
        <div className="mb-6 p-4 rounded-xl border bg-white" style={{ borderColor: "#bfdbfe" }}>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#2563eb]" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#1e3a8a]">
                Class-wise Academic Comparison
              </h4>
              {selectedClass !== "all" && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#1e3a8a] text-white">
                  Class {selectedClassName} Selected
                </span>
              )}
            </div>

            <button
              onClick={() => setShowSectionComparison(!showSectionComparison)}
              className="text-xs font-semibold text-[#2563eb] hover:underline"
            >
              {showSectionComparison ? "Hide Comparison" : "Show Comparison"}
            </button>
          </div>

          {showSectionComparison && (
            <>
              {/* Class Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {classComparison.map((item: any) => {
                  const classId = String(item.class_id);
                  const isSelected = selectedClass === classId;

                  return (
                    <div
                      key={classId}
                      className={`p-3.5 rounded-xl border transition cursor-pointer ${
                        isSelected
                          ? "border-[#1e3a8a] bg-[#f0f4f8] ring-2 ring-[#1e3a8a]/30 shadow-xs"
                          : "border-[#bfdbfe]/80 bg-[#f0f4f8]/40 hover:bg-[#f0f4f8] hover:border-[#bfdbfe]"
                      }`}
                      onClick={() => handleClassChange(isSelected ? "all" : classId)}
                      role="button"
                      title={isSelected ? `Click to clear filter (Show all classes)` : `Click to filter by Class ${item.class_name} and view its sections`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-[#0f224a] flex items-center gap-1.5">
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#2563eb]" />}
                          Class {item.class_name}
                        </span>
                        <span className="text-[10px] text-gray-500 font-medium">
                          {item.student_count || item.total_enrolled || 0} studs
                        </span>
                      </div>
                      <div className="mt-2 flex items-baseline justify-between">
                        <span className="text-xl font-black text-[#1e3a8a]">
                          {item.has_tests !== false ? `${item.avg_percentage}%` : "—"}
                        </span>
                        <span
                          className={`text-[10px] font-bold ${
                            item.absent_rate > 20 ? "text-rose-600" : "text-gray-500"
                          }`}
                        >
                          {item.has_tests !== false ? `${item.absent_rate}% abs` : "No tests"}
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden mt-2">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, item.avg_percentage || 0)}%`,
                            background:
                              (item.avg_percentage || 0) >= 70
                                ? "#2563eb"
                                : (item.avg_percentage || 0) >= 50
                                ? "#d97706"
                                : "#dc2626",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Sections of the Selected Class */}
              {selectedClass !== "all" && (
                <div className="mt-4 pt-3.5 border-t border-[#bfdbfe]/70">
                  <div className="flex items-center justify-between mb-2.5 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#1e3a8a] flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#2563eb]" />
                        Sections in Class {selectedClassName}:
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#bfdbfe]/50 text-[#1e3a8a]">
                        {sectionsForSelectedClass.length} section{sectionsForSelectedClass.length !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {selectedSection !== "all" && (
                      <button
                        onClick={() => handleSectionChange("all")}
                        className="text-[11px] font-bold text-[#2563eb] hover:underline"
                      >
                        Clear section filter (Show all {selectedClassName})
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                    {/* "All Sections" Option Card */}
                    <div
                      onClick={() => handleSectionChange("all")}
                      role="button"
                      className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                        selectedSection === "all"
                          ? "border-[#1e3a8a] bg-[#1e3a8a] text-white shadow-xs ring-2 ring-[#1e3a8a]/20"
                          : "border-[#bfdbfe] bg-[#f0f4f8]/60 hover:bg-[#f0f4f8] text-[#1e3a8a]"
                      }`}
                      title={`View all sections of Class ${selectedClassName}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">All Sections</span>
                        <span className={`text-[10px] font-semibold ${selectedSection === "all" ? "text-white/80" : "text-gray-500"}`}>
                          Class Total
                        </span>
                      </div>
                      <div className="mt-2 text-xs font-semibold">
                        {selectedClassObj?.student_count || selectedClassObj?.total_enrolled || 0} students
                      </div>
                    </div>

                    {/* Individual Section Cards */}
                    {sectionsForSelectedClass.map((sec: any) => {
                      const secId = String(sec.section_id);
                      const isSecSelected = selectedSection === secId;

                      return (
                        <div
                          key={secId}
                          onClick={() => handleSectionChange(isSecSelected ? "all" : secId)}
                          role="button"
                          className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                            isSecSelected
                              ? "border-[#2563eb] bg-[#f0f4f8] ring-2 ring-[#2563eb] shadow-xs"
                              : "border-[#bfdbfe]/80 bg-white hover:bg-[#f0f4f8]/60 hover:border-[#bfdbfe]"
                          }`}
                          title={`Click to filter by Section ${sec.section_name}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-[#0f224a]">
                              Section {sec.section_name}
                            </span>
                            <span className="text-[10px] text-gray-500 font-medium">
                              {sec.student_count || sec.total_enrolled || 0} studs
                            </span>
                          </div>

                          <div className="mt-2 flex items-baseline justify-between">
                            <span className="text-base font-black text-[#1e3a8a]">
                              {sec.has_tests !== false ? `${sec.avg_percentage}%` : "—"}
                            </span>
                            <span
                              className={`text-[10px] font-bold ${
                                sec.absent_rate > 20 ? "text-rose-600" : "text-gray-500"
                              }`}
                            >
                              {sec.has_tests !== false ? `${sec.absent_rate}% abs` : "No tests"}
                            </span>
                          </div>

                          {/* Mini progress bar */}
                          <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden mt-1.5">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min(100, sec.avg_percentage || 0)}%`,
                                background:
                                  (sec.avg_percentage || 0) >= 70
                                    ? "#2563eb"
                                    : (sec.avg_percentage || 0) >= 50
                                    ? "#d97706"
                                    : "#dc2626",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Hint when all classes are shown */}
              {selectedClass === "all" && (
                <div className="mt-3 pt-2.5 border-t border-[#bfdbfe]/40 text-xs text-[#2563eb]">
                  <span className="text-[11px] font-medium flex items-center gap-1.5">
                    <span>💡</span> Click any class card above to reveal its sections and filter section-level performance.
                  </span>
                </div>
              )}
            </>
          )}

          {/* Subject Difficulty Heatmap Pills */}
          {subjectDifficulty.length > 0 && (
            <div className="mt-4 pt-3 border-t border-[#bfdbfe]/60 flex items-center gap-2 flex-wrap text-xs">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider shrink-0">
                Subject Difficulty:
              </span>
              {selectedSubject !== "all" && (
                <button
                  type="button"
                  onClick={() => setSelectedSubject("all")}
                  className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#1e3a8a] text-white hover:bg-[#2563eb] flex items-center gap-1 transition shadow-xs cursor-pointer"
                  title="Clear subject filter and show all subjects"
                >
                  <RotateCcw className="w-3 h-3 text-amber-300" />
                  <span>All Subjects</span>
                </button>
              )}
              {subjectDifficulty.map((sub: any) => {
                const isSelected = selectedSubject === String(sub.subject_id);
                return (
                  <button
                    key={sub.subject_id}
                    type="button"
                    onClick={() => handleSubjectClick(sub.subject_id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border flex items-center gap-1.5 transition cursor-pointer active:scale-95 select-none ${
                      isSelected
                        ? "bg-[#1e3a8a] text-white border-[#1e3a8a] ring-2 ring-[#1e3a8a]/40 shadow-sm"
                        : sub.difficulty === "hard"
                        ? "bg-rose-50 text-rose-900 border-rose-300 hover:bg-rose-100 hover:border-rose-400"
                        : sub.difficulty === "medium"
                        ? "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 hover:border-amber-400"
                        : "bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400"
                    }`}
                    title={
                      isSelected
                        ? `Filtered by ${sub.subject_name}. Click to clear subject filter.`
                        : `Click to filter by ${sub.subject_name} (${sub.avg_percentage}% avg across ${sub.tests_count} tests)`
                    }
                  >
                    <span className="font-bold">{sub.subject_name}</span>
                    <span className={`font-black ${isSelected ? "text-amber-300" : ""}`}>
                      {sub.avg_percentage}%
                    </span>
                    {sub.difficulty === "hard" && (
                      <span
                        className={`text-[9px] uppercase font-bold ${
                          isSelected ? "text-rose-200" : "text-rose-700"
                        }`}
                      >
                        Hard
                      </span>
                    )}
                    {isSelected && (
                      <span className="text-[10px] font-black bg-white/20 text-white rounded-full px-1">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. Fluid Wrapped Category Tab Strip with Live Criteria Badges (No Horizontal Scroll) */}
      <div className="relative mb-6">
        <div className="flex flex-wrap items-center gap-2 pb-1">
          {categoryTabs.map((tab: any) => {
            const TabIcon = tab.icon;
            const count = counts[tab.id] ?? 0;
            const isActive = activeCategory === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => handleCategoryChange(tab.id)}
                className={`relative px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 select-none ${
                  isActive
                    ? "text-white shadow-md ring-2 ring-[#1e3a8a]/20"
                    : tab.isPrimary
                    ? "text-[#1e3a8a] hover:bg-[#f0f4f8] border-2 border-[#bfdbfe] shadow-xs"
                    : "text-[#1e3a8a] hover:bg-[#f0f4f8] border border-[#bfdbfe]"
                }`}
                style={{
                  background: isActive ? "#1e3a8a" : tab.isPrimary ? "#fdfbf9" : "#ffffff",
                }}
              >
                <TabIcon className={`w-3.5 h-3.5 ${isActive ? "text-[#bfdbfe]" : "text-[#2563eb]"}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-[#bfdbfe]/60 text-[#2563eb]"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
                <span
                  className={`text-[10px] font-black px-1.5 py-0.2 rounded-full transition ${
                    isActive
                      ? "bg-white text-[#1e3a8a]"
                      : count > 0
                      ? "bg-[#bfdbfe] text-[#1e3a8a]"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {count}
                </span>

                {/* Animated active pill glow */}
                {isActive && (
                  <motion.div
                    layoutId="activeCategoryIndicator"
                    className="absolute inset-0 rounded-xl -z-10 bg-[#1e3a8a]"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Category Header & Print Action Bar */}
      <div
        className="flex items-center justify-between gap-3 mb-4 p-3 rounded-xl border flex-wrap"
        style={{ background: "#f0f4f8", borderColor: "#bfdbfe" }}
      >
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2563eb]" />
          <div>
            <h4 className="text-xs font-bold text-[#0f224a] flex items-center gap-2 flex-wrap">
              <span>Category: {currentCategoryLabel}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#1e3a8a] text-white">
                {counts[activeCategory] ?? totalStudents} students
              </span>
              {selectedSubject !== "all" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#2563eb] text-white text-[10px] font-bold shadow-xs">
                  <span>Subject: {selectedSubjectName}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedSubject("all")}
                    className="hover:text-amber-200 ml-0.5 font-black cursor-pointer"
                    title="Clear subject filter"
                  >
                    ✕
                  </button>
                </span>
              )}
            </h4>
            <p className="text-[11px] text-gray-500">
              Filtered for {selectedClassName} • {selectedSectionName}
              {selectedSubject !== "all" ? ` • Subject: ${selectedSubjectName}` : ""}
            </p>
          </div>
        </div>

        <button
          onClick={handlePrintCategory}
          className="py-1.5 px-3 rounded-lg text-xs font-bold text-white transition flex items-center gap-1.5 shadow-xs hover:shadow-md active:scale-95 shrink-0"
          style={{
            background: "linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%)",
          }}
          title={`Generate printable PDF for ${currentCategoryLabel}`}
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print Category PDF</span>
        </button>
      </div>

      {/* 5. Main Content: Student Cards / Table View */}
      {summaryError ? (
        <div className="p-8 rounded-xl border border-rose-300 bg-rose-50 text-center">
          <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
          <p className="text-sm font-bold text-rose-900">
            Unable to synchronize academic attention metrics.
          </p>
          <button
            onClick={handleRefresh}
            className="mt-3 px-4 py-1.5 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-lg"
          >
            Retry Connection
          </button>
        </div>
      ) : isLoadingStudents ? (
        <div className="p-16 text-center">
          <div className="w-8 h-8 border-3 border-[#2563eb] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-[#2563eb]">
            Calculating performance metrics & diagnostic profiles...
          </p>
        </div>
      ) : studentList.length === 0 ? (
        <div className="p-12 text-center rounded-xl border border-[#bfdbfe] bg-[#f0f4f8]/60">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-[#0f224a]">
            No students found in this category!
          </h4>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No student matches "${searchQuery}". Try clearing search.`
              : selectedSubject !== "all"
              ? `No evaluated students found for ${selectedSubjectName} in this criteria.`
              : "All students in this filter have satisfactory records or there are no evaluations meeting these specific diagnostic criteria."}
          </p>
          <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="px-3 py-1.5 text-xs font-bold text-[#1e3a8a] bg-white border border-[#bfdbfe] rounded-lg hover:shadow-xs"
              >
                Clear Search Filter
              </button>
            )}
            {selectedSubject !== "all" && (
              <button
                onClick={() => setSelectedSubject("all")}
                className="px-3 py-1.5 text-xs font-bold text-[#1e3a8a] bg-white border border-[#bfdbfe] rounded-lg hover:shadow-xs"
              >
                Clear Subject Filter ({selectedSubjectName})
              </button>
            )}
          </div>
        </div>
      ) : viewMode === "grid" ? (
        <AnimatePresence mode="wait">
          <motion.div
            key={`${selectedClass}-${selectedSection}-${selectedSubject}-${activeCategory}-${currentPage}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {studentList.map((student) => (
              <StudentAttentionCard
                key={student.id}
                student={student}
                activeCategory={activeCategory}
                sessionId={activeSessionId}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      ) : (
        /* Dense Table View */
        <div className="overflow-x-auto rounded-xl border border-[#bfdbfe]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f0f4f8] text-[#1e3a8a] border-b border-[#bfdbfe] font-bold">
              <tr>
                <th className="p-3">Roll #</th>
                <th className="p-3">Student Name</th>
                <th className="p-3">Class & Section</th>
                <th className="p-3 text-center">Score %</th>
                <th className="p-3 text-center">Grade</th>
                <th className="p-3 text-center">Tests (Taken/Tot)</th>
                <th className="p-3">Weakest Subject</th>
                <th className="p-3">Diagnostic Note</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#bfdbfe]/60">
              {studentList.map((s) => (
                <tr key={s.id} className="hover:bg-[#f0f4f8]/50 transition">
                  <td className="p-3 font-bold text-[#1e3a8a]">
                    #{s.roll_number || "—"}
                  </td>
                  <td className="p-3">
                    <p className="font-bold text-[#0f224a]">{s.name}</p>
                    <p className="text-[10px] text-gray-500">S/D of {s.father_name}</p>
                  </td>
                  <td className="p-3 font-semibold text-gray-600">
                    {s.class_name} • {s.section_name}
                  </td>
                  <td className="p-3 text-center font-black text-sm text-[#0f224a]">
                    {s.avg_percentage}%
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`font-black px-1.5 py-0.5 rounded-sm text-[10px] uppercase ${
                        s.avg_percentage >= 70
                          ? "bg-emerald-100 text-emerald-800"
                          : s.avg_percentage >= 50
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {s.grade}
                    </span>
                  </td>
                  <td className="p-3 text-center font-semibold text-gray-600">
                    {s.tests_taken}/{s.total_tests}
                    {s.tests_absent > 0 && (
                      <span className="text-rose-600 ml-1">({s.tests_absent} abs)</span>
                    )}
                  </td>
                  <td className="p-3">
                    {s.weakest_subject ? (
                      <span className="font-medium text-rose-800">
                        {s.weakest_subject.name} ({s.weakest_subject.percentage}%)
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-3 text-[11px] text-gray-600 max-w-xs truncate">
                    {s.diagnostic_note}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <a
                        href={`/dashboard/results/student-detail?id=${s.id}&session=${activeSessionId}&class=${s.class_id || ''}&category=${s.test_category_id || 1}`}
                        className="p-1.5 rounded-md border border-[#bfdbfe] hover:bg-white text-[#1e3a8a]"
                        title="View Results"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      {s.contact_number && (
                        <button
                          onClick={() => handleTableSendAlert(s)}
                          disabled={tableSendingId === s.id}
                          className={`p-1.5 rounded-md text-white transition active:scale-95 flex items-center justify-center ${
                            tableSentIds[s.id]
                              ? "bg-emerald-700 hover:bg-emerald-800"
                              : "bg-emerald-600 hover:bg-emerald-700"
                          }`}
                          title={tableSentIds[s.id] ? "Alert Sent via WhatsApp!" : "Send WhatsApp Alert"}
                        >
                          {tableSendingId === s.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                          ) : tableSentIds[s.id] ? (
                            <Check className="w-3.5 h-3.5 text-white" />
                          ) : (
                            <MessageCircle className="w-3.5 h-3.5" />
                          )}
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

      {/* 6. Pagination Footer */}
      {lastPage > 1 && (
        <div className="flex items-center justify-between pt-5 mt-5 border-t border-[#bfdbfe]/80 text-xs">
          <p className="text-gray-500 font-medium">
            Showing Page <strong>{currentPage}</strong> of <strong>{lastPage}</strong> ({totalStudents} total students)
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="px-3 py-1.5 rounded-lg border border-[#bfdbfe] font-semibold text-[#1e3a8a] hover:bg-[#f0f4f8] disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </button>
            <span className="font-bold px-2 text-[#0f224a]">
              {currentPage} / {lastPage}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(lastPage, p + 1))}
              disabled={currentPage >= lastPage}
              className="px-3 py-1.5 rounded-lg border border-[#bfdbfe] font-semibold text-[#1e3a8a] hover:bg-[#f0f4f8] disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
      {/* 7. Customizable Performance Criteria Modal */}
      <AnimatePresence>
        {showThresholdModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl shadow-2xl border border-[#bfdbfe] max-w-lg w-full overflow-hidden"
              style={{ maxHeight: "90vh", display: "flex", flexDirection: "column" }}
            >
              {/* Modal Header */}
              <div
                className="p-5 border-b flex items-center justify-between text-white"
                style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)" }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-white/15 text-amber-300">
                    <SlidersHorizontal className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">Category Performance Criteria</h3>
                    <p className="text-xs text-white/80">
                      Customize percentage thresholds for academic classification
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowThresholdModal(false)}
                  className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6 overflow-y-auto">
                {/* Visual Spectrum Preview */}
                <div className="p-4 rounded-xl border bg-[#f0f4f8]" style={{ borderColor: "#bfdbfe" }}>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#2563eb] mb-2 flex items-center justify-between">
                    <span>Active Classification Spectrum</span>
                    <span className="text-[10px] font-medium text-gray-500">Live Preview</span>
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
                    <div className="p-2 rounded-lg bg-rose-100 text-rose-900 border border-rose-300 flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-rose-700">Attention Seeker</span>
                      <span className="text-sm font-black mt-0.5">&lt; {tempAttentionThreshold}%</span>
                    </div>
                    <div className="p-2 rounded-lg bg-blue-100 text-blue-900 border border-blue-300 flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-blue-700">Average Band</span>
                      <span className="text-sm font-black mt-0.5">{tempAttentionThreshold}% – {tempTopThreshold - 1}%</span>
                    </div>
                    <div className="p-2 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-amber-700">Top Performers</span>
                      <span className="text-sm font-black mt-0.5">≥ {tempTopThreshold}%</span>
                    </div>
                  </div>
                </div>

                {/* Slider 1: Top Performers */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#0f224a] flex items-center gap-1.5">
                      <Crown className="w-4 h-4 text-amber-600" />
                      Top Performers Threshold (≥ %)
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={tempAttentionThreshold + 1}
                        max={99}
                        value={tempTopThreshold}
                        onChange={(e) => setTempTopThreshold(Number(e.target.value))}
                        className="w-16 px-2 py-1 border rounded-lg text-center font-black text-xs text-[#1e3a8a] bg-[#f0f4f8] border-[#bfdbfe] focus:outline-hidden focus:ring-2 focus:ring-[#2563eb]"
                      />
                      <span className="text-xs font-bold text-gray-500">%</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={Math.max(50, tempAttentionThreshold + 1)}
                    max={95}
                    value={tempTopThreshold}
                    onChange={(e) => setTempTopThreshold(Number(e.target.value))}
                    className="w-full accent-[#2563eb] cursor-pointer"
                  />
                  <p className="text-[11px] text-gray-500">
                    Students scoring at or above <strong>{tempTopThreshold}%</strong> will be marked as Top Performers.
                  </p>
                </div>

                {/* Slider 2: Attention Seeker */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#0f224a] flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      Attention Seeker Cutoff (&lt; %)
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={10}
                        max={tempTopThreshold - 1}
                        value={tempAttentionThreshold}
                        onChange={(e) => setTempAttentionThreshold(Number(e.target.value))}
                        className="w-16 px-2 py-1 border rounded-lg text-center font-black text-xs text-[#1e3a8a] bg-[#f0f4f8] border-[#bfdbfe] focus:outline-hidden focus:ring-2 focus:ring-[#2563eb]"
                      />
                      <span className="text-xs font-bold text-gray-500">%</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={Math.min(75, tempTopThreshold - 1)}
                    value={tempAttentionThreshold}
                    onChange={(e) => setTempAttentionThreshold(Number(e.target.value))}
                    className="w-full accent-[#e11d48] cursor-pointer"
                  />
                  <p className="text-[11px] text-gray-500">
                    Students scoring strictly below <strong>{tempAttentionThreshold}%</strong> will be flagged as Attention Seekers.
                  </p>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-[#bfdbfe] bg-gray-50 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowThresholdModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingThresholds}
                  onClick={() => handleSaveThresholds(tempTopThreshold, tempAttentionThreshold)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white transition flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%)" }}
                >
                  {isSavingThresholds ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Save & Recalibrate</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
