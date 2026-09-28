"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────
interface StudentVoucher {
  student_id: number;
  roll_number: string | number;
  name: string;
  father_name: string;
  contact_number: string;
  class_name: string;
  section_name: string;
  monthly_fee: number;
  current_month_paid: number;
  current_month_discount: number;
  current_month_net_due: number;
  previous_arrears: number;
  total_payable: number;
  gross_payable: number;
  status: string;
  voucher_number: string;
  target_month: string;
  month_name: string;
  due_date: string;
  admission_fee?: number;
  security_fee?: number;
  lim_charges?: number;
  ac_charges?: number;
  id_card_charges?: number;
  board_reg_fee?: number;
  admin_charges?: number;
  transport_fee?: number;
  fee_items?: { label: string; amount: number }[];
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function formatCurrency(amount: number) {
  return Number(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatOrdinalDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate();
    const month = d.toLocaleString("en-US", { month: "short" });
    const year = d.getFullYear();

    const j = day % 10;
    const k = day % 100;
    let suffix = "th";
    if (j === 1 && k !== 11) suffix = "st";
    else if (j === 2 && k !== 12) suffix = "nd";
    else if (j === 3 && k !== 13) suffix = "rd";

    return `${String(day).padStart(2, "0")} ${month} ${year}`;
  } catch {
    return dateStr;
  }
}

function formatConsumerNumber(studentId: number | string, voucherNo: string) {
  const rawDigits = String(voucherNo || "").replace(/\D/g, "");
  const suffix = rawDigits ? rawDigits.slice(-6).padStart(6, "0") : String(studentId).padStart(6, "0");
  return `26720027503263${suffix}`;
}

function formatChallanNumber(studentId: number | string, voucherNo: string) {
  const rawDigits = String(voucherNo || "").replace(/\D/g, "");
  const suffix = rawDigits ? rawDigits.slice(-8).padStart(8, "0") : String(studentId).padStart(8, "0");
  return `0326${suffix}`;
}

function formatIssueDate(monthStr: string) {
  try {
    const parts = (monthStr || "").split("-");
    const year = parts[0] ? parseInt(parts[0], 10) : new Date().getFullYear();
    const monthIndex = parts[1] ? parseInt(parts[1], 10) - 1 : new Date().getMonth();
    const prevMonthDate = new Date(year, monthIndex - 1, 26);
    return formatOrdinalDate(prevMonthDate.toISOString().slice(0, 10));
  } catch {
    return "26 Aug 2026";
  }
}

function formatRegistrationNumber(studentId: number | string, rollNo: string | number) {
  if (rollNo && String(rollNo).includes("-")) {
    return String(rollNo);
  }
  const idNum = String(studentId || 1).padStart(7, "0");
  return `24-3-539-67-${idNum}`;
}

function formatSessionFeeMonth(monthName: string, targetMonth: string) {
  const year = targetMonth ? targetMonth.split("-")[0] : new Date().getFullYear();
  let mCode = "SEP";
  try {
    const d = new Date(targetMonth + "-01");
    mCode = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
  } catch {}
  return `${mCode}-${year}`;
}

// Convert amount to Pakistani English words
function numberToWordsPKR(num: number): string {
  if (!num || num === 0) return "Zero Rupees Only";

  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convertChunk(n: number): string {
    let str = "";
    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + ones[n % 10] : "") + " ";
    } else if (n > 0) {
      str += ones[n] + " ";
    }
    return str.trim();
  }

  const rounded = Math.floor(Math.abs(num));
  if (rounded === 0) return "Zero Rupees Only";

  let crore = Math.floor(rounded / 10000000);
  let remainder = rounded % 10000000;
  let lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;
  let thousand = Math.floor(remainder / 1000);
  remainder = remainder % 1000;
  let hundred = remainder;

  let words = "";
  if (crore > 0) words += convertChunk(crore) + " Crore ";
  if (lakh > 0) words += convertChunk(lakh) + " Lakh ";
  if (thousand > 0) words += convertChunk(thousand) + " Thousand ";
  if (hundred > 0) words += convertChunk(hundred) + " ";

  return words.trim() + " Rupees Only";
}

