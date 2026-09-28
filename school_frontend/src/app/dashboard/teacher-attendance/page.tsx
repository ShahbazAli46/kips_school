"use client";

import React, { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
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

interface Teacher {
  teacher_id: number;
  name: string;
  image: string | null;
  status: "Present" | "Absent" | "Leave" | null;
  check_in_time: string | null;
  check_out_time: string | null;
}

export default function TeacherAttendancePage() {
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [attendances, setAttendances] = useState<Record<number, "Present" | "Absent" | "Leave">>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/teacher-attendance?date=${date}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      const tList = Array.isArray(data) ? data : [];
      setTeachers(tList);

      const newState: Record<number, "Present" | "Absent" | "Leave"> = {};
      tList.forEach((t: Teacher) => {
        if (t.status) {
          newState[t.teacher_id] = t.status;
        } else {
          newState[t.teacher_id] = "Present"; // default present
        }
      });
      setAttendances(newState);
    } catch {
      // Error handling
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusChange = (teacherId: number, status: "Present" | "Absent" | "Leave") => {
    setAttendances(prev => ({ ...prev, [teacherId]: status }));
  };

  const handleSaveAll = async () => {
    if (teachers.length === 0) return;
    setSaving(true);
    try {
      const payload = teachers.map(t => ({
        teacher_id: t.teacher_id,
        status: attendances[t.teacher_id] || "Present",
        check_in_time: format(new Date(), "HH:mm:ss")
      }));

      const res = await fetch(`${API}/admin/teacher-attendance`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          date,
          attendances: payload
        })
      });

      if (res.ok) {
        alert("Attendance saved successfully!");
        loadData();
      } else {
        alert("Failed to save attendance");
      }
    } catch (err) {
      alert("Error saving attendance");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#1e3a8a]">Teacher Attendance</h1>
            <p className="text-sm text-[#2563eb]">Mark or view teacher attendance for a specific date</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-[#bfdbfe] p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <label className="block text-sm font-medium text-[#1e3a8a] mb-1">Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full sm:w-[240px] justify-start text-left font-normal border-[#bfdbfe] h-12 rounded-xl focus:ring-[#2563eb]",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(new Date(date), "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={new Date(date)}
                    onSelect={(d) => d && setDate(format(d, "yyyy-MM-dd"))}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="flex items-end">
              <Button 
                onClick={handleSaveAll}
                disabled={loading || saving || teachers.length === 0}
                className="w-full sm:w-auto h-12 px-8 rounded-xl bg-[#2563eb] hover:bg-[#6b2512] text-white transition-all shadow-md font-medium"
              >
                {saving ? "Saving..." : "Save Attendance"}
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#bfdbfe]">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#f0f4f8] text-[#2563eb] uppercase font-semibold text-xs border-b border-[#bfdbfe]">
                <tr>
                  <th className="px-6 py-4 rounded-tl-xl">Teacher Name</th>
                  <th className="px-6 py-4 text-center rounded-tr-xl">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#bfdbfe]">
                {loading ? (
                  <tr>
                    <td colSpan={2} className="px-6 py-8 text-center text-[#2563eb]">Loading teachers...</td>
                  </tr>
                ) : teachers.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-6 py-8 text-center text-[#2563eb]">No teachers found.</td>
                  </tr>
                ) : (
                  teachers.map((teacher) => (
                    <tr key={teacher.teacher_id} className="hover:bg-[#f0f4f8]/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-[#dbeafe] flex items-center justify-center font-bold text-[#2563eb] border border-[#bfdbfe] overflow-hidden">
                            {teacher.image ? (
                              <img src={teacher.image.startsWith('http') ? teacher.image : `${API.replace('/api', '')}/storage/${teacher.image}`} alt={teacher.name} className="w-full h-full object-cover" />
                            ) : (
                              teacher.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-[#1e3a8a]">{teacher.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {(["Present", "Absent", "Leave"] as const).map((s) => (
                            <button
                              key={s}
                              onClick={() => handleStatusChange(teacher.teacher_id, s)}
                              className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border",
                                attendances[teacher.teacher_id] === s
                                  ? s === "Present" ? "bg-green-100 text-green-800 border-green-200 shadow-sm"
                                  : s === "Absent" ? "bg-red-100 text-red-800 border-red-200 shadow-sm"
                                  : "bg-yellow-100 text-yellow-800 border-yellow-200 shadow-sm"
                                  : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                              )}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
