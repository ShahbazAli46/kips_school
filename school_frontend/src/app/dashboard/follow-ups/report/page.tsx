"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Printer, ArrowLeft, Download, Filter } from "lucide-react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
}

interface FollowUpReportItem {
  id: number;
  student_id: number;
  date: string;
  note: string;
  creator?: { name: string };
  student?: {
    id: number;
    name: string;
    contact_number: string | null;
    academyClass?: { name: string };
    section?: { name: string };
  };
}

import PageLoader from "@/components/PageLoader";

export default function FollowUpReportPageWrapper() {
  return (
    <Suspense fallback={<PageLoader text="Loading follow-up report..." />}>
      <FollowUpReportContent />
    </Suspense>
  );
}

function FollowUpReportContent() {
  const searchParams = useSearchParams();
  const todayStr = new Date().toISOString().split("T")[0];

  const [date, setDate] = useState<string>(searchParams.get("date") || todayStr);
  const [classId, setClassId] = useState<string>(searchParams.get("class_id") || "");
  const [sectionId, setSectionId] = useState<string>(searchParams.get("section_id") || "");

  const [classes, setClasses] = useState<{ id: number; name: string }[]>([]);
  const [sections, setSections] = useState<{ id: number; name: string }[]>([]);
  const [reports, setReports] = useState<FollowUpReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/classes`, { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(d => setClasses(Array.isArray(d) ? d : []))
      .catch(() => {});

    fetch(`${API}/sections`, { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(d => setSections(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const fetchReports = () => {
    setLoading(true);
    let url = `${API}/follow-ups?`;
    if (date) url += `date=${date}&`;
    if (classId) url += `class_id=${classId}&`;
    if (sectionId) url += `section_id=${sectionId}&`;

    fetch(url, { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(data => {
        setReports(Array.isArray(data) ? data : []);
      })
      .catch(err => console.error("Error loading follow-up reports:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReports();
  }, [date, classId, sectionId]);

  const selectedClassName = classes.find(c => String(c.id) === classId)?.name || "All Classes";
  const selectedSectionName = sections.find(s => String(s.id) === sectionId)?.name || "All Sections";
  const formattedDate = date ? format(new Date(date), "PPP") : "All Dates";

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
            .no-print { display: none !important; }
            body { background: white !important; color: black !important; }
            .print-container { width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
            .print-card { border: none !important; shadow: none !important; }
        }
      `}} />

      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-16">
        {/* Top Control Bar (Hidden on Print) */}
        <div className="no-print bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/dashboard/follow-ups" className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Follow-up Summary Report</h1>
                <p className="text-xs text-gray-500">Filter, view, print and export follow-up reports across all classes and sections.</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 rounded-xl font-bold text-white transition flex items-center gap-2 shadow-sm"
                style={{ background: "linear-gradient(135deg, #2563eb, #1e3a8a)" }}
              >
                <Printer className="w-4 h-4" />
                Print / Save PDF
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-[#f0f4f8] border-t border-brand-100 py-3 px-6">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-xs font-bold text-[#2563eb] uppercase tracking-wide">
                <Filter className="w-4 h-4" />
                Filters:
              </div>

              <div>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-brand-200 text-xs bg-white text-gray-900 font-medium outline-none"
                />
              </div>

              <div>
                <select
                  value={classId}
                  onChange={(e) => { setClassId(e.target.value); setSectionId(""); }}
                  className="px-3 py-1.5 rounded-lg border border-brand-200 text-xs bg-white text-gray-900 font-medium outline-none"
                >
                  <option value="">All Classes</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <select
                  value={sectionId}
                  onChange={(e) => setSectionId(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-brand-200 text-xs bg-white text-gray-900 font-medium outline-none"
                >
                  <option value="">All Sections</option>
                  {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {(date || classId || sectionId) && (
                <button
                  onClick={() => { setDate(""); setClassId(""); setSectionId(""); }}
                  className="text-xs text-[#2563eb] underline font-semibold hover:text-[#1e3a8a]"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Report Document Body */}
        <div className="max-w-5xl mx-auto mt-6 px-4 md:px-0 print:m-0 print:p-0 print-container">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 print-card print:border-none print:shadow-none">
            
            {/* Header */}
            <div className="border-b-2 border-brand-800 pb-6 mb-6 flex flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <img 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuA1q351Wo7zeLGpBytKcN56vwaSZk5sk9D6l36eUUVGAe7TCyb2pJ4byBy2fIqYLoWLLwoW8IHhb3KlCiHRFN9huJxDdwNO4Dn21Mp6zYX9Z3YSvSduf19x4ItSK789BBUvJmz-zpcX7WGWlkldvEIZu7-c1Sm4ycU0wJg5H0P8uHtJ62MujlkrdN4DJsWmEBsKsAYezLUL689tJZmnhPt2CS2cZga-vg75whH_7bkccOr9AWweEQD40adiYaiF8VUqs7Nr-u07uiU" 
                  alt="Academy Logo" 
                  className="w-20 h-20 rounded-lg p-1 border border-gray-200 shrink-0"
                />
                <div>
                  <h2 className="text-2xl font-black text-[#1e3a8a] uppercase tracking-tight">Kips School Chunian Campus</h2>
                  <p className="text-xs font-semibold text-[#2563eb] uppercase tracking-wider mt-0.5">Absent Student Follow-up Comments Report</p>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-600 font-medium">
                    <span className="bg-brand-50 text-brand-800 px-2.5 py-0.5 rounded border border-brand-200">Date: <strong>{formattedDate}</strong></span>
                    <span className="bg-brand-50 text-brand-800 px-2.5 py-0.5 rounded border border-brand-200">Class: <strong>{selectedClassName}</strong></span>
                    <span className="bg-brand-50 text-brand-800 px-2.5 py-0.5 rounded border border-brand-200">Section: <strong>{selectedSectionName}</strong></span>
                  </div>
                </div>
              </div>

              <div className="text-right text-xs text-gray-500 font-medium hidden sm:block">
                <p>Generated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })}</p>
                <p className="mt-1 font-mono text-[11px] text-gray-400">Total Entries: {reports.length}</p>
              </div>
            </div>

            {/* Content Table */}
            {loading ? (
              <div className="text-center py-20 text-gray-500 font-medium">Loading report records...</div>
            ) : reports.length === 0 ? (
              <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <p className="text-gray-500 font-medium text-sm">No follow-up comments found for the selected filters.</p>
                <p className="text-gray-400 text-xs mt-1">Try changing the required date or class/section filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#f0f4f8] border-b-2 border-brand-200 text-[#2563eb]">
                      <th className="px-4 py-3 font-bold uppercase tracking-wider w-12 text-center">#</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider">Student Name</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider">Class &amp; Section</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider">Contact Number</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider">Follow-up Comment</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">Date &amp; Recorded By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-gray-800">
                    {reports.map((item, idx) => {
                      const st = item.student;
                      const cName = st?.academyClass?.name || "";
                      const sName = st?.section?.name || "";
                      const classSec = [cName, sName].filter(Boolean).join(" - ") || "N/A";

                      return (
                        <tr key={item.id} className="hover:bg-gray-50 print:hover:bg-transparent">
                          <td className="px-4 py-3 font-bold text-gray-500 text-center">{idx + 1}</td>
                          <td className="px-4 py-3 font-bold text-[#0f224a] text-sm">
                            {st?.name || `Student #${item.student_id}`}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold px-2 py-0.5 rounded bg-brand-50 text-brand-900 border border-brand-200">
                              {classSec}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-gray-600">
                            {st?.contact_number || "Not provided"}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900 leading-relaxed max-w-xs">
                            {item.note}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="font-bold text-[#2563eb]">{item.date}</div>
                            <div className="text-[10px] text-gray-500">By: {item.creator?.name || "System"}</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer Signatures for Printed Document */}
            <div className="mt-16 pt-8 border-t border-gray-200 flex justify-between items-end text-xs text-gray-600">
              <div className="text-center">
                <div className="w-40 border-b border-gray-400 mb-1"></div>
                <p className="font-semibold">Prepared By</p>
              </div>
              <div className="text-center">
                <div className="w-40 border-b border-gray-400 mb-1"></div>
                <p className="font-semibold">Principal / Authority Signature</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