// Compute non-zero fee line items
function getFeeItems(student: StudentVoucher) {
  const feeItems: { label: string; amount: number }[] = [];

  if (Array.isArray(student.fee_items) && student.fee_items.length > 0) {
    student.fee_items.forEach((fi: any) => {
      if (fi && Number(fi.amount) !== 0) {
        feeItems.push({ label: fi.label || fi.name, amount: Number(fi.amount) });
      }
    });
  } else {
    const tuitionFee = Number(student.monthly_fee ?? (student as any).tuition_fee ?? 0);
    const previousArrears = Number(student.previous_arrears ?? (student as any).total_previous_arrears ?? 0);
    const admissionFee = Number((student as any).admission_fee ?? (student as any).admission_charges ?? 0);
    const securityFee = Number((student as any).security_fee ?? 0);
    const limCharges = Number((student as any).lim_charges ?? 0);
    const acCharges = Number((student as any).ac_charges ?? 0);
    const idCardCharges = Number((student as any).id_card_charges ?? (student as any).id_card_fee ?? 0);
    const boardRegFee = Number((student as any).board_reg_fee ?? (student as any).board_fee ?? (student as any).registration_fee ?? 0);
    const adminCharges = Number((student as any).admin_charges ?? (student as any).administrative_charges ?? (student as any).late_fee ?? 0);
    const transportFee = Number((student as any).transport_fee ?? 0);
    const paidAmount = Number(student.current_month_paid ?? (student as any).paid_amount ?? 0);
    const discountAmount = Number(student.current_month_discount ?? (student as any).discount_amount ?? (student as any).discount ?? 0);

    if (admissionFee > 0) feeItems.push({ label: "Admission Fee", amount: admissionFee });
    if (securityFee > 0) feeItems.push({ label: "Security Fee", amount: securityFee });
    if (limCharges > 0) feeItems.push({ label: "LIM Charges", amount: limCharges });
    if (acCharges > 0) feeItems.push({ label: "AC Charges", amount: acCharges });
    if (idCardCharges > 0) feeItems.push({ label: "ID Card Charges", amount: idCardCharges });
    if (tuitionFee > 0) feeItems.push({ label: "Tuition Fee", amount: tuitionFee });
    if (boardRegFee > 0) feeItems.push({ label: "Board Reg Fee", amount: boardRegFee });
    if (previousArrears > 0) feeItems.push({ label: "Previous Outstanding Balance", amount: previousArrears });
    if (adminCharges > 0) feeItems.push({ label: "Administrative Charges", amount: adminCharges });
    if (transportFee > 0) feeItems.push({ label: "Transport Fee", amount: transportFee });
    if (paidAmount > 0) feeItems.push({ label: "Paid Amount", amount: -paidAmount });
    if (discountAmount > 0) feeItems.push({ label: "Discount", amount: -discountAmount });
  }

  const totalPayable = student.total_payable !== undefined
    ? Number(student.total_payable)
    : feeItems.reduce((acc, item) => acc + item.amount, 0);

  return { feeItems, totalPayable };
}

