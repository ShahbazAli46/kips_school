"use client";

import React, { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import CustomDropdown from "@/components/CustomDropdown";
import { Crown, Medal, Award, Plus, X, Search, FileDown, CheckCircle2, AlertCircle, Mail } from "lucide-react";
import {
  useGetAcademicSessionsQuery,
  useGetClassesQuery,
  useGetTestCategoriesQuery,
  useGetSectionsQuery,
  useGetResultsSeriesQuery,
} from "@/store/apiSlice";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function ResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 1. Fetch Dropdown Options via RTK Query
  const { data: sessions = [], isLoading: isLoadingSessions } = useGetAcademicSessionsQuery();
  const { data: classes = [], isLoading: isLoadingClasses } = useGetClassesQuery();
  const { data: categories = [], isLoading: isLoadingCategories } = useGetTestCategoriesQuery();
  const { data: sections = [], isLoading: isLoadingSections } = useGetSectionsQuery();

  const selectedSession = searchParams.get("session") || "";
  const selectedClass = searchParams.get("class") || "";
  const selectedType = searchParams.get("type") || "academy_series";
  const selectedSection = searchParams.get("section") || "";
  const selectedCategory = searchParams.get("category") || searchParams.get("type") || "academy_series";

  const updateURL = (key: string, value: string, additionalParams: Record<string, string> = {}) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    
    Object.entries(additionalParams).forEach(([k, v]) => {
      if (v) params.set(k, v);
      else params.delete(k);
    });

    router.replace(`?${params.toString()}`, { scroll: false });
  };

  // 2. Fetch Results via RTK Query
  const shouldFetchResults = Boolean(selectedSession && selectedClass && selectedCategory && (selectedType !== 'class_test' || selectedSection));
  const { data: results = [], isLoading: loadingResults } = useGetResultsSeriesQuery(
    {
      session: selectedSession,
      classId: selectedClass,
      category: selectedCategory,
      type: selectedType,
      section: selectedSection,
    },
    { skip: !shouldFetchResults }
  );

  const filteredCategories = categories.filter((c) => c.type === selectedType);
  const top3 = results.slice(0, 3);
  const rest = results.slice(3);

  const [isBroadcastingWhatsApp, setIsBroadcastingWhatsApp] = useState(false);
  const [showBroadcastConfirm, setShowBroadcastConfirm] = useState(false);

  const handleBroadcastWhatsApp = async () => {
    if (!selectedSession || !selectedClass || !selectedCategory) return;
    setIsBroadcastingWhatsApp(true);
    try {
      const res = await fetch(`${API}/results/whatsapp-bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          academic_session_id: selectedSession,
          academy_class_id: selectedClass,
          test_category_id: selectedCategory,
          section_id: selectedType === "class_test" && selectedSection && selectedSection !== "all" ? selectedSection : null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`✅ ${data.message} (${data.total_students} students queued with anti-ban delay).`);
        setShowBroadcastConfirm(false);
      } else {
        alert(`❌ ${data.message || "Failed to dispatch bulk WhatsApp results."}`);
      }
    } catch (err: any) {
      alert(`❌ Error: ${err.message}`);
    } finally {
      setIsBroadcastingWhatsApp(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#0f224a]">Series Results</h2>
        <p className="text-sm mt-1 text-[#2563eb]">Aggregate and view overall results for test series or class tests.</p>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-sm border border-[#bfdbfe] mb-6 flex flex-wrap gap-4 items-end">
        <div className="w-56">
          <label className="block text-xs font-bold text-[#2563eb] uppercase tracking-wide mb-1">Session</label>
          <CustomDropdown
            name="session"
            value={selectedSession}
            onChange={(name, val) => { 
              updateURL("session", val as string, { category: selectedType }); 
            }}
            placeholder="Select Session"
            options={sessions.map((s) => ({ label: s.name, value: s.id }))}
          />
        </div>
        <div className="w-48">
          <label className="block text-xs font-bold text-[#2563eb] uppercase tracking-wide mb-1">Class</label>
          <CustomDropdown
            name="class"
            value={selectedClass}
            onChange={(name, val) => { 
              updateURL("class", val as string, { category: selectedType }); 
            }}
            placeholder="Select Class"
            options={classes.map((c) => ({ label: c.name, value: c.id }))}
          />
        </div>
        <div className="w-56">
          <label className="block text-xs font-bold text-[#2563eb] uppercase tracking-wide mb-1">Type</label>
          <CustomDropdown
            name="type"
            value={selectedType}
            onChange={(name, val) => { 
              updateURL("type", val as string, { category: val as string, section: "" }); 
            }}
            placeholder="Select Type"
            options={[
              { label: "Academy Series", value: "academy_series" },
              { label: "Class Test", value: "class_test" },
            ]}
          />
        </div>
        {selectedType === "class_test" && (
          <div className="w-48">
            <label className="block text-xs font-bold text-[#2563eb] uppercase tracking-wide mb-1">Section</label>
            <CustomDropdown
              name="section"
              value={selectedSection}
              onChange={(name, val) => {
                updateURL("section", val as string);
              }}
              placeholder="Select Section"
              options={[
                { label: "All Sections", value: "all" },
                ...sections.map((s) => ({ label: s.name, value: s.id }))
              ]}
            />
          </div>
        )}
      </div>

      {selectedSession && selectedClass && (
        <div className="mb-6">
          <div className="flex flex-wrap gap-2 mb-4">
            {filteredCategories.length > 0 && (
              <button
                onClick={() => {
                  updateURL("category", selectedType);
                }}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                  selectedCategory === selectedType
                    ? "bg-[#2563eb] text-white shadow-md"
                    : "bg-white text-[#1e40af] border border-[#bfdbfe] hover:bg-blue-50"
                }`}
              >
                All Categories
              </button>
            )}
            {filteredCategories.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  updateURL("category", c.id.toString());
                }}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                  selectedCategory === c.id.toString()
                    ? "bg-[#2563eb] text-white shadow-md"
                    : "bg-white text-[#1e40af] border border-[#bfdbfe] hover:bg-blue-50"
                }`}
              >
                {c.name}
              </button>
            ))}
            {filteredCategories.length === 0 && (
              <p className="text-sm text-gray-500 italic">No categories found for this type.</p>
            )}
          </div>
        </div>
      )}

      {loadingResults && <div className="text-center py-10 text-gray-500">Calculating aggregates...</div>}

      {!loadingResults && selectedCategory && results.length === 0 && (
        <div className="text-center py-10 text-gray-500">No marks found for this series.</div>
      )}

      {!loadingResults && results.length > 0 && (
        <>
          <div className="flex justify-end gap-3 mb-4">
            <button
              onClick={() => setShowBroadcastConfirm(true)}
              disabled={isBroadcastingWhatsApp}
              className="bg-emerald-600 text-white hover:bg-emerald-700 transition px-4 py-2 rounded-lg shadow-sm font-semibold flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {isBroadcastingWhatsApp ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              )}
              {isBroadcastingWhatsApp ? "Dispatching..." : "Broadcast via WhatsApp"}
            </button>
            <a 
              href={`/dashboard/results/print-all?session=${selectedSession}&class=${selectedClass}&category=${selectedCategory}${selectedType === "class_test" && selectedSection && selectedSection !== "all" ? "&section=" + selectedSection : ""}&session_name=${sessions.find(s => s.id.toString() === selectedSession.toString())?.name || ''}&class_name=${classes.find(c => c.id.toString() === selectedClass.toString())?.name || ''}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#2563eb] text-white hover:bg-[#1e40af] transition px-4 py-2 rounded-lg shadow-sm font-semibold flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              Print Results Sheet
            </a>
          </div>

          {/* Broadcast Confirmation Modal */}
          {showBroadcastConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#bfdbfe]">
                <div className="flex items-center gap-3 mb-4 text-emerald-700">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center font-bold">
                    📢
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-[#0f224a]">Broadcast Result Cards</h3>
                    <p className="text-xs text-gray-500">Official WhatsApp Dispatch</p>
                  </div>
                </div>

                <div className="bg-[#f0f4f8] p-4 rounded-xl border border-[#bfdbfe] text-xs text-[#1e3a8a] space-y-2 mb-6">
                  <p><strong>Total Students in Class:</strong> {results.length}</p>
                  <p><strong>Category:</strong> {filteredCategories.find(c => c.id.toString() === selectedCategory)?.name || "All Categories"}</p>
                  <p className="text-[11px] text-[#2563eb]">
                    🛡️ <em>Includes anti-ban rate limiting (12–22s interval between messages, 100 limit, 5m break).</em>
                  </p>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowBroadcastConfirm(false)}
                    disabled={isBroadcastingWhatsApp}
                    className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBroadcastWhatsApp}
                    disabled={isBroadcastingWhatsApp}
                    className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow active:scale-95 disabled:opacity-50"
                  >
                    {isBroadcastingWhatsApp ? "Queuing..." : "Confirm & Send"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TOP 3 CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {top3.map((r, idx) => (
              <div key={r.student_id} onClick={() => router.push(`/dashboard/results/student-detail?id=${r.student_id}&session=${selectedSession}&class=${selectedClass}&category=${selectedCategory}`)} className={`cursor-pointer hover:scale-[1.02] transition-transform relative p-6 rounded-2xl border-2 flex flex-col items-center text-center shadow-sm overflow-hidden ${
                idx === 0 ? "border-amber-400 bg-gradient-to-b from-amber-50 to-white" :
                idx === 1 ? "border-slate-300 bg-gradient-to-b from-slate-50 to-white" :
                "border-blue-300 bg-gradient-to-b from-orange-50 to-white"
              }`}>
                {/* Medal Icon / Rank Badge */}
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
                
                <div className="mt-4 flex flex-col gap-2 w-full">
                  <div className="flex gap-4 w-full justify-center">
                    <div className="bg-white/60 px-3 py-2 rounded-lg text-sm font-semibold shadow-sm border border-black/5">
                      <span className="block text-xs text-gray-500 font-medium">Score</span>
                      <span className="text-[#2563eb]">{r.total_obtained} <span className="text-gray-400 font-normal">/ {r.total_max}</span></span>
                    </div>
                    <div className="bg-white/60 px-3 py-2 rounded-lg text-sm font-semibold shadow-sm border border-black/5">
                      <span className="block text-xs text-gray-500 font-medium">Percentage</span>
                      <span className="text-[#2563eb]">{r.percentage}%</span>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/results/student-detail?id=${r.student_id}&session=${selectedSession}&class=${selectedClass}&category=${selectedCategory}`); }} 
                    className="mt-1 w-full bg-[#f0f4f8] text-[#2563eb] border border-[#bfdbfe] hover:bg-[#2563eb] hover:text-white transition px-4 py-2 rounded-lg shadow-sm font-bold text-xs"
                  >
                    View Detailed Report
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* REST OF STUDENTS TABLE */}
          {rest.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-[#bfdbfe] overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#f0f4f8] text-[#2563eb] border-b border-[#bfdbfe]">
                  <tr>
                    <th className="px-5 py-3 w-16 text-center">Rank</th>
                    <th className="px-5 py-3">Student Name</th>
                    <th className="px-5 py-3 text-center">Tests Taken</th>
                    <th className="px-5 py-3 text-center">Absents</th>
                    <th className="px-5 py-3 text-right">Total Marks</th>
                    <th className="px-5 py-3 text-right">Percentage</th>
                    <th className="px-5 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dbeafe]">
                  {rest.map((r) => (
                    <tr key={r.student_id} onClick={() => router.push(`/dashboard/results/student-detail?id=${r.student_id}&session=${selectedSession}&class=${selectedClass}&category=${selectedCategory}`)} className="hover:bg-blue-100 cursor-pointer transition-colors">
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
                      <td className="px-5 py-3 text-center">
                        <button 
                          onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/results/student-detail?id=${r.student_id}&session=${selectedSession}&class=${selectedClass}&category=${selectedCategory}`); }} 
                          className="bg-white border border-[#bfdbfe] text-[#2563eb] hover:bg-[#f0f4f8] transition px-3 py-1.5 rounded-lg shadow-sm text-xs font-bold whitespace-nowrap"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

    </DashboardLayout>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading filters...</div>}>
      <ResultsContent />
    </Suspense>
  );
}
