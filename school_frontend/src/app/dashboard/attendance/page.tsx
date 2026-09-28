"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { format } from "date-fns";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
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
  const token = localStorage.getItem("token");
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

interface Class {
  id: number;
  name: string;
}

interface Section {
  id: number;
  name: string;
  class_id: number;
  class: { name: string };
}

interface Student {
  id: number;
  name: string;
  father_name?: string | null;
  roll_number?: number | null;
  section_id: number;
  contact_number: string | null;
}

interface AttendanceRecord {
  id?: number;
  student_id: number;
  status: "present" | "absent" | "leave";
}

// FollowUpModal removed as per user request

export default function AttendancePage() {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [attendances, setAttendances] = useState<Record<number, "present" | "absent" | "leave">>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [leaveStudentIds, setLeaveStudentIds] = useState<number[]>([]);

  useEffect(() => {
    // Fetch classes
    fetch(`${API}/classes`, { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => {
        setClasses(Array.isArray(data) ? data : []);
      })
      .catch(() => {});

    // Fetch sections
    fetch(`${API}/sections`, { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => {
        setSections(Array.isArray(data) ? data : []);
      })
      .catch(() => {});
  }, []);

  // Reset section when class changes
  useEffect(() => {
    setSelectedSection("");
  }, [selectedClass]);

  const loadData = useCallback(async () => {
    if (!selectedClass || !selectedSection) return;
    setLoading(true);
    try {
      // Fetch students for class and section
      const stdRes = await fetch(`${API}/attendance-students?class_id=${selectedClass}&section_id=${selectedSection}`, { headers: getAuthHeaders() });
      const stdData = await stdRes.json();
      const stList = Array.isArray(stdData) ? stdData : [];
      setStudents(stList);

      // Fetch attendance records for date, class, and section
      const attRes = await fetch(`${API}/attendance?date=${date}&class_id=${selectedClass}&section_id=${selectedSection}`, { headers: getAuthHeaders() });
      const attData = await attRes.json();
      const existing = Array.isArray(attData) ? attData : [];

      // Fetch leaves on date
      const leavesRes = await fetch(`${API}/attendance-leaves?date=${date}`, { headers: getAuthHeaders() });
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
      // Error handling
    } finally {
      setLoading(false);
    }
  }, [date, selectedClass, selectedSection]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusChange = (studentId: number, status: "present" | "absent" | "leave") => {
    setAttendances(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSaveAll = async () => {
    if (!selectedSection || students.length === 0) return;
    setSaving(true);
    try {
      const payload = students.map(s => ({
        student_id: s.id,
        status: attendances[s.id] || "present"
      }));

      const res = await fetch(`${API}/attendance/bulk`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ date, attendances: payload })
      });
      if (res.ok) {
        alert("Attendance marked successfully!");
      } else {
        alert("Failed to mark attendance.");
      }
    } catch {
      alert("Error saving attendance.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "#0f224a" }}>Mark Attendance</h2>
          <p className="text-sm mt-1" style={{ color: "#2563eb" }}>Select a date and section to manage attendance.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6 bg-white p-4 rounded-2xl border shadow-sm" style={{ borderColor: "#bfdbfe" }}>
        <div className="flex-1">
          <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "#2563eb" }}>Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-medium px-4 py-6 rounded-xl border transition-all hover:bg-white",
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
        <div className="flex-1 relative">
          <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "#2563eb" }}>Class</label>
          <div className="relative">
            <select 
              value={selectedClass} 
              onChange={(e) => setSelectedClass(e.target.value)} 
              className="w-full px-4 py-3.5 appearance-none rounded-xl border outline-none font-medium transition cursor-pointer hover:bg-white" 
              style={{ background: "#f0f4f8", borderColor: "#bfdbfe", color: "#0f224a" }}
            >
              <option value="">-- Select Class --</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none text-[#2563eb]" />
          </div>
        </div>
        <div className="flex-1 relative">
          <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "#2563eb" }}>Section</label>
          <div className="relative">
            <select 
              value={selectedSection} 
              onChange={(e) => setSelectedSection(e.target.value)} 
              disabled={!selectedClass}
              className="w-full px-4 py-3.5 appearance-none rounded-xl border outline-none font-medium transition cursor-pointer hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#f0f4f8]" 
              style={{ background: "#f0f4f8", borderColor: "#bfdbfe", color: "#0f224a" }}
            >
              <option value="">-- Select Section --</option>
              {sections.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none text-[#2563eb]" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <svg className="animate-spin w-8 h-8" style={{ color: "#2563eb" }} fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
        </div>
      ) : selectedSection === "" ? (
        <div className="text-center py-20 bg-white rounded-2xl border" style={{ borderColor: "#bfdbfe" }}>
          <p className="text-sm font-medium" style={{ color: "#38bdf8" }}>Please select a section to mark attendance.</p>
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border" style={{ borderColor: "#bfdbfe" }}>
          <p className="text-sm font-medium" style={{ color: "#38bdf8" }}>No students found in this section.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden" style={{ borderColor: "#bfdbfe" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#f0f4f8", borderBottom: "1px solid #bfdbfe" }}>
                  <th className="text-left px-5 py-4 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Student Name</th>
                  <th className="text-right px-5 py-4 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "#dbeafe" }}>
                {students.map(student => {
                  const status = attendances[student.id];
                  return (
                    <tr key={student.id} className="transition-colors hover:bg-gray-50">
                      <td className="px-5 py-4 font-bold" style={{ color: "#0f224a" }}>
                        <div className="flex flex-col">
                          <span className="flex items-center gap-2">
                            {student.name}
                            {status === "absent" && <span className="inline-block w-2 h-2 rounded-full bg-red-500"></span>}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            {student.father_name && (
                              <span className="text-[11px] font-medium" style={{ color: "#2563eb" }}>
                                {student.father_name}
                              </span>
                            )}
                            {student.roll_number && (
                              <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "#38bdf8" }}>
                                Roll: {student.roll_number}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex rounded-lg border p-1" style={{ borderColor: "#bfdbfe", background: "#f0f4f8" }}>
                          <button 
                            onClick={() => !leaveStudentIds.includes(student.id) && handleStatusChange(student.id, "present")}
                            disabled={leaveStudentIds.includes(student.id)}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${status === "present" ? "bg-green-100 text-green-700 shadow-sm" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"} ${leaveStudentIds.includes(student.id) ? "opacity-30 cursor-not-allowed" : ""}`}
                          >
                            Present
                          </button>
                          <button 
                            onClick={() => !leaveStudentIds.includes(student.id) && handleStatusChange(student.id, "absent")}
                            disabled={leaveStudentIds.includes(student.id)}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${status === "absent" ? "bg-red-100 text-red-700 shadow-sm" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"} ${leaveStudentIds.includes(student.id) ? "opacity-30 cursor-not-allowed" : ""}`}
                          >
                            Absent
                          </button>
                          <button 
                            onClick={() => !leaveStudentIds.includes(student.id) && handleStatusChange(student.id, "leave")}
                            disabled={leaveStudentIds.includes(student.id)}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${status === "leave" ? "bg-yellow-100 text-yellow-700 shadow-sm" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"} ${leaveStudentIds.includes(student.id) ? "cursor-not-allowed" : ""}`}
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
          <div className="p-4 border-t flex justify-end" style={{ borderColor: "#bfdbfe", background: "#fafafa" }}>
            <button onClick={handleSaveAll} disabled={saving} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-md transition-all active:scale-95 disabled:opacity-50 hover:shadow-lg" style={{ background: "linear-gradient(135deg, #2563eb, #1e3a8a)" }}>
              {saving ? "Saving..." : "Save All Attendance"}
            </button>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
