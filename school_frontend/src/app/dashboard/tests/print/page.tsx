"use client";

import React, { useEffect, useState } from "react";
import { format } from "date-fns";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export default function TestSchedulePrintPage() {
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [className, setClassName] = useState("");
  const [sessionName, setSessionName] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    setClassName(params.get("class_name") || "");
    setSessionName(params.get("session_name") || "");

    const fetchTests = async () => {
      try {
        let queryParams = new URLSearchParams();
        const sessionId = params.get("academic_session_id");
        const date = params.get("date");
        const classId = params.get("academy_class_id");
        const subjectId = params.get("subject_id");

        if (sessionId) queryParams.set("academic_session_id", sessionId);
        if (date) queryParams.set("date", date);
        if (classId) queryParams.set("academy_class_id", classId);
        if (subjectId) queryParams.set("subject_id", subjectId);

        let data: any[] = [];
        const token = localStorage.getItem("token");
        if (token) {
          try {
            const res = await fetch(`${API}/tests?${queryParams.toString()}`, {
              headers: getAuthHeaders(),
            });
            if (res.ok) data = await res.json();
          } catch {}
        }
        
        if (!Array.isArray(data) || data.length === 0) {
          const res = await fetch(`${API}/website/test-schedule`);
          if (res.ok) {
            const publicData = await res.json();
            if (Array.isArray(publicData)) {
              data = publicData.filter((t: any) => {
                let match = true;
                if (classId && classId !== "all" && String(t.academy_class_id) !== classId) match = false;
                if (subjectId && subjectId !== "all" && String(t.subject_id) !== subjectId) match = false;
                if (date && t.date !== date) match = false;
                return match;
              });
            }
          }
        }
        
        const testIdsParam = params.get("test_ids");
        const testIds = testIdsParam ? testIdsParam.split(",").filter(Boolean) : [];

        if (Array.isArray(data) && testIds.length > 0) {
          data = data.filter((t: any) => testIds.includes(String(t.id)));
        }

        // Sort tests by date ascending
        if (Array.isArray(data)) {
          data.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
          setTests(data);
        }
      } catch (err) {
        console.error("Failed to load tests for printing:", err);
      } finally {
        setLoading(false);
        setTimeout(() => {
          window.print();
        }, 600);
      }
    };

    fetchTests();
  }, []);

  if (loading) {
    return <div className="p-10 text-center font-bold text-lg">Preparing Test Schedule PDF...</div>;
  }

  return (
    <div className="bg-white min-h-screen text-black print:p-0 p-2 w-full font-sans">
      <style dangerouslySetInnerHTML={{ __html: `
        @font-face {
          font-family: 'Jameel Noori Nastaleeq';
          src: url('/jameel-noori-nastaleeq.ttf') format('truetype');
          font-weight: normal;
          font-style: normal;
        }

        .font-urdu {
          font-family: 'Jameel Noori Nastaleeq', 'Jameel Noori Nastaleeq Regular', serif !important;
        }

        @media print {
          @page { size: A4 portrait; margin: 5mm; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .no-print { display: none !important; }
        }
      `}} />

      {/* No-Print Control Bar */}
      <div className="no-print mb-6 p-4 bg-gray-100 border border-gray-300 rounded-xl flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-800">Print / PDF Preview</h3>
          <p className="text-xs text-gray-500">Click Print below or press Ctrl+P / Cmd+P to save as PDF</p>
        </div>
        <button
          onClick={() => window.print()}
          className="px-6 py-2 bg-[#2563eb] text-white font-bold rounded-lg shadow hover:bg-[#1e3a8a] transition"
        >
          Print / Download PDF
        </button>
      </div>

      {/* Institutional Header */}
      <div className="flex items-center justify-center gap-4 pb-2 relative">
        <div className="w-12 h-12 absolute left-0 top-0 flex items-center justify-center shrink-0">
          <img
            src="/logo.jpg"
            alt="Logo"
            className="w-full h-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
        <div className="text-center">
          <h1 className="text-lg font-bold tracking-tight uppercase text-black">
            KIPS SCHOOL CHUNIAN CAMPUS
          </h1>
          <p className="text-xs font-bold text-black mt-0.5">
            Opposite Shell Pump Changa Manga Road, Chunian • 0300 39 39 581
          </p>
        </div>
      </div>

      {/* Title Bar Banner */}
      <div className="mt-2 mb-2 border border-black bg-[#d8e8d8] py-1 px-4 text-center">
        <h2 className="text-sm font-black text-black uppercase tracking-wider">
          TEST SCHEDULE {className ? className : (sessionName ? sessionName : "")}
        </h2>
      </div>

      {/* Schedule Table */}
      <table className="w-full text-center border-collapse border border-black text-black">
        <thead>
          <tr className="bg-[#2563eb] text-white font-bold text-sm">
            <th className="border border-black px-2 py-1.5 w-12">Sr. #</th>
            <th className="border border-black px-3 py-1.5 w-24">Date</th>
            <th className="border border-black px-3 py-1.5 w-24">Days</th>
            <th className="border border-black px-3 py-1.5 w-32">Subject</th>
            <th className="border border-black px-2 py-1.5 w-24">Test #</th>
            <th className="border border-black px-4 py-1.5">Test Syllabus</th>
          </tr>
        </thead>
        <tbody className="text-xs">
          {tests.map((test, index) => {
            const testDate = test.date ? new Date(test.date) : null;
            const formattedDate = testDate ? format(testDate, "dd-M-yyyy") : "-";
            const dayName = testDate ? format(testDate, "EEEE") : "-";
            const syllabusText = test.syllabus || test.syllabus_english || test.syllabus_urdu || "";

            const catCode = test.test_category?.short_name || test.test_category?.name || "";
            let testNumDisplay = test.title || "";
            if (catCode && test.title && !test.title.toLowerCase().includes(catCode.toLowerCase())) {
              testNumDisplay = `${catCode} ${test.title}`;
            } else if (!testNumDisplay) {
              testNumDisplay = catCode || "-";
            }

            return (
              <tr key={test.id} className="hover:bg-gray-50">
                <td className="border border-black px-2 py-2 font-bold">{index + 1}</td>
                <td className="border border-black px-2 py-2 font-semibold whitespace-nowrap">{formattedDate}</td>
                <td className="border border-black px-2 py-2 font-semibold whitespace-nowrap">{dayName}</td>
                <td className="border border-black px-2 py-2 font-bold bg-[#fffde6] whitespace-nowrap">
                  {test.subject?.name || "-"}
                </td>
                <td className="border border-black px-2 py-2 font-bold whitespace-nowrap">
                  {testNumDisplay}
                </td>
                <td className="border border-black px-3 py-2 text-center text-sm font-urdu leading-relaxed">
                  {syllabusText || "-"}
                </td>
              </tr>
            );
          })}

          {tests.length === 0 && (
            <tr>
              <td colSpan={6} className="border border-black px-4 py-8 text-center text-gray-500 italic">
                No tests found for the selected filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Footer info */}
      <div className="mt-6 flex justify-between items-center text-[10px] text-gray-600 border-t border-gray-300 pt-2">
        <span>Kips School Chunian Campus System</span>
        <span>Printed on: {new Date().toLocaleDateString('en-GB')}</span>
      </div>
    </div>
  );
}
