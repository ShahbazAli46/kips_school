"use client";

import React, { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export default function AttendanceSheetPrintPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [sessionName, setSessionName] = useState("");
  const [className, setClassName] = useState("");
  const [sectionName, setSectionName] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    setSessionName(params.get("session_name") || "");
    setClassName(params.get("class_name") || "");
    setSectionName(params.get("section_name") || "");

    const classId = params.get("class_id");
    const sectionId = params.get("section_id");
    const gender = params.get("gender");

    const fetchStudents = async () => {
      try {
        let url = `${API}/students?all=true`;
        if (classId) url += `&class_id=${classId}`;
        if (sectionId) url += `&section_id=${sectionId}`;
        if (gender) url += `&gender=${gender}`;

        const res = await fetch(url, { headers: getAuthHeaders() });
        const data = await res.json();
        setStudents(Array.isArray(data) ? data : (data.data || []));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
        // Automatically open print dialog after brief delay to ensure rendering
        setTimeout(() => window.print(), 500);
      }
    };

    fetchStudents();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-white">
        <div className="w-16 h-16 rounded-2xl border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
        <h3 className="text-sm font-bold text-slate-800 mt-4 tracking-wide">KIPS School Chunian</h3>
        <p className="text-xs font-medium text-blue-600 mt-1 animate-pulse">Preparing Attendance Sheet...</p>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen text-black print:p-0 p-8 max-w-5xl mx-auto font-sans">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4 portrait; margin: 12mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}} />

      {/* Institutional Header */}
      <div className="flex items-center gap-3 pb-2 border-b-2 border-black">
        <div className="w-12 h-12 flex items-center justify-center shrink-0">
           <img src="/logo.jpg" alt="Logo" className="w-full h-full object-contain grayscale" onError={(e) => {
             (e.target as HTMLImageElement).style.display = 'none';
           }}/>
        </div>
        <div>
          <h1 className="text-lg font-black uppercase tracking-wide text-black">KIPS SCHOOL CHUNIAN CAMPUS</h1>
          <p className="text-[10px] font-bold text-gray-700 mt-0.5">Topper's First Choice | Opposite Shell Pump Changa Manga Road, Chunian | 0300 39 39 581</p>
        </div>
      </div>

      {/* Page Title */}
      <div className="text-center pt-2 pb-1">
        <h2 className="text-base font-black text-black uppercase tracking-widest">Attendance Sheet</h2>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-3 mb-3 border border-gray-400 rounded-lg overflow-hidden font-bold text-xs text-black">
        <div className="p-2 border-b border-r border-gray-400 flex items-center">
          <span className="w-20 text-gray-600 uppercase text-[10px] tracking-wider">Session:</span>
          <span className="truncate">{sessionName || 'N/A'}</span>
        </div>
        <div className="p-2 border-b border-r border-gray-400 flex items-center">
          <span className="w-20 text-gray-600 uppercase text-[10px] tracking-wider">Class:</span>
          <span className="text-sm font-black truncate">{className || 'N/A'}</span>
        </div>
        <div className="p-2 border-b border-gray-400 flex items-center">
          <span className="w-20 text-gray-600 uppercase text-[10px] tracking-wider">Section:</span>
          <span className="text-xs font-bold text-slate-900 truncate">{sectionName || 'All Sections'}</span>
        </div>
        <div className="p-2 border-r border-gray-400 flex items-center">
          <span className="w-20 text-gray-600 uppercase text-[10px] tracking-wider">Students:</span>
          <span>{students.length}</span>
        </div>
        <div className="p-2 border-r border-gray-400 flex items-center">
          <span className="w-20 text-gray-600 uppercase text-[10px] tracking-wider">Date:</span>
          <span className="flex-1 border-b border-dashed border-gray-500 mt-2"></span>
        </div>
        <div className="p-2 flex items-center">
          <span className="w-20 text-gray-600 uppercase text-[10px] tracking-wider">Subject:</span>
          <span className="flex-1 border-b border-dashed border-gray-500 mt-2"></span>
        </div>
      </div>

      {/* Attendance Table */}
      <table className="w-full text-left text-[11px] border-collapse border border-gray-400 text-black">
        <thead className="bg-gray-200 text-black font-black uppercase text-[10px] tracking-wider">
          <tr>
            <th className="border border-gray-400 px-2 py-1.5 w-10 text-center">Sr.No</th>
            <th className="border border-gray-400 px-2 py-1.5 w-16 text-center">Roll No</th>
            <th className="border border-gray-400 px-2 py-1.5">Student Name</th>
            <th className="border border-gray-400 px-2 py-1.5">Father Name</th>
            <th className="border border-gray-400 px-2 py-1.5 w-28">Section</th>
            <th className="border border-gray-400 px-2 py-1.5 w-24">Major</th>
            <th className="border border-gray-400 px-2 py-1.5 w-32 text-center">Signature</th>
            <th className="border border-gray-400 px-2 py-1.5 w-24 text-center">Obt. Marks</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s, index) => (
            <tr key={s.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              <td className="border border-gray-400 px-2 py-1 text-center font-bold">{index + 1}</td>
              <td className="border border-gray-400 px-2 py-1 text-center font-bold font-mono">{s.roll_number || s.id}</td>
              <td className="border border-gray-400 px-2 py-1 font-bold uppercase">{s.name}</td>
              <td className="border border-gray-400 px-2 py-1 uppercase">{s.father_name || '-'}</td>
              <td className="border border-gray-400 px-2 py-1 font-medium text-gray-800">{s.section?.name || '-'}</td>
              <td className="border border-gray-400 px-2 py-1 font-semibold">{s.major?.name || '-'}</td>
              <td className="border border-gray-400 px-2 py-1"></td>
              <td className="border border-gray-400 px-2 py-1"></td>
            </tr>
          ))}
          {students.length === 0 && (
            <tr>
              <td colSpan={8} className="border border-gray-400 px-4 py-6 text-center text-gray-500 italic">
                No students found for this selection ({className}{sectionName ? ` • Section: ${sectionName}` : ''}).
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-gray-400">
        <p>Generated automatically by Kips School Chunian Campus System on {new Date().toLocaleDateString()}</p>
      </div>
    </div>
  );
}
