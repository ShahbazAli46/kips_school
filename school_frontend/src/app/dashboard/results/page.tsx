"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import CustomDropdown from "@/components/CustomDropdown";
import { Crown, Medal, Award, Plus, X, Search, FileDown, CheckCircle2, AlertCircle, Mail, Layers } from "lucide-react";
import {
  useGetAcademicSessionsQuery,
  useGetClassesQuery,
  useGetTestCategoriesQuery,
  useGetSectionsQuery,
  useGetResultsSeriesQuery,
  useGetAvailableRoundsQuery,
} from "@/store/apiSlice";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const TEST_TYPE_OPTIONS = [
  { label: "Class Test", value: "class_test" },
  { label: "School Test", value: "school_test" },
  { label: "R n T", value: "rnt" },
];

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
  const selectedType = searchParams.get("type") || "class_test";
  const selectedSection = searchParams.get("section") || "";
  const selectedCategory = searchParams.get("category") || searchParams.get("type") || "class_test";

  const selectedClassObj = classes.find((c: any) => String(c.id) === String(selectedClass));
  const availableSections: any[] = selectedClassObj?.sections && Array.isArray(selectedClassObj.sections) && selectedClassObj.sections.length > 0
    ? selectedClassObj.sections
    : sections;

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

  const shouldFetchResults = Boolean(selectedSession && selectedClass && selectedCategory);

  // 2. Fetch Available Rounds for current session, class & category
  const { data: roundsData, isLoading: isLoadingRounds } = useGetAvailableRoundsQuery(
    {
      session: selectedSession,
      classId: selectedClass,
      category: selectedCategory,
      section: selectedSection,
    },
    { skip: !shouldFetchResults }
  );

  const availableRounds: string[] = roundsData?.rounds || [];
  const activeRounds: string[] = roundsData?.active_rounds || [];
  const roundStatuses: Record<string, { status: "completed" | "partial" | "template"; entered: number; total: number }> =
    roundsData?.round_statuses || {};

  const roundsParam = searchParams.get("rounds");

  // Derive selectedRounds directly from searchParams and availableRounds to eliminate setState inside useEffect loops
  const selectedRounds = useMemo(() => {
    if (roundsParam === "none") return [];
    if (roundsParam) {
      return roundsParam.split(",").map((r) => r.trim()).filter(Boolean);
    }
    return availableRounds;
  }, [roundsParam, availableRounds]);

  const handleToggleRound = (roundName: string) => {
    let next: string[];
    if (selectedRounds.includes(roundName)) {
      next = selectedRounds.filter((r) => r !== roundName);
    } else {
      next = [...selectedRounds, roundName];
    }
    const ordered = availableRounds.filter((r) => next.includes(r));
    updateURL("rounds", ordered.length === 0 ? "none" : ordered.join(","));
  };

  const handleSelectAllRounds = () => {
    updateURL("rounds", availableRounds.join(","));
  };

  const handleSelectActiveRounds = () => {
    const active = activeRounds.length > 0 ? activeRounds : availableRounds.slice(0, 1);
    updateURL("rounds", active.join(","));
  };

  const handleClearRounds = () => {
    updateURL("rounds", "none");
  };

  const roundsQueryString =
    roundsParam === "none"
      ? "none"
      : roundsParam
      ? roundsParam
      : undefined;

  const roundsNavQuery =
    roundsParam === "none"
      ? "&rounds=none"
      : roundsParam
      ? `&rounds=${encodeURIComponent(roundsParam)}`
      : "";

  // 3. Fetch Results via RTK Query
  const { data: results = [], isLoading: loadingResults } = useGetResultsSeriesQuery(
    {
      session: selectedSession,
      classId: selectedClass,
      category: selectedCategory,
      type: selectedType,
      section: selectedSection,
      rounds: roundsQueryString,
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
          section_id: selectedSection && selectedSection !== "all" ? selectedSection : null,
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
        <p className="text-sm mt-1 text-[#2563eb]">Aggregate and view overall results for Class Test, School Test, and R n T.</p>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-sm border border-[#bfdbfe] mb-6 flex flex-wrap gap-4 items-end">
        <div className="w-56">
          <label className="block text-xs font-bold text-[#2563eb] uppercase tracking-wide mb-1">Session</label>
          <CustomDropdown
            name="session"
            value={selectedSession}
            onChange={(name, val) => { 
              updateURL("session", val as string, { category: selectedType, rounds: "" }); 
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
              updateURL("class", val as string, { category: selectedType, section: "", rounds: "" }); 
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
              updateURL("type", val as string, { category: val as string, section: "", rounds: "" }); 
            }}
            placeholder="Select Type"
            options={TEST_TYPE_OPTIONS}
          />
        </div>
        {selectedClass && (
          <div className="w-48">
            <label className="block text-xs font-bold text-[#2563eb] uppercase tracking-wide mb-1">Section</label>
            <CustomDropdown
              name="section"
              value={selectedSection}
              onChange={(name, val) => {
                updateURL("section", val as string);
              }}
              placeholder="All Sections"
              options={[
                { label: "All Sections", value: "all" },
                ...availableSections.map((s: any) => ({ label: s.name, value: String(s.id) }))
              ]}
            />
          </div>
        )}
      </div>

      {selectedSession && selectedClass && (
        <div className="mb-6 space-y-4">
          {/* Categories Pills */}
          <div className="flex flex-wrap gap-2">
            {filteredCategories.length > 0 && (
              <button
                onClick={() => {
                  updateURL("category", selectedType, { rounds: "" });
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
                  updateURL("category", c.id.toString(), { rounds: "" });
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

          {/* Test Rounds Checkboxes List */}
          {availableRounds.length > 0 && (
            <div className="bg-white p-4 rounded-xl shadow-xs border border-[#bfdbfe]">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#2563eb]" />
                  <span className="text-xs font-bold text-[#0f224a] uppercase tracking-wider">
                    Evaluation Rounds / Test Series:
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    ({selectedRounds.length} of {availableRounds.length} selected for result cards)
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={handleSelectAllRounds}
                    className="px-2.5 py-1 rounded-md text-xs font-bold text-[#2563eb] bg-blue-50 hover:bg-blue-100 border border-blue-200 transition active:scale-95"
                  >
                    Select All
                  </button>
                  {activeRounds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleSelectActiveRounds}
                      className="px-2.5 py-1 rounded-md text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition active:scale-95"
                      title="Select only rounds that have tests in the database"
                    >
                      Conducted Only ({activeRounds.length})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleClearRounds}
                    className="px-2.5 py-1 rounded-md text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition active:scale-95"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Checkbox pills */}
              <div className="flex flex-wrap items-center gap-2.5">
                {availableRounds.map((round) => {
                  const isChecked = selectedRounds.includes(round);
                  const roundInfo = roundStatuses[round];
                  const status = roundInfo?.status || (activeRounds.includes(round) ? "partial" : "template");
                  const enteredCount = roundInfo?.entered ?? 0;
                  const totalCount = roundInfo?.total ?? 0;

                  return (
                    <label
                      key={round}
                      onClick={(e) => {
                        e.preventDefault();
                        handleToggleRound(round);
                      }}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all border select-none ${
                        isChecked
                          ? "bg-blue-50 border-[#2563eb] text-[#1e40af] shadow-xs ring-1 ring-[#2563eb]/20"
                          : "bg-slate-50/70 border-slate-200 text-slate-500 hover:bg-slate-100/70 hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded border-slate-300 text-[#2563eb] focus:ring-[#2563eb] w-3.5 h-3.5 cursor-pointer pointer-events-none"
                      />
                      <span className="font-extrabold tracking-wide text-xs">{round}</span>
                      
                      {status === "completed" && (
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9px] font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-1">
                          Completed {totalCount > 0 ? `(${totalCount}/${totalCount})` : ""}
                        </span>
                      )}

                      {status === "partial" && (
                        <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-1">
                          Partial {totalCount > 0 ? `(${enteredCount}/${totalCount})` : ""}
                        </span>
                      )}

                      {status === "template" && (
                        <span className="bg-slate-200 text-slate-600 border border-slate-300 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                          Template
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>

              {availableRounds.length > 0 && selectedRounds.length === 0 && (
                <p className="text-xs text-amber-600 font-semibold mt-2.5">
                  ⚠️ No rounds selected. Please check at least one round above to calculate and display result cards.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {loadingResults && <div className="text-center py-10 text-gray-500">Calculating aggregates...</div>}

      {!loadingResults && selectedCategory && results.length === 0 && (
        <div className="text-center py-10 text-gray-500">No marks found for this series.</div>
      )}

      {!loadingResults && results.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            {results[0]?.class_incharge ? (
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-900 px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-2xs">
                <span>👨‍🏫 Class Incharge:</span>
                <span className="text-blue-700 font-extrabold">{results[0].class_incharge}</span>
              </div>
            ) : <div />}
            <div className="flex items-center gap-3">
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
              href={`/dashboard/results/print-all?session=${selectedSession}&class=${selectedClass}&category=${selectedCategory}${selectedSection && selectedSection !== "all" ? "&section=" + selectedSection : ""}&session_name=${sessions.find(s => s.id.toString() === selectedSession.toString())?.name || ''}&class_name=${classes.find(c => c.id.toString() === selectedClass.toString())?.name || ''}${roundsNavQuery}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#2563eb] text-white hover:bg-[#1e40af] transition px-4 py-2 rounded-lg shadow-sm font-semibold flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              Print Results Sheet
            </a>
          </div>
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
              <div key={r.student_id} onClick={() => router.push(`/dashboard/results/student-detail?id=${r.student_id}&session=${selectedSession}&class=${selectedClass}&category=${selectedCategory}${roundsNavQuery}`)} className={`cursor-pointer hover:scale-[1.02] transition-transform relative p-6 rounded-2xl border-2 flex flex-col items-center text-center shadow-sm overflow-hidden ${
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
                    onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/results/student-detail?id=${r.student_id}&session=${selectedSession}&class=${selectedClass}&category=${selectedCategory}${roundsNavQuery}`); }} 
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
                    <tr key={r.student_id} onClick={() => router.push(`/dashboard/results/student-detail?id=${r.student_id}&session=${selectedSession}&class=${selectedClass}&category=${selectedCategory}${roundsNavQuery}`)} className="hover:bg-blue-100 cursor-pointer transition-colors">
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
                        <div className="flex items-center justify-center gap-1.5">
                          <button 
                            onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/results/student-detail?id=${r.student_id}&session=${selectedSession}&class=${selectedClass}&category=${selectedCategory}${roundsNavQuery}`); }} 
                            className="bg-white border border-[#bfdbfe] text-[#2563eb] hover:bg-[#f0f4f8] transition px-2.5 py-1 rounded-lg shadow-xs text-xs font-bold whitespace-nowrap"
                          >
                            Details
                          </button>
                          <a
                            href={`/dashboard/results/print?student_id=${r.student_id}&session=${selectedSession}&class=${selectedClass}&category=${selectedCategory}${roundsNavQuery}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="bg-blue-600 text-white hover:bg-blue-700 transition px-2.5 py-1 rounded-lg shadow-xs text-xs font-bold whitespace-nowrap flex items-center gap-1"
                            title="Print Official Excel Result Card"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            Card
                          </a>
                        </div>
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

import PageLoader from "@/components/PageLoader";

export default function ResultsPage() {
  return (
    <Suspense fallback={<PageLoader text="Loading results..." />}>
      <ResultsContent />
    </Suspense>
  );
}
