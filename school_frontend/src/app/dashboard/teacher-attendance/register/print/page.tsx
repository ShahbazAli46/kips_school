"use client";

import React, { useEffect, useState, useMemo } from "react";
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
  daily: Record<number, { status: "Present" | "Absent" | "Leave" | null }>;
  summary: {
    present: number;
    absent: number;
    leave: number;
    total_marked: number;
    percentage: number;
  };
}

const WEEKDAY_INITIALS = ["Su", "M", "T", "W", "Th", "F", "Sa"];

export default function TeacherAttendanceRegisterPrintPage() {
  const [month, setMonth] = useState("");
  const [teachers, setTeachers] = useState<TeacherRegisterItem[]>([]);
  const [daysInMonth, setDaysInMonth] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const m = params.get("month") || format(new Date(), "yyyy-MM");
    setMonth(m);

    const fetchRegister = async () => {
      try {
        const res = await fetch(`${API}/admin/teacher-attendance/register?month=${m}`, {
          headers: getAuthHeaders(),
        });
        const data = await res.json();
        setTeachers(data.teachers || []);
        setDaysInMonth(data.days_in_month || 30);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
        setTimeout(() => window.print(), 600);
      }
    };

    fetchRegister();
  }, []);

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const parsedMonthDate = useMemo(() => {
    try {
      return parseISO(`${month || format(new Date(), "yyyy-MM")}-01`);
    } catch {
      return new Date();
    }
  }, [month]);

  if (loading) {
    return <div className="p-10 text-center font-bold text-gray-700">Preparing Teacher Attendance Register for Print...</div>;
  }

  return (
    <div className="bg-white min-h-screen text-black p-4 max-w-[1400px] mx-auto print:p-0">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4 landscape; margin: 8mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      `}} />

      {/* Institutional Header */}
      <div className="flex items-center justify-between pb-2 border-b-2 border-black mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 flex items-center justify-center shrink-0">
            <img
              src="/logo.jpg"
              alt="Logo"
              className="w-full h-full object-contain grayscale"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-wider text-black">Kips School Chunian Campus</h1>
            <p className="text-[10px] font-bold text-gray-700">Topper&apos;s First Choice | Opposite Shell Pump Changa Manga Road, Chunian | Ph: 0300 39 39 581</p>
          </div>
        </div>

        <div className="text-right">
          <h2 className="text-base font-black uppercase tracking-widest text-black">Teacher Attendance Register</h2>
          <p className="text-xs font-bold text-gray-800 mt-0.5">Month: <span className="underline uppercase">{format(parsedMonthDate, "MMMM yyyy")}</span></p>
        </div>
      </div>

      {/* Info Bar */}
      <div className="flex justify-between items-center text-xs font-bold mb-2 pb-1 border-b border-gray-300">
        <span>Total Faculty: {teachers.length}</span>
        <span>Printed On: {format(new Date(), "dd-MMM-yyyy hh:mm a")}</span>
        <span>Status Keys: [P = Present] [A = Absent] [L = Leave]</span>
      </div>

      {/* Register Matrix */}
      <div className="overflow-x-auto border border-black">
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b border-black">
              <th className="p-1 border-r border-black text-center w-6">Sr</th>
              <th className="p-1 border-r border-black text-left min-w-[140px]">Teacher Name</th>
              <th className="p-1 border-r border-black text-left min-w-[90px]">Subject(s)</th>
              
              {daysArray.map(day => {
                const dayDate = new Date(parsedMonthDate.getFullYear(), parsedMonthDate.getMonth(), day);
                const dayOfWeek = getDay(dayDate);
                const isSun = dayOfWeek === 0;

                return (
                  <th
                    key={day}
                    className={`p-0.5 border-r border-gray-400 text-center w-5 ${isSun ? "bg-gray-200" : ""}`}
                  >
                    <div className="text-[8px] text-gray-600 font-normal">{WEEKDAY_INITIALS[dayOfWeek]}</div>
                    <div className="font-bold text-[9px]">{day}</div>
                  </th>
                );
              })}

              <th className="p-1 border-r border-black text-center w-7 bg-gray-50">P</th>
              <th className="p-1 border-r border-black text-center w-7 bg-gray-50">A</th>
              <th className="p-1 border-r border-black text-center w-7 bg-gray-50">L</th>
              <th className="p-1 border-r border-black text-center w-10 bg-gray-100">%</th>
              <th className="p-1 text-center min-w-[80px]">Sign</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((t, idx) => (
              <tr key={t.teacher_id} className="border-b border-gray-400">
                <td className="p-1 border-r border-black text-center font-bold">{idx + 1}</td>
                <td className="p-1 border-r border-black font-bold whitespace-nowrap">
                  {t.name}
                  {t.qualification && <span className="block text-[8px] text-gray-600 font-normal">{t.qualification}</span>}
                </td>
                <td className="p-1 border-r border-black text-[9px]">
                  {t.subjects && t.subjects.length > 0 ? t.subjects.join(", ") : "—"}
                </td>

                {daysArray.map(day => {
                  const dayDate = new Date(parsedMonthDate.getFullYear(), parsedMonthDate.getMonth(), day);
                  const isSun = getDay(dayDate) === 0;
                  const status = t.daily[day]?.status;

                  return (
                    <td
                      key={day}
                      className={`p-0.5 border-r border-gray-300 text-center font-bold ${
                        isSun ? "bg-gray-200" : ""
                      } ${
                        status === "Present" ? "text-black" : status === "Absent" ? "text-red-700" : status === "Leave" ? "text-yellow-800" : "text-gray-300"
                      }`}
                    >
                      {status === "Present" ? "P" : status === "Absent" ? "A" : status === "Leave" ? "L" : isSun ? "" : "·"}
                    </td>
                  );
                })}

                <td className="p-1 border-r border-black text-center font-black">{t.summary.present}</td>
                <td className="p-1 border-r border-black text-center font-black">{t.summary.absent}</td>
                <td className="p-1 border-r border-black text-center font-black">{t.summary.leave}</td>
                <td className="p-1 border-r border-black text-center font-black bg-gray-50">
                  {t.summary.total_marked > 0 ? `${t.summary.percentage}%` : "—"}
                </td>
                <td className="p-1 border-b-0"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Signature Footer */}
      <div className="flex justify-between items-end mt-12 pt-4 px-6 text-xs font-bold text-black">
        <div className="text-center">
          <div className="w-48 border-t border-black mb-1"></div>
          <p>Prepared By (Office Assistant)</p>
        </div>
        <div className="text-center">
          <div className="w-48 border-t border-black mb-1"></div>
          <p>Verified By (Vice Principal)</p>
        </div>
        <div className="text-center">
          <div className="w-48 border-t border-black mb-1"></div>
          <p>Principal / Director Signature</p>
        </div>
      </div>
    </div>
  );
}
