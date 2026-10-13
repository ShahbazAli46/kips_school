"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import CustomDropdown from "@/components/CustomDropdown";
import CustomDatePicker from "@/components/CustomDatePicker";
import CustomNumberInput from "@/components/CustomNumberInput";
import {
  DollarSign,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  Plus,
  Receipt,
  Printer,
  Send,
  ArrowDownToLine,
  CheckCheck,
  Calendar,
  X,
  UserCheck,
  Building2,
  FileText,
  BadgeAlert,
  ChevronRight,
  ChevronLeft,
  Smartphone,
  Info,
  Layers,
  ArrowRight
} from "lucide-react";
import { format } from "date-fns";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

interface StudentRef {
  id: number;
  name: string;
  father_name: string;
  roll_number?: string | number;
  contact_number?: string;
  emergency_contact?: string;
  father_cell?: string;
  academy_class?: { id: number; name: string };
  section?: { id: number; name: string };
  academyClass?: { id: number; name: string };
}

interface StaffRef {
  id: number;
  name: string;
  role_id: number;
  designation?: { id: number; name: string };
}

interface ReceivingItem {
  id: number;
  receipt_no: string;
  student_id: number;
  staff_id: number;
  academic_session_id?: number | null;
  amount: string | number;
  description: string;
  payment_method: string;
  received_date: string;
  status: "pending_handover" | "received_by_admin";
  admin_received_by?: number | null;
  admin_received_at?: string | null;
  admin_notes?: string | null;
  parent_phone?: string | null;
  whatsapp_status: "pending" | "sent" | "failed";
  whatsapp_sent_at?: string | null;
  student?: StudentRef;
  staff?: StaffRef;
  admin_receiver?: { id: number; name: string };
  adminReceiver?: { id: number; name: string };
  fee_payment?: { id: number; payment_date: string; amount_paid: string | number };
  feePayment?: { id: number; payment_date: string; amount_paid: string | number };
}

interface StatsData {
  total_pending_amount: number;
  pending_count: number;
  total_received_today: number;
  total_cleared: number;
  total_all_time: number;
  staff_holding_count: number;
  is_admin: boolean;
}

