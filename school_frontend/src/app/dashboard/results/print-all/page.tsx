"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Crown, Medal, Award } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function ResultsPrintAllContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");
  const classId = searchParams.get("class");
  const categoryId = searchParams.get("category");
  const sectionId = searchParams.get("section");
  const sessionName = searchParams.get("session_name") || "";
  const className = searchParams.get("class_name") || "";

  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId || !classId || !categoryId) return;

    const fetchResults = async () => {
      try {
        let url = `${API}/results/series?academic_session_id=${sessionId}&academy_class_id=${classId}&test_category_id=${categoryId}`;
        if (sectionId && sectionId !== "all") {
          url += `&section_id=${sectionId}`;
        }

        const res = await fetch(url, { headers: getAuthHeaders() });
        const data = await res.json();
        setResults(data);
      } catch (err) {
        console.error("Failed to fetch results", err);
      } finally {
        setLoading(false);
        // Automatically open print dialog after brief delay to ensure rendering
        setTimeout(() => window.print(), 800);
      }
    };

    fetchResults();
  }, [sessionId, classId, categoryId, sectionId]);

  if (loading) {
    return <div className="p-10 text-center font-medium">Preparing Results Sheet...</div>;
  }

  const top3 = results.slice(0, 3);
  const rest = results.slice(3);

  return (
    <div className="bg-[#f7f6e8] min-h-screen text-black print:p-0 print:bg-white p-8 max-w-5xl mx-auto">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4 portrait; margin: 15mm; }
          body { background-color: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          * { font-family: Arial, Helvetica, sans-serif !important; }
        }
      `}} />

      {/* Institutional Header */}
      <div className="flex items-center gap-3 pb-2 border-b-2 border-black mb-4">
        <div className="w-12 h-12 flex items-center justify-center shrink-0">
           <img src="/logo.jpg" alt="Logo" className="w-full h-full object-contain grayscale" onError={(e) => {
             (e.target as HTMLImageElement).style.display = 'none';
           }}/>
        </div>
        <div>
          <h1 className="text-lg font-black uppercase tracking-wide text-black">Kips School Chunian Campus</h1>
          <p className="text-[10px] font-bold text-gray-700 mt-0.5">Topper's First Choice | Exchange Road, Hadi town, Chunian | 0300 39 39 581</p>
        </div>
      </div>

      {/* Page Title */}
      <div className="text-center pt-2 pb-1 mb-4">
        <h2 className="text-base font-black text-black uppercase tracking-widest">Results Sheet</h2>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 mb-8 border border-gray-400 rounded-lg overflow-hidden font-bold text-xs text-black bg-white">
        <div className="p-2 border-b border-r border-gray-400 flex items-center">
          <span className="w-28 text-gray-600 uppercase text-[10px] tracking-wider">Session:</span>
          <span>{sessionName || 'N/A'}</span>
        </div>
        <div className="p-2 border-b border-gray-400 flex items-center">
          <span className="w-28 text-gray-600 uppercase text-[10px] tracking-wider">Class:</span>
          <span className="text-sm">{className || 'N/A'}</span>
        </div>
        <div className="p-2 border-r border-gray-400 flex items-center">
          <span className="w-28 text-gray-600 uppercase text-[10px] tracking-wider">Total Students:</span>
          <span>{results.length}</span>
        </div>
        <div className="p-2 flex items-center">
          <span className="w-28 text-gray-600 uppercase text-[10px] tracking-wider">Type:</span>
          <span>Results Overview</span>
        </div>
      </div>

      {/* TOP 3 CARDS */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 print:break-inside-avoid">
          {top3.map((r, idx) => (
            <div key={r.student_id} className={`relative p-6 rounded-2xl border-2 flex flex-col items-center text-center shadow-sm overflow-hidden ${
              idx === 0 ? "border-amber-400 bg-gradient-to-b from-amber-50 to-white" :
              idx === 1 ? "border-slate-300 bg-gradient-to-b from-slate-50 to-white" :
              "border-blue-300 bg-gradient-to-b from-orange-50 to-white"
            }`}>
              {/* Rank Badge */}
              <div className={`absolute top-0 right-0 w-12 h-12 flex items-center justify-center font-black text-xl rounded-bl-2xl shadow-sm ${
                idx === 0 ? "bg-amber-400 text-amber-900" :
                idx === 1 ? "bg-slate-300 text-slate-800" :
                "bg-orange-300 text-orange-900"
              }`}>
                #{r.rank}
              </div>
              
              <div className="relative mb-4 mt-2">
                {idx === 0 && (
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-20">
                    <Crown className="text-[#2563eb] drop-shadow-md" size={36} fill="#2563eb" strokeWidth={1.5} />
                  </div>
                )}
                {idx === 1 && (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-20">
                    <Medal className="text-slate-400 drop-shadow-md" size={28} fill="#cbd5e1" strokeWidth={1.5} />
                  </div>
                )}
                {idx === 2 && (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-20">
                    <Award className="text-orange-400 drop-shadow-md" size={28} fill="#fdba74" strokeWidth={1.5} />
                  </div>
                )}
                <div className={`w-20 h-20 bg-white rounded-full shadow-md border-4 ${
                  idx === 0 ? 'border-[#2563eb]' : 
                  idx === 1 ? 'border-slate-300' : 
                  'border-blue-300'
                } flex items-center justify-center text-2xl font-bold text-[#2563eb] overflow-hidden relative z-10`}>
                    {r.student_image ? (
                      <img src={`${API.replace('/api', '/storage')}/${r.student_image}`} alt={r.student_name} className="w-full h-full object-cover" />
                    ) : (
                      r.student_name.charAt(0).toUpperCase()
                    )}
                </div>
              </div>
              
              <h3 className="font-bold text-2xl text-gray-900 mb-0">{r.student_name}</h3>
              {r.student_father_name && (
                <p className="text-sm font-semibold text-[#2563eb] mt-1 mb-0.5">{r.student_father_name}</p>
              )}
              <p className="text-xs font-bold text-[#38bdf8] uppercase tracking-wider mb-1">Roll: KIPS-{String(r.student_id).padStart(4, '0')}</p>
              
              <div className="mt-4 flex gap-4 w-full justify-center">
                <div className="bg-white/60 px-3 py-2 rounded-lg text-sm font-semibold shadow-sm border border-black/5">
                  <span className="block text-xs text-gray-500 font-medium">Score</span>
                  <span className="text-[#2563eb]">{r.total_obtained} <span className="text-gray-400 font-normal">/ {r.total_max}</span></span>
                </div>
                <div className="bg-white/60 px-3 py-2 rounded-lg text-sm font-semibold shadow-sm border border-black/5">
                  <span className="block text-xs text-gray-500 font-medium">Percentage</span>
                  <span className="text-[#2563eb]">{r.percentage}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* REST OF STUDENTS TABLE */}
      {rest.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-[#bfdbfe] overflow-hidden print:break-before-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f0f4f8] text-[#2563eb] border-b border-[#bfdbfe]">
              <tr>
                <th className="px-5 py-3 w-16 text-center">Rank</th>
                <th className="px-5 py-3">Student Name</th>
                <th className="px-5 py-3 text-center">Tests Taken</th>
                <th className="px-5 py-3 text-center">Absents</th>
                <th className="px-5 py-3 text-right">Total Marks</th>
                <th className="px-5 py-3 text-right">Percentage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dbeafe]">
              {rest.map((r) => (
                <tr key={r.student_id} className="transition-colors print:break-inside-avoid">
                  <td className="px-5 py-3 font-bold text-gray-500 text-center">#{r.rank}</td>
                  <td className="px-5 py-3 font-medium text-[#1e3a8a]">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-[#2563eb] overflow-hidden shrink-0">
                          {r.student_image ? <img src={`${API.replace('/api', '/storage')}/${r.student_image}`} className="w-full h-full object-cover" /> : r.student_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold leading-tight">{r.student_name}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            {r.student_father_name && (
                              <span className="text-[11px] font-semibold text-[#2563eb]">
                                {r.student_father_name}
                              </span>
                            )}
                            <span className="text-[10px] font-bold text-[#38bdf8] uppercase tracking-wider">
                              Roll: KIPS-{String(r.student_id).padStart(4, '0')}
                            </span>
                          </div>
                        </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-center text-gray-600">{r.tests_taken}</td>
                  <td className="px-5 py-3 text-center text-gray-600">
                    {r.total_absents > 0 ? <span className="text-red-500 font-bold">{r.total_absents}</span> : "0"}
                  </td>
                  <td className="px-5 py-3 text-right text-[#1e40af] font-semibold">{r.total_obtained} <span className="text-gray-400 font-normal">/ {r.total_max}</span></td>
                  <td className="px-5 py-3 text-right font-bold text-[#2563eb]">{r.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-gray-400">
        <p>Generated automatically by Kips School Chunian Campus System on {new Date().toLocaleDateString()}</p>
      </div>
    </div>
  );
}

import PageLoader from "@/components/PageLoader";

export default function ResultsPrintAllPage() {
  return (
    <Suspense fallback={<PageLoader text="Loading all result cards..." />}>
      <ResultsPrintAllContent />
    </Suspense>
  );
}
