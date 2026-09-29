"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Head from "next/head";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
}

import PageLoader from "@/components/PageLoader";

export default function PrintFollowUpHistoryWrapper() {
  return (
    <React.Suspense fallback={<PageLoader text="Loading follow-up history..." />}>
      <PrintFollowUpHistory />
    </React.Suspense>
  );
}

function PrintFollowUpHistory() {
  const searchParams = useSearchParams();
  const studentId = searchParams.get("student_id");
  const studentName = searchParams.get("name") || "Unknown Student";
  const contact = searchParams.get("contact") || "Not provided";
  const studentEmail = searchParams.get("email") || "Not provided";

  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!studentId) {
      setError("No student ID provided.");
      setLoading(false);
      return;
    }

    fetch(`${API}/follow-ups?student_id=${studentId}`, { headers: getAuthHeaders() })
      .then(r => {
        if (!r.ok) throw new Error("Failed to load history");
        return r.json();
      })
      .then(data => {
        setHistory(Array.isArray(data) ? data : []);
      })
      .catch(err => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
        // Print automatically when fully rendered
        setTimeout(() => {
          window.print();
        }, 1000);
      });
  }, [studentId]);

  if (loading) {
    return <div className="p-10 font-sans">Loading history for printing...</div>;
  }

  if (error) {
    return <div className="p-10 font-sans text-red-600">Error: {error}</div>;
  }

  // Helper to alternate colors and icons for timeline
  const getTimelineStyle = (index: number) => {
    const styles = [
      { bg: "bg-[#1e3a8a]", icon: "call" },
      { bg: "bg-[#004ac6]", icon: "meeting_room" },
      { bg: "bg-green-600", icon: "mail" },
      { bg: "bg-orange-600", icon: "campaign" },
    ];
    return styles[index % styles.length];
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
            .no-print { display: none !important; }
            body { background: white !important; }
            .print-container { width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
        }
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
      `}} />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

      <div className="bg-[#faf8ff] text-[#131b2e] font-sans min-h-screen flex flex-col">
        <main className="flex-1 flex flex-col min-w-0 bg-[#faf8ff] overflow-y-auto">
          {/* Report Canvas */}
          <div className="p-4 md:p-6 max-w-5xl mx-auto w-full print:p-0 print-container">
            {/* Institutional Header */}
            <div className="bg-[#1e3a8a] text-white p-8 rounded-xl shadow-md mb-8 flex flex-row items-center justify-between gap-6 print:rounded-none print:shadow-none print:p-6 print:mb-6">
              <div className="flex items-center gap-6">
                <img 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuA1q351Wo7zeLGpBytKcN56vwaSZk5sk9D6l36eUUVGAe7TCyb2pJ4byBy2fIqYLoWLLwoW8IHhb3KlCiHRFN9huJxDdwNO4Dn21Mp6zYX9Z3YSvSduf19x4ItSK789BBUvJmz-zpcX7WGWlkldvEIZu7-c1Sm4ycU0wJg5H0P8uHtJ62MujlkrdN4DJsWmEBsKsAYezLUL689tJZmnhPt2CS2cZga-vg75whH_7bkccOr9AWweEQD40adiYaiF8VUqs7Nr-u07uiU" 
                  alt="Academy Logo" 
                  className="w-24 h-24 rounded-lg bg-white p-1"
                />
                <div className="text-left">
                  <h2 className="text-3xl font-bold uppercase tracking-tight">Kips School Chunian Campus</h2>
                  <p className="text-sm opacity-80 mt-1">Topper's First Choice</p>
                  <div className="mt-3 inline-block bg-white/20 px-4 py-1.5 rounded-lg border border-white/30">
                    <h3 className="text-base font-bold uppercase tracking-widest">Absent Follow up</h3>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 text-right">
                <div className="flex items-center gap-1.5 font-semibold tracking-wide text-sm bg-white/10 border border-white/20 px-3 py-1 rounded-full mb-1">
                  <span className="material-symbols-outlined text-[16px]">call</span>
                  0300 39 39 581
                </div>
                <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold">Ref ID: KIPS-FR-{studentId?.padStart(4, '0')}</span>
                <span className="text-sm opacity-90">Generated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })}</span>
              </div>
            </div>

            {/* Student Detail Section */}
            <div className="flex flex-row mb-4 shadow-sm">
              {/* Main Info Card */}
              <div className="flex-1 bg-white border border-[#737686] rounded-l-xl p-6 flex flex-row gap-6 items-start border-r-0 border-b">
                <div className="bg-[#2563eb] text-[#eeefff] p-4 rounded-xl flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'opsz' 48" }}>person</span>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-y-4 gap-x-8">
                  <div>
                    <p className="text-xs font-semibold text-[#434655] uppercase mb-1">Student Name</p>
                    <p className="text-xl font-bold text-[#004ac6]">{studentName}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#434655] uppercase mb-1">Registration Number</p>
                    <p className="text-base font-bold">KIPS-{studentId?.padStart(4, '0')}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#434655] uppercase mb-1">Primary Contact</p>
                    <p className="text-base">{contact}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#434655] uppercase mb-1">Email Address</p>
                    <p className="text-base">{studentEmail}</p>
                  </div>
                </div>
              </div>

              {/* Status Sidebar */}
              <div className="w-64 shrink-0 bg-[#e2e7ff] border border-[#737686] rounded-r-xl p-6 flex flex-col justify-center border-l-0">
                <p className="text-xs font-semibold text-[#434655] uppercase mb-2">Account Status</p>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  <span className="text-sm font-bold">Active</span>
                </div>
                <p className="text-xs font-semibold text-[#434655] uppercase mb-2">Total Follow-ups</p>
                <p className="text-3xl font-bold text-[#004ac6]">{history.length.toString().padStart(2, '0')}</p>
              </div>
            </div>

            {/* Table-Based History */}
            <div className="mt-8">
              {history.length === 0 ? (
                 <p className="text-[#434655] italic text-center py-8">No interaction history recorded for this student.</p>
              ) : (
                <div className="border border-[#737686] shadow-sm bg-white rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#e2e7ff] text-[#131b2e]">
                      <tr>
                        <th className="py-3 px-4 border-b border-[#737686] font-bold text-xs uppercase w-16 text-center">Sr.</th>
                        <th className="py-3 px-4 border-b border-[#737686] font-bold text-xs uppercase w-32">Date</th>
                        <th className="py-3 px-4 border-b border-[#737686] font-bold text-xs uppercase">Follow up text</th>
                        <th className="py-3 px-4 border-b border-[#737686] font-bold text-xs uppercase w-48">Follow up by</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#dae2fd]">
                      {history.map((item, index) => (
                        <tr key={index} className="break-inside-avoid">
                          <td className="py-4 px-4 text-sm text-center text-[#434655] font-semibold align-top">{index + 1}</td>
                          <td className="py-4 px-4 text-sm text-[#131b2e] font-semibold align-top">{item.date}</td>
                          <td className="py-4 px-4 text-sm text-[#131b2e] align-top whitespace-pre-wrap">{item.note}</td>
                          <td className="py-4 px-4 text-sm text-[#434655] align-top">{item.creator?.name || 'Unknown User'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
