"use client";

import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Cell,
} from "recharts";

export interface TestItem {
  test_id: number | string;
  test_title: string;
  test_date: string;
  subject_id?: number | string;
  subject_name: string;
  obtained_marks: number | string | null;
  total_marks: number | string;
  is_absent?: number | boolean;
}

export interface SubjectSummary {
  subject_id?: number | string;
  subject_name: string;
  tests_taken: number;
  total_obtained: number;
  total_max: number;
  percentage: number;
  absents?: number;
  grade?: string;
}

export interface RoundInfo {
  title: string;
  date?: string;
  total_marks?: number;
}

export interface ExcelResultCardProps {
  student: {
    id?: number | string;
    student_id?: number | string;
    name?: string;
    student_name?: string;
    father_name?: string;
    student_father_name?: string;
    roll_number?: string | number;
    student_roll_number?: string | number;
    image?: string;
    student_image?: string;
    class_name?: string;
    section_name?: string;
    session_name?: string;
    campus_name?: string;
    class_incharge?: string;
    rank?: number | string;
  };
  subjects: SubjectSummary[];
  tests?: TestItem[];
  rounds?: RoundInfo[];
  categoryTitle?: string;
  sessionTitle?: string;
  showChart?: boolean;
}

// Compute Grade helper matching Excel formula
export function calculateGrade(percentage: number): string {
  if (percentage > 85) return "A+";
  if (percentage > 75) return "A";
  if (percentage > 65) return "B";
  if (percentage > 50) return "C";
  if (percentage > 40) return "D";
  if (percentage > 32) return "E";
  return "Fail";
}

// Compute Attendance Remark helper matching Excel formula
export function calculateAttendanceRemark(absents: number): string {
  if (absents < 1) return "Excellent";
  if (absents === 1) return "V. Good";
  if (absents === 2) return "Good";
  if (absents === 3) return "Satisfactory";
  return "Poor";
}

