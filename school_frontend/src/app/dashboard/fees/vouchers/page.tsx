"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import CustomDropdown from "@/components/CustomDropdown";
import Link from "next/link";
import QuillEditor from "@/components/QuillEditor";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AcademyClass {
  id: number;
  name: string;
  sections?: { id: number; name: string }[];
}

interface Section {
  id: number;
  name: string;
}

interface StudentVoucher {
  student_id: number;
  uuid: string;
  roll_number: string | number;
  name: string;
  father_name: string;
  contact_number: string;
  normalized_phone: string;
  class_id: number | null;
  class_name: string;
  section_id: number | null;
  section_name: string;
  major_id: number | null;
  major_name: string;
  image: string | null;
  monthly_fee: number;
  current_month_paid: number;
  current_month_discount: number;
  current_month_net_due: number;
  previous_arrears: number;
  total_payable: number;
  gross_payable: number;
  status: "Paid" | "Partial" | "Unpaid";
  voucher_number?: string;
  voucher_type?: string;
  target_month?: string;
  month_name?: string;
  due_date?: string;
  footer_instructions?: string;
  signature_image?: string | null;
  fee_items?: { label: string; amount: number }[];
}

interface VoucherSummary {
  total_vouchers: number;
  total_students: number;
  total_current_fees: number;
  total_previous_arrears: number;
  grand_total_payable: number;
  paid_count?: number;
  unpaid_count?: number;
  month_name?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
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
  return "Rs. " + Math.round(amount || 0).toLocaleString();
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FeeVouchersPage() {
  const [targetMonth, setTargetMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-10`;
  });

  const [classes, setClasses] = useState<AcademyClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [filterType, setFilterType] = useState<"all" | "with_arrears" | "unpaid">("all");

  const [vouchers, setVouchers] = useState<StudentVoucher[]>([]);
  const [summary, setSummary] = useState<VoucherSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVoucherKeys, setSelectedVoucherKeys] = useState<Set<string>>(new Set());

  // Quick Preview modal
  const [previewVoucher, setPreviewVoucher] = useState<StudentVoucher | null>(null);
  const [whatsAppSending, setWhatsAppSending] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Voucher Footer / Instructions Editor State
  const [footerInstructions, setFooterInstructions] = useState<string>("");
  const [defaultInstructions, setDefaultInstructions] = useState<string>("");
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [editorContent, setEditorContent] = useState<string>("");
  const [savingSettings, setSavingSettings] = useState(false);

  // Signature Upload State
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [selectedSignatureFile, setSelectedSignatureFile] = useState<File | null>(null);
  const [signaturePreviewUrl, setSignaturePreviewUrl] = useState<string | null>(null);
  const [savingSignature, setSavingSignature] = useState(false);

  // Fetch settings & metadata
  useEffect(() => {
    async function loadMeta() {
      try {
        const resC = await fetch(`${API}/classes`, { headers: getAuthHeaders() });
        const dataC = await resC.json();
        setClasses(Array.isArray(dataC) ? dataC : []);
      } catch {
        // ignore
      }

      try {
        const resS = await fetch(`${API}/fees/vouchers/settings`, { headers: getAuthHeaders() });
        const dataS = await resS.json();
        if (dataS.voucher_footer_instructions) {
          setFooterInstructions(dataS.voucher_footer_instructions);
        }
        if (dataS.default_instructions) {
          setDefaultInstructions(dataS.default_instructions);
        }
        if (dataS.voucher_signature_image) {
          setSignatureImage(dataS.voucher_signature_image);
        }
      } catch {
        // ignore
      }
    }
    loadMeta();
  }, []);

  // Fetch Vouchers Data
  const fetchVouchers = useCallback(async () => {
    setLoading(true);
    setSelectedVoucherKeys(new Set());
    try {
      const params = new URLSearchParams({
        month: targetMonth,
        due_date: dueDate,
      });

      if (selectedClass) params.append("class_id", selectedClass);
      if (selectedSection) params.append("section_id", selectedSection);
      if (search) params.append("search", search);

      const res = await fetch(`${API}/fees/vouchers?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      setVouchers(data.vouchers || []);
      setSummary(data.summary || null);
      if (data.footer_instructions) {
        setFooterInstructions(data.footer_instructions);
      }
      if (data.signature_image) {
        setSignatureImage(data.signature_image);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [targetMonth, dueDate, selectedClass, selectedSection, search]);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  // Available sections for chosen class
  const availableSections = useMemo(() => {
    if (!selectedClass) return [];
    const cls = classes.find((c) => String(c.id) === selectedClass);
    return cls?.sections || [];
  }, [classes, selectedClass]);

  // Client-side filtering
  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      if (!v) return false;
      if (filterType === "with_arrears" && ((v.previous_arrears ?? 0) <= 0)) return false;
      if (filterType === "unpaid" && ((v.total_payable ?? 0) <= 0)) return false;
      return true;
    });
  }, [vouchers, filterType]);

  // Toggle Selection
  const toggleSelectAll = () => {
    if (selectedVoucherKeys.size === filteredVouchers.length) {
      setSelectedVoucherKeys(new Set());
    } else {
      const allKeys = new Set(filteredVouchers.map((v) => v.voucher_number || String(v.student_id)));
      setSelectedVoucherKeys(allKeys);
    }
  };

  const toggleSelectOne = (key: string) => {
    const next = new Set(selectedVoucherKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedVoucherKeys(next);
  };

  // Build Print URL
  const buildPrintUrl = (onlySelected = false) => {
    const params = new URLSearchParams({
      month: targetMonth,
      due_date: dueDate,
    });
    if (selectedClass) params.append("class_id", selectedClass);
    if (selectedSection) params.append("section_id", selectedSection);
    if (search) params.append("search", search);

    if (onlySelected && selectedVoucherKeys.size > 0) {
      params.append("selected_keys", Array.from(selectedVoucherKeys).join(","));
    }

    return `/dashboard/fees/vouchers/print?${params.toString()}`;
  };

  // Send Fee Vouchers via WhatsApp (PDF)
  const handleSendWhatsApp = async (keys?: string[], isSingle = false) => {
    const keysToSend = keys || Array.from(selectedVoucherKeys);
    if (keysToSend.length === 0) return;

    setWhatsAppSending(true);
    setActionMessage(null);

    try {
      const res = await fetch(`${API}/fees/vouchers/send-whatsapp`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          month: targetMonth,
          due_date: dueDate,
          class_id: selectedClass || undefined,
          section_id: selectedSection || undefined,
          search: search || undefined,
          selected_keys: keysToSend,
          sync: isSingle,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage({
          type: "success",
          text: data.message || "Fee voucher PDF dispatched successfully via WhatsApp!",
        });
      } else {
        setActionMessage({
          type: "error",
          text: data.message || "Failed to dispatch WhatsApp fee vouchers.",
        });
      }
    } catch (err: any) {
      setActionMessage({
        type: "error",
        text: err.message || "Network error while connecting to WhatsApp service.",
      });
    } finally {
      setWhatsAppSending(false);
    }
  };

  // Save Voucher Footer Instructions
  const handleSaveFooterInstructions = async () => {
    setSavingSettings(true);
    setActionMessage(null);
    try {
      const res = await fetch(`${API}/fees/vouchers/settings`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          voucher_footer_instructions: editorContent,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFooterInstructions(data.voucher_footer_instructions || editorContent);
        setIsSettingsModalOpen(false);
        setActionMessage({
          type: "success",
          text: "Voucher footer instructions updated successfully! All vouchers and print slips now display the updated text.",
        });
        fetchVouchers();
      } else {
        setActionMessage({
          type: "error",
          text: data.message || "Failed to update voucher footer instructions.",
        });
      }
    } catch (err: any) {
      setActionMessage({
        type: "error",
        text: err.message || "Network error while saving instructions.",
      });
    } finally {
      setSavingSettings(false);
    }
  };

  // Save or Upload Signature Image
  const handleSaveSignature = async () => {
    if (!selectedSignatureFile && !signaturePreviewUrl) {
      return;
    }
    setSavingSignature(true);
    setActionMessage(null);
    try {
      const formData = new FormData();
      if (selectedSignatureFile) {
        formData.append("signature", selectedSignatureFile);
      } else if (signaturePreviewUrl) {
        formData.append("voucher_signature_image", signaturePreviewUrl);
      }

      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch(`${API}/fees/vouchers/settings`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSignatureImage(data.voucher_signature_image || null);
        setSelectedSignatureFile(null);
        setIsSignatureModalOpen(false);
        setActionMessage({
          type: "success",
          text: "Authorized signature saved successfully! All printed vouchers, WhatsApp PDFs, and public verification documents now display the official signature.",
        });
        fetchVouchers();
      } else {
        setActionMessage({
          type: "error",
          text: data.message || "Failed to update authorized signature.",
        });
      }
    } catch (err: any) {
      setActionMessage({
        type: "error",
        text: err.message || "Network error while uploading signature.",
      });
    } finally {
      setSavingSignature(false);
    }
  };

  // Remove Signature Image
  const handleRemoveSignature = async () => {
    setSavingSignature(true);
    setActionMessage(null);
    try {
      const res = await fetch(`${API}/fees/vouchers/settings`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          remove_signature: true,
          voucher_signature_image: "__remove__",
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSignatureImage(null);
        setSelectedSignatureFile(null);
        setSignaturePreviewUrl(null);
        setIsSignatureModalOpen(false);
        setActionMessage({
          type: "success",
          text: "Authorized signature removed successfully. Vouchers will now display the blank stamp box.",
        });
        fetchVouchers();
      } else {
        setActionMessage({
          type: "error",
          text: data.message || "Failed to remove signature.",
        });
      }
    } catch (err: any) {
      setActionMessage({
        type: "error",
        text: err.message || "Network error while removing signature.",
      });
    } finally {
      setSavingSignature(false);
    }
  };

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "#0f224a" }}>Fee Voucher Generation</h2>
          <p className="text-sm mt-1" style={{ color: "#2563eb" }}>
            Generate and send Fee Vouchers as PDF via WhatsApp or print official 2-Copy Landscape Challans
          </p>
        </div>

        {/* Print & WhatsApp Actions */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Upload Authorized Signature Button */}
          <button
            type="button"
            onClick={() => {
              setSignaturePreviewUrl(signatureImage);
              setSelectedSignatureFile(null);
              setIsSignatureModalOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-all active:scale-95 cursor-pointer"
            title="Upload or change official authorized signature on all vouchers"
          >
            <span className="text-sm">🖋️</span>
            <span>Authorized Signature {signatureImage ? "✓" : ""}</span>
          </button>

          {/* Edit Footer / Instructions Button */}
          <button
            type="button"
            onClick={() => {
              setEditorContent(footerInstructions || defaultInstructions);
              setIsSettingsModalOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-all active:scale-95 cursor-pointer"
            title="Edit footer payment instructions and guidelines with rich text editor"
          >
            <span className="text-sm">✍️</span>
            <span>Edit Voucher Footer / Instructions</span>
          </button>

          {/* WhatsApp PDF Button for Selected */}
          {selectedVoucherKeys.size > 0 && (
            <button
              onClick={() => handleSendWhatsApp()}
              disabled={whatsAppSending}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {whatsAppSending ? (
                <>
                  <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  <span>Dispatching...</span>
                </>
              ) : (
                <>
                  <span>📱</span>
                  <span>Send WhatsApp PDF ({selectedVoucherKeys.size})</span>
                </>
              )}
            </button>
          )}

          <Link
            href={buildPrintUrl(false)}
            target="_blank"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all active:scale-95 hover:shadow-lg"
            style={{ background: "linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%)" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Print All ({filteredVouchers.length})
          </Link>

          {selectedVoucherKeys.size > 0 && (
            <Link
              href={buildPrintUrl(true)}
              target="_blank"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-amber-900 bg-amber-100 border border-amber-300 shadow-sm hover:bg-amber-200 transition-all active:scale-95"
            >
              <svg className="w-4 h-4 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Print Selected ({selectedVoucherKeys.size})
            </Link>
          )}
        </div>
      </div>

      {/* Action Notification Toast Banner */}
      {actionMessage && (
        <div
          className={`p-4 mb-6 rounded-2xl flex items-center justify-between border shadow-sm ${
            actionMessage.type === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-900"
              : "bg-red-50 border-red-300 text-red-900"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">{actionMessage.type === "success" ? "✅" : "⚠️"}</span>
            <p className="text-xs font-semibold">{actionMessage.text}</p>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-gray-400 hover:text-gray-600 font-bold text-sm px-2 py-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6">
        <div className="p-4 rounded-2xl border bg-white shadow-sm" style={{ borderColor: "#bfdbfe" }}>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563eb]">
            Total Student Vouchers
          </span>
          <div className="text-2xl font-black text-[#0f224a] mt-1">{summary?.total_vouchers || 0}</div>
          <p className="text-[10px] text-[#38bdf8] mt-0.5">{summary?.total_students || 0} active students</p>
        </div>

        <div className="p-4 rounded-2xl border bg-white shadow-sm" style={{ borderColor: "#bfdbfe" }}>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563eb]">Current Month Fees</span>
          <div className="text-2xl font-black text-[#0f224a] mt-1">{formatCurrency(summary?.total_current_fees || 0)}</div>
          <p className="text-[10px] text-[#38bdf8] mt-0.5">Tuition fee for {targetMonth}</p>
        </div>

        <div className="p-4 rounded-2xl border bg-white shadow-sm" style={{ borderColor: "#bfdbfe" }}>
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Previous Arrears</span>
          <div className="text-2xl font-black text-amber-900 mt-1">{formatCurrency(summary?.total_previous_arrears || 0)}</div>
          <p className="text-[10px] text-amber-600 mt-0.5">Remaining from past months</p>
        </div>

        <div className="p-4 rounded-2xl border bg-gradient-to-br from-[#f0f4f8] to-[#f8eae2] shadow-sm" style={{ borderColor: "#bfdbfe" }}>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563eb]">Grand Total Payable</span>
          <div className="text-2xl font-black text-[#2563eb] mt-1">{formatCurrency(summary?.grand_total_payable || 0)}</div>
          <p className="text-[10px] text-[#2563eb] font-medium mt-0.5">Current fees + Arrears</p>
        </div>
      </div>

      {/* Control Bar: Month, Due Date, Class/Section, Search */}
      <div className="p-4 rounded-2xl border bg-white shadow-sm mb-6 space-y-4" style={{ borderColor: "#bfdbfe" }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
          {/* Target Month Picker */}
          <div>
            <label className="block text-xs font-bold mb-1 text-[#1e3a8a]">Target Billing Month</label>
            <input
              type="month"
              value={targetMonth}
              onChange={(e) => {
                const newMonth = e.target.value;
                setTargetMonth(newMonth);
                setDueDate(`${newMonth}-10`);
              }}
              className="w-full px-3 py-2 rounded-xl border text-sm font-semibold outline-none transition"
              style={{ borderColor: "#bfdbfe", background: "#f0f4f8", color: "#0f224a" }}
            />
          </div>

          {/* Due Date Picker */}
          <div>
            <label className="block text-xs font-bold mb-1 text-[#1e3a8a]">Voucher Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border text-sm font-semibold outline-none transition"
              style={{ borderColor: "#bfdbfe", background: "#f0f4f8", color: "#0f224a" }}
            />
          </div>

          {/* Class Filter */}
          <div>
            <label className="block text-xs font-bold mb-1 text-[#1e3a8a]">Filter Class</label>
            <CustomDropdown
              name="class_filter"
              placeholder="All Classes"
              options={classes.map((c) => ({ label: c.name, value: String(c.id) }))}
              value={selectedClass}
              onChange={(_, val) => {
                setSelectedClass(String(val || ""));
                setSelectedSection("");
              }}
            />
          </div>

          {/* Section Filter */}
          <div>
            <label className="block text-xs font-bold mb-1 text-[#1e3a8a]">Filter Section</label>
            <CustomDropdown
              name="section_filter"
              placeholder={!selectedClass ? "Select Class First" : "All Sections"}
              options={availableSections.map((s) => ({ label: s.name, value: String(s.id) }))}
              value={selectedSection}
              onChange={(_, val) => setSelectedSection(String(val || ""))}
            />
          </div>
        </div>

        {/* Filter Badges & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t" style={{ borderColor: "#dbeafe" }}>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setFilterType("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                filterType === "all" ? "bg-[#2563eb] text-white shadow-sm" : "bg-[#f0f4f8] text-[#1e40af] hover:bg-[#bfdbfe]"
              }`}
            >
              All Vouchers ({vouchers.length})
            </button>

            <button
              onClick={() => setFilterType("with_arrears")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                filterType === "with_arrears" ? "bg-amber-600 text-white shadow-sm" : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
              }`}
            >
              ⚠️ With Arrears
            </button>

            <button
              onClick={() => setFilterType("unpaid")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                filterType === "unpaid" ? "bg-red-600 text-white shadow-sm" : "bg-red-50 text-red-800 border border-red-200 hover:bg-red-100"
              }`}
            >
              ⭕ Unpaid Only
            </button>
          </div>

          <div className="relative max-w-xs w-full">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#38bdf8]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student, father, phone..."
              className="w-full pl-9 pr-4 py-1.5 rounded-xl border text-xs outline-none transition"
              style={{ background: "#f0f4f8", borderColor: "#bfdbfe", color: "#0f224a" }}
            />
          </div>
        </div>
      </div>

      {/* Vouchers Content Table */}
      <div className="rounded-2xl overflow-hidden shadow-sm border bg-white" style={{ borderColor: "#bfdbfe" }}>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <svg className="animate-spin w-8 h-8 text-[#2563eb]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            <p className="text-xs font-medium text-[#2563eb]">Calculating student vouchers and arrears...</p>
          </div>
        ) : filteredVouchers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <svg className="w-14 h-14 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <p className="text-sm font-semibold text-[#2563eb]">No fee vouchers match the selected criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#f0f4f8", borderBottom: "1px solid #bfdbfe" }}>
                  <th className="p-3 text-left w-8">
                    <input
                      type="checkbox"
                      checked={selectedVoucherKeys.size === filteredVouchers.length && filteredVouchers.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded text-[#2563eb] focus:ring-[#2563eb]"
                    />
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-[#2563eb]">Voucher #</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-[#2563eb]">Student</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-[#2563eb]">Class</th>
                  <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide text-[#2563eb]">Monthly Fee</th>
                  <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide text-[#2563eb]">Prev. Arrears</th>
                  <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide text-[#2563eb]">Total Payable</th>
                  <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wide text-[#2563eb]">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide text-[#2563eb]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "#dbeafe" }}>
                {filteredVouchers.map((ind: StudentVoucher, idx: number) => {
                  const isSelected = selectedVoucherKeys.has(ind.voucher_number || String(ind.student_id));

                  return (
                    <tr key={ind.voucher_number || `${ind.student_id}-${idx}`} className={`transition-colors ${isSelected ? "bg-blue-50" : "hover:bg-[#f0f4f8]"}`}>
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(ind.voucher_number || String(ind.student_id))}
                          className="w-4 h-4 rounded text-[#2563eb] focus:ring-[#2563eb]"
                        />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-bold text-gray-700">
                        {ind.voucher_number}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-bold text-xs text-[#0f224a]">{ind.name}</p>
                          <p className="text-[11px] text-[#38bdf8]">
                            S/D/O {ind.father_name} • 📞 {ind.contact_number}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-[#1e3a8a]">
                        {ind.class_name} {ind.section_name ? `(${ind.section_name})` : ""}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-xs text-[#0f224a]">
                        {formatCurrency(ind.monthly_fee)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-xs text-amber-800">
                        {formatCurrency(ind.previous_arrears)}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-sm text-[#2563eb]">
                        {formatCurrency(ind.total_payable)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            ind.status === "Paid"
                              ? "bg-emerald-100 text-emerald-800"
                              : ind.status === "Partial"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {ind.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleSendWhatsApp([ind.voucher_number || String(ind.student_id)], true)}
                            disabled={whatsAppSending}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-bold text-emerald-800 bg-emerald-50 border-emerald-300 hover:bg-emerald-100 transition shadow-sm disabled:opacity-50 cursor-pointer"
                            title="Send Fee Voucher PDF via WhatsApp"
                          >
                            📱 WhatsApp
                          </button>
                          <button
                            onClick={() => setPreviewVoucher(ind)}
                            className="px-2.5 py-1 rounded-lg border text-xs font-bold transition hover:bg-[#bfdbfe] text-[#2563eb] cursor-pointer"
                            style={{ borderColor: "#bfdbfe", background: "#fff" }}
                          >
                            👁️ View
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── QUICK PREVIEW MODAL ────────────────────────────────────── */}
      {previewVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => setPreviewVoucher(null)} />
          <div className="relative w-full max-w-2xl rounded-2xl shadow-2xl p-6 z-10 max-h-[90vh] overflow-y-auto bg-white border border-[#bfdbfe]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 pb-3 border-b border-[#dbeafe]">
              <div>
                <h3 className="text-base font-bold text-[#0f224a]">
                  Fee Voucher Preview — {previewVoucher.voucher_number}
                </h3>
                <p className="text-xs text-[#38bdf8]">
                  Billing Month: {previewVoucher.month_name || targetMonth} • Due Date: {previewVoucher.due_date || dueDate}
                </p>
              </div>

              <button onClick={() => setPreviewVoucher(null)} className="text-gray-400 hover:text-gray-600 p-1 self-end sm:self-auto cursor-pointer">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Authentic Executive Voucher Slip Preview Body */}
            <div className="p-4 rounded-xl border-2 border-gray-900 bg-white space-y-3 mb-5 text-[10px] text-gray-900 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#0f224a]"></div>

              {/* Header */}
              <div className="flex items-center justify-between pb-2.5 border-b-2 border-gray-900 pt-1">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 shrink-0 flex items-center justify-center p-1 bg-gray-50 border border-gray-300 rounded-lg shadow-2xs">
                    <img src="/logo.png" alt="KIPS" className="w-12 h-12 object-contain" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-[#0f224a] uppercase tracking-tight">KIPS SCHOOL</h4>
                    <p className="text-[10px] font-extrabold text-gray-700 uppercase tracking-wider mt-0.5">Chunian Campus</p>
                    <div className="mt-1 text-[8.5px] text-gray-600 font-mono">
                      <span>Issue Date: <strong>{previewVoucher.target_month ? `${previewVoucher.target_month}-01` : "2026-09-01"}</strong></span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3.5 py-1 bg-[#0f224a] text-white font-black text-[9px] uppercase tracking-wider rounded shadow-xs">
                    EXECUTIVE PREVIEW
                  </span>
                </div>
              </div>

              {/* Student Identity Profile Card (Full Width) */}
              <div className="border border-gray-900 rounded-md p-2.5 bg-white">
                <div className="text-[8.5px] font-black text-gray-900 uppercase tracking-wider pb-1 border-b border-gray-200 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span>👤</span>
                    <span>STUDENT PROFILE</span>
                  </span>
                  <span className="font-mono text-gray-600 font-bold">ID: {previewVoucher.student_id}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1.5 text-[9px]">
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-bold flex items-center gap-1"><span>🪪</span> Reg / Roll #</span>
                    <span className="font-mono font-bold text-gray-900">24-3-539-67-{String(previewVoucher.student_id || 1).padStart(7, "0")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-bold flex items-center gap-1"><span>👨‍👦</span> Father Name</span>
                    <span className="font-bold text-gray-900 uppercase">{previewVoucher.father_name || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-bold flex items-center gap-1"><span>🎓</span> Student Name</span>
                    <span className="font-black text-gray-900 uppercase text-[9.5px]">{previewVoucher.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-bold flex items-center gap-1"><span>🏫</span> Class & Sec</span>
                    <span className="font-bold text-gray-900">{previewVoucher.class_name} ({previewVoucher.section_name || "—"})</span>
                  </div>
                </div>
              </div>

              {/* Fee Breakdown Table with Larger Fonts & Row Padding */}
              <div className="border-2 border-gray-900 rounded-md overflow-hidden">
                <div className="bg-gray-100 px-3 py-1 text-[8px] font-black text-gray-900 uppercase flex items-center justify-between border-b border-gray-900">
                  <span className="flex items-center gap-1"><span>📋</span> FEE HEADS & BREAKDOWN</span>
                  <span className="font-mono text-gray-600">CURRENCY: PKR</span>
                </div>
                <table className="w-full text-[9.5px]">
                  <thead>
                    <tr className="border-b border-gray-300 bg-gray-50 font-bold text-gray-700">
                      <th className="text-left py-1.5 px-3 border-r border-gray-200 w-2/3">Fee Particulars</th>
                      <th className="text-right py-1.5 px-3">Amount (PKR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(() => {
                      const pv = previewVoucher as any;
                      const tuition = Number(pv.monthly_fee ?? 0);
                      const arrears = Number(pv.previous_arrears ?? 0);
                      const paid = Number(pv.current_month_paid ?? 0);
                      const discount = Number(pv.current_month_discount ?? 0);

                      const rows: { label: string; amount: number; isArrears?: boolean }[] = [];
                      if (Array.isArray(pv.fee_items) && pv.fee_items.length > 0) {
                        pv.fee_items.forEach((fi: any) => {
                          if (fi && Number(fi.amount) !== 0) {
                            rows.push({
                              label: fi.label || fi.name,
                              amount: Number(fi.amount),
                              isArrears: String(fi.label || "").toLowerCase().includes("unpaid") || String(fi.label || "").toLowerCase().includes("arrears")
                            });
                          }
                        });
                      } else {
                        if (tuition > 0) rows.push({ label: `Tuition Fee (${pv.month_name || targetMonth})`, amount: tuition });
                        if (arrears > 0) rows.push({ label: "Previous Outstanding Balance", amount: arrears, isArrears: true });
                        if (paid > 0) rows.push({ label: "Paid Amount", amount: -paid });
                        if (discount > 0) rows.push({ label: "Discount", amount: -discount });
                      }

                      if (rows.length === 0) {
                        rows.push({ label: `Tuition Fee (${pv.month_name || targetMonth})`, amount: tuition });
                      }

                      return rows.map((r, rIdx) => (
                        <tr key={rIdx} className={rIdx % 2 === 1 ? "bg-gray-50/60" : "bg-white"}>
                          <td className="py-1.5 px-3 border-r border-gray-200 font-semibold">{r.label}</td>
                          <td className={`py-1.5 px-3 text-right font-mono font-bold ${r.isArrears ? "text-amber-800" : "text-gray-900"}`}>
                            {formatCurrency(r.amount)}
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-900 bg-gray-100 font-black text-[10.5px]">
                      <td className="py-1.5 px-3 border-r border-gray-900 uppercase">Total Payable Within Due Date</td>
                      <td className="py-1.5 px-3 text-right font-mono font-black text-gray-900">
                        {formatCurrency(previewVoucher.total_payable)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Net Payable Bar */}
              <div className="border-2 border-gray-900 rounded-md overflow-hidden flex shadow-xs">
                <div className="w-[60%] p-2 bg-gray-50 border-r-2 border-gray-900 flex flex-col justify-center">
                  <div className="text-[7.5px] font-black text-gray-500 uppercase flex items-center gap-1"><span>✍️</span> Status</div>
                  <div className="text-[8.5px] font-bold text-gray-900 italic">Valid Bank Challan & Tax Document</div>
                </div>
                <div className="w-[40%] bg-[#0f224a] text-white p-2 text-right flex flex-col justify-center">
                  <div className="text-[7.5px] font-bold text-gray-300 uppercase tracking-wider">NET PAYABLE</div>
                  <div className="text-[13px] font-black font-mono text-white">{formatCurrency(previewVoucher.total_payable)}</div>
                </div>
              </div>

              {/* Guidelines / Footer Instructions Section */}
              <div className="border border-gray-900 rounded p-2 bg-white text-[8px] text-gray-800 leading-[1.3]">
                {footerInstructions ? (
                  <div
                    className="voucher-footer-preview"
                    dangerouslySetInnerHTML={{
                      __html: footerInstructions
                        .replace(/\{consumer_no\}/g, `26720027503263${String(previewVoucher.student_id).padStart(6, "0")}`)
                        .replace(/\{challan_no\}/g, previewVoucher.voucher_number || `KIPS-VCH-${previewVoucher.student_id}`)
                        .replace(/\{due_date\}/g, dueDate)
                        .replace(/\{month_name\}/g, previewVoucher.month_name || targetMonth),
                    }}
                  />
                ) : (
                  <div className="space-y-0.5">
                    <div className="font-extrabold text-[8.5px] text-gray-900 uppercase">PAYMENT INSTRUCTIONS:</div>
                    <div>• <strong>1BILL ONLINE:</strong> Pay via 1Bill Consumer #: <strong className="font-mono">{`26720027503263${String(previewVoucher.student_id).padStart(6, "0")}`}</strong> across all Banking &amp; Wallet Apps.</div>
                    <div>• <strong>BANK COUNTER:</strong> Payable at any UBL Branch nationwide (A/C: Quality Brands (Pvt) Ltd).</div>
                    <div>• <strong>LATE SURCHARGE:</strong> Late fee surcharge of Rs. 50/day applicable strictly after due date.</div>
                    <div>• <strong>HELPLINE:</strong> 0300 39 39 581</div>
                  </div>
                )}
              </div>

              {/* Signatures & Preparation Line */}
              <div className="flex items-end justify-between text-[8px] text-gray-700 px-1 py-0.5">
                <div>Prepared By: <strong>Accounts System Portal</strong></div>
                {signatureImage || previewVoucher.signature_image ? (
                  <div className="flex flex-col items-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={signatureImage || previewVoucher.signature_image || ""}
                      alt="Authorized Signature"
                      className="max-h-7 max-w-[100px] object-contain mb-0.5"
                    />
                    <div className="border-t border-gray-600 pt-0.5 text-center text-[7px] text-gray-800 font-bold">
                      Authorized Stamp &amp; Sign
                    </div>
                  </div>
                ) : (
                  <div className="border border-dashed border-gray-600 rounded px-2.5 py-0.5 text-center text-[7.5px] text-gray-600 font-bold">
                    Authorized Stamp &amp; Sign
                  </div>
                )}
              </div>

              {/* Security Baseline Strip */}
              <div className="bg-gray-900 text-white text-[7px] font-bold text-center py-0.5 rounded-xs tracking-wider uppercase">
                • KIPS SCHOOL OFFICIAL FINANCIAL INSTRUMENT • PRINT PRODUCES 2 COPIES (ACCOUNTS & STUDENT) •
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Link
                href={`/vouchers/verify?voucher_no=${encodeURIComponent(previewVoucher.voucher_number || `KIPS-VCH-${targetMonth.replace('-', '')}-${previewVoucher.student_id}`)}`}
                target="_blank"
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition shadow-2xs border border-slate-300 dark:border-slate-700"
              >
                <span>🔍</span>
                <span>Public Portal</span>
              </Link>
              <a
                href={`${API}/public/vouchers/pdf?voucher_no=${encodeURIComponent(previewVoucher.voucher_number || `KIPS-VCH-${targetMonth.replace('-', '')}-${previewVoucher.student_id}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition shadow-2xs border border-slate-300 dark:border-slate-700"
              >
                <span>📄</span>
                <span>Open PDF</span>
              </a>
              <button
                onClick={() => {
                  handleSendWhatsApp(
                    [previewVoucher.voucher_number || String(previewVoucher.student_id)],
                    true
                  );
                  setPreviewVoucher(null);
                }}
                disabled={whatsAppSending}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-2xs disabled:opacity-50 cursor-pointer"
              >
                <span>📱</span>
                <span>WhatsApp</span>
              </button>
              <Link
                href={`/dashboard/fees/vouchers/print?month=${targetMonth}&due_date=${dueDate}&selected_keys=${previewVoucher.voucher_number || previewVoucher.student_id}`}
                target="_blank"
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold text-white transition shadow-2xs hover:opacity-90 bg-blue-600"
              >
                <span>🖨️</span>
                <span>Print Slip</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ─── Voucher Footer Settings / Quill Editor Modal ─── */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg font-bold">
                  ✍️
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Edit Voucher Footer / Instructions
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Customize the payment instructions, terms, and guidelines that appear below each voucher slip.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-xl p-3 text-xs text-blue-900 dark:text-blue-200">
                <p className="font-semibold mb-1 flex items-center gap-1.5">
                  <span>💡</span> Rich Text Guidelines Editor
                </p>
                <p className="text-[11.5px] leading-relaxed">
                  Use the editor toolbar below to format bold headings, lists, colors, or helpline contacts. Use the <strong>Insert Tag</strong> buttons to dynamically display each student&apos;s 1Bill consumer number, challan reference, and due date.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Voucher Instructions &amp; Notes
                </label>
                <QuillEditor
                  value={editorContent}
                  onChange={(html) => setEditorContent(html)}
                  minHeight="180px"
                  placeholder="Enter fee voucher payment instructions, bank notes, or helpline details..."
                />
              </div>

              {/* Live Slip Preview */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <span>👁️</span> Realtime Voucher Footer Preview
                </label>
                <div className="border border-gray-900 rounded-md p-3 bg-white text-[8.5px] text-gray-800 leading-[1.35] shadow-xs">
                  {editorContent ? (
                    <div
                      className="voucher-footer-preview"
                      dangerouslySetInnerHTML={{
                        __html: editorContent
                          .replace(/\{consumer_no\}/g, "267200275032630001")
                          .replace(/\{challan_no\}/g, "KIPS-VCH-202610-0001")
                          .replace(/\{due_date\}/g, dueDate)
                          .replace(/\{month_name\}/g, summary?.month_name || targetMonth),
                      }}
                    />
                  ) : (
                    <p className="text-gray-400 italic text-[10px]">No instructions entered. Standard default guidelines will be used.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80">
              <button
                type="button"
                onClick={() => {
                  if (defaultInstructions) {
                    setEditorContent(defaultInstructions);
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                🔄 Reset to Standard Default
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveFooterInstructions}
                  disabled={savingSettings}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {savingSettings ? (
                    <>
                      <svg className="animate-spin w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <span>💾</span>
                      <span>Save &amp; Apply Instructions</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Authorized Signature Upload Modal ─── */}
      {isSignatureModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg font-bold">
                  🖋️
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Official Authorized Signature
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Upload an official signature image to display on all vouchers &amp; PDFs.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSignatureModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              <div className="bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-xl p-3 text-xs text-blue-900 dark:text-blue-200">
                <p className="font-semibold mb-1 flex items-center gap-1.5">
                  <span>💡</span> Signature Stamp Guidelines
                </p>
                <p className="text-[11.5px] leading-relaxed">
                  Upload a clean <strong>PNG with a transparent background</strong> (or JPG) of the Principal&apos;s or Accounts Officer&apos;s signature / official stamp. It will automatically appear in the bottom-right corner of all voucher slips (Accounts &amp; Student copies), print sheets, and backend PDFs.
                </p>
              </div>

              {/* Upload Dropzone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Select Signature File
                </label>
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 rounded-2xl p-6 text-center transition-colors bg-slate-50/50 dark:bg-slate-800/50 cursor-pointer relative group">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setSelectedSignatureFile(file);
                        const objectUrl = URL.createObjectURL(file);
                        setSignaturePreviewUrl(objectUrl);
                      }
                    }}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                  />
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                      📤
                    </div>
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {selectedSignatureFile ? (
                        <span className="text-blue-600 dark:text-blue-400 font-bold">{selectedSignatureFile.name} ({(selectedSignatureFile.size / 1024).toFixed(1)} KB)</span>
                      ) : (
                        <span>Click to browse or drag &amp; drop signature image</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Supports PNG, JPG, WebP, SVG (Max 5MB). Transparent PNG recommended.
                    </p>
                  </div>
                </div>
              </div>

              {/* Live Preview Card */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><span>👁️</span> Realtime Voucher Slip Preview</span>
                  {signaturePreviewUrl && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">● Active Preview</span>
                  )}
                </label>

                <div className="border border-gray-900 rounded-xl p-4 bg-white text-gray-800 shadow-sm flex items-center justify-between">
                  <div className="text-[10px] text-gray-500">
                    <div>Prepared By: <strong>Accounts Desk</strong></div>
                    <div className="text-[9px] text-gray-400 mt-0.5">KIPS School Official Slip</div>
                  </div>

                  <div className="flex flex-col items-center justify-center min-w-[130px] p-2 bg-gray-50 border border-dashed border-gray-300 rounded-lg">
                    {signaturePreviewUrl ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={signaturePreviewUrl}
                          alt="Signature Preview"
                          className="max-h-10 max-w-[120px] object-contain mb-1"
                        />
                        <div className="border-t border-gray-600 pt-0.5 text-center text-[7.5px] text-gray-800 font-bold">
                          Authorized Stamp &amp; Sign
                        </div>
                      </>
                    ) : (
                      <div className="border border-dashed border-gray-600 rounded px-3 py-1.5 text-center text-[8px] text-gray-500 font-bold">
                        [ No Signature Uploaded ]
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80">
              {signatureImage ? (
                <button
                  type="button"
                  onClick={handleRemoveSignature}
                  disabled={savingSignature}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/40 transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <span>🗑️</span>
                  <span>Remove Signature</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsSignatureModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSignature}
                  disabled={savingSignature || (!selectedSignatureFile && !signaturePreviewUrl)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {savingSignature ? (
                    <>
                      <svg className="animate-spin w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <span>💾</span>
                      <span>Save &amp; Apply Signature</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global CSS for Rich Text rendering inside voucher footer */}
      <style jsx global>{`
        .voucher-footer-preview p {
          margin: 0 0 2px 0;
        }
        .voucher-footer-preview ul,
        .voucher-footer-preview ol {
          margin: 0 0 2px 0;
          padding-left: 14px;
        }
        .voucher-footer-preview li {
          margin-bottom: 1px;
        }
      `}</style>
    </DashboardLayout>
  );
}