// ─── Precision Vector Barcode (Code-128 Visual Component) ─────────────────────
function VectorBarcode({ value }: { value: string }) {
  const chars = (value || "032600001").split("");
  const bars: { width: number; isSpace: boolean }[] = [];

  // Start guard
  bars.push({ width: 2, isSpace: false }, { width: 1, isSpace: true }, { width: 2, isSpace: false });

  chars.forEach((ch, idx) => {
    const code = ch.charCodeAt(0);
    const w1 = ((code * 3 + idx * 7) % 3) + 1;
    const w2 = ((code * 5 + idx * 11) % 2) + 1;
    const w3 = ((code * 7 + idx * 13) % 3) + 1;
    const w4 = ((code * 2 + idx * 5) % 2) + 1;
    bars.push({ width: w1, isSpace: false });
    bars.push({ width: w2, isSpace: true });
    bars.push({ width: w3, isSpace: false });
    bars.push({ width: w4, isSpace: true });
  });

  // Stop guard
  bars.push({ width: 3, isSpace: false }, { width: 1, isSpace: true }, { width: 2, isSpace: false });

  const totalUnits = bars.reduce((sum, b) => sum + b.width, 0);

  return (
    <div className="flex flex-col items-center">
      <svg className="h-6 w-36" preserveAspectRatio="none" viewBox="0 0 100 24">
        {(() => {
          let currentX = 0;
          const scale = 100 / (totalUnits || 1);
          return bars.map((b, i) => {
            const barW = b.width * scale;
            const x = currentX;
            currentX += barW;
            if (b.isSpace) return null;
            return <rect key={i} x={x} y="0" width={barW} height="24" fill="#111827" />;
          });
        })()}
      </svg>
      <span className="font-mono text-[6.5px] font-bold text-gray-700 tracking-wider mt-0.5">
        *{value}*
      </span>
    </div>
  );
}

