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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 font-medium">Loading details...</p>
      </div>
    );
  }

  if (error || !slip) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-red-500 font-medium">{error || "Not found"}</p>
        <button onClick={() => router.back()} className="ml-4 underline text-sm">Go Back</button>
      </div>
    );
  }

  // Group percentage items by subject+class+major+section
  const percentageItems = slip.items.filter(i => i.payment_type === 'percentage');
  const pctBySubject = percentageItems.reduce((acc, item) => {
    const s = item.student as any;
    const className = item.academyClass?.name || s?.academy_class?.name || s?.class_name;
    const sectionName = item.section?.name || s?.section?.name;
    const majorName = item.major?.name || s?.major?.name;
    const classInfo = [className, sectionName, majorName].filter(Boolean).join(" ");
    
    const subjectName = item.subject?.name || 'Unknown';
    const key = classInfo ? `${classInfo} - ${subjectName}` : subjectName;
    
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, SalaryItem[]>);

  const fixedItems = slip.items.filter(i => i.payment_type === 'fixed');

  return (
    <div className="bg-[#f2f3ff] min-h-screen flex flex-col items-center py-6 px-4 print:p-0 print:bg-white font-sans text-[#131b2e]">
      
      {/* Action Toolbar (Hidden on Print) */}
      <div className="w-full max-w-[800px] flex justify-between items-center gap-4 mb-4 print:hidden">
        <button onClick={() => router.push('/dashboard/salaries')} className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition flex items-center gap-2">
          &larr; Back to Dashboard
        </button>
        <div className="flex gap-4 items-center">
          {emailStatus === "success" && <span className="text-sm text-green-600 font-bold">Email Sent!</span>}
          {emailStatus === "error" && <span className="text-sm text-red-600 font-bold">Failed to send</span>}
          <button 
            onClick={handleEmailSlip} 
            disabled={isEmailing}
            className="flex items-center gap-1 px-4 py-2 bg-white border border-[#1e3a8a] text-[#1e3a8a] rounded-lg text-sm font-bold uppercase tracking-wide shadow-sm hover:bg-[#fff5f5] transition-colors disabled:opacity-50"
          >
            {isEmailing ? "Sending..." : "Email Slip"}
          </button>
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-1 px-4 py-2 bg-[#1e3a8a] text-white rounded-lg text-sm font-bold uppercase tracking-wide shadow-sm hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-[20px]">print</span>
            Print PDF
          </button>
        </div>
      </div>

      {/* Main Salary Slip Container */}
      <main className="bg-white w-full max-w-[800px] border border-[#e2e8f0] shadow-sm rounded-xl overflow-hidden p-10 flex flex-col gap-4 print:border-none print:shadow-none print:w-full print:max-w-full print:p-0">
        
        {/* Header Section */}
        <div className="flex justify-between items-start border-b-2 border-[#1e3a8a] pb-4 mb-6 print:pb-4 print:mb-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-4 mt-2">
              <img alt="Academy Logo" className="h-20 w-auto object-contain print:h-16" src="/logo.jpg" />
              <div className="flex flex-col">
                <span className="text-lg text-[#1e3a8a] font-extrabold uppercase">Kips School Chunian Campus</span>
                <span className="text-[#434655] text-[10px] font-bold uppercase tracking-widest">Topper's First Choice</span>
              </div>
            </div>
          </div>
        </div>

        {/* Teacher Information */}
        <section className="grid grid-cols-2 gap-6 mb-6">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-[#434655] font-bold uppercase tracking-wider">Teacher Name</label>
            <p className="text-lg text-[#131b2e] font-semibold">{slip.teacher?.name}</p>
          </div>
          <div className="text-right flex flex-col gap-1">
            <label className="text-[10px] text-[#434655] font-bold uppercase tracking-wider">Pay Period</label>
            <p className="text-lg text-[#131b2e] font-semibold">{slip.month}</p>
          </div>
        </section>

        {/* Earnings Tables Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2">
          
          {Object.entries(pctBySubject).map(([subjectName, items]) => {
            const totalCut = items.reduce((sum, item) => sum + parseFloat(item.teacher_cut), 0);
            return (
              <div key={subjectName} className="flex flex-col border border-[#e2e8f0] rounded-lg overflow-hidden break-inside-avoid">
                <div className="bg-[#1e3a8a] text-white px-4 py-2 print:bg-[#1e3a8a] print:text-white" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                  <h3 className="text-xs uppercase font-bold tracking-widest">{subjectName}</h3>
                </div>
                <table className="w-full border-collapse text-xs print:text-[10px]">
                  <thead className="bg-[#eaedff] text-[#434655] text-[9px] uppercase tracking-wider print:bg-[#eaedff]" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                    <tr>
                      <th className="text-left py-1.5 px-3 border-b border-[#e2e8f0]">Student</th>
                      <th className="text-right py-1.5 px-3 border-b border-[#e2e8f0]">Fee</th>
                      <th className="text-center py-1.5 px-3 border-b border-[#e2e8f0]">%</th>
                      <th className="text-right py-1.5 px-3 border-b border-[#e2e8f0]">Cut</th>
                    </tr>
                  </thead>
                  <tbody className="text-[#131b2e]">
                    {items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-[#f2f3ff] transition-colors border-b border-gray-100 last:border-0">
                        <td className="py-1.5 px-3">
                          {item.student?.name}
                        </td>
                        <td className="py-1.5 px-3 text-right">Rs {parseFloat(item.student_fee_paid || '0').toLocaleString()}</td>
                        <td className="py-1.5 px-3 text-center">{parseFloat(item.percentage || '0')}%</td>
                        <td className="py-1.5 px-3 text-right font-semibold">Rs {parseFloat(item.teacher_cut).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-[#f2f3ff] border-t border-[#1e3a8a] print:bg-[#f2f3ff]" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                    <tr>
                      <td className="text-right py-1.5 px-3 text-[10px] text-[#434655] uppercase font-bold" colSpan={3}>Total</td>
                      <td className="text-right py-1.5 px-3 font-bold text-[#1e3a8a]">Rs {totalCut.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            );
          })}

          {fixedItems.length > 0 && (
            <div className="flex flex-col border border-[#e2e8f0] rounded-lg overflow-hidden break-inside-avoid">
              <div className="bg-[#1e3a8a] text-white px-4 py-2 print:bg-[#1e3a8a] print:text-white" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                <h3 className="text-xs uppercase font-bold tracking-widest">Fixed Allowances</h3>
              </div>
              <table className="w-full border-collapse text-xs print:text-[10px]">
                <thead className="bg-[#eaedff] text-[#434655] text-[9px] uppercase tracking-wider print:bg-[#eaedff]" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                  <tr>
                    <th className="text-left py-1.5 px-3 border-b border-[#e2e8f0]">Detail</th>
                    <th className="text-right py-1.5 px-3 border-b border-[#e2e8f0]">Amount</th>
                  </tr>
                </thead>
                <tbody className="text-[#131b2e]">
                  {fixedItems.map((item, idx) => {
                    const classInfo = [item.academyClass?.name, item.major?.name, item.section?.name].filter(Boolean).join(" ");
                    const title = `${item.subject?.name || 'Fixed Payment'}${classInfo ? ` (${classInfo})` : ''}`.trim();
                    return (
                      <tr key={idx} className="hover:bg-[#f2f3ff] transition-colors border-b border-gray-100 last:border-0">
                        <td className="py-1.5 px-3">{title}</td>
                        <td className="py-1.5 px-3 text-right font-semibold">Rs {parseFloat(item.teacher_cut).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-[#f2f3ff] border-t border-[#1e3a8a] print:bg-[#f2f3ff]" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                  <tr>
                    <td className="text-right py-1.5 px-3 text-[10px] text-[#434655] uppercase font-bold">Total</td>
                    <td className="text-right py-1.5 px-3 font-bold text-[#1e3a8a]">
                      Rs {fixedItems.reduce((s, i) => s + parseFloat(i.teacher_cut), 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

        </section>

        {/* Summary & Divider */}
        <div className="my-6 border-t-2 border-dashed border-[#e2e8f0] py-4 flex flex-col gap-2 print:my-4 print:py-2">
          
          {/* Calculation rows — small, informational */}
          <div className="flex justify-between items-center text-sm text-[#434655]">
            <span>Base Earned Total:</span>
            <span className="font-semibold">Rs {parseFloat(slip.total_amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
          </div>

          {(slip.taken_off_days > slip.permitted_off_days) && (
            <div className="flex justify-between items-center text-sm text-red-600">
              <span>Unpaid Offs Deduction ({slip.taken_off_days - slip.permitted_off_days} extra days):</span>
              <span className="font-semibold">− Rs {(((parseFloat(slip.total_amount) / 30)) * (slip.taken_off_days - slip.permitted_off_days)).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
          )}

          {parseFloat(slip.bonus || "0") > 0 && (
            <div className="flex justify-between items-center text-sm text-green-600">
              <span>Bonus:</span>
              <span className="font-semibold">+ Rs {parseFloat(slip.bonus).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
          )}

          {parseFloat(slip.previous_arrears || "0") > 0 && (
            <div className="flex justify-between items-center text-sm text-purple-600">
              <span>Previous Arrears Included:</span>
              <span className="font-semibold">+ Rs {parseFloat(slip.previous_arrears).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
          )}

          {parseFloat(slip.advance_deducted || "0") > 0 && (
            <div className="flex justify-between items-center text-sm text-blue-600">
              <span>Previous Advance Recovered:</span>
              <span className="font-semibold">− Rs {parseFloat(slip.advance_deducted).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
          )}

          {/* Net Payable — medium, not the star */}
          <div className="flex justify-between items-center mt-2 pt-2 border-t border-[#e2e8f0]">
            <span className="text-xs text-[#434655] uppercase font-bold tracking-wide">Net Payable:</span>
            <span className="text-base font-bold" style={{ color: '#1e3a8a' }}>
              Rs {parseFloat(slip.payable_salary || slip.total_amount).toLocaleString(undefined, {minimumFractionDigits: 2})}
            </span>
          </div>
        </div>

        {/* Installment-by-installment payments */}
        {slip.payments && slip.payments.length > 0 && (
          <div className="mb-6">
            <h4 className="text-[10px] uppercase tracking-widest font-bold text-[#434655] mb-2">Payment Installments</h4>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-[#eaedff] text-[#434655] text-[9px] uppercase tracking-wider" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                  <th className="text-left py-1.5 px-3 border-b border-[#e2e8f0]">#</th>
                  <th className="text-left py-1.5 px-3 border-b border-[#e2e8f0]">Date</th>
                  <th className="text-left py-1.5 px-3 border-b border-[#e2e8f0]">Method</th>
                  <th className="text-left py-1.5 px-3 border-b border-[#e2e8f0]">Note</th>
                  <th className="text-right py-1.5 px-3 border-b border-[#e2e8f0]">Amount</th>
                </tr>
              </thead>
              <tbody>
                {slip.payments.map((pay, idx) => (
                  <tr key={pay.id} className="border-b border-gray-100">
                    <td className="py-1.5 px-3 text-[#434655]">{idx + 1}</td>
                    <td className="py-1.5 px-3">
                      {new Date(pay.payment_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-1.5 px-3">{pay.payment_method}</td>
                    <td className="py-1.5 px-3 text-gray-400 italic">{pay.notes || '—'}</td>
                    <td className="py-1.5 px-3 text-right font-bold text-green-700">
                      Rs {parseFloat(pay.amount_paid).toLocaleString(undefined, {minimumFractionDigits: 0})}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#f2f3ff]" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                  <td colSpan={4} className="py-1.5 px-3 text-right text-[10px] uppercase font-bold text-[#434655]">Total Paid</td>
                  <td className="py-1.5 px-3 text-right font-black text-green-700">
                    Rs {parseFloat(slip.total_paid || "0").toLocaleString(undefined, {minimumFractionDigits: 0})}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Final balance — THE hero figure */}
        {(() => {
          const balanceOwed = parseFloat(slip.payable_salary || slip.total_amount) - parseFloat(slip.total_paid || "0");
          const isDebt = balanceOwed > 0.005;
          const isAdvance = balanceOwed < -0.005;
          return (
            <div
              className="rounded-xl px-6 py-5 flex justify-between items-center mb-6 print:mb-4"
              style={{
                background: isDebt ? '#fff7ed' : isAdvance ? '#f0fdf4' : '#f8fafc',
                border: `2px solid ${isDebt ? '#fed7aa' : isAdvance ? '#bbf7d0' : '#e2e8f0'}`,
              }}
            >
              <div>
                <p className="text-xs uppercase tracking-widest font-bold" style={{ color: isDebt ? '#c2410c' : isAdvance ? '#15803d' : '#64748b' }}>
                  {isDebt ? 'Balance Owed' : isAdvance ? 'Advance (Overpaid)' : 'Status'}
                </p>
                {!isDebt && !isAdvance && (
                  <p className="text-sm font-semibold text-gray-400 mt-0.5">Fully Paid & Cleared</p>
                )}
              </div>
              {(isDebt || isAdvance) && (
                <p
                  className="text-xl font-black"
                  style={{ color: isDebt ? '#c2410c' : '#15803d' }}
                >
                  Rs {Math.abs(balanceOwed).toLocaleString(undefined, {minimumFractionDigits: 0})}
                </p>
              )}
            </div>
          );
        })()}

        {/* Signature Section */}
        <footer className="mt-8 pt-6 print:mt-4 print:pt-4" style={{ breakInside: 'avoid' }}>
          <div className="grid grid-cols-2 gap-12">
            <div className="flex flex-col items-center">
              <div className="w-full border-t border-[#434655] mb-1"></div>
              <span className="text-[10px] text-[#434655] uppercase tracking-widest font-bold">Teacher Signature</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-full border-t border-[#434655] mb-1"></div>
              <span className="text-[10px] text-[#434655] uppercase tracking-widest font-bold">Admin Signature</span>
            </div>
          </div>
          <div className="mt-12 pt-4 border-t border-[#e2e8f0] flex flex-col items-center gap-1 print:mt-8">
            <p className="text-xs text-[#1e3a8a] font-bold uppercase tracking-widest">Kips School Chunian Campus</p>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default function PrintableSalarySlipWrapper() {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <PrintableSalarySlip />
    </React.Suspense>
  );
}

function PrintableSalarySlip() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-gray-500 font-medium">Loading...</p></div>}>
      <PrintableSalarySlipContent />
    </Suspense>
  );
}