export default function ExcelResultCard({
  student,
  subjects = [],
  tests = [],
  rounds = [],
  categoryTitle,
  sessionTitle,
  showChart = true,
}: ExcelResultCardProps) {
  // 1. Identify distinct test rounds (minimum 5 rounds like in Excel template)
  const roundColumns = useMemo(() => {
    // If rounds passed explicitly
    let baseRounds: { title: string; date?: string }[] = [];

    if (rounds && rounds.length > 0) {
      baseRounds = rounds.map((r) => ({ title: r.title, date: r.date }));
    } else if (tests && tests.length > 0) {
      const distinctMap = new Map<string, string>();
      tests.forEach((t) => {
        const title = t.test_title || `Test ${t.test_id}`;
        if (!distinctMap.has(title)) {
          distinctMap.set(title, t.test_date || "");
        }
      });
      baseRounds = Array.from(distinctMap.entries()).map(([title, date]) => ({
        title,
        date,
      }));
    }

    // Ensure at least 5 round slots like the standard Excel template
    const defaultRoundNames = [
      categoryTitle || "First Term",
      "Round 2",
      "Round 3",
      "Round 4",
      "Round 5",
    ];

    const finalRounds = [...baseRounds];
    while (finalRounds.length < 5) {
      const nextIdx = finalRounds.length;
      finalRounds.push({
        title: defaultRoundNames[nextIdx] || `Round ${nextIdx + 1}`,
        date: undefined,
      });
    }

    return finalRounds;
  }, [rounds, tests, categoryTitle]);

  // 2. Build structured Matrix for each subject
  const subjectRows = useMemo(() => {
    // Ensure all subjects are represented
    const list = subjects.length > 0 ? subjects : [];

    return list.map((sub, idx) => {
      // Find tests for this subject
      const subTests = (tests || []).filter(
        (t) =>
          t.subject_name?.trim().toLowerCase() ===
            sub.subject_name?.trim().toLowerCase() ||
          (sub.subject_id && String(t.subject_id) === String(sub.subject_id))
      );

      let subAbsents = sub.absents !== undefined ? Number(sub.absents) : 0;
      if (subAbsents === 0 && subTests.length > 0) {
        subAbsents = subTests.filter((t) => Boolean(t.is_absent) && Number(t.is_absent) !== 0).length;
      }

      // Map test rounds
      const roundDetails = roundColumns.map((round) => {
        const matchingTest = subTests.find(
          (t) => (t.test_title || "").toLowerCase() === round.title.toLowerCase()
        );

        if (matchingTest) {
          const isAbs = Boolean(matchingTest.is_absent) && Number(matchingTest.is_absent) !== 0;
          const totalM = Number(matchingTest.total_marks || 0);
          const obtM = isAbs
            ? "A"
            : matchingTest.obtained_marks !== null &&
              matchingTest.obtained_marks !== undefined
            ? Number(matchingTest.obtained_marks)
            : 0;

          return {
            date: matchingTest.test_date || round.date || "-",
            tm: totalM,
            ob: obtM,
            isAbsent: isAbs,
            hasData: true,
          };
        }

        // If this is single test/term result mode
        if (subTests.length === 1 && round === roundColumns[0]) {
          const t = subTests[0];
          const isAbs = Boolean(t.is_absent) && Number(t.is_absent) !== 0;
          return {
            date: t.test_date || "-",
            tm: Number(t.total_marks || sub.total_max || 0),
            ob: isAbs ? "A" : Number(t.obtained_marks || sub.total_obtained || 0),
            isAbsent: isAbs,
            hasData: true,
          };
        }

        return {
          date: "-",
          tm: 0,
          ob: 0,
          isAbsent: false,
          hasData: false,
        };
      });

      const totalMax = Number(sub.total_max || 0);
      const totalObtained = Number(sub.total_obtained || 0);
      const percentage = Number(sub.percentage) || (totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0);
      const grade = sub.grade || calculateGrade(percentage);

      return {
        sr: idx + 1,
        name: sub.subject_name,
        rounds: roundDetails,
        totalMax,
        totalObtained,
        percentage,
        grade,
        absents: Number(subAbsents || 0),
      };
    });
  }, [subjects, tests, roundColumns]);

  // 3. Compute Test Wise Totals
  const testWiseTotals = useMemo(() => {
    return roundColumns.map((_, rIdx) => {
      let totalTm = 0;
      let totalOb = 0;
      let countData = 0;

      subjectRows.forEach((row) => {
        const cell = row.rounds[rIdx];
        if (cell && cell.hasData) {
          countData++;
          totalTm += typeof cell.tm === "number" ? cell.tm : 0;
          if (typeof cell.ob === "number") {
            totalOb += cell.ob;
          }
        }
      });

      const pct = totalTm > 0 ? Math.round((totalOb / totalTm) * 100) : 0;
      return {
        totalTm,
        totalOb,
        percentage: pct,
        hasData: countData > 0,
      };
    });
  }, [roundColumns, subjectRows]);

  // Grand Totals
  const grandTotalMax = subjectRows.reduce((acc, r) => acc + Number(r.totalMax || 0), 0);
  const grandTotalObtained = subjectRows.reduce((acc, r) => acc + Number(r.totalObtained || 0), 0);
  const grandOverallPercentage =
    grandTotalMax > 0 ? Math.round((grandTotalObtained / grandTotalMax) * 100) : 0;
  const grandOverallGrade = calculateGrade(grandOverallPercentage);
  const grandTotalAbsents = subjectRows.reduce((acc, r) => acc + Number(r.absents || 0), 0);
  const attendanceRemark = calculateAttendanceRemark(grandTotalAbsents);

  // Chart data formatting
  const chartData = useMemo(() => {
    return subjectRows.map((s) => ({
      name: s.name,
      percentage: s.percentage,
    }));
  }, [subjectRows]);

  const studentName = student?.student_name || student?.name || "Student Name";
  const fatherName = student?.student_father_name || student?.father_name || "";
  const rollNumber = student?.student_roll_number || student?.roll_number || student?.id || "-";
  const className = student?.class_name || "7";
  const sectionName = student?.section_name || "G";
  const sessionName = student?.session_name || sessionTitle || "Session 2026-27";
  const campusName = student?.campus_name || "Chunian Campus";
  const classIncharge = student?.class_incharge || "MS. AMNA";

  const displayCategoryTitle = useMemo(() => {
    if (!categoryTitle || /^\d+$/.test(String(categoryTitle).trim())) {
      return "First Term";
    }
    return categoryTitle;
  }, [categoryTitle]);

  return (
    <div className="w-full max-w-5xl mx-auto bg-white border-2 border-black font-sans text-black shadow-md print:shadow-none print:border-black print:m-0 print:w-full print:max-w-none text-xs leading-tight select-text">
      {/* ─── 1. CRISP INSTITUTIONAL HEADER SECTION ───────────────────────────── */}
      <div className="w-full border-b-2 border-black bg-white">
        {/* Top Header: Clean, Sharp Institutional Branding */}
        <div className="w-full bg-white p-4 sm:p-5 flex items-center justify-between border-b-2 border-black">
          {/* Logo */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center shrink-0 border-2 border-black rounded-lg p-1 bg-white shadow-2xs">
            <img
              src="/logo.jpg"
              alt="KIPS Logo"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/logo.png";
              }}
            />
          </div>

          {/* School Details */}
          <div className="text-center flex-1 px-4">
            <h1 className="text-xl sm:text-3xl font-black uppercase tracking-wider text-[#0f224a] leading-tight font-sans">
              KIPS School Chunian Campus
            </h1>
            <p className="text-[11px] sm:text-xs font-bold text-slate-700 mt-1">
              Exchange Road, Hadi Town Chunian &bull; Phone: 0300 39 39 581
            </p>
          </div>

          {/* Report Card Badge */}
          <div className="hidden sm:flex flex-col items-end justify-center shrink-0 border-2 border-black rounded-lg px-3.5 py-2 bg-slate-50 text-right">
            <span className="text-xs font-black uppercase tracking-widest text-[#0f224a]">
              Student Report Card
            </span>
            <span className="text-[10px] font-bold text-slate-600 mt-0.5">
              Official Examination Result
            </span>
          </div>
        </div>

        {/* Exam Title Bar */}
        <div className="bg-slate-200 py-2 px-4 text-center border-b-2 border-black">
          <h2 className="text-sm sm:text-base font-black uppercase tracking-wide text-black">
            {displayCategoryTitle} Examination Result ({sessionName})
          </h2>
        </div>

        {/* Student Information Grid (Excel Rows 3-6) */}
        <div className="grid grid-cols-12 text-xs font-bold divide-x divide-black border-b border-black">
          <div className="col-span-3 px-3 py-1.5 bg-slate-50 flex items-center gap-1.5">
            <span className="text-slate-600 uppercase text-[11px]">Class:</span>
            <span className="text-black font-extrabold">{className}</span>
          </div>
          <div className="col-span-3 px-3 py-1.5 bg-slate-50 flex items-center gap-1.5">
            <span className="text-slate-600 uppercase text-[11px]">Section:</span>
            <span className="text-black font-extrabold">{sectionName}</span>
          </div>
          <div className="col-span-6 px-3 py-1.5 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-600 uppercase text-[11px]">Campus:</span>
              <span className="text-black font-extrabold">{campusName}</span>
            </div>
            {student?.rank && (
              <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded text-[11px] font-black border border-amber-300">
                Rank #{student.rank}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-12 text-xs font-bold divide-x divide-black">
          <div className="col-span-6 px-3 py-1.5 flex items-center gap-2">
            <span className="text-slate-600 uppercase text-[11px] w-28 shrink-0">Student&apos;s Name:</span>
            <span className="text-black font-extrabold text-sm uppercase truncate">
              {studentName} {fatherName ? `S/O ${fatherName}` : ""}
            </span>
          </div>
          <div className="col-span-3 px-3 py-1.5 flex items-center gap-1.5">
            <span className="text-slate-600 uppercase text-[11px]">Roll No.:</span>
            <span className="text-black font-extrabold">{rollNumber}</span>
          </div>
          <div className="col-span-3 px-3 py-1.5 flex items-center gap-1.5 bg-slate-100">
            <span className="text-slate-600 uppercase text-[11px]">Class Incharge:</span>
            <span className="text-black font-extrabold uppercase">{classIncharge}</span>
          </div>
        </div>
      </div>

      {/* ─── 2. MAIN RESULTS MATRIX TABLE ────────────────────────────────────── */}
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse text-[11px] sm:text-xs text-center border-b-2 border-black">
          <thead>
            {/* Header Row 1 */}
            <tr className="bg-[#969696] text-white border-b border-black font-extrabold">
              <th rowSpan={2} className="border-r border-black p-1 w-8 text-center bg-slate-700 text-white">
                Sr.#
              </th>
              <th rowSpan={2} className="border-r border-black p-1 text-left px-2.5 min-w-[130px] bg-slate-800 text-white">
                Subjects
              </th>
              {roundColumns.map((rc, idx) => (
                <th
                  key={idx}
                  colSpan={2}
                  className="border-r border-black p-1 text-center bg-slate-600 text-white truncate"
                >
                  {rc.title}
                </th>
              ))}
              <th
                colSpan={4}
                className="border-r border-black p-1 text-center bg-slate-800 text-white font-black uppercase tracking-wider"
              >
                Subject Wise
              </th>
              <th rowSpan={2} className="p-1 w-16 text-center bg-slate-700 text-white leading-tight">
                Absent<br />Report
              </th>
            </tr>

            {/* Header Row 2: Sub-columns */}
            <tr className="bg-slate-200 text-black font-extrabold border-b-2 border-black text-[10px] sm:text-[11px]">
              {roundColumns.map((_, idx) => (
                <React.Fragment key={idx}>
                  <th className="border-r border-black p-0.5 w-10">T.M</th>
                  <th className="border-r border-black p-0.5 w-10">O.B</th>
                </React.Fragment>
              ))}
              <th className="border-r border-black p-0.5 w-11 bg-slate-300">T.M</th>
              <th className="border-r border-black p-0.5 w-11 bg-slate-300">O.M</th>
              <th className="border-r border-black p-0.5 w-11 bg-slate-300">%</th>
              <th className="border-r border-black p-0.5 w-12 bg-slate-300">Grade</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-black font-bold">
            {subjectRows.map((row) => (
              <React.Fragment key={row.sr}>
                {/* Upper Row: Sr#, Subject Name, Dates, Absent Count */}
                <tr className="bg-white hover:bg-slate-50">
                  <td
                    rowSpan={2}
                    className="border-r border-black p-1 font-bold text-center bg-slate-100/70"
                  >
                    {row.sr}
                  </td>
                  <td
                    rowSpan={2}
                    className="border-r border-black p-1 px-2.5 text-left font-extrabold text-black uppercase"
                  >
                    {row.name}
                  </td>

                  {/* Dates for each test round */}
                  {row.rounds.map((roundCell, rIdx) => (
                    <td
                      key={rIdx}
                      colSpan={2}
                      className="border-r border-black p-0.5 text-[10px] font-bold text-slate-700 bg-slate-100 text-center truncate"
                    >
                      {roundCell.date}
                    </td>
                  ))}

                  {/* Subject Wise spacer */}
                  <td colSpan={4} className="border-r border-black bg-slate-100/40 p-0.5"></td>

                  {/* Absent count */}
                  <td className="p-0.5 text-center font-bold text-slate-800">
                    {row.absents}
                  </td>
                </tr>

                {/* Lower Row: Marks & Evaluation */}
                <tr className="border-b border-black bg-white hover:bg-slate-50">
                  {row.rounds.map((roundCell, rIdx) => (
                    <React.Fragment key={rIdx}>
                      <td className="border-r border-black p-0.5 text-center font-bold text-slate-600">
                        {roundCell.hasData ? roundCell.tm : "-"}
                      </td>
                      <td
                        className={`border-r border-black p-0.5 text-center font-black ${
                          roundCell.isAbsent ? "text-red-600 bg-red-50" : "text-black"
                        }`}
                      >
                        {roundCell.hasData ? roundCell.ob : "-"}
                      </td>
                    </React.Fragment>
                  ))}

                  {/* Subject Wise Summary */}
                  <td className="border-r border-black p-0.5 text-center font-extrabold text-slate-800 bg-slate-100/80">
                    {row.totalMax}
                  </td>
                  <td className="border-r border-black p-0.5 text-center font-extrabold text-blue-900 bg-slate-100/80">
                    {row.totalObtained}
                  </td>
                  <td className="border-r border-black p-0.5 text-center font-extrabold text-slate-800 bg-slate-100/80">
                    {row.percentage}%
                  </td>
                  <td
                    className={`border-r border-black p-0.5 text-center font-black ${
                      row.grade === "A+"
                        ? "text-emerald-700 bg-emerald-50"
                        : row.grade === "A"
                        ? "text-emerald-600 bg-emerald-50"
                        : row.grade === "B"
                        ? "text-blue-700 bg-blue-50"
                        : row.grade === "Fail"
                        ? "text-red-600 bg-red-50"
                        : "text-amber-700 bg-amber-50"
                    }`}
                  >
                    {row.grade}
                  </td>

                  {/* Empty cell below absents */}
                  <td className="p-0.5"></td>
                </tr>
              </React.Fragment>
            ))}

            {/* ─── SUMMARY ROW 1: TEST WISE TOTALS ──────────────────────────── */}
            <tr className="bg-slate-200 font-black border-t-2 border-black">
              <td
                rowSpan={2}
                colSpan={2}
                className="border-r border-black p-2 text-center text-xs font-black uppercase tracking-wider bg-slate-300 text-black"
              >
                Test Wise
              </td>

              {testWiseTotals.map((tot, idx) => (
                <React.Fragment key={idx}>
                  <td className="border-r border-black p-1 text-center font-black bg-slate-200">
                    {tot.hasData ? tot.totalTm : "-"}
                  </td>
                  <td className="border-r border-black p-1 text-center font-black bg-slate-200 text-blue-900">
                    {tot.hasData ? tot.totalOb : "-"}
                  </td>
                </React.Fragment>
              ))}

              {/* Grand Subject Wise Totals */}
              <td className="border-r border-black p-1 text-center font-black text-black bg-slate-300">
                {grandTotalMax}
              </td>
              <td className="border-r border-black p-1 text-center font-black text-blue-900 bg-slate-300">
                {grandTotalObtained}
              </td>
              <td className="border-r border-black p-1 text-center font-black text-black bg-slate-300">
                {grandOverallPercentage}%
              </td>
              <td
                className={`border-r border-black p-1 text-center font-black text-sm ${
                  grandOverallGrade === "Fail"
                    ? "text-red-700 bg-red-100"
                    : "text-emerald-800 bg-emerald-100"
                }`}
              >
                {grandOverallGrade}
              </td>

              {/* Total Absents with Excel Yellow highlight */}
              <td
                rowSpan={2}
                className="p-1 text-center font-black bg-[#ffff00] text-black text-sm align-middle"
              >
                {grandTotalAbsents}
              </td>
            </tr>

            {/* ─── SUMMARY ROW 2: ROUND % ───────────────────────────────────── */}
            <tr className="bg-slate-100 font-black border-b-2 border-black text-[11px]">
              {testWiseTotals.map((tot, idx) => (
                <td
                  key={idx}
                  colSpan={2}
                  className="border-r border-black p-1 text-center font-black bg-slate-200 text-slate-800"
                >
                  {tot.hasData ? `${tot.percentage}%` : "-"}
                </td>
              ))}

              {/* Blank Subject Wise columns */}
              <td colSpan={4} className="border-r border-black bg-slate-200 p-1"></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ─── 3. ANALYTICAL PERFORMANCE BAR CHART (MATCHING EXCEL) ────────────── */}
      {showChart && chartData.length > 0 && (
        <div className="p-4 bg-white border-b-2 border-black">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Subject-Wise Performance Analysis (%)
            </h4>
            <span className="text-[10px] font-bold text-slate-500">
              Target Benchmark: 85%+ (A+)
            </span>
          </div>

          <div className="w-full h-48 sm:h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 15, right: 10, left: -20, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#1e293b", fontSize: 10, fontWeight: 700 }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 20, 40, 60, 80, 100]}
                  tick={{ fill: "#475569", fontSize: 10, fontWeight: 700 }}
                  unit="%"
                />
                <Tooltip
                  formatter={(value: any) => [`${value}%`, "Percentage"]}
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    color: "#fff",
                    borderRadius: "6px",
                    fontWeight: 700,
                    fontSize: "11px",
                  }}
                />
                <Bar dataKey="percentage" fill="#4F81BD" radius={[4, 4, 0, 0]}>
                  <LabelList
                    dataKey="percentage"
                    position="top"
                    formatter={(val: any) => `${val}%`}
                    style={{
                      fill: "#0f172a",
                      fontSize: 10,
                      fontWeight: 800,
                    }}
                  />
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.percentage >= 85
                          ? "#22c55e"
                          : entry.percentage >= 70
                          ? "#4F81BD"
                          : entry.percentage >= 50
                          ? "#f59e0b"
                          : "#ef4444"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ─── 4. SIGNATURES & EVALUATION REMARKS FOOTER ───────────────────────── */}
      <div className="p-4 sm:p-5 bg-white">
        <div className="grid grid-cols-12 gap-4 items-end">
          {/* Grading Legend & Policy */}
          <div className="col-span-6 border border-slate-300 rounded p-2 bg-slate-50 text-[10px] space-y-1">
            <span className="block font-black text-slate-800 uppercase tracking-wide">
              Official Grading Scale:
            </span>
            <div className="grid grid-cols-4 gap-1 text-slate-700 font-bold">
              <span>A+ : &gt; 85%</span>
              <span>A : 76 - 85%</span>
              <span>B : 66 - 75%</span>
              <span>C : 51 - 65%</span>
              <span>D : 41 - 50%</span>
              <span>E : 33 - 40%</span>
              <span className="text-red-600 font-black">Fail : &le; 32%</span>
            </div>
          </div>

          {/* Class Teacher Signature */}
          <div className="col-span-3 text-center">
            <div className="border-b border-black w-3/4 mx-auto mb-1 h-8"></div>
            <span className="text-xs font-black uppercase text-slate-800">
              Class Teacher
            </span>
          </div>

          {/* Principal Signature */}
          <div className="col-span-3 text-center">
            <div className="border-b border-black w-3/4 mx-auto mb-1 h-8"></div>
            <span className="text-xs font-black uppercase text-slate-800">
              Principal
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
