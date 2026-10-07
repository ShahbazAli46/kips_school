"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { format } from "date-fns";
import { Calendar as CalendarIcon, ChevronDown, CheckCircle2, AlertCircle, Users, CheckCheck, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

interface ClassItem {
  id: number;
  name: string;
}

interface SectionItem {
  id: number;
  name: string;
  class_id: number;
  class?: { name: string };
}

interface Student {
  id: number;
  name: string;
  father_name?: string | null;
  roll_number?: number | null;
  section_id: number;
  contact_number: string | null;
}

export default function AttendancePage() {
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [attendances, setAttendances] = useState<Record<number, "present" | "absent" | "leave">>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [leaveStudentIds, setLeaveStudentIds] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isTeacher, setIsTeacher] = useState(false);

  // Load Classes and Sections (Filtered for Teachers)
  useEffect(() => {
    const role = localStorage.getItem("userRole");
    const isTeacherUser = role === "2" || role === "teacher";
    setIsTeacher(isTeacherUser);

    const loadMetadata = async () => {
      try {
        if (isTeacherUser) {
          // Fetch teacher assignments to scope classes and sections
          const res = await fetch(`${API}/teacher/subject-attendance/assignments`, {
            headers: getAuthHeaders(),
          });
          if (res.ok) {
            const json = await res.json();
            const assignments = Array.isArray(json.data) ? json.data : [];

            if (assignments.length > 0) {
              const classMap = new Map<number, string>();
              const sectionMap = new Map<number, SectionItem>();

              assignments.forEach((a: any) => {
                const cId = Number(a.class_id);
                const cName = a.academy_class?.name || a.academyClass?.name || `Class ${cId}`;
                if (cId) classMap.set(cId, cName);

                const sId = Number(a.section_id);
                const sName = a.section?.name || `Section ${sId}`;
                if (sId && cId) {
                  sectionMap.set(sId, { id: sId, name: sName, class_id: cId });
                }
              });

              const teacherClasses = Array.from(classMap.entries()).map(([id, name]) => ({ id, name }));
              const teacherSections = Array.from(sectionMap.values());

              setClasses(teacherClasses);
              setSections(teacherSections);

              // Auto-select first class if available
              if (teacherClasses.length > 0) {
                const firstClassId = String(teacherClasses[0].id);
                setSelectedClass(firstClassId);
                const matchingSecs = teacherSections.filter((s) => String(s.class_id) === firstClassId);
                if (matchingSecs.length > 0) {
                  setSelectedSection(String(matchingSecs[0].id));
                }
              }
              return;
            }
          }
        }

        // Fallback or Admin/Attendance Manager: fetch all classes & sections
        const [cRes, sRes] = await Promise.all([
          fetch(`${API}/classes`, { headers: getAuthHeaders() }),
          fetch(`${API}/sections`, { headers: getAuthHeaders() }),
        ]);

        if (cRes.ok) {
          const cData = await cRes.json();
          setClasses(Array.isArray(cData) ? cData : []);
        }
        if (sRes.ok) {
          const sData = await sRes.json();
          setSections(Array.isArray(sData) ? sData : []);
        }
      } catch (err) {
        console.error("Failed to load classes and sections", err);
      }
    };

    loadMetadata();
  }, []);

  // Filter sections by selected class
  const filteredSections = useMemo(() => {
    if (!selectedClass) return [];
    return sections.filter((s) => String(s.class_id) === String(selectedClass));
  }, [sections, selectedClass]);

  // When class changes, auto-select or reset section
  const handleClassChange = (newClassId: string) => {
    setSelectedClass(newClassId);
    const validSecs = sections.filter((s) => String(s.class_id) === String(newClassId));
    if (validSecs.length === 1) {
      setSelectedSection(String(validSecs[0].id));
    } else {
      setSelectedSection("");
    }
  };

  const loadData = useCallback(async () => {
    if (!selectedClass || !selectedSection) return;
    setLoading(true);
    setFeedback(null);
    try {
      // Fetch students for class and section
      const stdRes = await fetch(
        `${API}/attendance-students?class_id=${selectedClass}&section_id=${selectedSection}`,
        { headers: getAuthHeaders() }
      );
      const stdData = await stdRes.json();
      const stList = Array.isArray(stdData) ? stdData : [];
      setStudents(stList);

      // Fetch attendance records for date, class, and section
      const attRes = await fetch(
        `${API}/attendance?date=${date}&class_id=${selectedClass}&section_id=${selectedSection}`,
        { headers: getAuthHeaders() }
      );
      const attData = await attRes.json();
      const existing = Array.isArray(attData) ? attData : [];

      // Fetch leaves on date
      const leavesRes = await fetch(`${API}/attendance-leaves?date=${date}`, {
        headers: getAuthHeaders(),
      });
      const leavesData = await leavesRes.json();
      const leavesList = Array.isArray(leavesData) ? leavesData : [];
      setLeaveStudentIds(leavesList);

      const newState: Record<number, "present" | "absent" | "leave"> = {};
      stList.forEach((s: Student) => {
        const record = existing.find((e: any) => e.student_id === s.id);
        if (record) {
          newState[s.id] = record.status;
        } else if (leavesList.includes(s.id)) {
          newState[s.id] = "leave";
        } else {
          newState[s.id] = "present"; // default present
        }
      });
      setAttendances(newState);
    } catch {
      setFeedback({ type: "error", message: "Failed to load students attendance." });
    } finally {
      setLoading(false);
    }
  }, [date, selectedClass, selectedSection]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusChange = (studentId: number, status: "present" | "absent" | "leave") => {
    setAttendances((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleQuickMarkAll = (status: "present" | "absent" | "leave") => {
    const newState: Record<number, "present" | "absent" | "leave"> = {};
    students.forEach((s) => {
      if (leaveStudentIds.includes(s.id)) {
        newState[s.id] = "leave";
      } else {
        newState[s.id] = status;
      }
    });
    setAttendances(newState);
  };

  const handleSaveAll = async () => {
    if (!selectedSection || students.length === 0) return;
    setSaving(true);
    setFeedback(null);
    try {
      const payload = students.map((s) => ({
        student_id: s.id,
        status: attendances[s.id] || "present",
      }));

      const res = await fetch(`${API}/attendance/bulk`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ date, attendances: payload }),
      });

      if (res.ok) {
        const data = await res.json();
        setFeedback({
          type: "success",
          message: data.message || "Attendance marked successfully! Absentees notified.",
        });
        setTimeout(() => setFeedback(null), 5000);
      } else {
        const data = await res.json();
        setFeedback({ type: "error", message: data.message || "Failed to mark attendance." });
      }
    } catch {
      setFeedback({ type: "error", message: "Error connecting to server to save attendance." });
    } finally {
      setSaving(false);
    }
  };

  // Metrics
  const presentCount = students.filter((s) => attendances[s.id] === "present").length;
  const absentCount = students.filter((s) => attendances[s.id] === "absent").length;
  const leaveCount = students.filter((s) => attendances[s.id] === "leave").length;

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-[#0f224a]">Mark Class Attendance</h2>
            {isTeacher && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                Assigned Classes
              </span>
            )}
          </div>
          <p className="text-sm mt-1 text-[#2563eb]">
            {isTeacher
              ? "Mark daily attendance for students of your assigned classes and sections."
              : "Select a date, class, and section to mark attendance."}
          </p>
        </div>
      </div>

      {feedback && (
        <div
          className={`mb-6 p-4 rounded-xl border flex items-center gap-3 text-sm font-semibold transition-all ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-800"
              : "bg-rose-50 border-rose-300 text-rose-800"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Filter Controls Card */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 bg-white p-5 rounded-2xl border shadow-sm border-[#bfdbfe]">
        {/* Date Selector */}
        <div className="flex-1">
          <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide text-[#2563eb]">
            Attendance Date
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-medium px-4 py-5 rounded-xl border transition-all hover:bg-white",
                  !date && "text-muted-foreground"
                )}
                style={{ background: "#f0f4f8", borderColor: "#bfdbfe", color: "#0f224a" }}
              >
                <CalendarIcon className="mr-3 h-5 w-5 text-[#2563eb]" />
                {date ? format(new Date(date), "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-2xl shadow-xl border-[#bfdbfe] bg-white">
              <Calendar
                mode="single"
                selected={new Date(date)}
                onSelect={(d) => {
                  if (d) {
                    const localDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
                    setDate(localDate.toISOString().split("T")[0]);
                  }
                }}
                className="p-4"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Class Selector */}
        <div className="flex-1 relative">
          <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide text-[#2563eb]">
            Class {isTeacher && "(Assigned)"}
          </label>
          <div className="relative">
            <select
              value={selectedClass}
              onChange={(e) => handleClassChange(e.target.value)}
              className="w-full px-4 py-3 appearance-none rounded-xl border outline-none font-medium transition cursor-pointer hover:bg-white text-sm"
              style={{ background: "#f0f4f8", borderColor: "#bfdbfe", color: "#0f224a" }}
            >
              <option value="">-- Select Class --</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none text-[#2563eb]" />
          </div>
        </div>

        {/* Section Selector */}
        <div className="flex-1 relative">
          <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide text-[#2563eb]">
            Section
          </label>
          <div className="relative">
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              disabled={!selectedClass}
              className="w-full px-4 py-3 appearance-none rounded-xl border outline-none font-medium transition cursor-pointer hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#f0f4f8] text-sm"
              style={{ background: "#f0f4f8", borderColor: "#bfdbfe", color: "#0f224a" }}
            >
              <option value="">-- Select Section --</option>
              {filteredSections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none text-[#2563eb]" />
          </div>
        </div>
      </div>

      {/* Attendance Stats & Quick Marking Bar */}
      {selectedSection && students.length > 0 && !loading && (
        <div className="mb-4 bg-white p-4 rounded-2xl border border-[#bfdbfe] shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[#2563eb]" /> Total: <strong>{students.length}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Present: {presentCount}
            </span>
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
              Absent: {absentCount}
            </span>
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
              Leave: {leaveCount}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-500">Quick Mark:</span>
            <button
              onClick={() => handleQuickMarkAll("present")}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition"
            >
              All Present
            </button>
            <button
              onClick={() => handleQuickMarkAll("absent")}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-100 text-rose-800 hover:bg-rose-200 transition"
            >
              All Absent
            </button>
          </div>
        </div>
      )}

      {/* Main Student List Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <svg className="animate-spin w-8 h-8 text-[#2563eb]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : selectedSection === "" ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-[#bfdbfe]">
          <p className="text-sm font-semibold text-[#2563eb]">Please select a class and section to mark attendance.</p>
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-[#bfdbfe]">
          <p className="text-sm font-medium text-slate-500">No students found in this section.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden border-[#bfdbfe]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#f0f4f8] border-b border-[#bfdbfe]">
                  <th className="text-left px-5 py-3.5 font-bold text-xs uppercase tracking-wide text-[#2563eb]">
                    Roll # & Student Name
                  </th>
                  <th className="text-right px-5 py-3.5 font-bold text-xs uppercase tracking-wide text-[#2563eb]">
                    Attendance Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dbeafe]">
                {students.map((student) => {
                  const status = attendances[student.id];
                  const isOnLeave = leaveStudentIds.includes(student.id);

                  return (
                    <tr key={student.id} className="transition-colors hover:bg-blue-50/30">
                      <td className="px-5 py-3.5 font-bold text-[#0f224a]">
                        <div className="flex flex-col">
                          <span className="flex items-center gap-2">
                            {student.name}
                            {status === "absent" && (
                              <span className="inline-block w-2 h-2 rounded-full bg-red-500"></span>
                            )}
                            {isOnLeave && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                Approved Leave
                              </span>
                            )}
                          </span>
                          <div className="flex items-center gap-3 mt-0.5">
                            {student.roll_number && (
                              <span className="text-[11px] uppercase font-bold tracking-wider text-[#2563eb]">
                                Roll: {student.roll_number}
                              </span>
                            )}
                            {student.father_name && (
                              <span className="text-[11px] font-medium text-slate-500">
                                S/O {student.father_name}
                              </span>
                            )}
                            {student.contact_number && (
                              <span className="text-[11px] font-medium text-slate-400">
                                {student.contact_number}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex rounded-xl border p-1 border-[#bfdbfe] bg-[#f0f4f8]">
                          <button
                            type="button"
                            onClick={() => !isOnLeave && handleStatusChange(student.id, "present")}
                            disabled={isOnLeave}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              status === "present"
                                ? "bg-emerald-600 text-white shadow-sm"
                                : "text-gray-600 hover:bg-white hover:text-emerald-700"
                            } ${isOnLeave ? "opacity-30 cursor-not-allowed" : ""}`}
                          >
                            Present
                          </button>
                          <button
                            type="button"
                            onClick={() => !isOnLeave && handleStatusChange(student.id, "absent")}
                            disabled={isOnLeave}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              status === "absent"
                                ? "bg-rose-600 text-white shadow-sm"
                                : "text-gray-600 hover:bg-white hover:text-rose-700"
                            } ${isOnLeave ? "opacity-30 cursor-not-allowed" : ""}`}
                          >
                            Absent
                          </button>
                          <button
                            type="button"
                            onClick={() => !isOnLeave && handleStatusChange(student.id, "leave")}
                            disabled={isOnLeave}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              status === "leave"
                                ? "bg-amber-500 text-white shadow-sm"
                                : "text-gray-600 hover:bg-white hover:text-amber-700"
                            } ${isOnLeave ? "bg-amber-500 text-white" : ""}`}
                          >
                            Leave
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t flex items-center justify-between border-[#bfdbfe] bg-slate-50">
            <p className="text-xs text-slate-500">
              Saving attendance will notify parents of absent and on-leave students immediately.
            </p>
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl text-xs md:text-sm font-bold text-white shadow-md transition-all active:scale-95 disabled:opacity-50 hover:shadow-lg flex items-center gap-2"
              style={{ background: "linear-gradient(135deg, #2563eb, #1e3a8a)" }}
            >
              {saving ? (
                <>
                  <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCheck className="w-4 h-4" />
                  <span>Save All Attendance</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
