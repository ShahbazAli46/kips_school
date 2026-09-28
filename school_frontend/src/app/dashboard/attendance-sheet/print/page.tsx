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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    setSessionName(params.get("session_name") || "");
    setClassName(params.get("class_name") || "");

    const classId = params.get("class_id");
    const gender = params.get("gender");
    const majorId = params.get("major_id");

    const fetchStudents = async () => {
      try {
        let url = `${API}/students?all=true`;
        if (classId) url += `&class_id=${classId}`;
        if (gender) url += `&gender=${gender}`;
        if (majorId) url += `&major_id=${majorId}`;

        const res = await fetch(url, { headers: getAuthHeaders() });
        const data = await res.json();
        setStudents(data);
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
    return <div className="p-10 text-center font-medium">Preparing Attendance Sheet...</div>;
  }

  return (
    <div className="bg-white min-h-screen text-black print:p-0 p-8 max-w-5xl mx-auto">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4 portrait; margin: 15mm; }
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
          <h1 className="text-lg font-black uppercase tracking-wide text-black">Kips School Chunian Campus</h1>
          <p className="text-[10px] font-bold text-gray-700 mt-0.5">Topper's First Choice | Exchange Road, Hadi town, Chunian | 0300 39 39 581</p>
        </div>
      </div>

      {/* Page Title */}
      <div className="text-center pt-2 pb-1">
        <h2 className="text-base font-black text-black uppercase tracking-widest">Attendance Sheet</h2>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 mb-3 border border-gray-400 rounded-lg overflow-hidden font-bold text-xs text-black">
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
          <span>{students.length}</span>
        </div>
        <div className="p-2 flex items-center">
          <span className="w-28 text-gray-600 uppercase text-[10px] tracking-wider">Subject Name:</span>
          <span className="flex-1 border-b border-dashed border-gray-500 mt-2"></span>
        </div>
      </div>

      {/* Attendance Table */}
      <table className="w-full text-left text-[11px] border-collapse border border-gray-400 text-black">
        <thead className="bg-gray-200 text-black font-black uppercase text-[10px] tracking-wider">
          <tr>
            <th className="border border-gray-400 px-2 py-1 w-12 text-center">Sr.No</th>
            <th className="border border-gray-400 px-2 py-1 w-16 text-center">Reg.No</th>
            <th className="border border-gray-400 px-2 py-1">Student Name</th>
            <th className="border border-gray-400 px-2 py-1">Father Name</th>
            <th className="border border-gray-400 px-2 py-1 w-24">Major</th>
            <th className="border border-gray-400 px-2 py-1 w-32 text-center">Signature</th>
            <th className="border border-gray-400 px-2 py-1 w-24 text-center">Obt. Marks</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s, index) => (
            <tr key={s.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-100"}>
              <td className="border border-gray-400 px-2 py-1 text-center font-bold">{index + 1}</td>
              <td className="border border-gray-400 px-2 py-1 text-center font-bold">{s.id}</td>
              <td className="border border-gray-400 px-2 py-1 font-bold uppercase">{s.name}</td>
              <td className="border border-gray-400 px-2 py-1 uppercase">{s.father_name || '-'}</td>
              <td className="border border-gray-400 px-2 py-1 font-semibold">{s.major?.name || '-'}</td>
              <td className="border border-gray-400 px-2 py-1"></td>
              <td className="border border-gray-400 px-2 py-1"></td>
            </tr>
          ))}
          {students.length === 0 && (
            <tr>
              <td colSpan={7} className="border border-gray-400 px-4 py-6 text-center text-gray-500 italic">
                No students found for this class.
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
