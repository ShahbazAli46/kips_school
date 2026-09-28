"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Calendar as CalendarIcon, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format, parse } from "date-fns";
import { cn } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };
}

export default function ReceivingsPage() {
  const [monthStr, setMonthStr] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/fees?month=${monthStr}`, { headers: getAuthHeaders() });
      const feeData = await res.json();
      setPayments(Array.isArray(feeData) ? feeData : []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [monthStr]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Derived state
  const totalReceivings = payments.reduce((sum, p) => sum + parseFloat(p.amount_paid || "0"), 0);

  const filteredPayments = useMemo(() => {
    if (!selectedDate) return payments;
    const filterDateStr = format(selectedDate, "yyyy-MM-dd");
    return payments.filter(p => p.payment_date.startsWith(filterDateStr));
  }, [payments, selectedDate]);

  const totalFiltered = filteredPayments.reduce((sum, p) => sum + parseFloat(p.amount_paid || "0"), 0);

  // Custom Month Picker logic
  const currentYear = parseInt(monthStr.split("-")[0]);
  const currentMonth = parseInt(monthStr.split("-")[1]);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const handleMonthChange = (year: number, month: number) => {
    setMonthStr(`${year}-${String(month).padStart(2, '0')}`);
    setMonthPickerOpen(false);
    setSelectedDate(undefined); // Reset date filter when month changes
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "#0f224a" }}>Receivings Register</h1>
          <p className="mt-1 text-sm font-medium" style={{ color: "#38bdf8" }}>View all fee collections and their details.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Custom Month Picker */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: '#1e3a8a' }}>Collection Month</label>
            <Popover open={monthPickerOpen} onOpenChange={setMonthPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[180px] justify-start text-left font-semibold h-10 px-4 rounded-xl border-2 hover:bg-gray-50",
                    !monthStr && "text-muted-foreground"
                  )}
                  style={{ borderColor: '#bfdbfe', color: '#1e3a8a' }}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" style={{ color: '#2563eb' }} />
                  {format(parse(monthStr, "yyyy-MM", new Date()), "MMMM yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" align="end">
                <div className="flex items-center justify-between mb-4">
                  <Button variant="ghost" size="icon" onClick={() => setMonthStr(`${currentYear - 1}-${String(currentMonth).padStart(2, '0')}`)} className="h-7 w-7 p-0 hover:bg-gray-100">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="font-bold text-sm" style={{ color: '#0f224a' }}>{currentYear}</div>
                  <Button variant="ghost" size="icon" onClick={() => setMonthStr(`${currentYear + 1}-${String(currentMonth).padStart(2, '0')}`)} className="h-7 w-7 p-0 hover:bg-gray-100">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {months.map((m, idx) => (
                    <Button
                      key={m}
                      variant="ghost"
                      onClick={() => handleMonthChange(currentYear, idx + 1)}
                      className={cn(
                        "h-9 text-xs font-semibold hover:bg-gray-100 hover:text-gray-900",
                        currentMonth === idx + 1 && "bg-[#2563eb] text-white hover:bg-[#2563eb] hover:text-white"
                      )}
                    >
                      {m}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Daily Date Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: '#1e3a8a' }}>Filter by Exact Date</label>
            <div className="flex items-center gap-2">
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[180px] justify-start text-left font-medium h-10 px-4 rounded-xl border-2 hover:bg-gray-50",
                      !selectedDate && "text-gray-500"
                    )}
                    style={{ borderColor: selectedDate ? '#2563eb' : '#bfdbfe', color: selectedDate ? '#2563eb' : '#1e40af' }}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => { setSelectedDate(d); setDatePickerOpen(false); }}

                    month={parse(monthStr, "yyyy-MM", new Date())}
                    onMonthChange={(d) => setMonthStr(format(d, "yyyy-MM"))}
                  />
                </PopoverContent>
              </Popover>
              {selectedDate && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setSelectedDate(undefined)} 
                  className="h-10 w-10 rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50 transition"
                  title="Clear date filter"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Month Total Card */}
        <div className="p-6 rounded-2xl flex items-center justify-between shadow-sm" style={{ background: 'linear-gradient(135deg, #f0f4f8, #fff)', border: '1px solid #bfdbfe' }}>
          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: '#1e40af' }}>
              Total Received in {format(parse(monthStr, "yyyy-MM", new Date()), "MMMM yyyy")}
            </p>
            <p className="text-2xl font-black" style={{ color: '#1e3a8a' }}>
              Rs {totalReceivings.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#dbeafe', color: '#2563eb' }}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
        </div>

        {/* Date Total Card (Visible only when date is selected) */}
        {selectedDate && (
          <div className="p-6 rounded-2xl flex items-center justify-between shadow-sm border" style={{ background: 'linear-gradient(135deg, #f0fdf4, #fff)', borderColor: '#bbf7d0' }}>
            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: '#166534' }}>
                Total on {format(selectedDate, "MMM do, yyyy")}
              </p>
              <p className="text-2xl font-black" style={{ color: '#15803d' }}>
                Rs {totalFiltered.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#dcfce3', color: '#16a34a' }}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl overflow-hidden shadow-sm border" style={{ background: "#fff", borderColor: "#bfdbfe" }}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin w-8 h-8" style={{ color: "#2563eb" }} fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <svg className="w-14 h-14" style={{ color: "#bfdbfe" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            <p className="text-sm font-medium" style={{ color: "#38bdf8" }}>
              {selectedDate ? `No receivings found for ${format(selectedDate, "PPP")}.` : `No receivings found for ${format(parse(monthStr, "yyyy-MM", new Date()), "MMMM yyyy")}.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#f0f4f8", borderBottom: "1px solid #bfdbfe" }}>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Date</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Student</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Class & Sec</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Major</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Amount</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Received By</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "#dbeafe" }}>
                {filteredPayments.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-5 py-3 font-medium whitespace-nowrap" style={{ color: "#1e3a8a" }}>
                      {new Date(p.payment_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-semibold" style={{ color: "#0f224a" }}>{p.student?.name}</p>
                      <p className="text-[11px]" style={{ color: "#38bdf8" }}>{p.student?.father_name}</p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-medium" style={{ color: "#1e3a8a" }}>{p.student?.academy_class?.name || "—"}</p>
                      <p className="text-xs" style={{ color: "#38bdf8" }}>{p.student?.section?.name || "—"}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide" style={{ background: "#f0f4f8", color: "#2563eb" }}>
                        {p.student?.major?.name || "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-800">
                        Rs {parseFloat(p.amount_paid).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-semibold text-xs px-2 py-1 rounded-md" style={{ background: "#bfdbfe", color: "#1e3a8a" }}>
                        {p.receiver?.name || "Admin"}
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
