"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function PrintContent() {
  const searchParams = useSearchParams();
  const studentId = searchParams.get("student_id");
  const sessionId = searchParams.get("session");
  const classId = searchParams.get("class");
  const categoryId = searchParams.get("category");

  const [student, setStudent] = useState<any>(null);
  const [details, setDetails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId || !sessionId || !classId || !categoryId) return;

    async function fetchData() {
      try {
        const headers = {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        };

        const [detailsRes, seriesRes] = await Promise.all([
          fetch(
            `${API}/results/series/student/${studentId}?academic_session_id=${sessionId}&academy_class_id=${classId}&test_category_id=${categoryId}&_t=${Date.now()}`,
            { headers }
          ),
          fetch(
            `${API}/results/series?academic_session_id=${sessionId}&academy_class_id=${classId}&test_category_id=${categoryId}&_t=${Date.now()}`,
            { headers }
          ),
        ]);

        if (detailsRes.ok && seriesRes.ok) {
          const detailsData = await detailsRes.json();
          const seriesData = await seriesRes.json();

          const std = seriesData.find((s: any) => String(s.student_id) === String(studentId));
          setStudent(std);
          setDetails(detailsData.subjects ? detailsData.subjects : (Array.isArray(detailsData) ? detailsData : []));

          setTimeout(() => {
            window.print();
          }, 1000);
        }
      } catch (err) {
        console.error("Failed to fetch print data", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [studentId, sessionId, classId, categoryId]);

  if (loading) {
    return <div className="p-10 font-sans text-center">Loading Report Card...</div>;
  }

  if (!student) {
    return <div className="p-10 text-center font-bold text-red-600">Failed to load student data.</div>;
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
            .no-print { display: none !important; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
            body { background-color: white !important; }
            @page { margin: 0; size: A4 portrait; }
            header, nav, aside { display: none !important; }
            
            /* Force borders to be darker and visible on print */
            .border-gray-200 { border-color: #9ca3af !important; }
            .divide-gray-200 > :not([hidden]) ~ :not([hidden]) { border-color: #9ca3af !important; }
            
            /* Make sure table borders are solid */
            table, th, td { border-style: solid !important; border-width: 1px !important; border-color: #9ca3af !important; }
        }
      `}} />

      <div className="min-h-screen bg-[#f7f6e8] text-[#222] font-sans p-8 flex justify-center print:p-6 print:bg-white">
        {/* Soft modern wrapper */}
        <div className="w-full max-w-4xl bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="w-full h-full p-8 print:p-6 flex flex-col">
            
            {/* Institutional Header */}
            <div className="bg-[#1e3a8a] text-white p-6 rounded-xl shadow-sm mb-8 flex flex-row items-center print:rounded-none print:shadow-none relative">
              <img 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuA1q351Wo7zeLGpBytKcN56vwaSZk5sk9D6l36eUUVGAe7TCyb2pJ4byBy2fIqYLoWLLwoW8IHhb3KlCiHRFN9huJxDdwNO4Dn21Mp6zYX9Z3YSvSduf19x4ItSK789BBUvJmz-zpcX7WGWlkldvEIZu7-c1Sm4ycU0wJg5H0P8uHtJ62MujlkrdN4DJsWmEBsKsAYezLUL689tJZmnhPt2CS2cZga-vg75whH_7bkccOr9AWweEQD40adiYaiF8VUqs7Nr-u07uiU" 
                alt="Academy Logo" 
                className="w-24 h-24 bg-white p-1 rounded-lg absolute left-6"
              />
              <div className="w-full text-center">
                <h2 className="text-3xl font-black uppercase tracking-tight font-sans">Kips School Chunian Campus</h2>
                <p className="text-sm opacity-90 mt-1 font-bold">Topper's First Choice</p>
                <p className="text-xs opacity-80 mt-1 font-medium tracking-wide">Exchange Road, Hadi Town Chunian, 0300 39 39 581</p>
                <div className="mt-3 inline-block bg-white/20 px-4 py-1.5 rounded-lg border border-white/30">
                  <h3 className="text-base font-black uppercase tracking-widest">Student Report Card</h3>
                </div>
              </div>

              <div className="w-24 h-24 bg-white p-1 rounded-lg absolute right-6 flex items-center justify-center text-4xl font-bold text-[#1e3a8a] overflow-hidden shadow-sm">
                {student.student_image ? (
                  <img src={`${API.replace('/api', '/storage')}/${student.student_image}`} alt={student.student_name} className="w-full h-full object-cover rounded-md" />
                ) : (
                  student.student_name?.charAt(0).toUpperCase() || '?'
                )}
              </div>
            </div>

            {/* Top Grid Info */}
            <div className="grid grid-cols-2 border border-gray-200 rounded-lg mb-8 bg-transparent text-sm font-bold uppercase overflow-hidden">
              <div className="border-r border-b border-gray-200 py-2 px-4 flex">
                <span className="w-32 text-[#555]">Name:</span>
                <span className="text-[#000]">{student.student_name}</span>
              </div>
              <div className="border-b border-gray-200 py-2 px-4 flex">
                <span className="w-32 text-[#555]">Father Name:</span>
                <span className="text-[#000]">{student.student_father_name || 'N/A'}</span>
              </div>
              
              <div className="border-r border-b border-gray-200 py-2 px-4 flex">
                <span className="w-32 text-[#555]">Roll Number:</span>
                <span className="text-[#000]">KIPS-{studentId?.padStart(4, '0')}</span>
              </div>
              <div className="border-b border-gray-200 py-2 px-4 flex">
                <span className="w-32 text-[#555]">Session:</span>
                <span className="text-[#000]">{student.session_name || '2025-2026'}</span>
              </div>

              <div className="border-r border-b border-gray-200 py-2 px-4 flex">
                <span className="w-32 text-[#555]">Class & Sec:</span>
                <span className="text-[#000]">
                  {student.class_name ? `${student.class_name} ${student.section_name || ''}`.trim() : 'N/A'}
                </span>
              </div>
              <div className="border-b border-gray-200 py-2 px-4 flex">
                <span className="w-32 text-[#555]">Major:</span>
                <span className="text-[#000]">{student.major_name || 'N/A'}</span>
              </div>

              <div className="border-r border-gray-200 py-2 px-4 flex">
                <span className="w-32 text-[#555]">Rank:</span>
                <span className="text-[#000]">#{student.rank}</span>
              </div>
              <div className="py-2 px-4 flex">
              </div>
            </div>

            {/* Grades Table */}
            <div className="rounded-lg overflow-hidden border border-gray-200 mb-8">
              <table className="w-full text-center border-collapse font-bold">
                <thead>
                  <tr className="uppercase text-sm tracking-widest bg-[#333a45] text-white">
                    <th className="py-2 px-4 text-left w-2/5">Subject</th>
                    <th className="py-2 px-4 bg-[#8b939f] w-1/5">Tests Taken</th>
                    <th className="py-2 px-4 bg-[#8b939f] w-1/5">Marks</th>
                    <th className="py-2 px-4 w-1/5">Percentage</th>
                  </tr>
                </thead>
                <tbody className="bg-transparent text-[#333] font-bold divide-y divide-gray-200">
                  {details.map((d: any, i: number) => {
                    const getGradeColor = (p: number) => {
                      if (p >= 80) return "text-[#629755]"; // green
                      if (p >= 60) return "text-[#d19a2e]"; // yellow/orange
                      return "text-[#c25953]"; // red
                    };
                    return (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="py-2 px-4 text-left capitalize text-[#000] border-r border-gray-200">{d.subject_name}</td>
                        <td className="py-2 px-4 text-[#8b939f] border-r border-gray-200">{d.tests_taken}</td>
                        <td className="py-2 px-4 text-[#8b939f] border-r border-gray-200">{d.total_obtained} <span className="text-xs">/ {d.total_max}</span></td>
                        <td className={`py-2 px-4 ${getGradeColor(d.percentage)}`}>{d.percentage}%</td>
                      </tr>
                    );
                  })}
                  {/* Fill empty rows to match the height of the paper if needed */}
                  {Array.from({ length: Math.max(0, 8 - details.length) }).map((_, i) => (
                    <tr key={`empty-${i}`}>
                      <td className="py-2 px-4 text-transparent border-r border-gray-200">-</td>
                      <td className="py-2 px-4 border-r border-gray-200"></td>
                      <td className="py-2 px-4 border-r border-gray-200"></td>
                      <td className="py-2 px-4"></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Grid Info */}
            <div className="grid grid-cols-2 border border-gray-200 rounded-lg mb-6 bg-transparent text-sm font-bold uppercase overflow-hidden">
              <div className="border-r border-b border-gray-200 py-2 px-4 flex items-center">
                <span className="w-40 text-[#555]">Total Score:</span>
                <span className="text-[#000]">{student.total_obtained} <span className="text-xs">/ {student.total_max}</span></span>
              </div>
              <div className="border-b border-gray-200 py-2 px-4 flex items-center">
                <span className="w-40 text-[#555]">Overall Percentage:</span>
                <span className="text-[#000]">{student.percentage}%</span>
              </div>
              
              <div className="border-r border-gray-200 py-2 px-4 flex items-center">
                <span className="w-40 text-[#555]">Tests Evaluated:</span>
                <span className="text-[#000]">{student.tests_taken}</span>
              </div>
              <div className="py-2 px-4 flex items-center">
                <span className="w-40 text-[#555]">Final Grade:</span>
                <span className={`text-[#000] ${
                  student.percentage >= 80 ? 'text-[#629755]' :
                  student.percentage >= 60 ? 'text-[#d19a2e]' :
                  'text-[#c25953]'
                }`}>
                  {student.percentage >= 90 ? 'A+' : student.percentage >= 80 ? 'A' : student.percentage >= 70 ? 'B' : student.percentage >= 60 ? 'C' : 'F'}
                </span>
              </div>
            </div>

            {/* Remarks */}
            <div className="border border-gray-200 rounded-lg py-3 px-4 flex items-center gap-4 bg-white">
              <span className="text-[#1e3a8a] font-black uppercase tracking-widest text-sm whitespace-nowrap">Remarks:</span>
              <span className="text-[#333] font-bold text-sm italic">
                {(() => {
                  const p = student.percentage;
                  if (p >= 93) return "Bravo! Look and work for top position in Board Exams.";
                  if (p >= 80) return "Perfection and consistency is needed. Best of luck for coming papers.";
                  if (p >= 70) return "Long productive sitting at home is required.";
                  if (p >= 60) return "Plan and start working with a serious attitude immediately.";
                  if (p >= 50) return "It is just a PASSING efficiency. Work hard to show better than it.";
                  if (p >= 33) return "Serious hard work in all subjects is needed.";
                  return "Serious hard work in all subjects is needed. It is a weak performance. !";
                })()}
              </span>
            </div>



          </div>
        </div>
      </div>
    </>
  );
}

import PageLoader from "@/components/PageLoader";

export default function PrintPageWrapper() {
  return (
    <Suspense fallback={<PageLoader text="Loading print tools..." />}>
      <PrintContent />
    </Suspense>
  );
}
