"use client";

import React, { useEffect, use } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export default function DynamicVoucherPdfPage({
  params,
}: {
  params: Promise<{ voucher_no: string }>;
}) {
  const resolvedParams = use(params);

  useEffect(() => {
    if (resolvedParams?.voucher_no) {
      const pdfUrl = `${API}/public/vouchers/pdf?voucher_no=${encodeURIComponent(resolvedParams.voucher_no)}`;
      window.location.replace(pdfUrl);
    }
  }, [resolvedParams]);

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
