"use client";

import { useEffect, useState } from "react";
import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import ExcelResultCard from "@/components/ExcelResultCard";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  Legend
} from "recharts";

function StudentResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const id = searchParams.get("id");
  const sessionParam = searchParams.get("session");
  const classParam = searchParams.get("class");
  const categoryParam = searchParams.get("category");

  const [resolvedClass, setResolvedClass] = useState<string | null>(null);
  const [resolvedSession, setResolvedSession] = useState<string | null>(null);
  const [fallbackProfile, setFallbackProfile] = useState<any>(null);

  const [student, setStudent] = useState<any>(null);
  const [details, setDetails] = useState<any[]>([]);
  const [individualTests, setIndividualTests] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCategory, setLoadingCategory] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [selectedTestTitle, setSelectedTestTitle] = useState<string>("all");

  const session = sessionParam || resolvedSession;
  const academyClass = classParam || resolvedClass;
  const category = categoryParam || (categories.length > 0 ? categories[0].id.toString() : "1");

  // Reset test title filter when category changes
  useEffect(() => {
    setSelectedTestTitle("all");
  }, [category]);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
        const res = await fetch(`${API}/test-categories`, {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
        }
      } catch (err) {
        console.error("Failed to load categories", err);
      }
    }
    fetchCategories();
  }, []);

  // If class or session is not in URL, resolve from student profile
  useEffect(() => {
    if (!id) return;
    if (classParam && sessionParam) return;

    async function fetchStudentFallback() {
      try {
        const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
        const res = await fetch(`${API}/students/${id}`, {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        if (res.ok) {
          const s = await res.json();
          setFallbackProfile(s);
          if (s.class_id && !classParam) setResolvedClass(String(s.class_id));
          if (s.academic_session_id && !sessionParam) setResolvedSession(String(s.academic_session_id));
        }
      } catch (e) {
        console.error("Failed to fetch student profile fallback", e);
      }
    }
    fetchStudentFallback();
  }, [id, classParam, sessionParam]);

  useEffect(() => {
    if (!id || !session || !academyClass || !category) {
      const timer = setTimeout(() => {
        if (!id || !session || !academyClass || !category) {
          setLoading(false);
        }
      }, 1200);
      return () => clearTimeout(timer);
    }

    async function fetchData() {
      setLoading(true);
      try {
        const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
        const headers = {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        };

        const [detailsRes, seriesRes] = await Promise.all([
          fetch(
            `${API}/results/series/student/${id}?academic_session_id=${session}&academy_class_id=${academyClass}&test_category_id=${category}`,
            { headers }
          ),
          fetch(
            `${API}/results/series?academic_session_id=${session}&academy_class_id=${academyClass}&test_category_id=${category}`,
            { headers }
          ),
        ]);

        if (detailsRes.ok && seriesRes.ok) {
          const detailsData = await detailsRes.json();
          const seriesData = await seriesRes.json();

          let std = seriesData.find((s: any) => String(s.student_id) === String(id));
          if (!std && fallbackProfile) {
            std = {
              student_id: fallbackProfile.id,
              student_name: fallbackProfile.name,
              student_father_name: fallbackProfile.father_name,
              student_image: fallbackProfile.image,
              student_roll_number: fallbackProfile.roll_number,
              class_name: fallbackProfile.academy_class?.name || "N/A",
              section_name: fallbackProfile.section?.name || "N/A",
              rank: "—",
              total_obtained: 0,
              total_max: 0,
              percentage: 0,
            };
          }
          setStudent(std);

          if (detailsData.subjects) {
            setDetails(detailsData.subjects);
            setIndividualTests(detailsData.tests || []);
          } else {
            setDetails(Array.isArray(detailsData) ? detailsData : []);
            setIndividualTests([]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch data", err);
      } finally {
        setLoading(false);
        setLoadingCategory(false);
      }
    }

    fetchData();
  }, [id, session, academyClass, category, fallbackProfile]);

  const handleCategoryChange = (newCategoryId: string) => {
    setLoadingCategory(true);
    router.push(`/dashboard/results/student-detail?id=${id}&session=${session}&class=${academyClass}&category=${newCategoryId}`);
  };

  const handleSendEmail = async () => {
    setSendingEmail(true);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
      const res = await fetch(
        `${API}/results/email/${id}?academic_session_id=${session}&academy_class_id=${academyClass}&test_category_id=${category}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (res.ok) {
        alert("Email sent successfully!");
      } else {
        const data = await res.json();
        alert(data.message || "Failed to send email");
      }
    } catch (err) {
      alert("Error sending email");
    } finally {
      setSendingEmail(false);
    }
  };

  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);

  const handleSendWhatsApp = async () => {
    setSendingWhatsApp(true);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
      const res = await fetch(
        `${API}/results/whatsapp/${id}?academic_session_id=${session}&academy_class_id=${academyClass}&test_category_id=${category}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const data = await res.json();
      if (res.ok) {
        alert(`✅ ${data.message || "WhatsApp Result Card sent successfully!"}`);
      } else {
        alert(`❌ ${data.message || "Failed to send WhatsApp Result Card"}`);
      }
    } catch (err: any) {
      alert(`❌ Error sending WhatsApp message: ${err.message}`);
    } finally {
      setSendingWhatsApp(false);
    }
  };

  // Custom colors for bars
  const colors = ["#2563eb", "#38bdf8", "#d97706", "#1e3a8a", "#c2410c", "#b45309", "#78350f"];

  // Unique test titles for the graph filter
  const testTitles = Array.from(new Set(individualTests.map(t => t.test_title)));

  // Compute chart data based on selected test title
  const chartData = selectedTestTitle === "all"
    ? details
    : individualTests
        .filter(t => t.test_title === selectedTestTitle)
        .map(t => ({
          subject_name: t.subject_name,
          total_obtained: t.is_absent ? 0 : parseFloat(t.obtained_marks || 0),
          total_max: parseFloat(t.total_marks || 0),
          percentage: parseFloat(t.total_marks || 0) > 0 ? Number((((t.is_absent ? 0 : parseFloat(t.obtained_marks || 0)) / parseFloat(t.total_marks || 0)) * 100).toFixed(2)) : 0
        }));

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <svg className="animate-spin w-12 h-12 text-[#2563eb] mb-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          <p className="text-[#2563eb] font-semibold animate-pulse">Loading detailed results...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <button onClick={() => router.back()} className="text-[#2563eb] flex items-center gap-2 mb-6 font-semibold hover:underline">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to Results
        </button>
        <div className="bg-white rounded-xl shadow-sm p-10 text-center border border-gray-100">
          <p className="text-gray-500 italic">Student result data not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Navigation */}
        <button onClick={() => router.back()} className="text-[#2563eb] flex items-center gap-2 font-semibold hover:underline bg-white px-4 py-2 rounded-lg shadow-sm border border-[#bfdbfe] w-max">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to Dashboard
        </button>

        {/* Header Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#bfdbfe] overflow-hidden flex flex-col md:flex-row justify-between items-center p-6 gap-6 relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-orange-50 to-transparent rounded-bl-full -z-10 opacity-70"></div>
          
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-white rounded-full shadow-md border-4 border-[#f0f4f8] flex items-center justify-center text-3xl font-bold text-[#2563eb] overflow-hidden shrink-0">
               {student.student_image ? (
                 <img src={`${(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace('/api', '/storage')}/${student.student_image}`} alt={student.student_name} className="w-full h-full object-cover" />
               ) : (
                 student.student_name.charAt(0).toUpperCase()
               )}
            </div>
            <div>
              <h1 className="text-3xl font-black text-[#0f224a] mb-1">{student.student_name}</h1>
              <p className="text-[#2563eb] font-medium flex items-center gap-3">
                {student.student_father_name && <span>S/D of {student.student_father_name}</span>}
                <span className="text-xs font-bold text-white uppercase tracking-widest bg-[#38bdf8] px-2 py-0.5 rounded shadow-sm">
                  Roll: KIPS-{String(student.student_id).padStart(4, '0')}
                </span>
              </p>
              
              <div className="flex flex-wrap gap-4 mt-4">
                <div className="bg-[#f0f4f8] px-4 py-2 rounded-lg border border-[#bfdbfe]">
                  <span className="block text-[10px] text-gray-500 uppercase font-bold tracking-wider">Class Rank</span>
                  <span className="text-lg font-black text-[#2563eb]">#{student.rank}</span>
                </div>
                <div className="bg-[#f0f4f8] px-4 py-2 rounded-lg border border-[#bfdbfe]">
                  <span className="block text-[10px] text-gray-500 uppercase font-bold tracking-wider">Total Score</span>
                  <span className="text-lg font-black text-[#0f224a]">{student.total_obtained} <span className="text-sm font-medium text-gray-400">/ {student.total_max}</span></span>
                </div>
                <div className="bg-[#f0f4f8] px-4 py-2 rounded-lg border border-[#bfdbfe]">
                  <span className="block text-[10px] text-gray-500 uppercase font-bold tracking-wider">Overall Percentage</span>
                  <span className="text-lg font-black text-[#38bdf8]">{student.percentage}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              onClick={handleSendWhatsApp}
              disabled={sendingWhatsApp}
              className={`bg-emerald-600 hover:bg-emerald-700 text-white transition px-6 py-2.5 rounded-xl shadow-md text-sm font-bold flex items-center justify-center gap-2 active:scale-95 ${sendingWhatsApp ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {sendingWhatsApp ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              )}
              {sendingWhatsApp ? "Sending..." : "Send via WhatsApp"}
            </button>
            <button 
              onClick={handleSendEmail}
              disabled={sendingEmail}
              className={`text-[#2563eb] hover:bg-[#f0f4f8] bg-white border-2 border-[#2563eb] transition px-6 py-2.5 rounded-xl shadow-sm text-sm font-bold flex items-center justify-center gap-2 ${sendingEmail ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              {sendingEmail ? "Sending..." : "Email Report"}
            </button>
            <Link 
              href={`/dashboard/results/print?student_id=${student.student_id}&session=${session}&class=${academyClass}&category=${category}`}
              target="_blank"
              className="text-white hover:bg-[#1e40af] transition bg-[#2563eb] px-6 py-2.5 rounded-xl shadow-md text-sm font-bold flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              Print Result Card
            </Link>
          </div>
        </div>

        {/* Categories Filter */}
        {categories.length > 0 && (
          <div className="my-6">
            <h3 className="text-sm font-bold text-[#2563eb] uppercase tracking-wide mb-3">View Results By Category</h3>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleCategoryChange(c.id.toString())}
                  className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                    category === c.id.toString()
                      ? "bg-[#2563eb] text-white shadow-md"
                      : "bg-white text-[#1e40af] border border-[#bfdbfe] hover:bg-blue-50"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {loadingCategory && (
          <div className="flex justify-center my-10">
            <svg className="animate-spin w-8 h-8 text-[#2563eb]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          </div>
        )}

        {/* View Switcher: Official Result Card vs Analytics */}
        <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-[#bfdbfe] shadow-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedTestTitle("result_card")}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                selectedTestTitle === "result_card" || selectedTestTitle === "all"
                  ? "bg-blue-700 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              📄 Official Result Card (Excel Design)
            </button>
            <button
              onClick={() => setSelectedTestTitle("analytics")}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                selectedTestTitle === "analytics"
                  ? "bg-blue-700 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              📊 Performance Analytics
            </button>
          </div>

          <Link
            href={`/dashboard/results/print?student_id=${student.student_id}&session=${session}&class=${academyClass}&category=${category}`}
            target="_blank"
            className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1"
          >
            Open Standalone Print View &rarr;
          </Link>
        </div>

        {/* 1. Official Excel Result Card View */}
        {(selectedTestTitle === "result_card" || selectedTestTitle === "all") && !loadingCategory && (
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#bfdbfe]">
            <ExcelResultCard
              student={student}
              subjects={details}
              tests={individualTests}
              categoryTitle={categories.find((c) => c.id.toString() === category)?.name || "First Term"}
              sessionTitle={fallbackProfile?.academic_session?.name || "Session 2026-27"}
              showChart={false}
            />
          </div>
        )}

        {/* 2. Custom Graph Section */}
        {selectedTestTitle === "analytics" && !loadingCategory && details.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-[#bfdbfe] p-6">
            <h3 className="text-lg font-black text-[#1e3a8a] mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#2563eb]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              {categories.find(c => c.id.toString() === category)?.name || "Performance Analytics"}
            </h3>
            
            {testTitles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {testTitles.map((title: any) => (
                  <button
                    key={title}
                    onClick={() => setSelectedTestTitle(title)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                      selectedTestTitle === title
                        ? "bg-[#2563eb] text-white shadow-md"
                        : "bg-[#f0f4f8] text-[#2563eb] border border-[#bfdbfe] hover:bg-blue-100"
                    }`}
                  >
                    {title}
                  </button>
                ))}
              </div>
            )}

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="subject_name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 600 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip 
                    cursor={{ fill: '#f0f4f8' }} 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 rounded-xl border border-[#bfdbfe] shadow-md">
                            <p className="font-bold text-[#1e3a8a] mb-1 text-base">{label}</p>
                            <p className="text-sm font-bold text-[#2563eb]">Percentage: {data.percentage}%</p>
                            <p className="text-xs font-bold text-gray-500 mt-1 uppercase tracking-wider">Marks: {data.total_obtained} / {data.total_max}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="percentage" radius={[6, 6, 0, 0]} animationDuration={1500}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Progress Comparison Section Removed As Requested */}

        {!loadingCategory && details.length === 0 && (
          <div className="text-center py-10 bg-white rounded-xl border border-[#bfdbfe] mt-6">
            <p className="text-gray-500 font-medium">No results found for this category.</p>
          </div>
        )}

      </div>
    </div>
  );
}

import PageLoader from "@/components/PageLoader";

export default function StudentDetailedResultPage() {
  return (
    <Suspense fallback={<PageLoader text="Loading detailed results..." />}>
      <StudentResultContent />
    </Suspense>
  );
}
