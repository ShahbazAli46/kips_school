"use client";

import React, { useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import CustomDropdown from "@/components/CustomDropdown";
import {
  FileSpreadsheet,
  Printer,
  FileDown,
  Layers,
  ArrowLeft,
  Search,
  Award,
  Users,
  CheckCircle2,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import {
  useGetAcademicSessionsQuery,
  useGetClassesQuery,
  useGetTestCategoriesQuery,
  useGetSectionsQuery,
  useGetAvailableRoundsQuery,
  useGetSummarySheetResultsQuery,
} from "@/store/apiSlice";
import * as XLSX from "xlsx";

const TEST_TYPE_OPTIONS = [
  { label: "Class Test", value: "class_test" },
  { label: "School Test", value: "school_test" },
  { label: "R n T", value: "rnt" },
];

function ResultSummaryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 1. Fetch Dropdown Options via RTK Query
  const { data: sessions = [], isLoading: isLoadingSessions } = useGetAcademicSessionsQuery();
  const { data: classes = [], isLoading: isLoadingClasses } = useGetClassesQuery();
  const { data: categories = [], isLoading: isLoadingCategories } = useGetTestCategoriesQuery();
  const { data: sections = [], isLoading: isLoadingSections } = useGetSectionsQuery();

  const selectedSession = searchParams.get("session") || "";
  const selectedClass = searchParams.get("class") || "";
  const selectedType = searchParams.get("type") || "class_test";
  const selectedSection = searchParams.get("section") || "";
  const selectedCategory = searchParams.get("category") || searchParams.get("type") || "class_test";

  const selectedClassObj = classes.find((c: any) => String(c.id) === String(selectedClass));
  const availableSections: any[] =
    selectedClassObj?.sections && Array.isArray(selectedClassObj.sections) && selectedClassObj.sections.length > 0
      ? selectedClassObj.sections
      : sections;

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"sheet" | "section_summary">("sheet");

  const updateURL = (key: string, value: string, additionalParams: Record<string, string> = {}) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);

    Object.entries(additionalParams).forEach(([k, v]) => {
      if (v) params.set(k, v);
      else params.delete(k);
    });

    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const shouldFetchResults = Boolean(selectedSession && selectedClass && selectedCategory);

  // 2. Fetch Available Rounds for current session, class & category
  const { data: roundsData, isLoading: isLoadingRounds } = useGetAvailableRoundsQuery(
    {
      session: selectedSession,
      classId: selectedClass,
      category: selectedCategory,
      section: selectedSection,
    },
    { skip: !shouldFetchResults }
  );

  const availableRounds: string[] = roundsData?.rounds || [];
  const activeRounds: string[] = roundsData?.active_rounds || [];
  const roundStatuses: Record<string, { status: "completed" | "partial" | "template"; entered: number; total: number }> =
    roundsData?.round_statuses || {};

  const roundsParam = searchParams.get("rounds");

  const selectedRounds = useMemo(() => {
    if (roundsParam === "none") return [];
    if (roundsParam) {
      return roundsParam.split(",").map((r) => r.trim()).filter(Boolean);
    }
    if (selectedType === "rnt" && availableRounds.length > 0) {
      return activeRounds.length > 0 ? [activeRounds[0]] : [availableRounds[0]];
    }
    // Default to conducted rounds so unconducted empty columns are omitted unless requested
    if (activeRounds.length > 0) {
      return activeRounds;
    }
    return availableRounds;
  }, [roundsParam, availableRounds, selectedType, activeRounds]);

  const handleToggleRound = (roundName: string) => {
    let next: string[];
    if (selectedType === "rnt") {
      next = [roundName];
    } else {
      if (selectedRounds.includes(roundName)) {
        next = selectedRounds.filter((r) => r !== roundName);
      } else {
        next = [...selectedRounds, roundName];
      }
    }
    const ordered = availableRounds.filter((r) => next.includes(r));
    updateURL("rounds", ordered.length === 0 ? "none" : ordered.join(","));
  };

  const handleSelectAllRounds = () => {
    updateURL("rounds", availableRounds.join(","));
  };

  const handleSelectActiveRounds = () => {
    const active = activeRounds.length > 0 ? activeRounds : availableRounds.slice(0, 1);
    updateURL("rounds", active.join(","));
  };

  const handleClearRounds = () => {
    updateURL("rounds", "none");
  };

  const effectiveRoundsParam =
    roundsParam === "none"
      ? "none"
      : roundsParam
      ? roundsParam
      : (selectedRounds.length > 0 ? selectedRounds.join(",") : undefined);

  const roundsQueryString =
    effectiveRoundsParam === "none"
      ? "none"
      : effectiveRoundsParam
      ? effectiveRoundsParam
      : undefined;

  const roundsNavQuery =
    effectiveRoundsParam === "none"
      ? "&rounds=none"
      : effectiveRoundsParam
      ? `&rounds=${encodeURIComponent(effectiveRoundsParam)}`
      : "";

  // 3. Fetch Summary Sheet Data
  const { data: summaryData, isLoading: loadingSummary } = useGetSummarySheetResultsQuery(
    {
      session: selectedSession,
      classId: selectedClass,
      category: selectedCategory,
      type: selectedType,
      section: selectedSection,
      rounds: roundsQueryString,
    },
    { skip: !shouldFetchResults }
  );

  const filteredCategories = categories.filter((c) => c.type === selectedType);
  const sessionName = sessions.find((s) => String(s.id) === String(selectedSession))?.name || summaryData?.session?.name || "";
  const className = classes.find((c) => String(c.id) === String(selectedClass))?.name || summaryData?.class?.name || "";

  const studentsList: any[] = summaryData?.students || [];
  const subjectsList: any[] = summaryData?.subjects || [];
  const roundsList: string[] = summaryData?.rounds || [];
  const grandTotalMax = summaryData?.grand_total_max || 0;

  // Filter students based on search query
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return studentsList;
    const q = searchQuery.toLowerCase().trim();
    return studentsList.filter(
      (s) =>
        s.student_name?.toLowerCase().includes(q) ||
        String(s.roll_number || "").toLowerCase().includes(q) ||
        s.father_name?.toLowerCase().includes(q)
    );
  }, [studentsList, searchQuery]);

  // Summary Metrics
  const totalStudents = studentsList.length;
  const passedStudents = studentsList.filter((s) => s.grade && s.grade !== "Fail" && s.grade !== "-").length;
  const avgPercentage =
    totalStudents > 0
      ? (studentsList.reduce((acc, s) => acc + (s.percentage || 0), 0) / totalStudents).toFixed(1)
      : "0";
  const topStudent = studentsList.find((s) => s.position === 1 || s.position === "1") || studentsList[0];

  // Section Summary Analytics & Grade Distribution
  const analytics = useMemo(() => {
    if (summaryData?.analytics?.grade_breakdown && summaryData?.analytics?.subject_performance) {
      return {
        gradeBreakdown: summaryData.analytics.grade_breakdown.map((g: any) => ({
          grade: g.grade,
          scoreRange: g.score_range,
          count: g.count,
          percentage: typeof g.percentage === "number" ? `${g.percentage.toFixed(1)}%` : g.percentage,
        })),
        subjectPerformance: summaryData.analytics.subject_performance.map((s: any) => ({
          subject_name: s.subject_name,
          total_marks: s.total_marks,
          class_avg_score: typeof s.class_avg_score === "number" ? s.class_avg_score.toFixed(1) : s.class_avg_score,
          avg_percentage: typeof s.avg_percentage === "number" ? `${s.avg_percentage.toFixed(1)}%` : s.avg_percentage,
          pass_rate: typeof s.pass_rate === "number" ? `${s.pass_rate.toFixed(1)}%` : s.pass_rate,
        })),
        totalAppeared: summaryData.analytics.total_appeared || studentsList.length,
      };
    }

    // Client computation fallback
    const appeared = studentsList.filter((s: any) => (s.grand_total_max || 0) > 0);
    const totalAppeared = appeared.length;

    const tiers = [
      { grade: "A+", scoreRange: "90% and Above", min: 90, max: 1000 },
      { grade: "A", scoreRange: "80% to 89.9%", min: 80, max: 89.999 },
      { grade: "B", scoreRange: "70% to 79.9%", min: 70, max: 79.999 },
      { grade: "C", scoreRange: "60% to 69.9%", min: 60, max: 69.999 },
      { grade: "D", scoreRange: "40% to 59.9%", min: 40, max: 59.999 },
      { grade: "Fail", scoreRange: "Below 40%", min: -1, max: 39.999 },
    ];

    const gradeBreakdown = tiers.map((tier) => {
      const count = appeared.filter((s: any) => {
        const pct = parseFloat(s.percentage || 0);
        if (tier.grade === "A+") return pct >= 90;
        if (tier.grade === "Fail") return pct < 40;
        return pct >= tier.min && pct <= tier.max;
      }).length;
      const pct = totalAppeared > 0 ? ((count / totalAppeared) * 100).toFixed(1) : "0.0";
      return {
        grade: tier.grade,
        scoreRange: tier.scoreRange,
        count,
        percentage: `${pct}%`,
      };
    });

    gradeBreakdown.push({
      grade: "Total",
      scoreRange: "All Appeared",
      count: totalAppeared,
      percentage: "100.0%",
    });

    const subjectPerformance = subjectsList.map((sub: any) => {
      const subId = sub.id;
      const totalMarks = sub.total_max_marks || 0;
      const subStudents = studentsList.filter((s: any) => s.subjects?.[subId] && s.subjects[subId].total_max > 0);
      const count = subStudents.length;
      const sumObtained = subStudents.reduce((acc: number, s: any) => acc + (s.subjects[subId].total_obtained || 0), 0);
      const passedCount = subStudents.filter((s: any) => (s.subjects[subId].percentage || 0) >= 40).length;

      const classAvgScore = count > 0 ? (sumObtained / count).toFixed(1) : "0.0";
      const avgPct = totalMarks > 0 ? ((parseFloat(classAvgScore) / totalMarks) * 100).toFixed(1) : "0.0";
      const passRate = count > 0 ? ((passedCount / count) * 100).toFixed(1) : "0.0";

      return {
        subject_name: sub.name,
        total_marks: totalMarks,
        class_avg_score: classAvgScore,
        avg_percentage: `${avgPct}%`,
        pass_rate: `${passRate}%`,
      };
    });

    return {
      gradeBreakdown,
      subjectPerformance,
      totalAppeared,
    };
  }, [summaryData, studentsList, subjectsList]);

  // Excel Export Handler for Section Summary
  const handleExportSectionExcel = () => {
    try {
      const rows: any[][] = [];
      rows.push(["RESULT ANALYTICS & GRADE DISTRIBUTION"]);
      rows.push([
        `Class: ${className}`,
        `Session: ${sessionName}`,
        `Section: ${selectedSection && selectedSection !== "all" ? selectedSection : "All"}`,
        `Total Students: ${analytics.totalAppeared}`,
      ]);
      rows.push([]);



      // Subject-Wise Performance Analysis Table
      rows.push(["Subject-Wise Performance Analysis"]);
      rows.push(["Subject", "Total Marks", "Class Avg Score", "Avg %", "Pass Rate (%)"]);
      analytics.subjectPerformance.forEach((s: any) => {
        rows.push([s.subject_name, s.total_marks, s.class_avg_score, s.avg_percentage, s.pass_rate]);
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Section Summary");
      XLSX.writeFile(
        wb,
        `Section_Summary_${className.replace(/\s+/g, "_")}_${sessionName.replace(/\s+/g, "_")}.xlsx`
      );
    } catch (err: any) {
      alert(`Excel export failed: ${err.message}`);
    }
  };

  // Excel Export Handler (exact 2.xlsx Summary Sheet reproduction)
  const handleExportExcel = () => {
    if (!summaryData || subjectsList.length === 0 || studentsList.length === 0) {
      alert("No summary data to export.");
      return;
    }

    try {
      const rows: any[][] = [];

      // Row 1: Empty
      rows.push([]);

      // Row 2: Title
      const row2: any[] = [`Summary Sheet Class: ${className}`];
      // Pad to col 23 (X)
      while (row2.length < 23) row2.push("");
      row2.push(`(Session ${sessionName})`);
      rows.push(row2);

      // Row 3: Subject row
      const row3: any[] = ["Roll No", "Student's Name", "Subject"];
      const merges: any[] = [
        { s: { r: 1, c: 0 }, e: { r: 1, c: 22 } }, // A2:W2
        { s: { r: 1, c: 23 }, e: { r: 1, c: 23 + subjectsList.length * 9 + 4 } }, // X2:...
        { s: { r: 2, c: 0 }, e: { r: 6, c: 0 } }, // A3:A7 Roll No
        { s: { r: 2, c: 1 }, e: { r: 6, c: 1 } }, // B3:B7 Student's Name
      ];

      let colIdx = 3;
      subjectsList.forEach((sub: any) => {
        row3.push(sub.name);
        const subColsCount = (sub.rounds?.length || roundsList.length) + 3; // rounds + TM + % + Grade
        merges.push({ s: { r: 2, c: colIdx }, e: { r: 2, c: colIdx + subColsCount - 1 } });
        for (let i = 1; i < subColsCount; i++) row3.push("");
        row3.push(""); // blank separator col
        colIdx += subColsCount + 1;
      });

      // Total group in row 3
      row3.push("Total");
      merges.push({ s: { r: 2, c: colIdx }, e: { r: 3, c: colIdx + 3 } });
      rows.push(row3);

      // Row 4: Blank placeholder row
      rows.push([]);

      // Row 5: Round # row
      const row5: any[] = ["", "", "Round #"];
      subjectsList.forEach((sub: any) => {
        (sub.rounds || []).forEach((r: any) => {
          row5.push(r.short_title || r.round_title);
        });
        row5.push("T.M");
        row5.push("%");
        row5.push("Grade");
        row5.push(""); // separator
      });
      row5.push("T.M", "% age", "Grade", "Position");
      rows.push(row5);

      // Row 6: Conduction Date row
      const row6: any[] = ["", "", "Conduction Date"];
      subjectsList.forEach((sub: any) => {
        (sub.rounds || []).forEach((r: any) => {
          row6.push(r.date || "");
        });
        row6.push("");
        row6.push("");
        row6.push("");
        row6.push(""); // separator
      });
      row6.push("", "", "", "");
      rows.push(row6);

      // Row 7: Total Marks row
      const row7: any[] = ["", "", "Total Marks"];
      subjectsList.forEach((sub: any) => {
        (sub.rounds || []).forEach((r: any) => {
          row7.push(r.max_marks || "");
        });
        row7.push(sub.total_max_marks || 0);
        row7.push("");
        row7.push("");
        row7.push(""); // separator
      });
      row7.push(grandTotalMax, "", "", "");
      rows.push(row7);

      // Rows 8+: Student Data rows
      studentsList.forEach((student: any) => {
        const sRow: any[] = [student.roll_number || "", student.student_name || "", ""];
        subjectsList.forEach((sub: any) => {
          const subData = student.subjects?.[sub.id];
          (sub.rounds || []).forEach((r: any, rIdx: number) => {
            const rData = subData?.rounds?.[rIdx];
            if (rData?.is_absent) {
              sRow.push("A");
            } else if (rData?.obtained_marks !== null && rData?.obtained_marks !== undefined) {
              sRow.push(rData.obtained_marks);
            } else {
              sRow.push("");
            }
          });
          sRow.push(subData?.total_obtained ?? "");
          sRow.push(subData?.total_max > 0 ? (subData.percentage / 100).toFixed(2) : "");
          sRow.push(subData?.grade ?? "");
          sRow.push(""); // separator
        });

        // Total columns
        sRow.push(student.grand_total_obtained ?? "");
        sRow.push(student.grand_total_max > 0 ? (student.percentage / 100).toFixed(2) : "");
        sRow.push(student.grade ?? "");
        sRow.push(student.position ?? "");
        rows.push(sRow);
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws["!merges"] = merges;
      XLSX.utils.book_append_sheet(wb, ws, "Summary Sheet");
      XLSX.writeFile(wb, `Summary_Sheet_${className.replace(/\s+/g, "_")}_${sessionName.replace(/\s+/g, "_")}.xlsx`);
    } catch (err: any) {
      alert(`Export error: ${err.message}`);
    }
  };

  const printUrl = `/dashboard/results/summary/print?session=${selectedSession}&class=${selectedClass}&category=${selectedCategory}&type=${selectedType}${
    selectedSection && selectedSection !== "all" ? "&section=" + selectedSection : ""
  }&session_name=${encodeURIComponent(sessionName)}&class_name=${encodeURIComponent(className)}${roundsNavQuery}`;

  const printSectionUrl = `/dashboard/results/summary/section-summary/print?session=${selectedSession}&class=${selectedClass}&category=${selectedCategory}&type=${selectedType}${
    selectedSection && selectedSection !== "all" ? "&section=" + selectedSection : ""
  }&session_name=${encodeURIComponent(sessionName)}&class_name=${encodeURIComponent(className)}${roundsNavQuery}`;

  return (
    <DashboardLayout>
      {/* Top Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => router.push(`/dashboard/results?${searchParams.toString()}`)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
              title="Back to Series Results"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold text-[#0f224a] flex items-center gap-2">
              <FileSpreadsheet className="w-7 h-7 text-[#2563eb]" />
              Result Summary Sheet
            </h2>
          </div>
          <p className="text-sm text-[#2563eb] ml-8">
            Complete institutional multi-round summary breakdown with conduction dates, subject totals, and class ranks.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab(activeTab === "section_summary" ? "sheet" : "section_summary")}
            disabled={!summaryData || studentsList.length === 0}
            className={`transition px-4 py-2.5 rounded-xl shadow-md font-semibold flex items-center gap-2 active:scale-95 disabled:opacity-50 ${
              activeTab === "section_summary"
                ? "bg-[#0f224a] text-white hover:bg-slate-900"
                : "bg-indigo-600 text-white hover:bg-indigo-700"
            }`}
            title="Toggle Section Analytics & Grade Distribution"
          >
            <BarChart3 className="w-4 h-4" />
            {activeTab === "section_summary" ? "Full Sheet" : "Section Summary"}
          </button>

          <button
            onClick={activeTab === "section_summary" ? handleExportSectionExcel : handleExportExcel}
            disabled={!summaryData || studentsList.length === 0}
            className="bg-emerald-600 text-white hover:bg-emerald-700 transition px-4 py-2.5 rounded-xl shadow-sm font-semibold flex items-center gap-2 active:scale-95 disabled:opacity-50"
            title="Download formatted Excel file"
          >
            <FileDown className="w-4 h-4" />
            Export Excel (.xlsx)
          </button>

          <a
            href={activeTab === "section_summary" ? printSectionUrl : printUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`bg-[#2563eb] text-white hover:bg-[#1e40af] transition px-4 py-2.5 rounded-xl shadow-md font-semibold flex items-center gap-2 active:scale-95 ${
              !summaryData || studentsList.length === 0 ? "pointer-events-none opacity-50" : ""
            }`}
          >
            <Printer className="w-4 h-4" />
            {activeTab === "section_summary" ? "Print Section Summary" : "Print Summary Sheet"}
          </a>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#bfdbfe] mb-6 flex flex-wrap gap-4 items-end">
        <div className="w-56">
          <label className="block text-xs font-bold text-[#2563eb] uppercase tracking-wide mb-1">Session</label>
          <CustomDropdown
            name="session"
            value={selectedSession}
            onChange={(name, val) => {
              updateURL("session", val as string, { category: selectedType, rounds: "" });
            }}
            placeholder="Select Session"
            options={sessions.map((s) => ({ label: s.name, value: s.id }))}
          />
        </div>
        <div className="w-48">
          <label className="block text-xs font-bold text-[#2563eb] uppercase tracking-wide mb-1">Class</label>
          <CustomDropdown
            name="class"
            value={selectedClass}
            onChange={(name, val) => {
              updateURL("class", val as string, { category: selectedType, section: "", rounds: "" });
            }}
            placeholder="Select Class"
            options={classes.map((c) => ({ label: c.name, value: c.id }))}
          />
        </div>
        <div className="w-56">
          <label className="block text-xs font-bold text-[#2563eb] uppercase tracking-wide mb-1">Type</label>
          <CustomDropdown
            name="type"
            value={selectedType}
            onChange={(name, val) => {
              updateURL("type", val as string, { category: val as string, section: "", rounds: "" });
            }}
            placeholder="Select Type"
            options={TEST_TYPE_OPTIONS}
          />
        </div>
        {selectedClass && (
          <div className="w-48">
            <label className="block text-xs font-bold text-[#2563eb] uppercase tracking-wide mb-1">Section</label>
            <CustomDropdown
              name="section"
              value={selectedSection}
              onChange={(name, val) => {
                updateURL("section", val as string);
              }}
              placeholder="All Sections"
              options={[
                { label: "All Sections", value: "all" },
                ...availableSections.map((s: any) => ({ label: s.name, value: String(s.id) })),
              ]}
            />
          </div>
        )}
      </div>

      {/* Category Pills & Test Rounds Filter */}
      {selectedSession && selectedClass && (
        <div className="mb-6 space-y-4">
          {/* Categories Pills */}
          <div className="flex flex-wrap gap-2">
            {filteredCategories.length > 0 && (
              <button
                onClick={() => updateURL("category", selectedType, { rounds: "" })}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                  selectedCategory === selectedType
                    ? "bg-[#2563eb] text-white shadow-md"
                    : "bg-white text-[#1e40af] border border-[#bfdbfe] hover:bg-blue-50"
                }`}
              >
                All Categories
              </button>
            )}
            {filteredCategories.map((c) => (
              <button
                key={c.id}
                onClick={() => updateURL("category", c.id.toString(), { rounds: "" })}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                  selectedCategory === c.id.toString()
                    ? "bg-[#2563eb] text-white shadow-md"
                    : "bg-white text-[#1e40af] border border-[#bfdbfe] hover:bg-blue-50"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* Test Rounds Checkbox Selector */}
          {availableRounds.length > 0 && (
            <div className="bg-white p-4 rounded-xl shadow-xs border border-[#bfdbfe]">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#2563eb]" />
                  <span className="text-xs font-bold text-[#0f224a] uppercase tracking-wider">
                    {selectedType === "rnt" ? "R n T Round Selection:" : "Rounds Included in Summary:"}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    ({selectedRounds.length} of {availableRounds.length} selected)
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={handleSelectAllRounds}
                    className="px-2.5 py-1 rounded-md text-xs font-bold text-[#2563eb] bg-blue-50 hover:bg-blue-100 border border-blue-200 transition active:scale-95"
                  >
                    Select All
                  </button>
                  {activeRounds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleSelectActiveRounds}
                      className="px-2.5 py-1 rounded-md text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition active:scale-95"
                    >
                      Conducted Only ({activeRounds.length})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleClearRounds}
                    className="px-2.5 py-1 rounded-md text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition active:scale-95"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {availableRounds.map((round, rIdx) => {
                  const isChecked = selectedRounds.includes(round);
                  const roundInfo = roundStatuses[round];
                  const status = roundInfo?.status || (activeRounds.includes(round) ? "partial" : "template");

                  return (
                    <label
                      key={`${round}-${rIdx}`}
                      onClick={(e) => {
                        e.preventDefault();
                        handleToggleRound(round);
                      }}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all border select-none ${
                        isChecked
                          ? "bg-blue-50 border-[#2563eb] text-[#1e40af] shadow-xs ring-1 ring-[#2563eb]/20"
                          : "bg-slate-50/70 border-slate-200 text-slate-500 hover:bg-slate-100/70 hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded border-slate-300 text-[#2563eb] focus:ring-[#2563eb] w-3.5 h-3.5 pointer-events-none"
                      />
                      <span className="font-extrabold tracking-wide text-xs">{round}</span>
                      {status === "completed" && (
                        <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                          Done
                        </span>
                      )}
                      {status === "partial" && (
                        <span className="bg-amber-100 text-amber-900 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                          Partial
                        </span>
                      )}
                      {status === "template" && (
                        <span className="bg-slate-200 text-slate-600 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                          Template
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* KPI Cards when data loaded */}
      {summaryData && studentsList.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#2563eb] flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-black text-slate-800">{totalStudents}</div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Students</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-black text-emerald-700">{passedStudents}</div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Passed Students</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-black text-indigo-700">{avgPercentage}%</div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Class Average</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-extrabold text-slate-800 truncate max-w-[130px]">
                {topStudent?.student_name || "N/A"}
              </div>
              <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">
                Position #1 ({topStudent?.percentage || 0}%)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading & Empty States */}
      {loadingSummary && (
        <div className="bg-white rounded-2xl border border-blue-100 p-16 text-center shadow-xs">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h3 className="text-base font-bold text-slate-800">Calculating Summary Sheet...</h3>
          <p className="text-xs text-slate-500 mt-1">Cross-referencing all subjects, test rounds, and student marks.</p>
        </div>
      )}

      {!loadingSummary && (!selectedSession || !selectedClass) && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-16 text-center">
          <FileSpreadsheet className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">Select Session & Class</h3>
          <p className="text-xs text-slate-400 mt-1">Please select an academic session and class above to generate the result summary sheet.</p>
        </div>
      )}

      {!loadingSummary && shouldFetchResults && studentsList.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center text-slate-500">
          No tests or students found for the selected series.
        </div>
      )}

      {/* View Switcher Tabs (Full Sheet vs Section Summary) */}
      {!loadingSummary && summaryData && studentsList.length > 0 && (
        <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-3">
          <button
            onClick={() => setActiveTab("sheet")}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition ${
              activeTab === "sheet"
                ? "bg-[#0f224a] text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Detailed Multi-Round Summary Sheet
          </button>
          <button
            onClick={() => setActiveTab("section_summary")}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition ${
              activeTab === "section_summary"
                ? "bg-[#1e40af] text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Section Summary (Analytics &amp; Grades)
          </button>
        </div>
      )}

      {/* Section Summary View (RESULT ANALYTICS & GRADE DISTRIBUTION) */}
      {!loadingSummary && summaryData && studentsList.length > 0 && activeTab === "section_summary" && (
        <div className="bg-white rounded-2xl border border-[#bfdbfe] shadow-md p-6 md:p-8 mb-8">
          {/* Top Banner */}
          <div className="border-b-2 border-slate-800 pb-4 mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-[#1e40af] tracking-wide uppercase font-serif mb-1">
                RESULT ANALYTICS &amp; GRADE DISTRIBUTION
              </h3>
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-600">
                <span>Class: <strong className="text-slate-900 uppercase">{className}</strong></span>
                <span>•</span>
                <span>Session: <strong className="text-slate-900">{sessionName}</strong></span>
                <span>•</span>
                <span>Section: <strong className="text-slate-900 uppercase">{selectedSection && selectedSection !== "all" ? selectedSection : "All"}</strong></span>
                {summaryData.class_incharge && (
                  <>
                    <span>•</span>
                    <span>Class Incharge: <strong className="text-[#1e40af]">{summaryData.class_incharge}</strong></span>
                  </>
                )}
                <span>•</span>
                <span>Total Students: <strong className="text-slate-900">{analytics.totalAppeared}</strong></span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportSectionExcel}
                className="px-3.5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <FileDown className="w-3.5 h-3.5" />
                Export Excel
              </button>
              <a
                href={printSectionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-[#1e40af] text-white rounded-xl text-xs font-bold hover:bg-[#1e3a8a] transition flex items-center gap-1.5 shadow-md active:scale-95"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Sheet
              </a>
            </div>
          </div>

          {/* Subject-Wise Performance Analysis Table */}
          <div>
            <h4 className="text-sm font-black text-[#1e40af] uppercase tracking-wide mb-2.5">
              Subject-Wise Performance Analysis
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full max-w-3xl border-collapse border border-slate-400 text-xs">
                <thead>
                  <tr className="bg-[#1b4d89] text-white">
                    <th className="border border-slate-400 px-4 py-2 text-left font-bold tracking-wider">
                      Subject
                    </th>
                    <th className="border border-slate-400 px-3 py-2 text-center font-bold tracking-wider w-24">
                      Total Marks
                    </th>
                    <th className="border border-slate-400 px-3 py-2 text-center font-bold tracking-wider w-28">
                      Class Avg Score
                    </th>
                    <th className="border border-slate-400 px-3 py-2 text-center font-bold tracking-wider w-24">
                      Avg %
                    </th>
                    <th className="border border-slate-400 px-3 py-2 text-center font-bold tracking-wider w-28">
                      Pass Rate (%)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.subjectPerformance.map((row: any, idx: number) => (
                    <tr
                      key={idx}
                      className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}
                    >
                      <td className="border border-slate-300 px-4 py-1.5 font-bold text-slate-800">
                        {row.subject_name}
                      </td>
                      <td className="border border-slate-300 px-3 py-1.5 text-center font-semibold text-slate-700">
                        {row.total_marks}
                      </td>
                      <td className="border border-slate-300 px-3 py-1.5 text-center font-bold text-slate-900">
                        {row.class_avg_score}
                      </td>
                      <td className="border border-slate-300 px-3 py-1.5 text-center font-bold text-blue-900">
                        {row.avg_percentage}
                      </td>
                      <td
                        className={`border border-slate-300 px-3 py-1.5 text-center font-black ${
                          parseFloat(row.pass_rate) >= 90
                            ? "text-emerald-700"
                            : parseFloat(row.pass_rate) >= 75
                            ? "text-blue-700"
                            : "text-rose-600"
                        }`}
                      >
                        {row.pass_rate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Interactive 2.xlsx Summary Sheet Table Preview */}
      {!loadingSummary && summaryData && studentsList.length > 0 && activeTab === "sheet" && (
        <div className="bg-white rounded-2xl border border-[#bfdbfe] shadow-md overflow-hidden mb-8">
          {/* Table Header Bar */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="text-sm font-black text-[#0f224a]">
                Summary Sheet: <span className="text-[#2563eb]">{className}</span>
              </div>
              <span className="text-xs text-slate-400 font-semibold">•</span>
              <div className="text-xs text-slate-600 font-bold">{sessionName}</div>
              {summaryData.class_incharge && (
                <>
                  <span className="text-xs text-slate-400 font-semibold">•</span>
                  <div className="text-xs text-blue-800 font-bold bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
                    Incharge: {summaryData.class_incharge}
                  </div>
                </>
              )}
            </div>

            {/* Student Search */}
            <div className="relative w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search student or roll no..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-white font-medium"
              />
            </div>
          </div>

          {/* Horizontally Scrollable Table Container */}
          <div className="overflow-x-auto max-h-[70vh] border-b border-slate-200 select-text">
            <table className="border-collapse text-[11px] font-sans text-slate-900 w-full min-w-[1200px]">
              <thead className="sticky top-0 z-20 shadow-xs">
                {/* Row 3: Subject Name Row */}
                <tr className="bg-white text-black font-bold">
                  <th
                    rowSpan={3}
                    className="border border-slate-400 px-2 py-1 text-center bg-slate-100 min-w-[50px] sticky left-0 z-30"
                  >
                    Roll No
                  </th>
                  <th
                    rowSpan={3}
                    className="border border-slate-400 px-3 py-1 text-left bg-slate-100 min-w-[170px] sticky left-[50px] z-30"
                  >
                    Student's Name
                  </th>
                  <th className="border border-slate-400 px-2 py-1 bg-[#d8d8d8] text-slate-900 font-black text-center min-w-[90px]">
                    Subject
                  </th>
                  {subjectsList.map((sub: any) => {
                    const colSpan = (sub.rounds?.length || roundsList.length) + 3;
                    return (
                      <React.Fragment key={sub.id}>
                        <th
                          colSpan={colSpan}
                          className="border border-slate-400 px-2 py-1 text-center uppercase tracking-wider font-extrabold text-xs bg-slate-50 text-slate-900"
                        >
                          {sub.name}
                        </th>
                        <th className="border-y border-slate-300 bg-amber-100/60 w-2 p-0 min-w-[8px]" />
                      </React.Fragment>
                    );
                  })}
                  <th
                    colSpan={4}
                    className="border border-slate-400 px-2 py-1 text-center uppercase font-black tracking-wider text-xs bg-amber-200/70 text-slate-900"
                  >
                    Total
                  </th>
                </tr>

                {/* Row 5: Round # Headers Row */}
                <tr className="bg-[#99ccff] text-slate-900 font-bold">
                  <th className="border border-slate-400 px-1 py-1 bg-[#d8d8d8] text-slate-900 text-center font-black">
                    Round #
                  </th>
                  {subjectsList.map((sub: any) => (
                    <React.Fragment key={sub.id}>
                      {(sub.rounds || []).map((r: any, rIdx: number) => (
                        <th
                          key={rIdx}
                          className="border border-slate-400 px-1.5 py-1 text-center font-extrabold text-[10px] bg-[#99ccff] min-w-[42px]"
                        >
                          {r.short_title || `R-${rIdx + 1}`}
                        </th>
                      ))}
                      <th className="border border-slate-400 px-1.5 py-1 text-center font-black text-[10px] bg-[#99ccff] min-w-[42px]">
                        T.M
                      </th>
                      <th className="border border-slate-400 px-1 py-1 text-center font-black text-[10px] bg-[#99ccff] min-w-[40px]">
                        %
                      </th>
                      <th className="border border-slate-400 px-1 py-1 text-center font-black text-[10px] bg-[#99ccff] min-w-[42px]">
                        Grade
                      </th>
                      <th className="border-y border-slate-300 bg-amber-100/60 w-2 p-0 min-w-[8px]" />
                    </React.Fragment>
                  ))}
                  <th className="border border-slate-400 px-1.5 py-1 text-center font-black text-[10px] bg-[#99ccff] min-w-[46px]">
                    T.M
                  </th>
                  <th className="border border-slate-400 px-1.5 py-1 text-center font-black text-[10px] bg-[#99ccff] min-w-[46px]">
                    % age
                  </th>
                  <th className="border border-slate-400 px-1 py-1 text-center font-black text-[10px] bg-[#99ccff] min-w-[42px]">
                    Grade
                  </th>
                  <th className="border border-slate-400 px-1 py-1 text-center font-black text-[10px] bg-[#99ccff] min-w-[50px]">
                    Position
                  </th>
                </tr>

                {/* Row 6: Conduction Date Row */}
                <tr className="bg-white text-slate-700 font-semibold text-[10px]">
                  <th className="border border-slate-400 px-1 py-0.5 bg-[#d8d8d8] text-slate-900 text-center font-black">
                    Conduction Date
                  </th>
                  {subjectsList.map((sub: any) => (
                    <React.Fragment key={sub.id}>
                      {(sub.rounds || []).map((r: any, rIdx: number) => (
                        <th
                          key={rIdx}
                          className="border border-slate-400 px-1 py-0.5 text-center text-[9px] font-bold text-slate-700"
                        >
                          {r.date || "-"}
                        </th>
                      ))}
                      <th className="border border-slate-400 bg-slate-100" />
                      <th className="border border-slate-400 bg-slate-100" />
                      <th className="border border-slate-400 bg-slate-100" />
                      <th className="border-y border-slate-300 bg-amber-100/60 w-2 p-0 min-w-[8px]" />
                    </React.Fragment>
                  ))}
                  <th className="border border-slate-400 bg-slate-100" />
                  <th className="border border-slate-400 bg-slate-100" />
                  <th className="border border-slate-400 bg-slate-100" />
                  <th className="border border-slate-400 bg-slate-100" />
                </tr>

                {/* Row 7: Total Marks Row */}
                <tr className="bg-white text-slate-900 font-bold text-[10px]">
                  <th className="border border-slate-400 px-1 py-0.5 bg-slate-100 sticky left-0 z-30" />
                  <th className="border border-slate-400 px-1 py-0.5 bg-slate-100 sticky left-[50px] z-30" />
                  <th className="border border-slate-400 px-1 py-0.5 bg-[#d8d8d8] text-slate-900 text-center font-black">
                    Total Marks
                  </th>
                  {subjectsList.map((sub: any) => (
                    <React.Fragment key={sub.id}>
                      {(sub.rounds || []).map((r: any, rIdx: number) => (
                        <th
                          key={rIdx}
                          className="border border-slate-400 px-1 py-0.5 text-center font-bold text-slate-800"
                        >
                          {r.max_marks || "-"}
                        </th>
                      ))}
                      {/* Subject T.M with black background & bold white text matching 2.xlsx */}
                      <th className="border border-slate-400 px-1 py-0.5 text-center bg-black text-white font-black">
                        {sub.total_max_marks || 0}
                      </th>
                      <th className="border border-slate-400 bg-slate-100" />
                      <th className="border border-slate-400 bg-slate-100" />
                      <th className="border-y border-slate-300 bg-amber-100/60 w-2 p-0 min-w-[8px]" />
                    </React.Fragment>
                  ))}
                  {/* Grand Total Marks with black background & bold white text */}
                  <th className="border border-slate-400 px-1 py-0.5 text-center bg-black text-white font-black">
                    {grandTotalMax}
                  </th>
                  <th className="border border-slate-400 bg-slate-100" />
                  <th className="border border-slate-400 bg-slate-100" />
                  <th className="border border-slate-400 bg-slate-100" />
                </tr>
              </thead>

              {/* Rows 8+: Student Data Rows */}
              <tbody className="divide-y divide-slate-300">
                {filteredStudents.map((student: any, sIdx: number) => {
                  const isTop3 = student.position === 1 || student.position === 2 || student.position === 3;
                  return (
                    <tr
                      key={student.student_id}
                      className={`hover:bg-blue-50/80 transition-colors ${
                        sIdx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                      }`}
                    >
                      {/* Roll No */}
                      <td className="border border-slate-400 px-2 py-1 text-center font-bold sticky left-0 bg-inherit z-10 text-slate-900">
                        {student.roll_number || sIdx + 1}
                      </td>

                      {/* Student Name */}
                      <td className="border border-slate-400 px-3 py-1 font-semibold text-slate-900 sticky left-[50px] bg-inherit z-10 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {student.position === 1 && <span className="text-amber-500 font-black">🥇</span>}
                          {student.position === 2 && <span className="text-slate-400 font-black">🥈</span>}
                          {student.position === 3 && <span className="text-amber-700 font-black">🥉</span>}
                          <span>{student.student_name}</span>
                        </div>
                      </td>

                      {/* Blank Subject Col */}
                      <td className="border border-slate-400 px-1 py-1 text-center text-slate-400 text-[10px]">
                        {student.section_name || ""}
                      </td>

                      {/* Subject Marks Columns */}
                      {subjectsList.map((sub: any) => {
                        const subData = student.subjects?.[sub.id];
                        return (
                          <React.Fragment key={sub.id}>
                            {(sub.rounds || []).map((r: any, rIdx: number) => {
                              const rData = subData?.rounds?.[rIdx];
                              return (
                                <td
                                  key={rIdx}
                                  className={`border border-slate-400 px-1 py-1 text-center font-bold ${
                                    rData?.is_absent ? "text-red-500 bg-red-50/60" : "text-slate-900"
                                  }`}
                                >
                                  {rData?.is_absent
                                    ? "A"
                                    : rData?.obtained_marks !== null && rData?.obtained_marks !== undefined
                                    ? rData.obtained_marks
                                    : "-"}
                                </td>
                              );
                            })}
                            {/* Subject T.M */}
                            <td className="border border-slate-400 px-1 py-1 text-center font-extrabold text-blue-900 bg-blue-50/30">
                              {subData?.total_obtained ?? "-"}
                            </td>
                            {/* Subject % */}
                            <td className="border border-slate-400 px-1 py-1 text-center font-semibold text-slate-700 text-[10px]">
                              {subData?.total_max > 0 ? `${Math.round(subData.percentage)}%` : "-"}
                            </td>
                            {/* Subject Grade */}
                            <td
                              className={`border border-slate-400 px-1 py-1 text-center font-black text-[10px] ${
                                subData?.grade === "A+"
                                  ? "text-emerald-700 bg-emerald-50/40"
                                  : subData?.grade === "A"
                                  ? "text-green-700"
                                  : subData?.grade === "Fail"
                                  ? "text-rose-600 bg-rose-50/40"
                                  : "text-slate-800"
                              }`}
                            >
                              {subData?.grade ?? "-"}
                            </td>
                            {/* Separator Col */}
                            <td className="border-y border-slate-300 bg-amber-100/60 w-2 p-0 min-w-[8px]" />
                          </React.Fragment>
                        );
                      })}

                      {/* Grand Total Obtained */}
                      <td className="border border-slate-400 px-1.5 py-1 text-center font-black text-indigo-950 bg-indigo-50/40">
                        {student.grand_total_obtained}
                      </td>

                      {/* Grand Total % */}
                      <td className="border border-slate-400 px-1.5 py-1 text-center font-extrabold text-slate-800 text-[10px]">
                        {student.percentage}%
                      </td>

                      {/* Grand Total Grade */}
                      <td
                        className={`border border-slate-400 px-1 py-1 text-center font-black text-[10px] ${
                          student.grade === "A+"
                            ? "text-emerald-700 bg-emerald-100/50"
                            : student.grade === "A"
                            ? "text-emerald-600"
                            : student.grade === "Fail"
                            ? "text-rose-600 bg-rose-100/50"
                            : "text-slate-800"
                        }`}
                      >
                        {student.grade}
                      </td>

                      {/* Position / Rank */}
                      <td
                        className={`border border-slate-400 px-1.5 py-1 text-center font-black ${
                          isTop3 ? "text-amber-700 bg-amber-50 font-black" : "text-slate-700"
                        }`}
                      >
                        {student.position || "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer Summary Bar */}
          <div className="p-3 bg-slate-50 text-xs font-semibold text-slate-500 flex flex-wrap items-center justify-between gap-2">
            <div>
              Showing {filteredStudents.length} of {totalStudents} students
            </div>
            <div className="flex items-center gap-4 text-slate-600">
              <span>
                Grand Total Marks: <strong className="text-black font-extrabold">{grandTotalMax}</strong>
              </span>
              <span>
                Overall Class Average: <strong className="text-[#2563eb] font-extrabold">{avgPercentage}%</strong>
              </span>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default function ResultSummaryPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center font-medium">Loading Result Summary...</div>}>
      <ResultSummaryContent />
    </Suspense>
  );
}
