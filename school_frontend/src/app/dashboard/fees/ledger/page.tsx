"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";

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

function LedgerContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const router = useRouter();

  const [student, setStudent] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [feeItems, setFeeItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);

  // Extra Charge quick modal
  const [showExtraChargeModal, setShowExtraChargeModal] = useState(false);
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [chargeTitle, setChargeTitle] = useState("");
  const [chargeCategory, setChargeCategory] = useState("fine");
  const [chargePrice, setChargePrice] = useState<number | "">("");
  const [chargeQty, setChargeQty] = useState(1);
  const [chargePaymentOption, setChargePaymentOption] = useState<"pay_now" | "bill_to_voucher">("bill_to_voucher");
  const [submittingCharge, setSubmittingCharge] = useState(false);

  const fetchLedger = React.useCallback(() => {
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
        setFeeItems(data.statement_items || data.fee_items || data.student?.fee_items || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    fetch(`${API}/extra-charges/items`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((d) => setCatalogItems(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const handleCreateExtraCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student || !chargeTitle.trim() || !chargePrice || parseFloat(String(chargePrice)) <= 0) {
      alert("Please enter a valid title and amount.");
      return;
    }

    setSubmittingCharge(true);
    try {
      const res = await fetch(`${API}/extra-charges/issue`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          student_ids: [student.id],
          title: chargeTitle.trim(),
          category: chargeCategory,
          charge_type: "ad_hoc",
          unit_price: parseFloat(String(chargePrice)),
          quantity: chargeQty,
          payment_option: chargePaymentOption,
          payment_method: chargePaymentOption === "pay_now" ? "cash" : "voucher",
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Failed to issue charge");
      }

      setShowExtraChargeModal(false);
      setChargeTitle("");
      setChargePrice("");
      setChargeQty(1);
      fetchLedger();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingCharge(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  const handleEmail = async () => {
    if (!confirm("Are you sure you want to email this official ledger statement to the guardian?")) return;
    setSendingEmail(true);
    try {
      const res = await fetch(`${API}/fees/ledger/${id}/email`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        alert("✅ Official Fee Ledger Statement emailed successfully!");
      } else {
        const d = await res.json();
        alert("Failed to email: " + (d.message || "Unknown error"));
      }
    } catch {
      alert("Error sending email");
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Generating official bank-grade ledger statement...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!student) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center text-red-600 font-bold bg-red-50 rounded-xl max-w-lg mx-auto mt-12 border border-red-200">
          Student record not found.
        </div>
      </DashboardLayout>
    );
  }

  const rollNumber = student?.roll_number || `KIPS-${new Date().getFullYear()}-${String(student.id).padStart(3, "0")}`;
  const statementDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const closingArrears = parseFloat(summary?.arrears || 0);
  const totalBilled = parseFloat(summary?.total_due || 0);
  const totalPaid = parseFloat(summary?.total_paid || 0);
  const totalDiscount = parseFloat(summary?.total_discount || 0);

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 bg-slate-100/70 font-sans min-h-screen text-slate-900">
        
        {/* Top Control Bar */}
        <div className="max-w-5xl mx-auto mb-5 flex flex-wrap items-center justify-between gap-4 print:hidden">
          <button 
            onClick={() => router.push('/dashboard/fees')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 font-semibold text-sm shadow-sm transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Fees Dashboard
          </button>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowExtraChargeModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 rounded-xl font-extrabold text-xs sm:text-sm shadow-md transition active:scale-95 border border-amber-300/40"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>+ Add Extra Charge / Fine</span>
            </button>

            <button 
              onClick={() => window.open(`/dashboard/fees/ledger/print?id=${id}`, '_blank')}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs sm:text-sm hover:bg-slate-800 shadow-md transition active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Print Official Statement</span>
            </button>

            <button 
              onClick={handleEmail}
              disabled={sendingEmail}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-700 text-white rounded-xl font-bold text-xs sm:text-sm hover:bg-blue-800 shadow-md transition active:scale-95 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>{sendingEmail ? "Sending Email..." : "Email Statement"}</span>
            </button>
          </div>
        </div>

        {/* ══════════════════════ BANK-GRADE LEDGER STATEMENT CONTAINER ══════════════════════ */}
        <main className="ledger-statement-canvas max-w-5xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-300 overflow-hidden print:shadow-none print:border-none print:max-w-none print:rounded-none">
          
          {/* Institutional Banking Header */}
          <div className="p-6 sm:p-8 bg-gradient-to-r from-slate-900 via-[#0f224a] to-[#1e3a8a] text-white border-b-4 border-amber-500 relative">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
              
              {/* Logo & Campus Identity */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-white rounded-2xl p-1.5 shadow-md flex items-center justify-center flex-shrink-0 border-2 border-amber-400">
                  <img src="/logo.jpg" alt="KIPS Logo" className="w-full h-full object-contain rounded-xl" />
                </div>
                <div>
                  <div className="inline-block px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-widest bg-amber-400 text-slate-950 mb-1">
                    Official Financial Statement
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase text-white">
                    KIPS SCHOOL
                  </h1>
                  <p className="text-xs font-semibold text-slate-300 tracking-wider">
                    Chunian Campus
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Helpline: 0300 39 39 581
                  </p>
                </div>
              </div>

              {/* Statement Reference Info */}
              <div className="sm:text-right bg-white/10 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/15 w-full sm:w-auto">
                <div className="text-[11px] text-slate-300 flex sm:justify-end gap-3">
                  <span>Issue Date: <strong className="text-white">{statementDate}</strong></span>
                  <span>•</span>
                  <span>Currency: <strong className="text-amber-300 font-mono">PKR (Rs)</strong></span>
                </div>
              </div>

            </div>
          </div>

          {/* Account Holder Information (Bank Customer Profile) */}
          <section className="p-6 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                Student Account Particulars
              </h2>
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${closingArrears > 0 ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}`}>
                {closingArrears > 0 ? `Debit Balance: Rs. ${formatCurrency(closingArrears)}` : 'Account Settled / Nil Dues'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-slate-400 uppercase font-semibold text-[10px] block mb-0.5">Account Title (Student)</span>
                <p className="text-sm font-black text-slate-900">{student?.name}</p>
                <p className="text-slate-500 mt-0.5">S/O {student?.father_name || "—"}</p>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-slate-400 uppercase font-semibold text-[10px] block mb-0.5">Student Roll &amp; Reg No</span>
                <p className="font-mono text-sm font-bold text-blue-700">{rollNumber}</p>
                <p className="text-slate-500 mt-0.5 font-mono text-[11px]">ID: #{student?.id}</p>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-slate-400 uppercase font-semibold text-[10px] block mb-0.5">Class / Section / Stream</span>
                <p className="text-sm font-bold text-slate-900">
                  {student?.class_name} <span className="text-blue-600">({student?.section_name || "A"})</span>
                </p>
                <p className="text-slate-500 mt-0.5">{student?.major_name || student?.stream_type || "Regular Stream"}</p>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-slate-400 uppercase font-semibold text-[10px] block mb-0.5">Registered Contact</span>
                <p className="font-mono text-sm font-bold text-slate-900">{student?.contact_number || student?.father_cell || "—"}</p>
                <p className="text-slate-500 mt-0.5">Admission: {student?.admission_month || formatDate(student?.created_at)}</p>
              </div>
            </div>
          </section>

          {/* ══════════════════════ ITEMIZED FEE HEADS SUB-LEDGER ══════════════════════ */}
          {Array.isArray(feeItems) && feeItems.length > 0 && (
            <section className="p-6 bg-slate-50/50 border-b border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Itemized Fee Heads &amp; Tuition Breakdown
                  </h3>
                  <p className="text-xs text-slate-500">Statement breakdown across admission charges, itemized fee categories, and monthly tuition fees</p>
                </div>
              </div>

              <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-sm">
                <table className="w-full text-xs text-left border-collapse font-sans">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 text-[11px] uppercase tracking-wider">
                      <th className="p-3">Fee Particulars</th>
                      <th className="p-3">Type</th>
                      <th className="p-3 text-right">Standard (Rs)</th>
                      <th className="p-3 text-right">Concession (Rs)</th>
                      <th className="p-3 text-right">Debit / Billed (Rs)</th>
                      <th className="p-3 text-right">Credit / Paid (Rs)</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-right font-black">Balance (Rs)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono text-xs">
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
                          <tr key={head.id || idx} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 font-sans font-bold text-slate-900">{head.head_name}</td>
                            <td className="p-3 font-sans text-slate-500 capitalize">{head.head_type?.replace('_', ' ') || 'One-time'}</td>
                            <td className="p-3 text-right text-slate-600">{formatCurrency(actual)}</td>
                            <td className="p-3 text-right text-blue-700">{discount > 0 ? formatCurrency(discount) : "—"}</td>
                            <td className="p-3 text-right font-bold text-slate-900">{formatCurrency(payable)}</td>
                            <td className="p-3 text-right font-bold text-emerald-700">{formatCurrency(paid)}</td>
                            <td className="p-3 text-center font-sans">
                              {payable === 0 ? (
                                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">N/A</span>
                              ) : isCleared ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">Cleared</span>
                              ) : isUnpaid ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-800">Unpaid</span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900">Partial</span>
                              )}
                            </td>
                            <td className="p-3 text-right font-black">
                              {runningBal > 0 ? (
                                <span className="text-red-700 font-black">
                                  Rs. {formatCurrency(runningBal)} <span className="text-[10px] font-bold text-red-500">Dr</span>
                                </span>
                              ) : runningBal < 0 ? (
                                <span className="text-blue-700 font-black">
                                  Rs. {formatCurrency(Math.abs(runningBal))} <span className="text-[10px] font-bold text-blue-500">Cr</span>
                                </span>
                              ) : (
                                <span className="text-emerald-700 font-bold">0.00</span>
                              )}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-xs">
                      <td colSpan={2} className="p-3 text-slate-900 uppercase font-black tracking-wider">
                        Closing Statement Balance
                      </td>
                      <td className="p-3 text-right text-slate-700 font-mono">
                        {formatCurrency(feeItems.reduce((sum: number, it: any) => sum + parseFloat(it.actual_amount || 0), 0))}
                      </td>
                      <td className="p-3 text-right text-blue-800 font-mono">
                        {formatCurrency(feeItems.reduce((sum: number, it: any) => sum + parseFloat(it.discount_amount || 0), 0))}
                      </td>
                      <td className="p-3 text-right text-slate-900 font-mono font-black">
                        {formatCurrency(totalBilled)}
                      </td>
                      <td className="p-3 text-right text-emerald-800 font-mono font-black">
                        {formatCurrency(totalPaid)}
                      </td>
                      <td className="p-3 text-center font-sans text-[11px]">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${closingArrears > 0 ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {closingArrears > 0 ? 'Debit Balance' : 'Settled'}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-black text-sm">
                        <span className={closingArrears > 0 ? "text-red-700 font-black" : "text-emerald-700 font-black"}>
                          Rs. {formatCurrency(closingArrears)} {closingArrears > 0 ? "(Dr)" : ""}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          )}

          {/* ══════════════════════ INSTITUTIONAL AUTHENTICATION & SIGNATURES ══════════════════════ */}
          <div className="p-6 sm:p-8 bg-slate-50 border-t border-slate-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end pt-4 pb-2">
              
              {/* Prepared By */}
              <div className="text-center md:text-left">
                <div className="w-48 border-b-2 border-slate-400 mb-2 mx-auto md:mx-0"></div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-900">Accounts Officer / Cashier</p>
                <p className="text-[10px] text-slate-500">Prepared &amp; Verified from Database</p>
              </div>

              {/* Official Seal Watermark */}
              <div className="text-center flex flex-col items-center">
                <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center p-2 mb-1">
                  <span className="text-[9px] uppercase font-bold text-slate-400 text-center leading-tight">
                    Official Institutional Stamp
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono">Verified Digital Signature</p>
              </div>

              {/* Principal / Campus Director */}
              <div className="text-center md:text-right">
                <div className="w-48 border-b-2 border-slate-400 mb-2 mx-auto md:ml-auto md:mr-0"></div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-900">Principal / Director</p>
                <p className="text-[10px] text-slate-500">KIPS School Chunian</p>
              </div>

            </div>

            {/* Disclaimer Bar */}
            <div className="mt-6 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400">
              <p>
                * This document is a computer-generated official financial statement. Any discrepancy must be reported to the Accounts Office within 7 business days of issue.
              </p>
              <p className="mt-0.5">
                KIPS School Chunian Campus • All Rights Reserved © {new Date().getFullYear()}
              </p>
            </div>
          </div>

        </main>

        {/* ══════════════════════ QUICK MODAL: ADD EXTRA CHARGE / FINE ══════════════════════ */}
        {showExtraChargeModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h3 className="font-black text-slate-900 text-sm sm:text-base">Add Extra Charge / Fine</h3>
                  <p className="text-xs text-slate-500">Student: {student?.name} ({student?.roll_number || `#${student?.id}`})</p>
                </div>
                <button onClick={() => setShowExtraChargeModal(false)} className="text-slate-400 hover:text-slate-700">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleCreateExtraCharge} className="space-y-3 text-xs">
                {/* Catalog Quick Selector */}
                {catalogItems.length > 0 && (
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Quick Select from Catalog (Optional)</label>
                    <select
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        if (!selectedId) return;
                        const item = catalogItems.find(it => it.id == selectedId);
                        if (item) {
                          setChargeTitle(item.name);
                          setChargePrice(item.unit_price);
                          setChargeCategory(item.category);
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50"
                    >
                      <option value="">-- Choose or type custom below --</option>
                      {catalogItems.map(it => (
                        <option key={it.id} value={it.id}>
                          {it.name} - Rs. {parseFloat(it.unit_price).toLocaleString()} ({it.category})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Charge Title / Reason *</label>
                  <input
                    type="text"
                    placeholder="e.g. Discipline Fine, Chemistry Notebook, Trip to Murree"
                    value={chargeTitle}
                    onChange={(e) => setChargeTitle(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Category</label>
                    <select
                      value={chargeCategory}
                      onChange={(e) => setChargeCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    >
                      <option value="fine">Discipline / Late Fine</option>
                      <option value="stationery">Stationery</option>
                      <option value="uniform">Uniform</option>
                      <option value="books">Books</option>
                      <option value="trip">Trip / Picnic</option>
                      <option value="id_card">ID Card</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Amount (Rs) *</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={chargePrice}
                      onChange={(e) => setChargePrice(e.target.value === "" ? "" : parseFloat(e.target.value))}
                      required
                      min="1"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Billing Mode Switcher */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 block">
                    Payment Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className={`p-2 rounded-lg border cursor-pointer flex items-center gap-2 ${chargePaymentOption === 'bill_to_voucher' ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold' : 'border-slate-200 bg-white text-slate-600'}`}>
                      <input
                        type="radio"
                        name="ledgerChargeOption"
                        checked={chargePaymentOption === 'bill_to_voucher'}
                        onChange={() => setChargePaymentOption('bill_to_voucher')}
                      />
                      <span>Bill to Voucher</span>
                    </label>

                    <label className={`p-2 rounded-lg border cursor-pointer flex items-center gap-2 ${chargePaymentOption === 'pay_now' ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold' : 'border-slate-200 bg-white text-slate-600'}`}>
                      <input
                        type="radio"
                        name="ledgerChargeOption"
                        checked={chargePaymentOption === 'pay_now'}
                        onChange={() => setChargePaymentOption('pay_now')}
                      />
                      <span>Pay Now (Cash)</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowExtraChargeModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingCharge}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow"
                  >
                    {submittingCharge ? "Saving..." : "Apply Charge"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}

import PageLoader from "@/components/PageLoader";

export default function LedgerPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <PageLoader text="Loading ledger statement..." />
      </DashboardLayout>
    }>
      <LedgerContent />
    </Suspense>
  );
}
