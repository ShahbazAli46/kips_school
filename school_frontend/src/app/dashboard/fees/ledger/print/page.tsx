"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };
}

function formatDate(dateStr: string) {
  if (!dateStr) return "—";
  try {
    const datePart = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
    const parts = datePart.split("-");
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthIndex = parseInt(month, 10) - 1;
    return `${day} ${months[monthIndex]} ${year}`;
  } catch {
    return dateStr;
  }
}

function formatCurrency(amount: number | string | null | undefined) {
  const num = parseFloat((amount ?? 0).toString()) || 0;
  return num.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatMonthName(monthStr: string) {
  if (!monthStr) return "—";
  try {
    const parts = monthStr.split("-");
    if (parts.length !== 2) return monthStr;
    const [year, month] = parts;
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthIndex = parseInt(month, 10) - 1;
    return `${months[monthIndex]} ${year}`;
  } catch {
    return monthStr;
  }
}

function PrintLedgerContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [student, setStudent] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [feeItems, setFeeItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`${API}/fees/ledger/${id}`, { headers: getAuthHeaders() })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((data) => {
        setStudent(data.student);
        setSummary(data.summary);
        setLedger(data.ledger || []);
        setPayments(data.payments || []);
        setFeeItems(data.fee_items || data.student?.fee_items || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (!loading && student) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [loading, student]);

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 font-sans">
        Preparing official bank-grade statement for printing...
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-8 text-center text-red-600 font-sans font-bold">
        Student record not found.
      </div>
    );
  }

  const rollNumber = student?.roll_number || `KIPS-${new Date().getFullYear()}-${String(student.id).padStart(3, "0")}`;
  const statementDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const closingArrears = parseFloat(summary?.arrears || 0);
  const totalBilled = parseFloat(summary?.total_due || 0);
  const totalPaid = parseFloat(summary?.total_paid || 0);
  const totalDiscount = parseFloat(summary?.total_discount || 0);

  return (
    <div className="bg-white font-sans text-slate-900 min-h-screen p-2 sm:p-6 print:p-0">
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .ledger-print-banner {
            display: flex !important;
            background-color: #0f224a !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }
        }
      `}</style>
      
      {/* ══════════════════════ BANK STATEMENT PRINT CANVAS ══════════════════════ */}
      <main className="max-w-4xl mx-auto bg-white border border-slate-300 print:border-none overflow-hidden">
        
        {/* Header Banner */}
        <div className="ledger-print-banner p-5 bg-[#0f224a] text-white border-b-4 border-amber-500 flex justify-between items-center" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact', backgroundColor: '#0f224a', color: '#ffffff' }}>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white rounded-xl p-1 shadow flex items-center justify-center flex-shrink-0" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
              <img src="/logo.jpg" alt="KIPS Logo" className="w-full h-full object-contain rounded-lg" />
            </div>
            <div>
              <div className="text-[9px] font-black uppercase tracking-widest bg-amber-400 text-slate-950 px-2 py-0.5 rounded inline-block mb-0.5" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                Official Financial Statement
              </div>
              <h1 className="text-xl font-black tracking-tight uppercase text-white">KIPS SCHOOL</h1>
              <p className="text-xs font-semibold text-slate-200">Chunian Campus</p>
              <p className="text-[10px] text-slate-300">Helpline: 0300 39 39 581</p>
            </div>
          </div>

          <div className="text-right bg-white/10 p-2.5 rounded-lg border border-white/20" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
            <p className="text-[10px] text-slate-200">Issue Date: <strong className="text-white">{statementDate}</strong></p>
          </div>
        </div>

        {/* Student Account Particulars */}
        <section className="p-4 bg-slate-50 border-b border-slate-200" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
          <div className="grid grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-2.5 rounded border border-slate-200" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
              <span className="text-slate-400 uppercase font-semibold text-[9px] block">Student Name</span>
              <p className="font-bold text-slate-900 text-sm">{student?.name}</p>
              <p className="text-slate-500 text-[10px]">S/O {student?.father_name || "—"}</p>
            </div>

            <div className="bg-white p-2.5 rounded border border-slate-200" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
              <span className="text-slate-400 uppercase font-semibold text-[9px] block">Roll / Reg Number</span>
              <p className="font-mono text-sm font-bold text-blue-700">{rollNumber}</p>
              <p className="text-slate-500 text-[10px]">ID: #{student?.id}</p>
            </div>

            <div className="bg-white p-2.5 rounded border border-slate-200" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
              <span className="text-slate-400 uppercase font-semibold text-[9px] block">Class &amp; Section</span>
              <p className="font-bold text-slate-900 text-sm">{student?.class_name} ({student?.section_name || "A"})</p>
              <p className="text-slate-500 text-[10px]">{student?.major_name || student?.stream_type || "Regular Stream"}</p>
            </div>

            <div className="bg-white p-2.5 rounded border border-slate-200" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
              <span className="text-slate-400 uppercase font-semibold text-[9px] block">Contact &amp; Admission</span>
              <p className="font-mono text-xs font-bold text-slate-900">{student?.contact_number || student?.father_cell || "—"}</p>
              <p className="text-slate-500 text-[10px]">Admitted: {student?.admission_month || formatDate(student?.created_at)}</p>
            </div>
          </div>
        </section>

        {/* Itemized Heads Sub-ledger */}
        {Array.isArray(feeItems) && feeItems.length > 0 && (
          <section className="p-4 bg-slate-50 border-b border-slate-200" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2">
              Itemized Fee Heads &amp; Tuition Breakdown
            </h3>
            <table className="w-full text-left border-collapse font-sans text-[10px] border border-slate-300 bg-white" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
              <thead>
                <tr className="bg-slate-200 text-slate-800 font-bold uppercase" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                  <th className="p-1.5 border border-slate-300">Fee Particulars</th>
                  <th className="p-1.5 border border-slate-300">Type</th>
                  <th className="p-1.5 border border-slate-300 text-right">Standard (Rs)</th>
                  <th className="p-1.5 border border-slate-300 text-right">Concession (Rs)</th>
                  <th className="p-1.5 border border-slate-300 text-right">Debit / Billed (Rs)</th>
                  <th className="p-1.5 border border-slate-300 text-right">Credit / Paid (Rs)</th>
                  <th className="p-1.5 border border-slate-300 text-center">Status</th>
                  <th className="p-1.5 border border-slate-300 text-right font-black">Balance (Rs)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono text-[10px]">
                {(() => {
                  let cumulativeBal = 0;
                  return feeItems.map((head: any, idx: number) => {
                    const actual = parseFloat(head.actual_amount || 0);
                    const discount = parseFloat(head.discount_amount || 0);
                    const payable = parseFloat(head.payable_amount || 0);
                    const paid = parseFloat(head.paid_amount || 0);
                    const rowNet = payable - paid;
                    cumulativeBal += rowNet;
                    const runningBal = head.running_balance !== undefined ? parseFloat(head.running_balance) : cumulativeBal;
                    const isCleared = (payable - paid) <= 0 && payable > 0;
                    const isUnpaid = (payable - paid) > 0 && paid === 0;

                    return (
                      <tr key={head.id || idx}>
                        <td className="p-1.5 font-sans font-bold text-slate-900 border-r border-slate-200">{head.head_name}</td>
                        <td className="p-1.5 font-sans text-slate-500 capitalize border-r border-slate-200">{head.head_type?.replace('_', ' ') || 'One-time'}</td>
                        <td className="p-1.5 text-right text-slate-600 border-r border-slate-200">{formatCurrency(actual)}</td>
                        <td className="p-1.5 text-right text-blue-700 border-r border-slate-200">{discount > 0 ? formatCurrency(discount) : "—"}</td>
                        <td className="p-1.5 text-right font-bold text-slate-900 border-r border-slate-200">{formatCurrency(payable)}</td>
                        <td className="p-1.5 text-right font-bold text-emerald-800 border-r border-slate-200">{formatCurrency(paid)}</td>
                        <td className="p-1.5 text-center font-sans border-r border-slate-200">
                          {payable === 0 ? "N/A" : isCleared ? "Cleared" : isUnpaid ? "Unpaid" : "Partial"}
                        </td>
                        <td className="p-1.5 text-right font-black border-r border-slate-200">
                          {runningBal > 0 ? (
                            <span>Rs. {formatCurrency(runningBal)} <strong className="text-[9px]">Dr</strong></span>
                          ) : runningBal < 0 ? (
                            <span>Rs. {formatCurrency(Math.abs(runningBal))} <strong className="text-[9px]">Cr</strong></span>
                          ) : (
                            "0.00"
                          )}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
              <tfoot>
                <tr className="bg-slate-200 font-bold border-t-2 border-slate-400 text-[10px]" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                  <td colSpan={2} className="p-1.5 uppercase font-black text-slate-900 border-r border-slate-300">
                    Closing Statement Balance
                  </td>
                  <td className="p-1.5 text-right font-mono text-slate-800 border-r border-slate-300">
                    {formatCurrency(feeItems.reduce((sum: number, it: any) => sum + parseFloat(it.actual_amount || 0), 0))}
                  </td>
                  <td className="p-1.5 text-right font-mono text-blue-800 border-r border-slate-300">
                    {formatCurrency(feeItems.reduce((sum: number, it: any) => sum + parseFloat(it.discount_amount || 0), 0))}
                  </td>
                  <td className="p-1.5 text-right font-mono font-black text-slate-900 border-r border-slate-300">
                    {formatCurrency(totalBilled)}
                  </td>
                  <td className="p-1.5 text-right font-mono font-black text-emerald-800 border-r border-slate-300">
                    {formatCurrency(totalPaid)}
                  </td>
                  <td className="p-1.5 text-center font-sans text-[9px] border-r border-slate-300">
                    {closingArrears > 0 ? "DEBIT DUE" : "SETTLED"}
                  </td>
                  <td className="p-1.5 text-right font-mono font-black text-slate-900 border-r border-slate-300">
                    Rs. {formatCurrency(closingArrears)} {closingArrears > 0 ? "(Dr)" : ""}
                  </td>
                </tr>
              </tfoot>
            </table>
          </section>
        )}

        {/* Signatures & Authentication */}
        <div className="p-5 bg-white">
          <div className="grid grid-cols-3 gap-6 items-end pt-4 pb-1">
            <div className="text-left">
              <div className="w-36 border-b border-slate-400 mb-1.5"></div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-900">Accounts Officer</p>
              <p className="text-[8px] text-slate-400">Verified from Ledger Records</p>
            </div>

            <div className="text-center flex flex-col items-center">
              <div className="w-14 h-14 rounded-full border border-dashed border-slate-400 flex items-center justify-center p-1 mb-1">
                <span className="text-[7px] uppercase font-bold text-slate-400 text-center leading-tight">
                  Official Seal
                </span>
              </div>
            </div>

            <div className="text-right">
              <div className="w-36 border-b border-slate-400 mb-1.5 ml-auto"></div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-900">Principal / Director</p>
              <p className="text-[8px] text-slate-400">KIPS School Chunian Campus</p>
            </div>
          </div>

          <div className="mt-4 pt-2 border-t border-slate-200 text-center text-[8px] text-slate-400">
            * Computer-generated official student financial statement. Errors and omissions excepted (E&amp;OE).
          </div>
        </div>

      </main>
    </div>
  );
}

import PageLoader from "@/components/PageLoader";

export default function PrintLedgerPage() {
  return (
    <Suspense fallback={<PageLoader text="Loading print statement..." />}>
      <PrintLedgerContent />
    </Suspense>
  );
}
