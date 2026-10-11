"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };
}

interface SalaryItem {
  id: number;
  subject_id: number;
  class_id: number | null;
  major_id: number | null;
  payment_type: "fixed" | "percentage";
  fixed_amount: string | null;
  student_id: number | null;
  student_fee_paid: string | null;
  student_active_subjects_count: number | null;
  subject_share: string | null;
  percentage: string | null;
  teacher_cut: string;
  subject?: { id: number; name: string };
  academyClass?: { id: number; name: string };
  major?: { id: number; name: string };
  section?: { id: number; name: string };
  student?: { id: number; name: string };
}

interface SalaryPayment {
  id: number;
  amount_paid: string;
  payment_date: string;
  payment_method: string;
  notes: string | null;
}

interface SalarySlip {
  id: number;
  teacher_id: number;
  month: string;
  total_amount: string;
  attendance_percentage: string;
  permitted_off_days: number;
  taken_off_days: number;
  bonus: string;
  previous_arrears: string;
  advance_deducted: string;
  payable_salary: string;
  total_paid: string;
  status: string;
  teacher?: { id: number; name: string };
  items: SalaryItem[];
  payments?: SalaryPayment[];
}

import { User, Calendar, DollarSign, ShieldCheck, Printer, ArrowLeft, Mail } from "lucide-react";

function formatMonth(m?: string) {
  if (!m) return "";
  const parts = m.split("-");
  if (parts.length === 2) {
    const year = parseInt(parts[0], 10);
    const monthNum = parseInt(parts[1], 10);
    const date = new Date(year, monthNum - 1, 1);
    return date.toLocaleString("en-US", { month: "long", year: "numeric" });
  }
  return m;
}

function PrintableSalarySlipContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id");

  const [slip, setSlip] = useState<SalarySlip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEmailing, setIsEmailing] = useState(false);
  const [emailStatus, setEmailStatus] = useState<"idle" | "success" | "error">("idle");

  const fetchSlip = useCallback(async () => {
    try {
      const res = await fetch(`${API}/salaries/${id}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load slip");
      setSlip(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchSlip(); }, [fetchSlip]);

  const handleEmailSlip = async () => {
    if (!id || !slip) return;
    setIsEmailing(true);
    setEmailStatus("idle");
    try {
      const res = await fetch(`${API}/salaries/${id}/email`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Failed to email slip");
      }
      setEmailStatus("success");
      setTimeout(() => setEmailStatus("idle"), 3000);
    } catch (err: any) {
      console.error(err);
      setEmailStatus("error");
      setTimeout(() => setEmailStatus("idle"), 3000);
    } finally {
      setIsEmailing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans">
        <p className="text-slate-500 font-medium animate-pulse">Loading salary slip...</p>
      </div>
    );
  }

  if (error || !slip) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans">
        <p className="text-red-500 font-semibold">{error || "Salary slip not found"}</p>
        <button onClick={() => router.back()} className="ml-4 underline text-sm text-blue-700 font-bold">Go Back</button>
      </div>
    );
  }

  const fixedSalary = parseFloat(slip.total_amount || "0");
  const payableSalary = parseFloat(slip.payable_salary || slip.total_amount || "0");
  const totalPaid = parseFloat(slip.total_paid || "0");
  const balanceOwed = payableSalary - totalPaid;
  const monthFormatted = formatMonth(slip.month);

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
            .no-print { display: none !important; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
            body { background-color: white !important; margin: 0 !important; padding: 0 !important; }
            @page { margin: 8mm; size: A4 portrait; }
            header, nav, aside { display: none !important; }
        }
      `,
        }}
      />

      <div className="bg-[#f0f4f9] min-h-screen flex flex-col items-center py-6 px-4 print:p-0 print:bg-white font-sans text-[#19243a]">
        
        {/* Action Toolbar (Hidden on Print) */}
        <div className="w-full max-w-[760px] flex justify-between items-center gap-4 mb-4 no-print bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <button
            onClick={() => router.push('/dashboard/salaries')}
            className="text-xs font-bold text-slate-700 hover:text-slate-900 transition flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <div className="flex gap-2 items-center">
            {emailStatus === "success" && <span className="text-xs text-emerald-600 font-bold">✓ Email Sent!</span>}
            {emailStatus === "error" && <span className="text-xs text-red-600 font-bold">✕ Failed to send</span>}
            <button 
              onClick={handleEmailSlip} 
              disabled={isEmailing}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#263c83] text-[#263c83] rounded-lg text-xs font-bold uppercase tracking-wider shadow-xs hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              <Mail className="w-3.5 h-3.5" />
              {isEmailing ? "Sending..." : "Email Slip"}
            </button>
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#263c83] text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm hover:bg-[#1e2f69] transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Slip (Ctrl + P)
            </button>
          </div>
        </div>

        {/* Main Salary Slip Container - Exact Figma Replica */}
        <main className="bg-white w-full max-w-[760px] border border-[#263c83]/20 shadow-md rounded-2xl overflow-hidden relative flex flex-col print:border-none print:shadow-none print:w-full print:max-w-full print:rounded-none">
          
          {/* Top Decorative Bands */}
          <div className="w-full h-1.5 bg-[#263c83]" />
          <div className="w-full h-[3px] bg-[#e8b84b]" />

          {/* Background Watermark */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.035] -z-0">
            <img src="/logo.jpg" alt="Watermark" className="w-[380px] h-[380px] object-contain grayscale" />
          </div>

          <div className="p-8 sm:p-10 flex flex-col gap-6 relative z-10 print:p-6 print:gap-4">
            
            {/* Header: Institution Branding */}
            <div className="flex items-center gap-5">
              <div className="w-[84px] h-[84px] rounded-2xl border border-[#263c83]/20 bg-white shadow-2xs flex items-center justify-center p-2 shrink-0">
                <img alt="KIPS Logo" className="w-full h-full object-contain" src="/logo.jpg" />
              </div>
              <div className="h-14 w-[1.5px] bg-[#ccd3e0]" />
              <div className="flex flex-col justify-center">
                <h1 className="text-xl sm:text-2xl font-black text-[#263c83] tracking-wide uppercase leading-tight font-sans">
                  KIPS SCHOOL CHUNIAN CAMPUS
                </h1>
                <div className="mt-1">
                  <span className="inline-block bg-[#263c83] text-[#e8b84b] text-[10px] font-extrabold tracking-widest px-3 py-0.5 rounded-full uppercase shadow-2xs">
                    TOPPER&apos;S FIRST CHOICE
                  </span>
                </div>
              </div>
            </div>

            {/* Double Horizontal Rule */}
            <div className="flex flex-col gap-[2px]">
              <div className="w-full h-[3px] bg-[#263c83]" />
              <div className="w-full h-[1.5px] bg-[#e8b84b]" />
            </div>

            {/* Document Title Section */}
            <div className="flex justify-between items-center pt-1">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-[#19243a] tracking-tight">
                  Salary Slip
                </h2>
                <div className="mt-1">
                  <span className="inline-block bg-[#263c83] text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md">
                    OFFICIAL PAYROLL DOCUMENT
                  </span>
                </div>
              </div>
              {/* Geometric Accent Bars */}
              <div className="flex items-end gap-1.5 h-9">
                <div className="w-1.5 h-9 bg-[#263c83] rounded-full" />
                <div className="w-1.5 h-7 bg-[#263c83] rounded-full" />
                <div className="w-1.5 h-5 bg-[#ccd3e0] rounded-full" />
                <div className="w-1.5 h-3.5 bg-[#e8edf8] rounded-full" />
              </div>
            </div>

            <div className="w-full h-[1px] bg-[#ccd3e0]" />

            {/* Employee & Pay Period Card */}
            <section className="border border-[#263c83] bg-white rounded-xl overflow-hidden shadow-2xs relative">
              <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-[#263c83]" />
              <div className="grid grid-cols-2 divide-x divide-[#ccd3e0] p-4 pl-6">
                <div className="flex flex-col justify-center">
                  <div className="flex items-center gap-1.5 text-[#586176] text-[10px] font-bold uppercase tracking-wider mb-0.5">
                    <User className="w-3.5 h-3.5" />
                    <span>TEACHER NAME</span>
                  </div>
                  <p className="text-lg sm:text-xl font-bold text-[#19243a] leading-tight">
                    {slip.teacher?.name || "Teacher"}
                  </p>
                </div>
                <div className="flex flex-col justify-center pl-6 text-right sm:text-right">
                  <div className="flex items-center justify-end gap-1.5 text-[#586176] text-[10px] font-bold uppercase tracking-wider mb-0.5">
                    <span>PAY PERIOD</span>
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-lg sm:text-xl font-bold text-[#19243a] leading-tight">
                    {slip.month}
                  </p>
                </div>
              </div>
            </section>

            {/* Earnings Table: Fixed Salary Only */}
            <section className="w-full">
              <div className="border border-[#ccd3e0] rounded-xl overflow-hidden shadow-2xs">
                {/* Earnings Banner */}
                <div className="bg-[#263c83] text-white px-4 py-2.5 flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0">
                    <DollarSign className="w-3.5 h-3.5 text-[#e8b84b] stroke-[2.5]" />
                  </div>
                  <h3 className="text-[11px] uppercase font-bold tracking-widest">
                    EARNINGS
                  </h3>
                </div>

                {/* Subheadings */}
                <div className="bg-[#f8fafc] border-b border-[#ccd3e0] px-4 py-2 flex justify-between items-center text-[10px] font-bold text-[#263c83] uppercase tracking-wider">
                  <span>DESCRIPTION</span>
                  <span>AMOUNT</span>
                </div>

                {/* Row */}
                <div className="bg-white px-4 py-3.5 flex justify-between items-center text-sm border-b border-[#ccd3e0] last:border-b-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-1 h-4 bg-[#e8b84b] rounded-full" />
                    <span className="font-semibold text-[#19243a]">Fixed Salary</span>
                  </div>
                  <span className="font-bold text-[#263c83]">
                    Rs {fixedSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </section>

            {/* Summary Box */}
            <section className="border border-[#ccd3e0] rounded-xl bg-white p-4 flex flex-col gap-2.5 shadow-2xs">
              <div className="flex justify-between items-center text-[13px]">
                <span className="text-[#586176]">Fixed Salary:</span>
                <span className="font-semibold text-[#19243a]">
                  Rs {fixedSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Adjustments (if any) */}
              {(slip.taken_off_days > slip.permitted_off_days) && (
                <div className="flex justify-between items-center text-xs text-red-600">
                  <span>Unpaid Offs ({slip.taken_off_days - slip.permitted_off_days} days):</span>
                  <span className="font-semibold">
                    − Rs {(((fixedSalary / 30)) * (slip.taken_off_days - slip.permitted_off_days)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {parseFloat(slip.bonus || "0") > 0 && (
                <div className="flex justify-between items-center text-xs text-emerald-600">
                  <span>Bonus:</span>
                  <span className="font-semibold">
                    + Rs {parseFloat(slip.bonus).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {parseFloat(slip.previous_arrears || "0") > 0 && (
                <div className="flex justify-between items-center text-xs text-purple-600">
                  <span>Previous Arrears:</span>
                  <span className="font-semibold">
                    + Rs {parseFloat(slip.previous_arrears).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {parseFloat(slip.advance_deducted || "0") > 0 && (
                <div className="flex justify-between items-center text-xs text-amber-600">
                  <span>Advance Deducted:</span>
                  <span className="font-semibold">
                    − Rs {parseFloat(slip.advance_deducted).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              <div className="w-full h-[1px] bg-[#ccd3e0] my-0.5" />

              <div className="flex justify-between items-center pt-0.5">
                <span className="text-[11px] font-black text-[#19243a] uppercase tracking-wider">
                  NET PAYABLE:
                </span>
                <div className="bg-[#263c83] text-white px-3.5 py-1 rounded-lg text-sm font-bold shadow-2xs">
                  Rs {payableSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </section>

            {/* Installments Table (If partial payments exist) */}
            {slip.payments && slip.payments.length > 0 && (
              <section className="border border-[#ccd3e0] rounded-xl overflow-hidden shadow-2xs text-xs">
                <div className="bg-[#f8fafc] border-b border-[#ccd3e0] px-3.5 py-1.5 flex justify-between items-center text-[10px] font-bold text-[#586176] uppercase tracking-wider">
                  <span>Payment History ({slip.payments.length} Installments)</span>
                  <span className="text-emerald-700">Total Paid: Rs {totalPaid.toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                </div>
                <div className="divide-y divide-[#f0f0f0]">
                  {slip.payments.map((p, idx) => (
                    <div key={p.id} className="px-3.5 py-1.5 flex justify-between items-center text-xs">
                      <span className="text-[#586176]">
                        #{idx + 1} &bull; {new Date(p.payment_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} ({p.payment_method})
                      </span>
                      <span className="font-bold text-emerald-700">
                        Rs {parseFloat(p.amount_paid).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Balance Owed Hero Banner */}
            <section className="rounded-xl overflow-hidden shadow-sm relative border-t-2 border-[#e8b84b]">
              <div className="bg-gradient-to-r from-[#263c83] to-[#19243a] text-white p-5 sm:p-6 flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#e8b84b] mb-0.5">
                    BALANCE OWED
                  </span>
                  <span className="text-[10px] text-white/80 font-normal">
                    {monthFormatted ? `Net payable for ${monthFormatted}` : "Current net outstanding balance"}
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Rs {Math.round(balanceOwed > 0 ? balanceOwed : 0).toLocaleString()}
                </div>
              </div>
            </section>

            {/* Signature & Official Stamp Section */}
            <footer className="mt-6 pt-4 flex items-center justify-between gap-4" style={{ breakInside: 'avoid' }}>
              {/* Teacher Signature */}
              <div className="flex flex-col items-start w-44">
                <div className="w-full h-[1px] bg-[#ccd3e0] mb-2" />
                <span className="text-[10px] font-bold text-[#586176] uppercase tracking-wider">
                  TEACHER SIGNATURE
                </span>
                <span className="text-[10px] text-[#8a95a8] mt-0.5">
                  {slip.teacher?.name}
                </span>
              </div>

              {/* Official Stamp Placeholder */}
              <div className="w-20 h-20 rounded-full border-2 border-dashed border-[#263c83] flex flex-col items-center justify-center text-center p-1 bg-white shadow-2xs shrink-0">
                <ShieldCheck className="w-4 h-4 text-[#263c83]" />
                <span className="text-[8px] font-extrabold text-[#263c83] uppercase tracking-wider leading-tight mt-1">
                  OFFICIAL<br />STAMP
                </span>
              </div>

              {/* Admin Signature */}
              <div className="flex flex-col items-end w-44">
                <div className="w-full h-[1px] bg-[#ccd3e0] mb-2" />
                <span className="text-[10px] font-bold text-[#586176] uppercase tracking-wider">
                  ADMIN SIGNATURE
                </span>
                <span className="text-[10px] text-[#8a95a8] mt-0.5">
                  Authorized Signatory
                </span>
              </div>
            </footer>

          </div>

          {/* Bottom Decorative Bands */}
          <div className="w-full h-[3px] bg-[#e8b84b]" />
          <div className="w-full h-1.5 bg-[#263c83]" />
        </main>
      </div>
    </>
  );
}

import PageLoader from "@/components/PageLoader";

export default function PrintableSalarySlipWrapper() {
  return (
    <Suspense fallback={<PageLoader text="Loading salary slip..." />}>
      <PrintableSalarySlipContent />
    </Suspense>
  );
}