export default function StaffReceivedAmountsPage() {
  // ─── List & Pagination State ───────────────────────────────
  const [receivings, setReceivings] = useState<ReceivingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsData>({
    total_pending_amount: 0,
    pending_count: 0,
    total_received_today: 0,
    total_cleared: 0,
    total_all_time: 0,
    staff_holding_count: 0,
    is_admin: true,
  });
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 25,
    total: 0,
  });

  // ─── Filters State ─────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<"all" | "pending_handover" | "received_by_admin">("all");
  const [staffFilter, setStaffFilter] = useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchInput, setSearchInput] = useState<string>("");

  // ─── Filter Options State ──────────────────────────────────
  const [staffList, setStaffList] = useState<StaffRef[]>([]);
  const [classList, setClassList] = useState<{ id: number; name: string }[]>([]);

  // ─── Selection for Batch Handover ──────────────────────────
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // ─── UI Banners & Alerts ───────────────────────────────────
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // ─── Modal States ──────────────────────────────────────────
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [handoverTarget, setHandoverTarget] = useState<ReceivingItem | null>(null);
  const [handoverNotes, setHandoverNotes] = useState("");
  const [processingHandover, setProcessingHandover] = useState(false);

  // ─── Receipt Print Modal ───────────────────────────────────
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<ReceivingItem | null>(null);

  // ─── Fetch Dropdown Data ───────────────────────────────────
  useEffect(() => {
    async function loadDropdowns() {
      try {
        const [staffRes, classRes] = await Promise.all([
          fetch(`${API}/staff-receivings/staff-list`, { headers: getAuthHeaders() }),
          fetch(`${API}/classes`, { headers: getAuthHeaders() }),
        ]);

        if (staffRes.ok) {
          const sData = await staffRes.json();
          setStaffList(Array.isArray(sData) ? sData : []);
        }
        if (classRes.ok) {
          const cData = await classRes.json();
          setClassList(Array.isArray(cData) ? cData : (cData.data || []));
        }
      } catch (err) {
        console.error("Failed to load filter dropdowns", err);
      }
    }
    loadDropdowns();
  }, []);

  // ─── Fetch Receivings ──────────────────────────────────────
  const fetchReceivings = useCallback(
    async (pageNumber = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(pageNumber));
        params.set("per_page", "25");

        if (statusFilter !== "all") {
          params.set("status", statusFilter);
        }
        if (staffFilter && staffFilter !== "all") {
          params.set("staff_id", staffFilter);
        }
        if (classFilter && classFilter !== "all") {
          params.set("class_id", classFilter);
        }
        if (dateFrom) params.set("date_from", dateFrom);
        if (dateTo) params.set("date_to", dateTo);
        if (searchQuery.trim()) params.set("search", searchQuery.trim());

        const res = await fetch(`${API}/staff-receivings?${params.toString()}`, {
          headers: getAuthHeaders(),
        });

        if (res.ok) {
          const json = await res.json();
          setReceivings(json.data || []);
          if (json.pagination) {
            setPagination(json.pagination);
          }
          if (json.stats) {
            setStats(json.stats);
          }
        } else {
          const err = await res.json();
          setBanner({ type: "error", message: err.message || "Failed to load receivings" });
        }
      } catch (err: any) {
        setBanner({ type: "error", message: err.message || "Network error loading records" });
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, staffFilter, classFilter, dateFrom, dateTo, searchQuery]
  );

  useEffect(() => {
    fetchReceivings(1);
    setSelectedIds([]);
  }, [fetchReceivings]);

  // Handle Search Input submit / debounce
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
  };

  const handleResetFilters = () => {
    setStatusFilter("all");
    setStaffFilter("all");
    setClassFilter("all");
    setDateFrom("");
    setDateTo("");
    setSearchQuery("");
    setSearchInput("");
  };

  // ─── Selection Helpers ─────────────────────────────────────
  const pendingOnCurrentPage = useMemo(() => {
    return receivings.filter((r) => r.status === "pending_handover");
  }, [receivings]);

  const allPendingSelected =
    pendingOnCurrentPage.length > 0 &&
    pendingOnCurrentPage.every((r) => selectedIds.includes(r.id));

  const toggleSelectAll = () => {
    if (allPendingSelected) {
      const pendingIds = new Set(pendingOnCurrentPage.map((r) => r.id));
      setSelectedIds(selectedIds.filter((id) => !pendingIds.has(id)));
    } else {
      const newSelected = new Set(selectedIds);
      pendingOnCurrentPage.forEach((r) => newSelected.add(r.id));
      setSelectedIds(Array.from(newSelected));
    }
  };

  const toggleSelectRow = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectedTotalAmount = useMemo(() => {
    return receivings
      .filter((r) => selectedIds.includes(r.id))
      .reduce((sum, r) => sum + parseFloat(String(r.amount) || "0"), 0);
  }, [receivings, selectedIds]);

  // ─── Handover Confirmation ─────────────────────────────────
  const handleOpenSingleHandover = (item: ReceivingItem) => {
    setHandoverTarget(item);
    setHandoverNotes(`Cash received at office from ${item.staff?.name || "Staff"}`);
    setShowHandoverModal(true);
  };

  const handleOpenBatchHandover = () => {
    if (selectedIds.length === 0) return;
    setHandoverTarget(null);
    setHandoverNotes(`Batch handover received (${selectedIds.length} payments)`);
    setShowHandoverModal(true);
  };

  const executeHandover = async () => {
    setProcessingHandover(true);
    try {
      if (handoverTarget) {
        // Single receiving
        const res = await fetch(`${API}/staff-receivings/${handoverTarget.id}/receive`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ notes: handoverNotes }),
        });
        const json = await res.json();
        if (res.ok) {
          setBanner({ type: "success", message: json.message || "Amount received and cleared!" });
          setShowHandoverModal(false);
          setHandoverTarget(null);
          fetchReceivings(pagination.current_page);
        } else {
          setBanner({ type: "error", message: json.message || "Failed to receive amount" });
        }
      } else if (selectedIds.length > 0) {
        // Batch receiving
        const res = await fetch(`${API}/staff-receivings/batch-receive`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ ids: selectedIds, notes: handoverNotes }),
        });
        const json = await res.json();
        if (res.ok) {
          setBanner({
            type: "success",
            message: json.message || `Successfully cleared ${selectedIds.length} collections!`,
          });
          setShowHandoverModal(false);
          setSelectedIds([]);
          fetchReceivings(pagination.current_page);
        } else {
          setBanner({ type: "error", message: json.message || "Failed to process batch receiving" });
        }
      }
    } catch (err: any) {
      setBanner({ type: "error", message: err.message || "Network error occurred" });
    } finally {
      setProcessingHandover(false);
    }
  };

  // ─── Resend WhatsApp ───────────────────────────────────────
  const handleResendWhatsApp = async (id: number) => {
    try {
      const res = await fetch(`${API}/staff-receivings/${id}/resend-whatsapp`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (res.ok) {
        setBanner({ type: "success", message: json.message || "WhatsApp receipt re-queued." });
      } else {
        setBanner({ type: "error", message: json.message || "Failed to resend WhatsApp." });
      }
    } catch (err: any) {
      setBanner({ type: "error", message: err.message || "Network error" });
    }
  };

  // ─── Print Isolated Slip ───────────────────────────────────
  const handlePrintSlip = (item: ReceivingItem) => {
    setActiveReceipt(item);
    setShowReceiptModal(true);
  };

  const triggerWindowPrint = (item: ReceivingItem) => {
    const formattedDate = format(new Date(item.received_date || new Date()), "dd MMM yyyy");
    const studentName = item.student?.name || "Student";
    const fatherName = item.student?.father_name || "";
    const rollNo = item.student?.roll_number || `#${item.student?.id || ""}`;
    const className = item.student?.academyClass?.name || item.student?.academy_class?.name || "N/A";
    const sectionName = item.student?.section?.name || "";
    const staffName = item.staff?.name || "Staff Member";
    const amountNum = parseFloat(String(item.amount) || "0").toLocaleString();
    const adminClearStatus =
      item.status === "received_by_admin"
        ? `Deposited to School Accounts (${item.adminReceiver?.name || item.admin_receiver?.name || "Super Admin"})`
        : "Pending Handover (Cash with Staff)";

    const printHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Receipt - ${item.receipt_no}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 4mm;
            }
            @media print {
              html, body {
                width: 100%;
                margin: 0 !important;
                padding: 0 !important;
                background: #fff !important;
              }
            }
            * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
            body { background: #fff; color: #0f172a; padding: 8px; display: flex; justify-content: center; }
            .slip { width: 100%; max-width: 320px; border: 1px dashed #64748b; border-radius: 8px; padding: 14px; }
            .center { text-align: center; }
            .school-title { font-size: 16px; font-weight: 900; text-transform: uppercase; color: #0f224a; letter-spacing: 0.5px; }
            .sub-title { font-size: 10px; color: #64748b; margin-top: 2px; }
            .divider { border-top: 1px dashed #cbd5e1; margin: 10px 0; }
            .receipt-no { font-family: monospace; font-size: 12px; font-weight: 800; background: #f1f5f9; padding: 4px 8px; border-radius: 4px; display: inline-block; }
            .row { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 5px; }
            .label { color: #64748b; }
            .value { font-weight: 700; color: #0f172a; text-align: right; }
            .amount-box { background: #f8fafc; border: 1.5px solid #0f224a; border-radius: 6px; padding: 10px; margin: 10px 0; text-align: center; }
            .amount-val { font-size: 20px; font-weight: 900; color: #0f224a; font-family: monospace; }
            .desc-box { font-size: 11px; background: #eff6ff; border-radius: 4px; padding: 6px 8px; margin-bottom: 10px; color: #1e3a8a; }
            .footer-note { font-size: 9px; color: #94a3b8; text-align: center; margin-top: 12px; }
            .signatures { display: flex; justify-content: space-between; margin-top: 25px; padding-top: 10px; font-size: 10px; color: #475569; }
            .sig-line { border-top: 1px solid #94a3b8; width: 45%; text-align: center; padding-top: 4px; }
          </style>
        </head>
        <body>
          <div class="slip">
            <div class="center">
              <div class="school-title">KIPS SCHOOL</div>
              <div class="sub-title">Official Student Payment Receipt</div>
              <div style="margin-top: 6px;">
                <span class="receipt-no">${item.receipt_no}</span>
              </div>
            </div>

            <div class="divider"></div>

            <div class="row">
              <span class="label">Date:</span>
              <span class="value">${formattedDate}</span>
            </div>
            <div class="row">
              <span class="label">Student:</span>
              <span class="value">${studentName}</span>
            </div>
            ${fatherName ? `
            <div class="row">
              <span class="label">Father:</span>
              <span class="value">${fatherName}</span>
            </div>` : ""}
            <div class="row">
              <span class="label">Class & Roll:</span>
              <span class="value">${className} ${sectionName ? `(${sectionName})` : ""} • Roll #${rollNo}</span>
            </div>
            <div class="row">
              <span class="label">Received By:</span>
              <span class="value">${staffName}</span>
            </div>
            <div class="row">
              <span class="label">Method:</span>
              <span class="value">${(item.payment_method || "cash").toUpperCase()}</span>
            </div>

            <div class="desc-box">
              <strong>Purpose:</strong> ${item.description}
            </div>

            <div class="amount-box">
              <div style="font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase;">Amount Paid</div>
              <div class="amount-val">Rs. ${amountNum}</div>
            </div>

            <div class="row" style="margin-top: 6px;">
              <span class="label">Status:</span>
              <span class="value" style="color: ${item.status === 'received_by_admin' ? '#059669' : '#d97706'}">
                ${adminClearStatus}
              </span>
            </div>

            <div class="signatures">
              <div class="sig-line">Collector Signature</div>
              <div class="sig-line">Parent / Payer</div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    const printWin = window.open("", "_blank", "width=420,height=600");
    if (printWin) {
      printWin.document.open();
      printWin.document.write(printHtml);
      printWin.document.close();
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* ─── Top Header ───────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0f224a] to-[#1e3a8a] text-white flex items-center justify-center shadow-md shadow-blue-900/20">
                <Users className="w-5 h-5 text-sky-300" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-[#0f224a]">
                  Staff Received Amounts
                </h1>
                <p className="text-xs lg:text-sm font-medium text-slate-500">
                  Track student funds collected by staff members, manage cash handovers, and reconcile into Daily Receivings.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => fetchReceivings(pagination.current_page)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200/90 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : "text-slate-500"}`} />
              <span>Refresh</span>
            </button>

            {selectedIds.length > 0 && (
              <button
                onClick={handleOpenBatchHandover}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-700/20 transition-all"
              >
                <ArrowDownToLine className="w-4 h-4" />
                <span>Receive Selected ({selectedIds.length}) • Rs. {selectedTotalAmount.toLocaleString()}</span>
              </button>
            )}

            <button
              onClick={() => setShowCollectModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-[#0f224a] hover:bg-[#1e3a8a] shadow-md shadow-blue-950/20 transition-all"
            >
              <Plus className="w-4 h-4 text-sky-300" />
              <span>+ Collect from Student</span>
            </button>
          </div>
        </div>

        {/* ─── Banner Alert ─────────────────────────────────────── */}
        {banner && (
          <div
            className={`p-4 rounded-xl flex items-start justify-between gap-3 border transition-all ${
              banner.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {banner.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span className="text-xs font-semibold">{banner.message}</span>
            </div>
            <button
              onClick={() => setBanner(null)}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ─── KPI Stats Cards ─────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Pending with Staff */}
          <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white border border-amber-200/80 rounded-2xl p-5 shadow-2xs relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-700">
                Pending Handover
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-950 tracking-tight">
              Rs. {Number(stats.total_pending_amount || 0).toLocaleString()}
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-amber-700/90">
              <span>{stats.pending_count || 0} collections in possession</span>
              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                <Users className="w-3 h-3" />
                {stats.staff_holding_count || 0} staff holding
              </span>
            </div>
          </div>

          {/* Card 2: Received by Admin Today */}
          <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-white border border-emerald-200/80 rounded-2xl p-5 shadow-2xs relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700">
                Received Today
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <CheckCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-950 tracking-tight">
              Rs. {Number(stats.total_received_today || 0).toLocaleString()}
            </div>
            <div className="mt-2 text-[11px] font-semibold text-emerald-700">
              Cleared & booked into Daily Receivings today
            </div>
          </div>

          {/* Card 3: Total Cleared All-Time */}
          <div className="bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-white border border-blue-200/80 rounded-2xl p-5 shadow-2xs relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-blue-700">
                Total Handed Over
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <ArrowDownToLine className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-blue-950 tracking-tight">
              Rs. {Number(stats.total_cleared || 0).toLocaleString()}
            </div>
            <div className="mt-2 text-[11px] font-semibold text-blue-700">
              Cleared from staff into school accounts
            </div>
          </div>

          {/* Card 4: Total Volume All-Time */}
          <div className="bg-gradient-to-br from-slate-500/10 via-slate-500/5 to-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                Total Student Volume
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              Rs. {Number(stats.total_all_time || 0).toLocaleString()}
            </div>
            <div className="mt-2 text-[11px] font-semibold text-slate-500">
              Overall staff collection activity
            </div>
          </div>
        </div>

        {/* ─── Filter & Search Bar ───────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-4">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === "all"
                    ? "bg-white text-[#0f224a] shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All Records
              </button>
              <button
                onClick={() => setStatusFilter("pending_handover")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  statusFilter === "pending_handover"
                    ? "bg-amber-500 text-white shadow-2xs"
                    : "text-amber-700 hover:bg-amber-100/60"
                }`}
              >
                <span>Pending Handover</span>
                {stats.pending_count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      statusFilter === "pending_handover" ? "bg-amber-600 text-white" : "bg-amber-200 text-amber-900"
                    }`}
                  >
                    {stats.pending_count}
                  </span>
                )}
              </button>
              <button
                onClick={() => setStatusFilter("received_by_admin")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  statusFilter === "received_by_admin"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "text-emerald-700 hover:bg-emerald-100/60"
                }`}
              >
                <span>Cleared by Admin</span>
              </button>
            </div>

            <div className="text-xs text-slate-500 font-semibold">
              Showing {receivings.length} of {pagination.total} records
            </div>
          </div>

          {/* Filter Dropdowns & Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="lg:col-span-2 relative">
              <input
                type="text"
                placeholder="Search receipt #, student, staff, reason..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full h-[38px] pl-9 pr-3 text-xs font-semibold rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 placeholder:text-slate-400"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            </form>

            {/* Staff Filter */}
            <div>
              <CustomDropdown
                options={[
                  { label: "All Staff Members", value: "all" },
                  ...staffList.map((s) => ({
                    label: `${s.name}${s.designation?.name ? ` (${s.designation.name})` : ""}`,
                    value: s.id,
                  })),
                ]}
                value={staffFilter}
                onChange={(_, val) => setStaffFilter(String(val))}
                placeholder="Filter by Staff"
                name="staffFilter"
              />
            </div>

            {/* Class Filter */}
            <div>
              <CustomDropdown
                options={[
                  { label: "All Classes", value: "all" },
                  ...classList.map((c) => ({ label: c.name, value: c.id })),
                ]}
                value={classFilter}
                onChange={(_, val) => setClassFilter(String(val))}
                placeholder="Filter by Class"
                name="classFilter"
              />
            </div>

            {/* Date From */}
            <div>
              <CustomDatePicker
                value={dateFrom}
                onChange={(d) => setDateFrom(d)}
                placeholder="From Date"
              />
            </div>

            {/* Date To & Reset */}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <CustomDatePicker
                  value={dateTo}
                  onChange={(d) => setDateTo(d)}
                  placeholder="To Date"
                />
              </div>
              {(statusFilter !== "all" ||
                staffFilter !== "all" ||
                classFilter !== "all" ||
                dateFrom ||
                dateTo ||
                searchQuery) && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  title="Reset all filters"
                  className="h-[38px] px-2.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ─── Data Table ────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-black uppercase tracking-wider text-slate-600">
                  <th className="py-3.5 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={allPendingSelected}
                      onChange={toggleSelectAll}
                      disabled={pendingOnCurrentPage.length === 0}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="py-3.5 px-4">Receipt #</th>
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">Collected By</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4">Reason / Purpose</th>
                  <th className="py-3.5 px-4 text-center">WhatsApp</th>
                  <th className="py-3.5 px-4 text-center">Handover Status</th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <div className="inline-flex items-center gap-2 font-semibold">
                        <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                        <span>Loading staff collections...</span>
                      </div>
                    </td>
                  </tr>
                ) : receivings.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <div className="max-w-xs mx-auto space-y-2">
                        <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                        <div className="font-bold text-slate-700">No collections found</div>
                        <div className="text-[11px] text-slate-500">
                          Try adjusting your filters or use &ldquo;+ Collect from Student&rdquo; to record a new receipt.
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  receivings.map((item) => {
                    const isSelected = selectedIds.includes(item.id);
                    const isPending = item.status === "pending_handover";
                    const formattedDate = format(new Date(item.received_date), "dd MMM yyyy");
                    const studentClass =
                      item.student?.academyClass?.name || item.student?.academy_class?.name || "Class N/A";
                    const studentSection = item.student?.section?.name || "";

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          isSelected ? "bg-blue-50/40" : ""
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-3 px-4 text-center">
                          {isPending ? (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectRow(item.id)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          ) : (
                            <span className="text-slate-300">•</span>
                          )}
                        </td>

                        {/* Receipt # & Date */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-mono font-extrabold text-[#0f224a]">
                            {item.receipt_no}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{formattedDate}</span>
                          </div>
                        </td>

                        {/* Student Details */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">
                            {item.student?.name || "Unknown Student"}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span className="font-semibold text-blue-700">{studentClass}</span>
                            {studentSection && <span>• Sec {studentSection}</span>}
                            <span>• Roll #{item.student?.roll_number || item.student_id}</span>
                          </div>
                          {item.student?.father_name && (
                            <div className="text-[10px] text-slate-400">
                              S/O {item.student.father_name}
                            </div>
                          )}
                        </td>

                        {/* Staff Collector */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center">
                              {item.staff?.name ? item.staff.name.charAt(0).toUpperCase() : "S"}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">
                                {item.staff?.name || "Staff Member"}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {item.staff?.designation?.name || "Teacher / Staff"}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="font-mono font-black text-sm text-[#0f224a]">
                            Rs. {parseFloat(String(item.amount)).toLocaleString()}
                          </div>
                          <div className="text-[10px] font-medium text-slate-400 uppercase">
                            {item.payment_method || "cash"}
                          </div>
                        </td>

                        {/* Reason / Description */}
                        <td className="py-3 px-4 max-w-xs">
                          <div className="font-medium text-slate-800 line-clamp-2" title={item.description}>
                            {item.description}
                          </div>
                        </td>

                        {/* WhatsApp Status */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {item.whatsapp_status === "sent" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCheck className="w-3 h-3 text-emerald-600" />
                              <span>Sent</span>
                            </span>
                          ) : item.whatsapp_status === "pending" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>Queued</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => handleResendWhatsApp(item.id)}
                              title="Failed. Click to retry sending WhatsApp"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors"
                            >
                              <AlertCircle className="w-3 h-3 text-rose-600" />
                              <span>Retry</span>
                            </button>
                          )}
                        </td>

                        {/* Handover Status */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {isPending ? (
                            <div className="inline-flex flex-col items-center">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                <span>Pending Handover</span>
                              </span>
                              <span className="text-[10px] text-amber-700 font-medium mt-0.5">
                                With {item.staff?.name || "Staff"}
                              </span>
                            </div>
                          ) : (
                            <div className="inline-flex flex-col items-center">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Received by Admin</span>
                              </span>
                              {item.admin_received_at && (
                                <span className="text-[9px] text-slate-400 mt-0.5">
                                  {format(new Date(item.admin_received_at), "dd MMM, hh:mm a")}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {isPending && (
                              <button
                                onClick={() => handleOpenSingleHandover(item)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-2xs transition-all"
                                title="Acknowledge handover and add to Daily Receivings"
                              >
                                <ArrowDownToLine className="w-3 h-3" />
                                <span>Receive</span>
                              </button>
                            )}

                            <button
                              onClick={() => handlePrintSlip(item)}
                              title="Print Receipt Slip"
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ─── Pagination Footer ─────────────────────────────── */}
          {pagination.last_page > 1 && (
            <div className="py-3 px-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">
                Page {pagination.current_page} of {pagination.last_page} ({pagination.total} records)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => fetchReceivings(pagination.current_page - 1)}
                  disabled={pagination.current_page <= 1}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>
                <button
                  onClick={() => fetchReceivings(pagination.current_page + 1)}
                  disabled={pagination.current_page >= pagination.last_page}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════ MODAL: RECORD STUDENT RECEIVING ══════════════════════ */}
      {showCollectModal && (
        <CollectStudentReceivingModal
          classList={classList}
          staffList={staffList}
          onClose={() => setShowCollectModal(false)}
          onSuccess={(newRec) => {
            setShowCollectModal(false);
            setBanner({
              type: "success",
              message: `Recorded collection of Rs. ${parseFloat(String(newRec.amount)).toLocaleString()} (${newRec.receipt_no})!`,
            });
            fetchReceivings(1);
            if (newRec) {
              setActiveReceipt(newRec);
              setShowReceiptModal(true);
            }
          }}
        />
      )}

      {/* ══════════════════════ MODAL: CONFIRM HANDOVER / RECEIVE ══════════════════════ */}
      {showHandoverModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <ArrowDownToLine className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-sm">Receive Cash Handover</h3>
                  <p className="text-[11px] text-emerald-100">
                    Acknowledge cash from staff & add into Daily Receivings
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowHandoverModal(false)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {handoverTarget ? (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Receipt Number:</span>
                    <span className="font-mono font-bold text-slate-800">{handoverTarget.receipt_no}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Staff Member:</span>
                    <span className="font-bold text-slate-800">{handoverTarget.staff?.name || "Staff"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Student:</span>
                    <span className="font-bold text-slate-800">{handoverTarget.student?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Purpose:</span>
                    <span className="font-medium text-slate-700">{handoverTarget.description}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                    <span className="font-black text-slate-800">Amount to Receive:</span>
                    <span className="font-mono font-black text-base text-emerald-700">
                      Rs. {parseFloat(String(handoverTarget.amount)).toLocaleString()}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Selected Items:</span>
                    <span className="font-bold text-slate-800">{selectedIds.length} collections</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                    <span className="font-black text-slate-800">Total Cash Handover:</span>
                    <span className="font-mono font-black text-base text-emerald-700">
                      Rs. {selectedTotalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Handover Notes / Remarks (Optional)
                </label>
                <input
                  type="text"
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  placeholder="e.g. Received at Accounts Desk"
                  className="w-full h-[38px] px-3 text-xs font-semibold rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2 text-blue-900">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  Upon receiving, this amount will automatically be recorded in <strong>Daily Receivings</strong> and cleared from the staff member&apos;s pending handover balance.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowHandoverModal(false)}
                  disabled={processingHandover}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeHandover}
                  disabled={processingHandover}
                  className="px-5 py-2 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-700/20 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {processingHandover ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm & Add to Receivings</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════ MODAL: PRINT RECEIPT ══════════════════════ */}
      {showReceiptModal && activeReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-sky-400" />
                <span className="font-extrabold text-xs">Payment Receipt Preview</span>
              </div>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Receipt Body */}
            <div className="p-5 text-xs space-y-4">
              <div className="text-center space-y-1">
                <div className="text-base font-black tracking-wide text-[#0f224a]">KIPS SCHOOL</div>
                <div className="text-[10px] text-slate-500">Student Payment Receipt</div>
                <div className="inline-block px-3 py-1 bg-slate-100 font-mono font-bold text-slate-800 rounded-md mt-1">
                  {activeReceipt.receipt_no}
                </div>
              </div>

              <div className="space-y-2 border-y border-dashed border-slate-200 py-3 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Date:</span>
                  <span className="font-semibold text-slate-800">
                    {format(new Date(activeReceipt.received_date), "dd MMM yyyy")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Student:</span>
                  <span className="font-bold text-slate-900">{activeReceipt.student?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Class & Roll:</span>
                  <span className="font-medium text-slate-800">
                    {activeReceipt.student?.academyClass?.name || activeReceipt.student?.academy_class?.name || "N/A"} • #{activeReceipt.student?.roll_number || activeReceipt.student_id}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Collected By:</span>
                  <span className="font-semibold text-slate-800">{activeReceipt.staff?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Purpose:</span>
                  <span className="font-semibold text-blue-900">{activeReceipt.description}</span>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-center">
                <div className="text-[10px] uppercase font-bold text-slate-500">Amount Paid</div>
                <div className="text-2xl font-black font-mono text-[#0f224a] mt-0.5">
                  Rs. {parseFloat(String(activeReceipt.amount)).toLocaleString()}
                </div>
                <div className="text-[10px] font-semibold text-slate-400 uppercase mt-0.5">
                  Method: {activeReceipt.payment_method || "cash"}
                </div>
              </div>

              <div className="text-center text-[10px] text-slate-500">
                {activeReceipt.status === "received_by_admin" ? (
                  <span className="text-emerald-700 font-bold">✓ Cleared into School Daily Receivings</span>
                ) : (
                  <span className="text-amber-700 font-bold">In Possession of {activeReceipt.staff?.name}</span>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(false)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold text-slate-600 border border-slate-200 hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => triggerWindowPrint(activeReceipt)}
                  className="flex-1 py-2 rounded-xl text-xs font-black text-white bg-[#0f224a] hover:bg-[#1e3a8a] flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5 text-sky-300" />
                  <span>Print Slip</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

// ─── Modal: Collect Student Receiving ────────────────────────────
function CollectStudentReceivingModal({
  classList,
  staffList,
  onClose,
  onSuccess,
}: {
  classList: { id: number; name: string }[];
  staffList: StaffRef[];
  onClose: () => void;
  onSuccess: (rec: ReceivingItem) => void;
}) {
  // Student Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [searchResults, setSearchResults] = useState<StudentRef[]>([]);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentRef | null>(null);

  // Form Fields
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [receivedDate, setReceivedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [collectorStaffId, setCollectorStaffId] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Suggestions for rapid reason selection
  const commonReasons = [
    "Picnic / Field Trip",
    "Annual Sports Day",
    "Uniform Fee",
    "Student ID Card / Badge",
    "Science Lab Charges",
    "Stationery / Workbook",
    "Discipline Fine",
    "Late Fee Fine",
    "Tuition / Coaching Fee",
  ];

  // Live Student Search
  useEffect(() => {
    if (!searchQuery.trim() && selectedClassId === "all") {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingStudents(true);
      try {
        const params = new URLSearchParams();
        if (searchQuery.trim()) params.set("q", searchQuery.trim());
        if (selectedClassId !== "all") params.set("class_id", selectedClassId);

        const res = await fetch(`${API}/staff-receivings/students-search?${params.toString()}`, {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const list = await res.json();
          setSearchResults(Array.isArray(list) ? list : []);
        }
      } catch (err) {
        console.error("Student search error", err);
      } finally {
        setSearchingStudents(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedClassId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      setErrorMsg("Please select a student first.");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setErrorMsg("Please enter a valid amount.");
      return;
    }
    if (!description.trim()) {
      setErrorMsg("Please provide a reason / description for this payment.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      const payload: any = {
        student_id: selectedStudent.id,
        amount: parseFloat(amount),
        description: description.trim(),
        payment_method: paymentMethod,
        received_date: receivedDate,
      };

      if (collectorStaffId && collectorStaffId !== "") {
        payload.staff_id = parseInt(collectorStaffId);
      }

      const res = await fetch(`${API}/staff-receivings`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        onSuccess(data.receiving);
      } else {
        setErrorMsg(data.message || "Failed to record payment.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Network error occurred.");
    } finally {
      setSaving(false);
    }
  };

  const parentPhone =
    selectedStudent?.contact_number ||
    selectedStudent?.emergency_contact ||
    selectedStudent?.father_cell ||
    "Not Registered";

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-[#0f224a] to-[#1e3a8a] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Plus className="w-4 h-4 text-sky-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm">Receive Amount from Student</h3>
              <p className="text-[11px] text-sky-200">
                Collect payment for any school reason & send instant WhatsApp receipt to parent
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}

          {/* Student Selector / Search */}
          <div className="space-y-2">
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700">
              1. Select Student <span className="text-rose-500">*</span>
            </label>

            {selectedStudent ? (
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-black text-slate-900 text-sm">{selectedStudent.name}</div>
                  <div className="text-[11px] text-slate-600 flex items-center gap-2 mt-0.5">
                    <span className="font-bold text-blue-700">
                      {selectedStudent.academyClass?.name || selectedStudent.academy_class?.name || "Class"}
                    </span>
                    <span>• Roll #{selectedStudent.roll_number || selectedStudent.id}</span>
                    {selectedStudent.father_name && <span>• S/O {selectedStudent.father_name}</span>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2 relative">
                    <input
                      type="text"
                      placeholder="Type student name, roll # or phone..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-[38px] pl-8 pr-8 text-xs font-semibold rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 placeholder:text-slate-400"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                    {searchingStudents && (
                      <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin absolute right-2.5 top-3" />
                    )}
                  </div>
                  <div>
                    <CustomDropdown
                      options={[
                        { label: "All Classes", value: "all" },
                        ...classList.map((c) => ({ label: c.name, value: c.id })),
                      ]}
                      value={selectedClassId}
                      onChange={(_, val) => setSelectedClassId(String(val))}
                      placeholder="Class Filter"
                      name="classSearchFilter"
                    />
                  </div>
                </div>

                {/* Search Results Dropdown List */}
                {searchingStudents && searchResults.length === 0 ? (
                  <div className="p-3 text-center text-slate-500 font-semibold bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                    <span>Searching students...</span>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="max-h-52 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 shadow-md bg-white">
                    {searchResults.map((st) => (
                      <div
                        key={st.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSelectedStudent(st);
                          setSearchResults([]);
                          setSearchQuery("");
                        }}
                        onClick={() => {
                          setSelectedStudent(st);
                          setSearchResults([]);
                          setSearchQuery("");
                        }}
                        className="p-3 hover:bg-blue-50/80 cursor-pointer transition-all flex items-center justify-between border-l-2 border-transparent hover:border-blue-600 group"
                      >
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                            {st.name}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            <span className="font-semibold text-blue-600">
                              {st.academyClass?.name || st.academy_class?.name || "Class"}
                            </span>
                            {st.section?.name && <span> • Sec {st.section.name}</span>}
                            <span> • Roll #{st.roll_number || st.id}</span>
                            {st.father_name && <span> • S/O {st.father_name}</span>}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-100 group-hover:bg-blue-600 group-hover:text-white px-2.5 py-1 rounded-lg transition-colors shrink-0">
                          Select
                        </span>
                      </div>
                    ))}
                  </div>
                ) : !searchingStudents && searchQuery.trim().length >= 2 ? (
                  <div className="p-3 text-center text-slate-500 font-medium bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    No active students found matching &ldquo;{searchQuery}&rdquo;.
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Amount (Rs.) <span className="text-rose-500">*</span>
              </label>
              <CustomNumberInput
                value={amount}
                onChange={(val) => setAmount(val)}
                placeholder="0.00"
                prefix="Rs."
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Payment Date</label>
              <CustomDatePicker
                value={receivedDate}
                onChange={(date) => setReceivedDate(date)}
                placeholder="Select Date"
              />
            </div>
          </div>

          {/* Description / Purpose with chips */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Reason / Purpose <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Science Fair Registration, Annual Trip, Uniform Fee..."
              required
              className="w-full h-[38px] px-3 text-xs font-semibold rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600"
            />
            {/* Quick chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {commonReasons.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setDescription(r)}
                  className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-blue-100 hover:text-blue-800 text-[10px] font-semibold text-slate-600 transition-colors"
                >
                  + {r}
                </button>
              ))}
            </div>
          </div>

          {/* Attribute Staff (if Admin) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Collecting Staff (Optional)
            </label>
            <select
              value={collectorStaffId}
              onChange={(e) => setCollectorStaffId(e.target.value)}
              className="w-full h-[38px] px-3 text-xs font-semibold rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 bg-white"
            >
              <option value="">Logged-in User (Me)</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.designation?.name || "Staff"})
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !selectedStudent || !amount}
              className="px-5 py-2 rounded-xl text-xs font-black text-white bg-[#0f224a] hover:bg-[#1e3a8a] shadow-md shadow-blue-950/20 flex items-center gap-1.5 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Receipt...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-sky-300" />
                  <span>Save Receipt</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
