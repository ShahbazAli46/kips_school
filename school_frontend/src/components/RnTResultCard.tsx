"use client";

import React, { useMemo } from "react";
import { calculateGrade, ExcelResultCardProps } from "./ExcelResultCard";

export default function RnTResultCard({
  student,
  subjects,
  tests,
  rounds,
  categoryTitle,
  sessionTitle,
  selectedRounds,
}: ExcelResultCardProps) {
  
  const finalRounds = useMemo(() => {
    let finalRoundsList = [...(rounds || [])];
    if (finalRoundsList.length === 0) {
      if (tests && tests.length > 0) {
        const uniqueTitles = Array.from(new Set(tests.map(t => t.test_title).filter(Boolean)));
        finalRoundsList = uniqueTitles.map(t => ({ title: t }));
      } else {
        finalRoundsList = [{ title: "Round 1" }];
      }
    }
    
    if (selectedRounds && selectedRounds.length > 0) {
      const selectedSet = new Set(selectedRounds.map(s => s.trim().toLowerCase()));
      const filtered = finalRoundsList.filter(r => selectedSet.has(r.title.trim().toLowerCase()));
      return filtered.length > 0 ? filtered : finalRoundsList.slice(0, 1);
    }
    
    // If no specific round was passed, default to the first round so only one round shows
    return finalRoundsList.length > 0 ? [finalRoundsList[0]] : [{ title: "Round 1" }];
  }, [rounds, tests, selectedRounds]);

  // Compute marks for each subject specifically for the displayed round(s)
  const subjectStats = useMemo(() => {
    return subjects.map((sub) => {
      const matchedTests = (tests || []).filter(
        t =>
          (String(t.subject_id) === String(sub.subject_id) || t.subject_name?.toLowerCase() === sub.subject_name?.toLowerCase()) &&
          finalRounds.some(r => r.title.toLowerCase() === t.test_title?.toLowerCase())
      );

      let max = 0;
      let obt = 0;
      let hasTests = false;

      matchedTests.forEach(t => {
        hasTests = true;
        max += Number(t.total_marks || 0);
        if (!t.is_absent) {
          obt += Number(t.obtained_marks || 0);
        }
      });

      if (!hasTests) {
        max = Number(sub.total_max || 0);
        obt = Number(sub.total_obtained || 0);
      }

      const pct = max > 0 ? Math.round((obt / max) * 100) : 0;

      return {
        ...sub,
        computed_max: max,
        computed_obtained: obt,
        computed_percentage: pct,
      };
    });
  }, [subjects, tests, finalRounds]);

  // Aggregate grand totals from subjectStats
  const grandTotalMax = useMemo(() => {
    return subjectStats.reduce((sum, s) => sum + s.computed_max, 0);
  }, [subjectStats]);

  const grandTotalObtained = useMemo(() => {
    return subjectStats.reduce((sum, s) => sum + s.computed_obtained, 0);
  }, [subjectStats]);

  const grandPercentage = grandTotalMax > 0 ? Math.round((grandTotalObtained / grandTotalMax) * 100) : 0;
  const grandGrade = calculateGrade(grandPercentage);

  const roundTitleSuffix = finalRounds.length === 1 ? ` (${finalRounds[0].title.toUpperCase()})` : '';

  return (
    <div className="w-full max-w-[297mm] mx-auto bg-white text-black p-2 print:p-0 print:m-0" style={{ fontFamily: "Arial, sans-serif" }}>
      {/* Header Info */}
      <div className="w-full flex justify-between items-end text-[10px] font-bold mb-1 px-1">
        <div>Class / Section: <span className="ml-2 font-normal border-b border-black inline-block min-w-[100px]">{student.class_name} {student.section_name}</span></div>
        {(student.class_incharge || (student as any).class_incharge_name) && (
          <div>Class Incharge: <span className="ml-2 font-bold border-b border-black inline-block min-w-[140px] uppercase">{student.class_incharge || (student as any).class_incharge_name}</span></div>
        )}
      </div>
      
      <div className="w-full grid grid-cols-3 text-[10px] font-bold mb-2 px-1">
        <div className="flex items-center">
          NAME: <span className="ml-2 font-normal border-b border-black inline-block min-w-[150px]">{student.name}</span>
        </div>
        <div className="text-center text-[12px] font-extrabold whitespace-nowrap self-center">
          STUDENT PROGRESS REPORT IN {categoryTitle?.toUpperCase() || "REVISION & TEST"}{roundTitleSuffix} - SESSION {sessionTitle}
        </div>
        <div className="text-right flex justify-end items-center">
          REG NO. <span className="ml-2 font-normal border-b border-black inline-block min-w-[60px] text-center">{student.roll_number}</span>
        </div>
      </div>

      {/* Main Table */}
      <div className="w-full overflow-x-auto print:overflow-visible">
        <table className="w-full border-collapse border border-black text-[8px]">
          <thead>
            <tr>
              {subjects.map((sub, idx) => (
                <th key={idx} colSpan={4} className="border border-black p-1 bg-gray-200 uppercase tracking-widest text-center whitespace-nowrap">
                  {sub.subject_name}
                </th>
              ))}
            </tr>
            <tr>
              {subjects.map((sub, idx) => (
                <React.Fragment key={`hdr-${idx}`}>
                  <th className="border border-black p-0.5 whitespace-nowrap font-semibold bg-gray-50 text-center">Date</th>
                  <th className="border border-black p-0.5 whitespace-nowrap font-semibold bg-gray-50 text-center">Test No.</th>
                  <th className="border border-black p-0.5 whitespace-nowrap font-semibold bg-gray-50 text-center">Total Marks</th>
                  <th className="border border-black p-0.5 whitespace-nowrap font-semibold bg-gray-50 text-center">Obtd. Marks</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {finalRounds.map((round, rIdx) => (
              <tr key={rIdx}>
                {subjects.map((sub, sIdx) => {
                  const matchingTest = (tests || []).find(
                    t =>
                      (String(t.subject_id) === String(sub.subject_id) || t.subject_name?.toLowerCase() === sub.subject_name?.toLowerCase()) &&
                      t.test_title?.toLowerCase() === round.title.toLowerCase()
                  );

                  let testDate = matchingTest?.test_date || "-";
                  let totalMarks: any = "-";
                  let obtdMarks: any = "-";

                  if (matchingTest) {
                    const isAbs = Boolean(matchingTest.is_absent) && Number(matchingTest.is_absent) !== 0;
                    totalMarks = matchingTest.total_marks || 0;
                    obtdMarks = isAbs ? "A" : (matchingTest.obtained_marks || 0);
                  }

                  return (
                    <React.Fragment key={`${rIdx}-${sIdx}`}>
                      <td className="border border-black p-0.5 text-center whitespace-nowrap">{testDate}</td>
                      <td className="border border-black p-0.5 text-center whitespace-nowrap font-medium">{round.title}</td>
                      <td className="border border-black p-0.5 text-center">{totalMarks}</td>
                      <td className={`border border-black p-0.5 text-center font-bold ${obtdMarks === 'A' ? 'text-red-600 print:text-black' : ''}`}>
                        {obtdMarks}
                      </td>
                    </React.Fragment>
                  );
                })}
              </tr>
            ))}

            {/* Total Marks Row */}
            <tr className="font-bold bg-gray-100 print:bg-transparent">
              {subjectStats.map((sub, idx) => (
                <React.Fragment key={`tm-${idx}`}>
                  <td colSpan={2} className="border border-black p-1 text-right pr-2">Total Marks</td>
                  <td className="border border-black p-1 text-center">{sub.computed_max}</td>
                  <td className="border border-black p-1 text-center">{sub.computed_obtained}</td>
                </React.Fragment>
              ))}
            </tr>

            {/* Percentage Row */}
            <tr className="font-bold bg-gray-100 print:bg-transparent">
              {subjectStats.map((sub, idx) => (
                <React.Fragment key={`pct-${idx}`}>
                  <td colSpan={2} className="border border-black p-1 text-right pr-2">Percentage</td>
                  <td colSpan={2} className="border border-black p-1 text-center">{sub.computed_percentage}%</td>
                </React.Fragment>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Summary Section */}
      <div className="w-full flex mt-6 text-[11px] font-bold">
        <div className="w-1/2 flex flex-col justify-end pl-2">
          <div className="flex items-center gap-2 mb-6">
            <span>TEACHER'S COMMENTS:</span>
            <div className="border-b border-black w-64 h-4"></div>
          </div>
          <div className="mt-6 flex items-start gap-12">
            <div>
              <div className="border-t border-black w-40 pt-1 text-center">
                <span>CLASS INCHARGE</span>
                {(student.class_incharge || (student as any).class_incharge_name) && (
                  <span className="block text-[10px] font-bold text-slate-800 mt-0.5 leading-tight uppercase break-words">
                    {student.class_incharge || (student as any).class_incharge_name}
                  </span>
                )}
              </div>
            </div>
            <div>
              <div className="border-t border-black w-36 pt-1 text-center">
                <span>PRINCIPAL</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="w-1/2 flex flex-col items-end gap-1 pr-6">
          <div className="flex w-64 justify-between">
            <span>Total Marks</span>
            <span className="w-16 text-center">{grandTotalMax}</span>
          </div>
          <div className="flex w-64 justify-between">
            <span>Total Obtained Marks</span>
            <span className="w-16 text-center">{grandTotalObtained}</span>
          </div>
          <div className="flex w-64 justify-between">
            <span>Overall Percentage</span>
            <span className="w-16 text-center">{grandPercentage}%</span>
          </div>
          <div className="flex w-64 justify-between">
            <span>Overall Grade</span>
            <span className="w-16 text-center">{grandGrade}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
