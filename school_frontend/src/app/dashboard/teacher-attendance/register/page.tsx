"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";
import { format, parseISO, getDay } from "date-fns";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

interface TeacherRegisterItem {
  teacher_id: number;
  name: string;
  email: string;
  contact_number: string | null;
  qualification: string | null;
  subjects: string[];
  daily: Record<number, { status: "Present" | "Absent" | "Leave" | null; check_in: string | null; check_out: string | null }>;
  summary: {
    present: number;
    absent: number;
    leave: number;
    total_marked: number;
    percentage: number;
  };
}

const WEEKDAY_INITIALS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function TeacherAttendanceRegisterPage() {
  const [month, setMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [teachers, setTeachers] = useState<TeacherRegisterItem[]>([]);
  const [daysInMonth, setDaysInMonth] = useState(30);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updatingCell, setUpdatingCell] = useState<{ teacherId: number; day: number } | null>(null);

  const fetchRegister = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/teacher-attendance/register?month=${month}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to load register");
      const data = await res.json();
      setTeachers(data.teachers || []);
      setDaysInMonth(data.days_in_month || 30);
    } catch (err) {
      console.error("Error fetching register:", err);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    fetchRegister();
  }, [fetchRegister]);

  // Fast cycle status: null -> Present -> Absent -> Leave -> null
  const handleCellClick = async (teacherId: number, day: number) => {
    const teacher = teachers.find(t => t.teacher_id === teacherId);
    if (!teacher) return;

    const currentStatus = teacher.daily[day]?.status;
    let nextStatus: "Present" | "Absent" | "Leave" | "clear" = "Present";
    if (currentStatus === "Present") nextStatus = "Absent";
    else if (currentStatus === "Absent") nextStatus = "Leave";
    else if (currentStatus === "Leave") nextStatus = "clear";
    else nextStatus = "Present";

    const dateStr = `${month}-${String(day).padStart(2, "0")}`;
    setUpdatingCell({ teacherId, day });

    // Optimistic UI update
    setTeachers(prev =>
      prev.map(t => {
        if (t.teacher_id !== teacherId) return t;
        const newDaily = { ...t.daily, [day]: { ...t.daily[day], status: nextStatus === "clear" ? null : nextStatus } };
        
        let p = 0, a = 0, l = 0;
        Object.values(newDaily).forEach(d => {
          if (d.status === "Present") p++;
          else if (d.status === "Absent") a++;
          else if (d.status === "Leave") l++;
        });
        const total = p + a + l;
        const pct = total > 0 ? Math.round((p / total) * 100 * 10) / 10 : 0;

        return {
          ...t,
          daily: newDaily,
          summary: { present: p, absent: a, leave: l, total_marked: total, percentage: pct }
        };
      })
    );

    try {
      await fetch(`${API}/admin/teacher-attendance/quick-update`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          teacher_id: teacherId,
          date: dateStr,
          status: nextStatus,
        }),
      });
    } catch (err) {
      console.error("Error updating cell:", err);
      fetchRegister(); // revert on fail
    } finally {
      setUpdatingCell(null);
    }
  };

  const filteredTeachers = useMemo(() => {
    if (!search.trim()) return teachers;
    const q = search.toLowerCase();
    return teachers.filter(
      t =>
        t.name.toLowerCase().includes(q) ||
        (t.qualification && t.qualification.toLowerCase().includes(q)) ||
        t.subjects.some(s => s.toLowerCase().includes(q))
    );
  }, [teachers, search]);

  // Aggregate stats
  const aggregateStats = useMemo(() => {
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLeave = 0;
    let totalMarked = 0;

    teachers.forEach(t => {
      totalPresent += t.summary.present;
      totalAbsent += t.summary.absent;
      totalLeave += t.summary.leave;
      totalMarked += t.summary.total_marked;
    });

    const avgRate = totalMarked > 0 ? Math.round((totalPresent / totalMarked) * 100 * 10) / 10 : 0;

    return {
      totalTeachers: teachers.length,
      totalPresent,
      totalAbsent,
      totalLeave,
      avgRate,
    };
  }, [teachers]);

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Month date parsed
  const parsedMonthDate = useMemo(() => {
    try {
      return parseISO(`${month}-01`);
    } catch {
      return new Date();
    }
  }, [month]);

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold" style={{ color: "#0f224a" }}>
              Teacher Attendance Register
            </h2>
            <span
              className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
              style={{ background: "#dbeafe", color: "#2563eb" }}
            >
              Monthly Matrix
            </span>
          </div>
          <p className="text-sm mt-1" style={{ color: "#2563eb" }}>
            Comprehensive monthly attendance record and register for all teaching faculty.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Month input */}
          <div className="flex items-center bg-white border rounded-xl px-3 py-2 shadow-xs" style={{ borderColor: "#bfdbfe" }}>
            <label htmlFor="month-select" className="text-xs font-bold mr-2 uppercase tracking-wide" style={{ color: "#1e40af" }}>Month:</label>
            <input
              id="month-select"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="text-sm font-semibold outline-none bg-transparent cursor-pointer"
              style={{ color: "#0f224a" }}
            />
          </div>

          <Link
            href={`/dashboard/teacher-attendance/register/print?month=${month}`}
            target="_blank"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all active:scale-95 shadow-xs hover:shadow-md"
            style={{ borderColor: "#bfdbfe", background: "#f0f4f8", color: "#1e3a8a" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Register
          </Link>

          <Link
            href="/dashboard/teacher-attendance"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md transition-all active:scale-95 hover:shadow-lg"
            style={{ background: "linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%)" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Mark Daily
          </Link>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border shadow-xs" style={{ borderColor: "#bfdbfe" }}>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#38bdf8" }}>Total Teachers</p>
          <p className="text-2xl font-black mt-1" style={{ color: "#0f224a" }}>{aggregateStats.totalTeachers}</p>
          <p className="text-[11px] mt-0.5 text-gray-500">Active Faculty</p>
        </div>

        <div className="bg-white p-4 rounded-xl border shadow-xs" style={{ borderColor: "#bfdbfe" }}>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Total Presents</p>
          <p className="text-2xl font-black mt-1 text-emerald-800">{aggregateStats.totalPresent}</p>
          <p className="text-[11px] mt-0.5 text-emerald-600 font-medium">Recorded P</p>
        </div>

        <div className="bg-white p-4 rounded-xl border shadow-xs" style={{ borderColor: "#bfdbfe" }}>
          <p className="text-xs font-semibold uppercase tracking-wider text-red-700">Total Absents</p>
          <p className="text-2xl font-black mt-1 text-red-800">{aggregateStats.totalAbsent}</p>
          <p className="text-[11px] mt-0.5 text-red-600 font-medium">Recorded A</p>
        </div>

        <div className="bg-white p-4 rounded-xl border shadow-xs" style={{ borderColor: "#bfdbfe" }}>
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Total Leaves</p>
          <p className="text-2xl font-black mt-1 text-amber-800">{aggregateStats.totalLeave}</p>
          <p className="text-[11px] mt-0.5 text-amber-600 font-medium">Recorded L</p>
        </div>

        <div className="bg-white p-4 rounded-xl border shadow-xs" style={{ borderColor: "#bfdbfe" }}>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#2563eb]">Avg. Rate</p>
          <p className="text-2xl font-black mt-1 text-[#2563eb]">{aggregateStats.avgRate}%</p>
          <p className="text-[11px] mt-0.5 text-[#38bdf8] font-medium">Faculty Attendance</p>
        </div>
      </div>

      {/* Filter and Legend Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="relative max-w-sm flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#38bdf8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search teacher by name, subject..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none transition"
            style={{ background: "#fff", borderColor: "#bfdbfe", color: "#0f224a" }}
          />
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs font-semibold flex-wrap">
          <span className="text-gray-500 font-medium">Legend:</span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
            <strong>P</strong> Present
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-100 text-red-800 border border-red-300">
            <strong>A</strong> Absent
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-100 text-amber-800 border border-amber-300">
            <strong>L</strong> Leave
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 border border-gray-300">
            <strong>—</strong> Unmarked
          </span>
          <span className="text-[11px] text-[#38bdf8] italic ml-1">(Click cell to cycle status)</span>
        </div>
      </div>

      {/* Main Register Table */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden relative isolate" style={{ borderColor: "#bfdbfe" }}>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <svg className="animate-spin w-8 h-8 text-[#2563eb]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm font-medium text-[#2563eb]">Loading Attendance Register for {format(parsedMonthDate, "MMMM yyyy")}...</p>
          </div>
        ) : filteredTeachers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <svg className="w-14 h-14 text-[#bfdbfe]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <p className="text-sm font-medium text-[#38bdf8]">
              {search ? `No teachers match "${search}"` : "No active teachers found."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr style={{ background: "#f0f4f8", borderBottom: "2px solid #bfdbfe" }}>
                  {/* Sticky Teacher Header */}
                  <th className="sticky left-0 z-10 px-4 py-3 text-left font-bold text-xs uppercase tracking-wider text-[#2563eb] min-w-[200px] border-r border-[#bfdbfe]" style={{ background: "#f0f4f8" }}>
                    Teacher Faculty
                  </th>

                  {/* Days 1..N */}
                  {daysArray.map(day => {
                    const dayDate = new Date(parsedMonthDate.getFullYear(), parsedMonthDate.getMonth(), day);
                    const dayOfWeek = getDay(dayDate); // 0 = Sunday
                    const isSunday = dayOfWeek === 0;

                    return (
                      <th
                        key={day}
                        className={`px-1 py-2 text-center font-bold min-w-[32px] border-r border-[#dbeafe] ${
                          isSunday ? "bg-red-50 text-red-700" : "text-[#1e3a8a]"
                        }`}
                      >
                        <div className="text-[10px] font-medium text-gray-500">{WEEKDAY_INITIALS[dayOfWeek]}</div>
                        <div className="text-xs font-bold">{day}</div>
                      </th>
                    );
                  })}

                  {/* Summary Headers */}
                  <th className="px-2 py-3 text-center font-bold text-xs uppercase tracking-wider text-emerald-800 min-w-[40px] border-l border-[#bfdbfe] bg-[#f5fbf7]">
                    P
                  </th>
                  <th className="px-2 py-3 text-center font-bold text-xs uppercase tracking-wider text-red-800 min-w-[40px] bg-[#fdf2f2]">
                    A
                  </th>
                  <th className="px-2 py-3 text-center font-bold text-xs uppercase tracking-wider text-amber-800 min-w-[40px] bg-[#fefaf0]">
                    L
                  </th>
                  <th className="px-3 py-3 text-center font-bold text-xs uppercase tracking-wider text-[#2563eb] min-w-[60px] bg-[#f0f4f8]">
                    Rate
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dbeafe]">
                {filteredTeachers.map((t, idx) => (
                  <tr key={t.teacher_id} className="hover:bg-[#fff9f6] transition-colors group">
                    {/* Sticky Teacher Column */}
                    <td
                      className="sticky left-0 z-[5] px-4 py-2.5 border-r border-[#bfdbfe] bg-white group-hover:bg-[#fff9f6] transition-colors"
                      style={{ boxShadow: "2px 0 5px -2px rgba(0,0,0,0.05)" }}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-[11px] shrink-0 uppercase"
                          style={{ background: "linear-gradient(135deg, #38bdf8, #2563eb)" }}
                        >
                          {t.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-[#0f224a] truncate">{t.name}</p>
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            {t.subjects && t.subjects.length > 0 ? (
                              t.subjects.map((sub, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="inline-block px-1.5 py-0.2 rounded text-[9px] font-semibold bg-[#dbeafe] text-[#2563eb]"
                                >
                                  {sub}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-gray-400 italic">No subjects</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Day Cells */}
                    {daysArray.map(day => {
                      const dayDate = new Date(parsedMonthDate.getFullYear(), parsedMonthDate.getMonth(), day);
                      const isSunday = getDay(dayDate) === 0;
                      const cell = t.daily[day];
                      const status = cell?.status;
                      const isUpdating = updatingCell?.teacherId === t.teacher_id && updatingCell?.day === day;

                      let cellBg = isSunday ? "bg-red-50/40" : "bg-white";
                      let textColor = "text-gray-300";
                      let badge = "—";

                      if (status === "Present") {
                        cellBg = "bg-emerald-100 hover:bg-emerald-200";
                        textColor = "text-emerald-800 font-bold";
                        badge = "P";
                      } else if (status === "Absent") {
                        cellBg = "bg-red-100 hover:bg-red-200";
                        textColor = "text-red-800 font-bold";
                        badge = "A";
                      } else if (status === "Leave") {
                        cellBg = "bg-amber-100 hover:bg-amber-200";
                        textColor = "text-amber-800 font-bold";
                        badge = "L";
                      }

                      return (
                        <td
                          key={day}
                          onClick={() => handleCellClick(t.teacher_id, day)}
                          className={`p-1 text-center cursor-pointer border-r border-[#dbeafe] transition-colors select-none ${cellBg} ${textColor}`}
                          title={`Day ${day}: ${status || "Unmarked"} (Click to change)`}
                        >
                          {isUpdating ? (
                            <div className="w-3.5 h-3.5 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin mx-auto" />
                          ) : (
                            <span className="block text-[11px] leading-tight">{badge}</span>
                          )}
                        </td>
                      );
                    })}

                    {/* Summaries */}
                    <td className="px-2 py-2.5 text-center font-bold text-emerald-800 bg-[#f5fbf7] border-l border-[#bfdbfe]">
                      {t.summary.present}
                    </td>
                    <td className="px-2 py-2.5 text-center font-bold text-red-800 bg-[#fdf2f2]">
                      {t.summary.absent}
                    </td>
                    <td className="px-2 py-2.5 text-center font-bold text-amber-800 bg-[#fefaf0]">
                      {t.summary.leave}
                    </td>
                    <td className="px-3 py-2.5 text-center font-black text-[#2563eb] bg-[#f0f4f8]">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[11px] ${
                          t.summary.percentage >= 85
                            ? "bg-emerald-100 text-emerald-800"
                            : t.summary.percentage >= 70
                            ? "bg-amber-100 text-amber-800"
                            : t.summary.total_marked === 0
                            ? "text-gray-400 font-normal"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {t.summary.total_marked > 0 ? `${t.summary.percentage}%` : "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
