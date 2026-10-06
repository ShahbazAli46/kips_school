"use client";

import React, { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function VoucherDirectPdfRedirect() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const voucherNo = searchParams.get("voucher_no") || searchParams.get("no") || "";
    const studentId = searchParams.get("student_id") || "";
    const month = searchParams.get("month") || "";

    const params = new URLSearchParams();
    if (voucherNo) params.set("voucher_no", voucherNo.trim());
    if (studentId) params.set("student_id", studentId.trim());
    if (month) params.set("month", month.trim());

    // Immediately trigger direct PDF download/stream
    const pdfUrl = `${API}/public/vouchers/pdf?${params.toString()}`;
    window.location.replace(pdfUrl);
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 space-y-4">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <div className="text-center space-y-1">
        <h2 className="text-base font-bold text-white">Opening Voucher PDF...</h2>
        <p className="text-xs text-slate-400">Please wait while your official fee voucher is being generated.</p>
      </div>
    </div>
  );
}

export default function VoucherVerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <VoucherDirectPdfRedirect />
    </Suspense>
  );
}
