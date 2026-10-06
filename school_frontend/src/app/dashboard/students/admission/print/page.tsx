"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import PageLoader from "@/components/PageLoader";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const STORAGE_URL = process.env.NEXT_PUBLIC_STORAGE_URL || "http://localhost:8000/storage";

function getAuthHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

interface FeeItem {
  id?: number;
  head_key: string;
  head_name: string;
  head_type?: string;
  actual_amount: number;
  discount_amount: number;
  payable_amount: number;
  paid_amount: number;
  balance_amount: number;
}

interface StudentDetail {
  id: number;
  roll_number?: number | string;
  name: string;
  email?: string;
  student_cnic?: string;
  erp_reg?: string;
  dob?: string;
  gender?: string;
  father_name: string;
  father_cnic?: string;
  father_cell?: string;
  contact_number?: string;
  emergency_contact?: string;
  current_address?: string;
  remarks?: string;
  stream_type?: string;
  test_marks?: string | number;
  obtained_marks?: string | number;
  admission_month?: string;
  monthly_fee?: number | string;
  pending_amount?: number | string;
  total_paid?: number | string;
  total_admission_payable?: number | string;
  amount_received_at_admission?: number | string;
  admission_balance?: number | string;
  is_prospectus_sold?: boolean | number;
  is_marks_based_discount?: boolean | number;
  is_discretionary_discount?: boolean | number;
  is_policy_discount?: boolean | number;
  selected_months_tf?: string;
  tuition_fee_per_policy?: number | string;
  discretionary_discount_reason?: string;
  discretionary_discount_amount?: number | string;
  policy_discount_type?: string;
  policy_discount_amount?: number | string;
  image?: string;
  academy_class?: { id: number; name: string };
  section?: { id: number; name: string };
  major?: { id: number; name: string };
  academic_session?: { id: number; name: string };
  fee_items?: FeeItem[];
  feeItems?: FeeItem[];
  created_at?: string;
}

const ALL_16_FEE_HEADS = [
  { key: "registration_fee", label: "Registration Fee", type: "One-Time" },
  { key: "adm_fee", label: "Admission Fee", type: "One-Time" },
  { key: "security_fee", label: "Security Deposit (Refundable)", type: "One-Time" },
  { key: "tuition_fee", label: "Tuition Fee (Monthly)", type: "Monthly" },
  { key: "id_card_charges", label: "Student ID Card Fee", type: "One-Time" },
  { key: "brd_reg_charges", label: "Board Registration Charges", type: "One-Time" },
  { key: "brd_adm_charges", label: "Board Admission Charges", type: "One-Time" },
  { key: "ac_charges", label: "Air Conditioning (AC) Charges", type: "Monthly" },
  { key: "lms_charges", label: "LMS & Digital Portal Fee", type: "Monthly" },
  { key: "lab_charges", label: "Science & Computer Lab Fee", type: "Monthly" },
  { key: "library_charges", label: "Library & Reading Room Fee", type: "Annual" },
  { key: "exam_charges", label: "Examination & Assessment Fee", type: "Annual" },
  { key: "service_charges", label: "Annual / Campus Service Fee", type: "Monthly" },
  { key: "lim_charges", label: "LIM / Study Material Fee", type: "Monthly" },
  { key: "r_and_t_charges", label: "Research & Training (R&T) Fee", type: "Annual" },
  { key: "fine", label: "Late Surcharge / Fine", type: "Special" },
];

function AdmissionFormPrintContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentId = searchParams.get("student_id") || searchParams.get("id");

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch official voucher signature image
    fetch(`${API}/fees/vouchers/settings`, {
      headers: getAuthHeaders(),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.voucher_signature_image) {
          setSignatureImage(data.voucher_signature_image);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!studentId) {
      setError("No student ID specified.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`${API}/students/${studentId}`, {
      headers: getAuthHeaders(),
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Failed to load student admission records");
        }
        return res.json();
      })
      .then((data) => {
        setStudent(data);
      })
      .catch((err: any) => {
        setError(err.message || "Failed to load admission form");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [studentId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-md border border-slate-200 flex flex-col items-center gap-3">
          <svg className="animate-spin w-9 h-9 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm font-bold text-slate-700">Loading Student Admission Form...</p>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-md border border-red-200 max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-900">Admission Record Not Found</h3>
          <p className="text-xs text-slate-500">{error || "The specified student could not be located."}</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => router.push("/dashboard/students")}
              className="px-4 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl hover:bg-black transition cursor-pointer"
            >
              Back to Students List
            </button>
          </div>
        </div>
      </div>
    );
  }

  const rollNumber = student.roll_number
    ? student.roll_number
    : `KIPS-${String(student.id).padStart(4, "0")}`;

  const feeItemsMap: Record<string, FeeItem> = {};
  const feeList = Array.isArray(student.fee_items)
    ? student.fee_items
    : Array.isArray(student.feeItems)
    ? student.feeItems
    : [];

  feeList.forEach((fi) => {
    feeItemsMap[fi.head_key] = fi;
  });

  const admissionDateStr = student.created_at
    ? new Date(student.created_at).toLocaleDateString("en-PK", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : new Date().toLocaleDateString("en-PK", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

  const currentMonthStr = student.admission_month || new Date().toISOString().slice(0, 7);

  // Calculate Grand Totals across all heads
  let totalActualSum = 0;
  let totalDiscountSum = 0;
  let totalPayableSum = 0;
  let totalPaidSum = 0;
  let totalBalanceSum = 0;

  ALL_16_FEE_HEADS.forEach((head) => {
    const item = feeItemsMap[head.key];
    const actual = item ? Number(item.actual_amount || 0) : 0;
    const disc = item ? Number(item.discount_amount || 0) : 0;
    const payable = item ? Number(item.payable_amount || 0) : Math.max(0, actual - disc);
    const paid = item ? Number(item.paid_amount || 0) : 0;
    const balance = item ? Number(item.balance_amount || 0) : Math.max(0, payable - paid);

    totalActualSum += actual;
    totalDiscountSum += disc;
    totalPayableSum += payable;
    totalPaidSum += paid;
    totalBalanceSum += balance;
  });

  // If tuition fee is on user object but not in feeItems
  if (totalActualSum === 0 && Number(student.monthly_fee || 0) > 0) {
    const monthlyFee = Number(student.monthly_fee);
    totalActualSum = monthlyFee;
    totalPayableSum = monthlyFee;
  }

  const finalTotalPayable = student.total_admission_payable
    ? Number(student.total_admission_payable)
    : totalPayableSum;
  const finalAmountReceived = student.amount_received_at_admission
    ? Number(student.amount_received_at_admission)
    : (totalPaidSum > 0 ? totalPaidSum : Number(student.total_paid || 0));
  const finalBalanceDue = student.admission_balance
    ? Number(student.admission_balance)
    : (student.pending_amount ? Number(student.pending_amount) : Math.max(0, finalTotalPayable - finalAmountReceived));

  return (
    <div className="min-h-screen bg-slate-200/80 text-slate-900 print:bg-white print:p-0">
      
      {/* ─── FLOATING TOP ACTION BAR (Hidden on Print) ─── */}
      <div className="print:hidden sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-700 px-4 py-3 shadow-lg">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>
            <span className="text-xs font-bold text-white tracking-wide">
              Official Admission Form — <span className="text-blue-400">{student.name}</span> ({rollNumber})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/fees/vouchers/print?month=${encodeURIComponent(currentMonthStr)}&selected_keys=${student.id}`}
              target="_blank"
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Print Fee Challan
            </Link>

            <button
              onClick={() => window.print()}
              className="px-4 py-1.5 rounded-lg text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Admission Form (Ctrl+P)
            </button>
          </div>
        </div>
      </div>

      {/* ─── PRINTABLE A4 ADMISSION FORM CONTAINER ─── */}
      <div className="max-w-[210mm] mx-auto my-6 p-6 sm:p-8 bg-white border border-slate-300 shadow-xl print:m-0 print:p-0 print:border-none print:shadow-none font-sans text-xs leading-tight">
        
        {/* Top Header */}
        <div className="border-b-2 border-[#0f224a] pb-2.5 mb-3 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* School Emblem / Logo */}
            <div className="w-13 h-13 rounded-xl bg-[#0f224a] text-white flex flex-col items-center justify-center font-black shrink-0 border border-blue-900 shadow-xs">
              <span className="text-lg leading-none tracking-tighter">KIPS</span>
              <span className="text-[7px] tracking-widest text-blue-300">SCHOOL</span>
            </div>

            <div>
              <h1 className="text-lg font-black uppercase tracking-tight text-[#0f224a] leading-none">
                KIPS School
              </h1>
              <p className="text-[10px] font-bold text-blue-700 uppercase tracking-widest mt-0.5">
                Chunian Campus • Excellence in Education
              </p>
              <div className="inline-block mt-1 px-2.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-950 font-extrabold text-[10.5px] uppercase tracking-wider">
                Student Admission &amp; Registration Form
              </div>
            </div>
          </div>

          {/* Registration & Date Meta Block */}
          <div className="text-right shrink-0 flex flex-col items-end">
            <div className="border-2 border-slate-800 rounded-lg px-3 py-1 bg-slate-50 text-center mb-1">
              <span className="text-[8.5px] uppercase font-bold text-slate-500 block">Roll / Reg No</span>
              <span className="text-sm font-black text-slate-900 font-mono tracking-wider">{rollNumber}</span>
            </div>
            <div className="text-[9.5px] text-slate-600 font-semibold space-y-0.5">
              <p><strong>Admission Date:</strong> {admissionDateStr}</p>
              <p><strong>Session:</strong> {student.academic_session?.name || "2026-2027"}</p>
            </div>
          </div>
        </div>

        {/* ─── SECTION 1: PERSONAL & CONTACT INFORMATION ─── */}
        <div className="mb-3">
          <div className="bg-[#0f224a] text-white px-3 py-1 text-[10.5px] font-black uppercase tracking-wider rounded-t flex justify-between items-center">
            <span>1. Student Personal &amp; Family Information</span>
            <span className="text-[9px] text-blue-200 font-normal">Section A</span>
          </div>

          <div className="border border-[#0f224a] border-t-0 p-2.5 rounded-b grid grid-cols-12 gap-2.5 items-start bg-slate-50/50">
            {/* Form Fields: 9 cols */}
            <div className="col-span-9 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10.5px]">
              <div>
                <span className="text-slate-500 font-bold block text-[9.5px]">Student Full Name:</span>
                <span className="font-extrabold text-slate-900 text-xs">{student.name}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold block text-[9.5px]">B-Form / CNIC No:</span>
                <span className="font-semibold text-slate-900 font-mono">{student.student_cnic || "—"}</span>
              </div>

              <div>
                <span className="text-slate-500 font-bold block text-[9.5px]">Father / Guardian Name:</span>
                <span className="font-extrabold text-slate-900 text-xs">{student.father_name || "—"}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold block text-[9.5px]">Father CNIC:</span>
                <span className="font-semibold text-slate-900 font-mono">{student.father_cnic || "—"}</span>
              </div>

              <div>
                <span className="text-slate-500 font-bold block text-[9.5px]">Date of Birth &amp; Gender:</span>
                <span className="font-semibold text-slate-900">
                  {student.dob ? new Date(student.dob).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                  {" • "}
                  <span className="capitalize">{student.gender || "—"}</span>
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-bold block text-[9.5px]">Student Mobile Cell:</span>
                <span className="font-bold text-slate-900 font-mono">{student.contact_number || "—"}</span>
              </div>

              <div>
                <span className="text-slate-500 font-bold block text-[9.5px]">Father / Emergency Cell:</span>
                <span className="font-bold text-slate-900 font-mono">{student.father_cell || student.emergency_contact || "—"}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold block text-[9.5px]">ERP / Admission Ref:</span>
                <span className="font-semibold text-slate-900 font-mono">{student.erp_reg || student.email || "—"}</span>
              </div>

              <div className="col-span-2 pt-1 border-t border-slate-200">
                <span className="text-slate-500 font-bold block text-[9.5px]">Residential / Current Address:</span>
                <span className="font-medium text-slate-900">{student.current_address || "Chunian, Punjab, Pakistan"}</span>
              </div>
            </div>

            {/* Student Photograph Frame: 3 cols */}
            <div className="col-span-3 flex flex-col items-center justify-center">
              <div className="w-22 h-26 border-2 border-dashed border-slate-400 rounded-lg overflow-hidden bg-white flex items-center justify-center text-center p-1 shadow-2xs">
                {student.image ? (
                  <img
                    src={student.image.startsWith("http") ? student.image : `${STORAGE_URL}/${student.image}`}
                    alt={student.name}
                    className="w-full h-full object-cover rounded"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 p-2">
                    <svg className="w-7 h-7 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-[7.5px] font-bold uppercase">Passport Photo</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── SECTION 2: ACADEMIC & ADMISSION STREAM MAPPING ─── */}
        <div className="mb-3">
          <div className="bg-[#0f224a] text-white px-3 py-1 text-[10.5px] font-black uppercase tracking-wider rounded-t flex justify-between items-center">
            <span>2. Academic Placement &amp; Stream Mapping</span>
            <span className="text-[9px] text-blue-200 font-normal">Section B</span>
          </div>

          <div className="border border-[#0f224a] border-t-0 p-2.5 rounded-b grid grid-cols-4 gap-2.5 bg-slate-50/50 text-[10.5px]">
            <div>
              <span className="text-slate-500 font-bold block text-[9.5px]">Class Admitted:</span>
              <span className="font-black text-[#0f224a] text-xs">
                {student.academy_class?.name || "Not Assigned"}
              </span>
            </div>

            <div>
              <span className="text-slate-500 font-bold block text-[9.5px]">Assigned Section:</span>
              <span className="font-black text-slate-800">
                {student.section?.name ? `Section ${student.section.name}` : "General Section"}
              </span>
            </div>

            <div>
              <span className="text-slate-500 font-bold block text-[9.5px]">Study Stream / Group:</span>
              <span className="font-bold text-slate-800">
                {student.major?.name || "Regular / Science"}
              </span>
            </div>

            <div>
              <span className="text-slate-500 font-bold block text-[9.5px]">Stream Mode:</span>
              <span className="font-bold text-blue-700 capitalize">
                {student.stream_type || "Regular"}
              </span>
            </div>

            <div>
              <span className="text-slate-500 font-bold block text-[9.5px]">Entry / Previous Marks:</span>
              <span className="font-bold text-slate-800">
                {student.obtained_marks ? `${student.obtained_marks} / ${student.test_marks || 100}` : "N/A (Direct Admission)"}
              </span>
            </div>

            <div>
              <span className="text-slate-500 font-bold block text-[9.5px]">Admission Billing Month:</span>
              <span className="font-bold text-slate-800 font-mono">
                {student.admission_month || "October 2026"}
              </span>
            </div>

            <div className="col-span-2">
              <span className="text-slate-500 font-bold block text-[9.5px]">Admission Remarks / Policy:</span>
              <span className="font-medium text-slate-700 italic truncate block">
                {student.remarks || "Regular Admission with Standard School Package"}
              </span>
            </div>
          </div>
        </div>

        {/* ─── SECTION 3: 16 FEE HEADS STRUCTURE & FINANCIAL SUMMARY ─── */}
        <div className="mb-3">
          <div className="bg-[#0f224a] text-white px-3 py-1 text-[10.5px] font-black uppercase tracking-wider rounded-t flex justify-between items-center">
            <span>3. Fee Structure &amp; Payable Schedule (All 16 Fee Heads &amp; Discounts)</span>
            <span className="text-[9px] text-blue-200 font-normal">Section C</span>
          </div>

          <div className="border border-[#0f224a] border-t-0 rounded-b overflow-hidden">
            <table className="w-full border-collapse text-[9.5px]">
              <thead>
                <tr className="bg-slate-200 text-slate-900 border-b border-slate-300 font-black">
                  <th className="p-1 text-center w-6">#</th>
                  <th className="p-1 text-left">Fee Head Description</th>
                  <th className="p-1 text-left w-20">Type</th>
                  <th className="p-1 text-right w-20">Actual Rate</th>
                  <th className="p-1 text-right w-20">Discount / Concession</th>
                  <th className="p-1 text-right w-20">Net Payable</th>
                  <th className="p-1 text-right w-20">Paid at Adm.</th>
                  <th className="p-1 text-right w-20">Balance Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {ALL_16_FEE_HEADS.map((head, idx) => {
                  const item = feeItemsMap[head.key];
                  const actual = item ? Number(item.actual_amount || 0) : 0;
                  const disc = item ? Number(item.discount_amount || 0) : 0;
                  const payable = item ? Number(item.payable_amount || 0) : Math.max(0, actual - disc);
                  const paid = item ? Number(item.paid_amount || 0) : 0;
                  const balance = item ? Number(item.balance_amount || 0) : Math.max(0, payable - paid);

                  const isHighValue = actual > 0 || disc > 0 || payable > 0;

                  return (
                    <tr
                      key={head.key}
                      className={isHighValue ? (idx % 2 === 0 ? "bg-blue-50/20" : "bg-blue-50/40 font-semibold") : (idx % 2 === 0 ? "bg-white" : "bg-slate-50/40 text-slate-400")}
                    >
                      <td className="p-1 text-center font-mono text-slate-500">{idx + 1}</td>
                      <td className="p-1 font-semibold text-slate-900">
                        {head.label}
                        {head.key === "tuition_fee" && (
                          <span className="text-[8.5px] text-blue-600 font-normal ml-1">(Regular Tuition)</span>
                        )}
                      </td>
                      <td className="p-1 text-slate-500 font-medium text-[9px]">{head.type}</td>
                      <td className="p-1 text-right font-mono text-slate-900">
                        {actual > 0 ? `Rs ${actual.toLocaleString()}` : "0"}
                      </td>
                      <td className="p-1 text-right font-mono font-bold text-emerald-700">
                        {disc > 0 ? `-Rs ${disc.toLocaleString()}` : "—"}
                      </td>
                      <td className="p-1 text-right font-mono font-black text-slate-900">
                        {payable > 0 ? `Rs ${payable.toLocaleString()}` : "0"}
                      </td>
                      <td className="p-1 text-right font-mono text-emerald-700 font-bold">
                        {paid > 0 ? `Rs ${paid.toLocaleString()}` : "0"}
                      </td>
                      <td className={`p-1 text-right font-mono font-black ${balance > 0 ? "text-red-700" : "text-slate-400"}`}>
                        {balance > 0 ? `Rs ${balance.toLocaleString()}` : "0"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                {/* ─── GRAND TOTAL SUMMARY ROW ─── */}
                <tr className="bg-slate-100 border-t-2 border-slate-400 text-slate-900 font-black text-[10px]">
                  <td colSpan={3} className="p-1.5 text-right uppercase tracking-wider text-slate-800">
                    Grand Total (All 16 Heads):
                  </td>
                  <td className="p-1.5 text-right font-mono text-slate-900">
                    Rs {totalActualSum.toLocaleString()}
                  </td>
                  <td className="p-1.5 text-right font-mono text-emerald-700 font-black">
                    {totalDiscountSum > 0 ? `-Rs ${totalDiscountSum.toLocaleString()}` : "Rs 0"}
                  </td>
                  <td className="p-1.5 text-right font-mono text-blue-900 font-black text-[10.5px]">
                    Rs {finalTotalPayable.toLocaleString()}
                  </td>
                  <td className="p-1.5 text-right font-mono text-emerald-800 font-black">
                    Rs {finalAmountReceived.toLocaleString()}
                  </td>
                  <td className={`p-1.5 text-right font-mono font-black text-[10.5px] ${finalBalanceDue > 0 ? "text-red-700" : "text-slate-500"}`}>
                    Rs {finalBalanceDue.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ─── SECTION 4: UNDERTAKING & DISCIPLINE POLICY ─── */}
        <div className="border border-slate-300 rounded p-2 mb-3 bg-slate-50/70 text-[9px] leading-tight">
          <h4 className="font-bold text-[#0f224a] uppercase text-[9.5px] mb-0.5">
            Rules, Regulations &amp; Parent Undertaking:
          </h4>
          <ol className="list-decimal list-inside space-y-0.5 text-slate-700">
            <li>I solemnly declare that all information and documents provided in this form are authentic and correct.</li>
            <li>I agree to strictly abide by the discipline, code of conduct, uniform and attendance rules of KIPS School.</li>
            <li>Monthly fee is strictly payable in advance by the <strong>10th of each calendar month</strong> through official bank challan.</li>
            <li>All registration and admission charges once paid are non-refundable and non-transferable under any circumstances.</li>
          </ol>
        </div>

        {/* ─── SECTION 5: SIGNATURES & OFFICIAL APPROVALS ─── */}
        <div className="grid grid-cols-4 gap-3 text-center mt-3 pt-1 items-end">
          <div>
            <div className="border-b border-slate-900 h-9 mb-1" />
            <span className="text-[9.5px] font-bold text-slate-800 uppercase block">Student Signature</span>
          </div>

          <div>
            <div className="border-b border-slate-900 h-9 mb-1" />
            <span className="text-[9.5px] font-bold text-slate-800 uppercase block">Parent / Guardian Signature</span>
          </div>

          <div>
            <div className="border-b border-slate-900 h-9 mb-1" />
            <span className="text-[9.5px] font-bold text-slate-800 uppercase block">Admission Incharge / Clerk</span>
          </div>

          <div className="relative flex flex-col items-center">
            <div className="h-9 w-full flex items-center justify-center mb-0.5">
              {signatureImage ? (
                <img
                  src={signatureImage.startsWith("http") ? signatureImage : `${STORAGE_URL}/${signatureImage}`}
                  alt="Principal Signature"
                  className="max-h-9 max-w-[130px] object-contain"
                />
              ) : (
                <div className="border border-dashed border-slate-400 rounded h-8 w-full flex items-center justify-center text-[7.5px] font-bold text-slate-400 uppercase">
                  [ Official Campus Stamp ]
                </div>
              )}
            </div>
            <div className="border-b border-slate-900 w-full mb-1" />
            <span className="text-[9.5px] font-extrabold text-[#0f224a] uppercase block">Principal / Director Approval</span>
          </div>
        </div>

        {/* Footer info line */}
        <div className="mt-3 pt-1.5 border-t border-slate-200 flex justify-between items-center text-[7.5px] text-slate-400 font-mono">
          <span>KIPS School Management System • Chunian Campus</span>
          <span>Printed on: {new Date().toLocaleString()}</span>
          <span>Confidential Official Record</span>
        </div>

      </div>
    </div>
  );
}

export default function AdmissionFormPrintPage() {
  return (
    <Suspense fallback={<PageLoader text="Loading admission form..." />}>
      <AdmissionFormPrintContent />
    </Suspense>
  );
}
