"use client";

import React, { useEffect, useState, useRef, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Printer, X, ZoomIn, Layers, Check } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function ResultSummaryPrintContent() {
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

  // Print controls state
  const [roundsFilterMode, setRoundsFilterMode] = useState<"url" | "conducted" | "all">(
    roundsParam ? "url" : "conducted"
  );
  const [scaleMode, setScaleMode] = useState<string>("auto");
  const [calculatedZoom, setCalculatedZoom] = useState<number>(1);
  const tableRef = useRef<HTMLTableElement>(null);

  const fetchSummary = async (filterMode: "url" | "conducted" | "all") => {
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

      if (filterMode === "url" && roundsParam && roundsParam !== "none") {
        url += `&rounds=${encodeURIComponent(roundsParam)}`;
      } else if (filterMode === "conducted") {
        // First get available rounds to find active conducted rounds
        const rRes = await fetch(
          `${API}/results/rounds?academic_session_id=${sessionId}&academy_class_id=${classId}&test_category_id=${categoryId}${
            sectionId && sectionId !== "all" ? `&section_id=${sectionId}` : ""
          }`,
          { headers: getAuthHeaders() }
        );
        if (rRes.ok) {
          const rData = await rRes.json();
          if (rData.active_rounds && rData.active_rounds.length > 0) {
            url += `&rounds=${encodeURIComponent(rData.active_rounds.join(","))}`;
          }
        }
      }
      // If "all", we pass no rounds filter to load the complete 5-round template

      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) {
        throw new Error(`Failed to load summary sheet (${res.status})`);
      }
      const data = await res.json();
      setSummaryData(data);
    } catch (err: any) {
      console.error("Failed to fetch summary data", err);
      setError(err.message || "Failed to load summary sheet.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary(roundsFilterMode);
  }, [sessionId, classId, categoryId, sectionId]);

  // Auto-fit calculation
  useEffect(() => {
    if (!summaryData || !tableRef.current) return;

    const measureAndFit = () => {
      if (!tableRef.current) return;
      // Target A4 landscape printable width in pixels at standard 96 DPI:
      // A4 is 297mm width. Minus 8mm total margins (4mm left + 4mm right) = 289mm = ~1092px.
      const targetPrintWidth = 1090;
      const actualTableWidth = tableRef.current.scrollWidth;

      if (actualTableWidth > targetPrintWidth) {
        const factor = Math.max(0.4, Number((targetPrintWidth / actualTableWidth).toFixed(3)));
        setCalculatedZoom(factor);
      } else {
        setCalculatedZoom(1);
      }
    };

    // Small delay to ensure table layout is completely computed
    const t = setTimeout(measureAndFit, 150);
    window.addEventListener("resize", measureAndFit);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measureAndFit);
    };
  }, [summaryData, roundsFilterMode]);

  const effectiveZoom = useMemo(() => {
    if (scaleMode === "auto") return calculatedZoom;
    const num = parseFloat(scaleMode);
    return !isNaN(num) ? num / 100 : 1;
  }, [scaleMode, calculatedZoom]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-10 font-sans">
        <div className="w-10 h-10 border-4 border-[#2563eb] border-t-transparent rounded-full animate-spin mb-4" />
        <div className="text-base font-bold text-slate-800">Preparing Printable Summary Sheet...</div>
        <div className="text-xs text-slate-500 mt-1">Calculating auto-fit dimensions and table columns.</div>
      </div>
    );
  }

  if (error || !summaryData) {
    return (
      <div className="p-10 text-center font-sans text-red-600">
        <div className="text-base font-bold">{error || "No data available for this class."}</div>
        <button
          onClick={() => window.close()}
          className="mt-4 px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold"
        >
          Close Window
        </button>
      </div>
    );
  }

  const studentsList: any[] = summaryData.students || [];
  const subjectsList: any[] = summaryData.subjects || [];
  const roundsList: string[] = summaryData.rounds || [];
  const grandTotalMax = summaryData.grand_total_max || 0;
  const displayClassName = className || summaryData.class?.name || "N/A";
  const displaySessionName = sessionName || summaryData.session?.name || "N/A";

  const handleRoundsChange = (mode: "conducted" | "all") => {
    setRoundsFilterMode(mode);
    fetchSummary(mode);
  };

  return (
    <div className="bg-white min-h-screen text-black print:p-0 print:m-0 w-full p-4 font-sans">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          @page {
            size: A4 landscape;
            margin: 4mm 4mm 4mm 4mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-root-container {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: none !important;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
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

      {/* Interactive Toolbar (Screen View Only) */}
      <div className="no-print bg-slate-900 text-white p-3 rounded-xl mb-4 flex flex-wrap items-center justify-between gap-3 shadow-lg sticky top-2 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold">
            <Printer className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-xs font-bold flex items-center gap-2">
              <span>Print Preview: Result Summary Sheet</span>
              <span className="bg-blue-500/20 text-blue-300 text-[10px] px-2 py-0.5 rounded-full border border-blue-400/30">
                A4 Landscape
              </span>
            </div>
            <div className="text-[10px] text-slate-400">
              Auto-scaled to fit all {subjectsList.length} subjects & Total column on 1 page width
            </div>
          </div>
        </div>

        {/* Controls: Rounds filter & Scale selector */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Rounds Filter Mode */}
          <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700">
            <button
              onClick={() => handleRoundsChange("conducted")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                roundsFilterMode === "conducted"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-300 hover:text-white"
              }`}
              title="Show only rounds with conducted tests (fits easily without empty columns)"
            >
              Conducted Tests Only
            </button>
            <button
              onClick={() => handleRoundsChange("all")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                roundsFilterMode === "all"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-300 hover:text-white"
              }`}
              title="Show all 5 rounds template matching blank Excel sheet"
            >
              All 5 Rounds (Template)
            </button>
          </div>

          {/* Scale Selector */}
          <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
            <ZoomIn className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] text-slate-400 font-semibold">Scale:</span>
            <select
              value={scaleMode}
              onChange={(e) => setScaleMode(e.target.value)}
              className="bg-transparent text-white text-[11px] font-bold focus:outline-none cursor-pointer"
            >
              <option value="auto" className="bg-slate-900">
                Auto Fit ({Math.round(calculatedZoom * 100)}%)
              </option>
              <option value="100" className="bg-slate-900">
                100% (No Zoom)
              </option>
              <option value="90" className="bg-slate-900">
                90%
              </option>
              <option value="80" className="bg-slate-900">
                80%
              </option>
              <option value="70" className="bg-slate-900">
                70%
              </option>
              <option value="60" className="bg-slate-900">
                60%
              </option>
              <option value="50" className="bg-slate-900">
                50%
              </option>
            </select>
          </div>

          {/* Action Buttons */}
          <button
            onClick={() => window.print()}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-1.5 rounded-lg flex items-center gap-1.5 transition active:scale-95 shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Now
          </button>
          <button
            onClick={() => window.close()}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
          >
            <X className="w-3.5 h-3.5" />
            Close
          </button>
        </div>
      </div>

      {/* Main Printable Container - Flush with left margins in print */}
      <div className="print-root-container w-full">
        {/* Scaling Wrapper using CSS zoom */}
        <div
          style={{
            zoom: effectiveZoom,
            WebkitPrintColorAdjust: "exact",
            printColorAdjust: "exact",
          }}
          className="w-full origin-top-left"
        >
          {/* Institutional Header Banner */}
          <div className="flex items-center justify-between pb-1.5 border-b-2 border-black mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 flex items-center justify-center shrink-0">
                <img
                  src="/logo.jpg"
                  alt="Logo"
                  className="w-full h-full object-contain grayscale"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
              <div>
                <h1 className="text-sm font-black uppercase tracking-wide text-black leading-tight">
                  Kips School Chunian Campus
                </h1>
                <p className="text-[8.5px] font-bold text-gray-700">
                  Opposite Shell Pump Changa Manga Road, Chunian | 0300 39 39 581
                </p>
              </div>
            </div>

            <div className="text-right text-[9.5px] font-bold text-black leading-tight">
              {summaryData.class_incharge && (
                <div>
                  Class Incharge: <span className="font-extrabold">{summaryData.class_incharge}</span>
                </div>
              )}
              <div className="text-gray-700 text-[8.5px]">
                Total Students: <strong>{studentsList.length}</strong>
              </div>
            </div>
          </div>

          {/* Exact 2.xlsx Header Row (Row 2 in Excel) */}
          <div className="flex items-center justify-between pt-0.5 pb-1 mb-1.5 font-black text-[11px] uppercase tracking-wider text-black">
            <div>Summary Sheet Class: {displayClassName}</div>
            <div>(Session {displaySessionName.replace("-", "_")})</div>
          </div>

          {/* Main Excel-formatted Table Grid */}
          <div className="w-full overflow-visible">
            <table
              ref={tableRef}
              className="w-full border-collapse border border-black text-[8.5px] leading-tight text-black"
            >
              <thead>
                {/* Row 3: Subject row */}
                <tr className="bg-white">
                  <th
                    rowSpan={3}
                    className="border border-black px-0.5 py-1 text-center font-bold w-[24px] min-w-[22px] align-middle"
                  >
                    Roll No
                  </th>
                  <th
                    rowSpan={3}
                    className="border border-black px-1.5 py-1 text-left font-bold min-w-[85px] max-w-[110px] align-middle truncate"
                  >
                    Student's Name
                  </th>
                  <th className="border border-black px-0.5 py-1 bg-[#d8d8d8] font-bold text-center w-[46px] min-w-[42px] align-middle">
                    Subject
                  </th>
                  {subjectsList.map((sub: any) => {
                    const colSpan = (sub.rounds?.length || roundsList.length) + 3;
                    return (
                      <React.Fragment key={sub.id}>
                        <th
                          colSpan={colSpan}
                          className="border border-black px-0.5 py-0.5 text-center font-black uppercase text-[9px] bg-white"
                        >
                          {sub.name}
                        </th>
                        <th className="border-y border-black bg-white w-0.5 p-0 min-w-[2px]" />
                      </React.Fragment>
                    );
                  })}
                  <th
                    colSpan={4}
                    className="border border-black px-0.5 py-0.5 text-center font-black uppercase text-[9.5px] bg-white"
                  >
                    Total
                  </th>
                </tr>

                {/* Row 5: Round # row */}
                <tr className="bg-[#99ccff]">
                  <th className="border border-black px-0.5 py-0.5 bg-[#d8d8d8] font-bold text-center">
                    Round #
                  </th>
                  {subjectsList.map((sub: any) => (
                    <React.Fragment key={sub.id}>
                      {(sub.rounds || []).map((r: any, rIdx: number) => (
                        <th
                          key={rIdx}
                          className="border border-black px-0.5 py-0.5 text-center font-bold bg-[#99ccff] min-w-[20px]"
                        >
                          {r.short_title || `R-${rIdx + 1}`}
                        </th>
                      ))}
                      <th className="border border-black px-0.5 py-0.5 text-center font-black bg-[#99ccff] min-w-[20px]">
                        T.M
                      </th>
                      <th className="border border-black px-0.5 py-0.5 text-center font-black bg-[#99ccff] min-w-[20px]">
                        %
                      </th>
                      <th className="border border-black px-0.5 py-0.5 text-center font-black bg-[#99ccff] min-w-[20px]">
                        Grade
                      </th>
                      <th className="border-y border-black bg-white w-0.5 p-0 min-w-[2px]" />
                    </React.Fragment>
                  ))}
                  <th className="border border-black px-0.5 py-0.5 text-center font-black bg-[#99ccff] min-w-[24px]">
                    T.M
                  </th>
                  <th className="border border-black px-0.5 py-0.5 text-center font-black bg-[#99ccff] min-w-[24px]">
                    % age
                  </th>
                  <th className="border border-black px-0.5 py-0.5 text-center font-black bg-[#99ccff] min-w-[20px]">
                    Grade
                  </th>
                  <th className="border border-black px-0.5 py-0.5 text-center font-black bg-[#99ccff] min-w-[24px]">
                    Position
                  </th>
                </tr>

                {/* Row 6: Conduction Date row */}
                <tr className="bg-white text-[7px]">
                  <th className="border border-black px-0.5 py-0.5 bg-[#d8d8d8] font-bold text-center">
                    Conduction Date
                  </th>
                  {subjectsList.map((sub: any) => (
                    <React.Fragment key={sub.id}>
                      {(sub.rounds || []).map((r: any, rIdx: number) => (
                        <th
                          key={rIdx}
                          className="border border-black px-0.5 py-0.5 text-center font-bold text-gray-800"
                        >
                          {r.date || ""}
                        </th>
                      ))}
                      <th className="border border-black bg-white" />
                      <th className="border border-black bg-white" />
                      <th className="border border-black bg-white" />
                      <th className="border-y border-black bg-white w-0.5 p-0 min-w-[2px]" />
                    </React.Fragment>
                  ))}
                  <th className="border border-black bg-white" />
                  <th className="border border-black bg-white" />
                  <th className="border border-black bg-white" />
                  <th className="border border-black bg-white" />
                </tr>

                {/* Row 7: Total Marks row */}
                <tr className="bg-white font-bold text-[8px]">
                  <th className="border border-black px-0.5 py-0.5" />
                  <th className="border border-black px-0.5 py-0.5" />
                  <th className="border border-black px-0.5 py-0.5 bg-[#d8d8d8] font-bold text-center">
                    Total Marks
                  </th>
                  {subjectsList.map((sub: any) => (
                    <React.Fragment key={sub.id}>
                      {(sub.rounds || []).map((r: any, rIdx: number) => (
                        <th
                          key={rIdx}
                          className="border border-black px-0.5 py-0.5 text-center font-bold"
                        >
                          {r.max_marks || ""}
                        </th>
                      ))}
                      {/* Black background with white font matching 2.xlsx */}
                      <th className="border border-black px-0.5 py-0.5 text-center bg-black text-white font-black">
                        {sub.total_max_marks || 0}
                      </th>
                      <th className="border border-black bg-white" />
                      <th className="border border-black bg-white" />
                      <th className="border-y border-black bg-white w-0.5 p-0 min-w-[2px]" />
                    </React.Fragment>
                  ))}
                  <th className="border border-black px-0.5 py-0.5 text-center bg-black text-white font-black">
                    {grandTotalMax}
                  </th>
                  <th className="border border-black bg-white" />
                  <th className="border border-black bg-white" />
                  <th className="border border-black bg-white" />
                </tr>
              </thead>

              <tbody>
                {studentsList.map((student: any, sIdx: number) => (
                  <tr key={student.student_id} className="bg-white">
                    {/* Roll No */}
                    <td className="border border-black px-0.5 py-0.5 text-center font-bold">
                      {student.roll_number || sIdx + 1}
                    </td>

                    {/* Student Name */}
                    <td className="border border-black px-1.5 py-0.5 text-left font-normal truncate max-w-[110px]">
                      {student.student_name}
                    </td>

                    {/* Blank Subject / Section col */}
                    <td className="border border-black px-0.5 py-0.5 text-center text-[7px] truncate max-w-[46px]">
                      {student.section_name || ""}
                    </td>

                    {/* Subject Marks */}
                    {subjectsList.map((sub: any) => {
                      const subData = student.subjects?.[sub.id];
                      return (
                        <React.Fragment key={sub.id}>
                          {(sub.rounds || []).map((r: any, rIdx: number) => {
                            const rData = subData?.rounds?.[rIdx];
                            return (
                              <td
                                key={rIdx}
                                className="border border-black px-0.5 py-0.5 text-center font-bold"
                              >
                                {rData?.is_absent
                                  ? "A"
                                  : rData?.obtained_marks !== null && rData?.obtained_marks !== undefined
                                  ? rData.obtained_marks
                                  : ""}
                              </td>
                            );
                          })}
                          {/* Subject T.M */}
                          <td className="border border-black px-0.5 py-0.5 text-center font-bold">
                            {subData?.total_obtained ?? ""}
                          </td>
                          {/* Subject % */}
                          <td className="border border-black px-0.5 py-0.5 text-center font-semibold text-[7.5px]">
                            {subData?.total_max > 0 ? (subData.percentage / 100).toFixed(2) : ""}
                          </td>
                          {/* Subject Grade */}
                          <td className="border border-black px-0.5 py-0.5 text-center font-bold text-[7.5px]">
                            {subData?.grade ?? ""}
                          </td>
                          {/* Separator Col */}
                          <td className="border-y border-black bg-white w-0.5 p-0 min-w-[2px]" />
                        </React.Fragment>
                      );
                    })}

                    {/* Grand Total Obtained */}
                    <td className="border border-black px-0.5 py-0.5 text-center font-black">
                      {student.grand_total_obtained}
                    </td>

                    {/* Grand Total % */}
                    <td className="border border-black px-0.5 py-0.5 text-center font-bold text-[7.5px]">
                      {student.grand_total_max > 0 ? (student.percentage / 100).toFixed(2) : ""}
                    </td>

                    {/* Grand Total Grade */}
                    <td className="border border-black px-0.5 py-0.5 text-center font-bold text-[7.5px]">
                      {student.grade}
                    </td>

                    {/* Position / Rank */}
                    <td className="border border-black px-0.5 py-0.5 text-center font-black">
                      {student.position || ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Signature & Verification Footer */}
          <div className="mt-6 pt-4 flex items-center justify-between text-[10px] font-bold text-black border-t border-black print:break-inside-avoid">
            <div className="text-center w-40">
              <div className="border-b border-black pb-1 mb-1" />
              <span>Class Incharge</span>
            </div>
            <div className="text-center w-40">
              <div className="border-b border-black pb-1 mb-1" />
              <span>Examination Controller</span>
            </div>
            <div className="text-center w-40">
              <div className="border-b border-black pb-1 mb-1" />
              <span>Principal / Director</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResultSummaryPrintPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center font-medium">Preparing printable summary sheet...</div>}>
      <ResultSummaryPrintContent />
    </Suspense>
  );
}