// ─── Precision Vector QR Code Matrix ──────────────────────────────────────────
function VectorQRMatrix() {
  return (
    <div className="w-11 h-11 bg-white border border-gray-900 p-0.5 rounded-xs flex items-center justify-center">
      <svg className="w-full h-full" viewBox="0 0 29 29" fill="none">
        {/* Top-Left Finder */}
        <rect x="1" y="1" width="7" height="7" fill="#111827" />
        <rect x="2" y="2" width="5" height="5" fill="#FFFFFF" />
        <rect x="3" y="3" width="3" height="3" fill="#111827" />

        {/* Top-Right Finder */}
        <rect x="21" y="1" width="7" height="7" fill="#111827" />
        <rect x="22" y="2" width="5" height="5" fill="#FFFFFF" />
        <rect x="23" y="3" width="3" height="3" fill="#111827" />

        {/* Bottom-Left Finder */}
        <rect x="1" y="21" width="7" height="7" fill="#111827" />
        <rect x="2" y="22" width="5" height="5" fill="#FFFFFF" />
        <rect x="3" y="23" width="3" height="3" fill="#111827" />

        {/* Timing Pattern */}
        <rect x="9" y="4" width="11" height="1" fill="#111827" strokeDasharray="1,1" />
        <rect x="4" y="9" width="1" height="11" fill="#111827" strokeDasharray="1,1" />

        {/* Data Cells */}
        <rect x="10" y="10" width="2" height="2" fill="#111827" />
        <rect x="14" y="10" width="2" height="2" fill="#111827" />
        <rect x="17" y="11" width="2" height="1" fill="#111827" />
        <rect x="11" y="14" width="1" height="3" fill="#111827" />
        <rect x="14" y="13" width="3" height="2" fill="#111827" />
        <rect x="18" y="14" width="2" height="2" fill="#111827" />
        <rect x="10" y="18" width="2" height="2" fill="#111827" />
        <rect x="13" y="17" width="2" height="3" fill="#111827" />
        <rect x="17" y="18" width="2" height="2" fill="#111827" />
        <rect x="22" y="10" width="2" height="3" fill="#111827" />
        <rect x="25" y="14" width="2" height="2" fill="#111827" />
        <rect x="22" y="18" width="3" height="2" fill="#111827" />
        <rect x="10" y="23" width="3" height="2" fill="#111827" />
        <rect x="15" y="22" width="2" height="3" fill="#111827" />
        <rect x="19" y="24" width="2" height="2" fill="#111827" />
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 🏛️ REFINED EXECUTIVE 2-COPY LANDSCAPE VOUCHER SLIP
// ─────────────────────────────────────────────────────────────────────────────
function ExecutiveLandscapeSlip({
  copyTitle,
  student,
  dueDateStr,
  targetMonthStr,
  monthNameStr,
  issueDateStr,
}: {
  copyTitle: "ACCOUNTS COPY" | "STUDENT COPY" | string;
  student: StudentVoucher;
  dueDateStr: string;
  targetMonthStr: string;
  monthNameStr: string;
  issueDateStr: string;
}) {
  const studentId = student.student_id || 1;
  const voucherNumber = student.voucher_number || `KIPS-VCH-${studentId}`;
  const consumerNo = formatConsumerNumber(studentId, voucherNumber);
  const challanNo = formatChallanNumber(studentId, voucherNumber);
  const regNo = formatRegistrationNumber(studentId, student.roll_number);
  const studentName = (student.name || "STUDENT").toUpperCase();
  const fatherName = (student.father_name || "GUARDIAN").toUpperCase();
  const className = (student.class_name || "GRADE 9").toUpperCase();
  const sectionName = (student.section_name || "ACHIEVERS").toUpperCase();

  const { feeItems, totalPayable } = getFeeItems(student);
  const amountInWords = numberToWordsPKR(totalPayable);

  return (
    <div className="voucher-slip flex flex-col justify-between h-full bg-white text-gray-900 text-[9.5px] leading-[1.3] px-3.5 py-2.5 box-border border-2 border-gray-900 rounded-md shadow-xs relative">
      {/* Micro-Security Top Border Accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-[#0f224a] print:bg-black" />

      <div className="space-y-2">
        {/* ─── 1. Header (Institutional & Branding) ─── */}
        <div className="flex items-center justify-between pb-1.5 border-b-2 border-gray-900 pt-0.5">
          <div className="flex items-center gap-2.5">
            <div className="w-12 h-12 shrink-0 flex items-center justify-center p-0.5 bg-gray-50 border border-gray-300 rounded-md shadow-2xs">
              <img src="/logo.png" alt="KIPS" className="w-10 h-10 object-contain" />
            </div>

            <div className="text-left">
              <h2 className="text-[14px] font-black text-[#0f224a] print:text-black tracking-tight uppercase leading-none font-sans">
                KIPS SCHOOL
              </h2>
              <p className="text-[9.5px] font-extrabold text-gray-700 uppercase tracking-wider mt-0.5 leading-none font-sans">
                Chunian Campus
              </p>
              <div className="mt-1 text-[8px] text-gray-600 font-mono">
                <span>Issue Date: <strong>{issueDateStr}</strong></span>
              </div>
            </div>
          </div>

          <div className="text-right flex flex-col items-end justify-center">
            <span className="inline-block px-3.5 py-1 bg-[#0f224a] print:bg-black text-white font-black text-[9.5px] uppercase tracking-wider rounded shadow-xs">
              {copyTitle}
            </span>
          </div>
        </div>

        {/* ─── 2. Student Identity Profile Card (Full Width) ─── */}
        <div className="border border-gray-900 rounded p-2 bg-white">
          <div className="text-[8.5px] font-black text-gray-900 uppercase tracking-wider pb-1 border-b border-gray-200 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span>👤</span>
              <span>STUDENT PROFILE</span>
            </span>
            <span className="font-mono text-gray-600 font-bold">ID: {studentId}</span>
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-1 mt-1.5 text-[9.5px]">
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-gray-500 font-bold text-[8.5px] shrink-0 flex items-center gap-1">
                <span>🪪</span> Reg / Roll #
              </span>
              <span className="font-mono font-bold text-gray-900 text-[9px] truncate">{regNo}</span>
            </div>
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-gray-500 font-bold text-[8.5px] shrink-0 flex items-center gap-1">
                <span>👨‍👦</span> Father Name
              </span>
              <span className="font-bold text-gray-900 uppercase text-[9.5px] truncate">{fatherName}</span>
            </div>
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-gray-500 font-bold text-[8.5px] shrink-0 flex items-center gap-1">
                <span>🎓</span> Student Name
              </span>
              <span className="font-black text-gray-900 uppercase text-[10px] truncate">{studentName}</span>
            </div>
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-gray-500 font-bold text-[8.5px] shrink-0 flex items-center gap-1">
                <span>🏫</span> Class &amp; Section
              </span>
              <span className="font-bold text-gray-900 text-[9.5px] truncate">{className} ({sectionName})</span>
            </div>
          </div>
        </div>

        {/* ─── 3. Executive Fee Breakdown Table with Generous Row Padding ─── */}
        <div className="border-2 border-gray-900 rounded overflow-hidden bg-white">
          <div className="bg-gray-100 px-3 py-1 text-[8.5px] font-black text-gray-900 uppercase flex items-center justify-between border-b border-gray-900">
            <span className="flex items-center gap-1">
              <span>📋</span>
              <span>FEE HEADS &amp; BREAKDOWN</span>
            </span>
            <span className="font-mono text-gray-600 text-[8px]">CURRENCY: PAK RUPEES (PKR)</span>
          </div>

          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-300 bg-gray-50 text-gray-700 font-bold text-[9px]">
                <th className="text-center py-1.5 px-2 w-[8%] border-r border-gray-200">#</th>
                <th className="text-left py-1.5 px-3 w-[62%] border-r border-gray-200">Fee Particulars</th>
                <th className="text-right py-1.5 px-3">Amount (PKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-[10px]">
              {feeItems.map((item, iIdx) => (
                <tr key={iIdx} className={iIdx % 2 === 1 ? "bg-gray-50/60" : "bg-white"}>
                  <td className="py-1.5 px-2 text-center text-gray-500 font-mono text-[8.5px] border-r border-gray-200">{iIdx + 1}</td>
                  <td className="py-1.5 px-3 text-gray-900 font-semibold border-r border-gray-200">{item.label}</td>
                  <td className="py-1.5 px-3 text-right font-mono font-bold text-gray-900 text-[10px]">{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-900 bg-gray-100 font-black">
                <td colSpan={2} className="py-1.5 px-3 text-right text-gray-900 text-[9.5px] uppercase border-r border-gray-900">
                  Total Payable Within Due Date
                </td>
                <td className="py-1.5 px-3 text-right font-mono font-black text-gray-900 text-[11px]">
                  Rs. {formatCurrency(totalPayable)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* ─── 4. Amount in Words & Total Payable Bar ─── */}
        <div className="border-2 border-gray-900 rounded overflow-hidden flex shadow-xs">
          <div className="w-[60%] p-2 bg-gray-50 border-r-2 border-gray-900 flex flex-col justify-center">
            <div className="text-[7.5px] font-black text-gray-500 uppercase flex items-center gap-1">
              <span>✍️</span> Amount in Words
            </div>
            <div className="text-[9px] font-bold text-gray-900 italic leading-tight mt-0.5">
              {amountInWords}
            </div>
          </div>

          <div className="w-[40%] bg-[#0f224a] print:bg-black text-white p-2 text-right flex flex-col justify-center">
            <div className="text-[7.5px] font-bold text-gray-300 uppercase tracking-wider leading-none">
              NET PAYABLE AMOUNT
            </div>
            <div className="text-[13px] font-black font-mono leading-tight mt-0.5 text-white">
              Rs. {formatCurrency(totalPayable)}
            </div>
          </div>
        </div>

        {/* ─── 5. Payment Guidelines & Fintech Verification Strip (Footer Instructions) ─── */}
        <div className="border border-gray-900 rounded p-2 bg-white">
          <div className="flex items-center justify-between gap-2.5 text-[8px] text-gray-800 leading-[1.3]">
            {/* Payment instructions */}
            <div className="flex-1 space-y-0.5">
              <div className="font-extrabold text-[8.5px] text-gray-900 uppercase">PAYMENT INSTRUCTIONS:</div>
              <div>• <strong>1BILL ONLINE:</strong> Pay via 1Bill Consumer #: <strong className="font-mono text-black font-black text-[8.5px]">{consumerNo}</strong> across all Pakistani Banking &amp; Wallet Apps (EasyPaisa, JazzCash, Nayapay, SadaPay).</div>
              <div>• <strong>BANK COUNTER:</strong> Payable at any United Bank Limited (UBL) Branch nationwide. (A/C: Quality Brands (Pvt) Ltd).</div>
              <div>• <strong>LATE SURCHARGE:</strong> Late fee surcharge of Rs. 50/day applicable strictly after due date.</div>
              <div>• <strong>HELPLINE:</strong> 0300 39 39 581 | Email: info@kips.edu.pk</div>
            </div>

            {/* Verification Barcode & QR Code */}
            <div className="shrink-0 flex items-center gap-2 pl-2.5 border-l border-gray-300">
              <VectorBarcode value={challanNo} />
              <div className="flex flex-col items-center">
                <VectorQRMatrix />
                <span className="text-[6px] font-bold text-gray-600 mt-0.5">Verify</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 6. Signatures & Microprint Security Baseline ─── */}
      <div className="mt-2">
        <div className="flex items-center justify-between pb-1 text-[8px] text-gray-700">
          <div className="flex items-center gap-1">
            <span>Prepared By: <strong>Accounts System Portal</strong></span>
          </div>
          <div className="border border-dashed border-gray-600 rounded px-3.5 py-0.5 text-center text-[7.5px] text-gray-600 font-bold">
            Authorized Signature &amp; Stamp
          </div>
        </div>

        {/* Security Baseline Strip */}
        <div className="bg-gray-900 text-white text-[7.5px] font-bold text-center py-0.5 rounded-xs tracking-wider uppercase">
          • KIPS SCHOOL OFFICIAL FINANCIAL INSTRUMENT • COMPUTER GENERATED • VALID WITHOUT MANUAL ALTERATIONS •
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LANDSCAPE 2-COPY SHEET (A4 Landscape Page)
// ─────────────────────────────────────────────────────────────────────────────
function LandscapeVoucherPage({
  student,
  dueDate,
  targetMonth,
  monthName,
  issueDate,
  pageNumber,
}: {
  student: StudentVoucher;
  dueDate: string;
  targetMonth: string;
  monthName: string;
  issueDate: string;
  pageNumber: number;
}) {
  return (
    <div className="voucher-page landscape-a4-page relative bg-white box-border w-full min-h-[210mm] flex flex-col justify-between p-3 box-border">
      <div className="grid grid-cols-2 flex-1 divide-x-2 divide-dashed divide-gray-400">
        {/* Column 1: Accounts Copy */}
        <div className="h-full pr-2.5 flex flex-col">
          <ExecutiveLandscapeSlip
            copyTitle="ACCOUNTS COPY"
            student={student}
            dueDateStr={dueDate}
            targetMonthStr={targetMonth}
            monthNameStr={monthName}
            issueDateStr={issueDate}
          />
        </div>

        {/* Column 2: Student Copy */}
        <div className="h-full pl-2.5 flex flex-col">
          <ExecutiveLandscapeSlip
            copyTitle="STUDENT COPY"
            student={student}
            dueDateStr={dueDate}
            targetMonthStr={targetMonth}
            monthNameStr={monthName}
            issueDateStr={issueDate}
          />
        </div>
      </div>

      {/* Footer Page Number */}
      <div className="h-[14px] flex items-center justify-end px-3 text-[8px] font-bold text-gray-500 mt-1">
        <span>Page {pageNumber}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE COMPONENT WITH DIRECT AUTO-PRINT
// ─────────────────────────────────────────────────────────────────────────────
function PrintVouchersContent() {
  const searchParams = useSearchParams();
  const targetMonth = searchParams.get("month") || new Date().toISOString().slice(0, 7);
  const dueDate = searchParams.get("due_date") || `${targetMonth}-10`;
  const selectedKeysParam = searchParams.get("selected_keys") || "";
  const classId = searchParams.get("class_id") || "";
  const sectionId = searchParams.get("section_id") || "";
  const search = searchParams.get("search") || "";

  const [studentList, setStudentList] = useState<StudentVoucher[]>([]);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const params = new URLSearchParams({
          month: targetMonth,
          due_date: dueDate,
        });
        if (classId) params.append("class_id", classId);
        if (sectionId) params.append("section_id", sectionId);
        if (search) params.append("search", search);

        const res = await fetch(`${API}/fees/vouchers?${params.toString()}`, {
          headers: getAuthHeaders(),
        });
        const data = await res.json();
        setSummaryData(data);

        let list: any[] = data.vouchers || [];

        if (selectedKeysParam) {
          const keys = new Set(
            selectedKeysParam
              .split(",")
              .map((k) => k.trim().toLowerCase())
              .filter(Boolean)
          );
          list = list.filter((v) => {
            const sId = String(v.student_id || "").toLowerCase();
            const vNo = String(v.voucher_number || "").toLowerCase();
            const rNo = String(v.roll_number || "").toLowerCase();
            const uId = String(v.uuid || "").toLowerCase();
            return keys.has(sId) || keys.has(vNo) || keys.has(rNo) || keys.has(uId);
          });
        }

        const formattedList: StudentVoucher[] = list.map((ind: StudentVoucher) => ({
          ...ind,
          due_date: ind.due_date || dueDate,
          target_month: ind.target_month || targetMonth,
          month_name: ind.month_name || data.month_name || targetMonth,
        }));

        setStudentList(formattedList);
      } catch (err) {
        console.error("Failed to load fee vouchers for print:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [targetMonth, dueDate, selectedKeysParam, classId, sectionId, search]);

  const issueDate = formatIssueDate(targetMonth);
  const monthName = summaryData?.month_name || targetMonth;

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* ─── Static Landscape @page Print Styles ─── */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .voucher-page {
            page-break-after: always !important;
            break-after: page !important;
            margin: 0 !important;
          }
          @page {
            size: A4 landscape;
            margin: 3mm 4mm;
          }
        }
      `}</style>

      {/* ─── Top Toolbar (Screen Only) ─── */}
      <div className="no-print sticky top-0 z-50 bg-[#0f224a] text-white px-6 py-3 shadow-xl flex items-center justify-between gap-4 border-b border-blue-950">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/fees/vouchers"
            className="flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition border border-slate-600"
          >
            ← Back to Vouchers
          </Link>
          <div className="h-4 w-px bg-slate-700"></div>
          <div>
            <h1 className="text-sm font-black text-white">Executive Fee Challan Print View (2-Copies)</h1>
            <p className="text-[11px] text-blue-200">
              {studentList.length} voucher{studentList.length === 1 ? "" : "s"} ready for printing
            </p>
          </div>
        </div>

        {/* Print Button */}
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black px-4 py-2 rounded-xl transition shadow-lg cursor-pointer"
        >
          <span>🖨️</span>
          <span>Print / Save PDF</span>
        </button>
      </div>

      {/* ─── Vouchers Render Canvas ─── */}
      <div className="max-w-[1300px] mx-auto py-6 px-4 print:p-0 print:m-0 print:max-w-none">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 font-sans">
            <div className="w-8 h-8 border-3 border-[#0052cc] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Generating Executive Vouchers...</p>
          </div>
        ) : studentList.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm max-w-md mx-auto my-12 border border-gray-200">
            <div className="text-4xl mb-3">📄</div>
            <h3 className="text-base font-bold text-gray-800">No Vouchers Found</h3>
            <p className="text-xs text-gray-500 mt-1 mb-4">No matching vouchers found for the selected filter.</p>
            <Link
              href="/dashboard/fees/vouchers"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0052cc] bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 transition"
            >
              ← Return to Vouchers List
            </Link>
          </div>
        ) : (
          <div className="space-y-8 print:space-y-0">
            {studentList.map((student, idx) => (
              <div
                key={student.student_id || idx}
                className="bg-white shadow-xl rounded-xl print:shadow-none print:rounded-none mx-auto overflow-hidden print:overflow-visible"
                style={{
                  width: "297mm",
                  minHeight: "210mm",
                }}
              >
                <LandscapeVoucherPage
                  student={student}
                  dueDate={dueDate}
                  targetMonth={targetMonth}
                  monthName={monthName}
                  issueDate={issueDate}
                  pageNumber={idx + 1}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PrintVouchersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="w-8 h-8 border-3 border-[#0052cc] border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <PrintVouchersContent />
    </Suspense>
  );
}
