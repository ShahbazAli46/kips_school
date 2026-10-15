"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Printer, X, FileDown } from "lucide-react";
import * as XLSX from "xlsx";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function SectionSummaryPrintContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");
  const classId = searchParams.get("class");
  const categoryId = searchParams.get("category");
  const sectionId = searchParams.get("section");
  const typeParam = searchParams.get("type") || "class_test";
  const sessionName = searchParams.get("session_name") || "";
  const className = searchParams.get("class_name") || "";
  const roundsParam = searchParams.get("rounds");

  const [summaryData, setSummaryData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      if (!sessionId || !classId || !categoryId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        let url = `${API}/results/summary-sheet?academic_session_id=${sessionId}&academy_class_id=${classId}&test_category_id=${categoryId}`;
        if (sectionId && sectionId !== "all") {
          url += `&section_id=${sectionId}`;
        }
        if (roundsParam && roundsParam !== "none") {
          url += `&rounds=${encodeURIComponent(roundsParam)}`;
        }

        const res = await fetch(url, { headers: getAuthHeaders() });
        if (!res.ok) {
          throw new Error(`Failed to load section summary (${res.status})`);
        }
        const data = await res.json();
        setSummaryData(data);
      } catch (err: any) {
        console.error("Failed to load section summary", err);
        setError(err.message || "Failed to load section summary.");
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [sessionId, classId, categoryId, sectionId, roundsParam]);

  const studentsList: any[] = summaryData?.students || [];
  const subjectsList: any[] = summaryData?.subjects || [];

  // Compute Grade Breakdown and Subject-wise Analytics
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

    // Client-side computation fallback
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

  const handleExportExcel = () => {
    try {
      const rows: any[][] = [];
      rows.push(["RESULT ANALYTICS & GRADE DISTRIBUTION"]);
      rows.push([
        `Class: ${className || summaryData?.class?.name || ""}`,
        `Session: ${sessionName || summaryData?.session?.name || ""}`,
        `Section: ${summaryData?.section?.name || "All"}`,
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
        `Section_Summary_${(className || "Class").replace(/\s+/g, "_")}_${(sessionName || "Session").replace(
          /\s+/g,
          "_"
        )}.xlsx`
      );
    } catch (err: any) {
      alert(`Excel export failed: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-10 font-sans">
        <div className="w-10 h-10 border-4 border-[#1e40af] border-t-transparent rounded-full animate-spin mb-4" />
        <div className="text-base font-bold text-slate-800">Preparing Section Summary Sheet...</div>
      </div>
    );
  }

  if (error || !summaryData) {
    return (
      <div className="p-10 text-center font-sans text-red-600">
        <div className="text-base font-bold">{error || "No data available."}</div>
        <button
          onClick={() => window.close()}
          className="mt-4 px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold"
        >
          Close Window
        </button>
      </div>
    );
  }

  const effectiveClassName = className || summaryData?.class?.name || "";
  const effectiveSessionName = sessionName || summaryData?.session?.name || "";
  const effectiveSectionName = summaryData?.section?.name || (sectionId && sectionId !== "all" ? sectionId : "All Sections");
  const classIncharge = summaryData?.class_incharge || "N/A";

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans p-4 md:p-8 print:p-0 print:bg-white">
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .printable-card {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
        }
      `}</style>

      {/* Top Floating Control Bar */}
      <div className="no-print max-w-4xl mx-auto mb-6 bg-white p-4 rounded-2xl shadow-md border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#0f224a] flex items-center gap-2">
            Section Summary (Analytics & Grade Distribution)
          </h2>
          <p className="text-xs text-slate-500">
            {effectiveClassName} • {effectiveSessionName} • {effectiveSectionName}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 transition rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            <FileDown className="w-4 h-4" />
            Export Excel
          </button>
          <button
            onClick={() => window.print()}
            className="px-5 py-2 bg-[#1e40af] text-white hover:bg-[#1e3a8a] transition rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95"
          >
            <Printer className="w-4 h-4" />
            Print Now
          </button>
          <button
            onClick={() => window.close()}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
            title="Close Window"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Printable Sheet Card */}
      <div className="printable-card max-w-4xl mx-auto bg-white rounded-2xl shadow-lg border border-slate-200 p-8 md:p-10">
        {/* Campus Letterhead */}
        <div className="border-b-2 border-slate-800 pb-3 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#0f224a] flex items-center justify-center text-white font-serif font-black text-xl shadow">
              K
            </div>
            <div>
              <h1 className="text-lg font-black text-[#0f224a] tracking-wider uppercase">
                KIPS SCHOOL CHUNIAN CAMPUS
              </h1>
              <p className="text-[11px] font-semibold text-slate-600">
                Opposite Shell Pump Manga Road, Chunian | 0300 39 39 581
              </p>
            </div>
          </div>
          <div className="text-right text-xs">
            <div className="font-bold text-slate-800">
              Class Incharge: <span className="text-[#1e40af]">{classIncharge}</span>
            </div>
            <div className="text-slate-500 font-semibold mt-0.5">
              Total Students: <strong className="text-slate-800">{analytics.totalAppeared}</strong>
            </div>
          </div>
        </div>

        {/* Section Header Banner */}
        <div className="mb-6">
          <h2 className="text-xl font-black text-[#1e40af] tracking-wide uppercase font-serif mb-1">
            RESULT ANALYTICS &amp; SUBJECT-WISE PERFORMANCE
          </h2>
          <div className="flex flex-wrap items-center justify-between text-xs font-bold text-slate-700 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
            <span>
              CLASS: <strong className="text-[#0f224a] uppercase">{effectiveClassName}</strong>
            </span>
            <span>
              SECTION: <strong className="text-[#0f224a] uppercase">{effectiveSectionName}</strong>
            </span>
            <span>
              SESSION: <strong className="text-[#0f224a]">{effectiveSessionName}</strong>
            </span>
          </div>
        </div>

        {/* Subject-Wise Performance Analysis Table */}
        <div className="mb-10">
          <h3 className="text-sm font-black text-[#1e40af] uppercase tracking-wide mb-2 flex items-center gap-1.5">
            Subject-Wise Performance Analysis
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-400 text-xs">
              <thead>
                <tr className="bg-[#1b4d89] text-white">
                  <th className="border border-slate-400 px-4 py-2 text-left font-bold tracking-wider">
                    Subject
                  </th>
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold tracking-wider w-28">
                    Total Marks
                  </th>
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold tracking-wider w-32">
                    Class Avg Score
                  </th>
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold tracking-wider w-28">
                    Avg %
                  </th>
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold tracking-wider w-32">
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

        {/* Official Signatures Row */}
        <div className="pt-8 border-t border-slate-300 mt-12 grid grid-cols-3 gap-8 text-center text-xs">
          <div>
            <div className="w-40 border-b border-slate-800 mx-auto mb-2" />
            <span className="font-bold text-slate-700 uppercase tracking-wide">Class Incharge</span>
          </div>
          <div>
            <div className="w-40 border-b border-slate-800 mx-auto mb-2" />
            <span className="font-bold text-slate-700 uppercase tracking-wide">Examination Controller</span>
          </div>
          <div>
            <div className="w-40 border-b border-slate-800 mx-auto mb-2" />
            <span className="font-bold text-slate-700 uppercase tracking-wide">Principal / Director</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SectionSummaryPrintPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center font-medium">Loading Section Summary...</div>}>
      <SectionSummaryPrintContent />
    </Suspense>
  );
}
