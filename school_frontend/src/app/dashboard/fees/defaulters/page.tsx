"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import CustomDropdown from "@/components/CustomDropdown";
import { DatePicker } from "@/components/ui/date-picker";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const STORAGE_URL = process.env.NEXT_PUBLIC_STORAGE_URL || "http://localhost:8000/storage";

function getAuthHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };
}

function formatWhatsApp(phone: string) {
  if (!phone) return "#";
  let cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "92" + cleaned.substring(1);
  }
  return `https://wa.me/${cleaned}`;
}

interface DefaulterStudent {
  id: number;
  uuid: string;
  name: string;
  father_name: string;
  roll_number: string;
  contact_number: string;
  emergency_contact: string;
  father_cell: string;
  image: string | null;
  class_id: number;
  class_name: string;
  section_id: number | null;
  section_name: string;
  major_id: number | null;
  major_name: string;
  monthly_fee: number;
  current_month_paid: number;
  current_month_discount: number;
  current_month_net_due: number;
  previous_tuition_arrears: number;
  unpaid_extra_charges: number;
  previous_arrears: number;
  total_payable: number;
  computed_status: "unpaid" | "partial" | "paid";
  is_this_month_unpaid: boolean;
  is_this_month_partial: boolean;
  is_past_arrears_only: boolean;
  is_defaulter: boolean;
  months_overdue: number;
  is_critical: boolean;
  last_payment_date: string | null;
  last_payment_amount: number;
  latest_follow_up?: {
    id: number;
    promise_date: string;
    next_promise_date?: string;
    comments?: string;
    created_at: string;
  } | null;
}

interface ClassSummary {
  class_id: number;
  class_name: string;
  total_enrolled: number;
  defaulters_count: number;
  paid_count: number;
  recovery_rate: number;
  defaulter_rate: number;
  total_monthly_expected: number;
  total_collected_month: number;
  total_pending_amount: number;
  current_month_pending: number;
  previous_arrears_pending: number;
  students: DefaulterStudent[];
}

interface DefaultersResponse {
  month: string;
  month_label: string;
  defaulter_type: string;
  summary: {
    total_enrolled: number;
    total_defaulters: number;
    total_paid_students: number;
    overall_recovery_rate: number;
    overall_defaulter_rate: number;
    total_expected_revenue: number;
    total_collected_month: number;
    total_outstanding_amount: number;
    current_month_outstanding: number;
    previous_arrears_outstanding: number;
  };
  classes: ClassSummary[];
  defaulters_flat: DefaulterStudent[];
}

interface AcademyClass {
  id: number;
  name: string;
  sections?: { id: number; name: string }[];
}

// ─── Fee Collection Modal ──────────────────────────────────────────────────
function FeeCollectionModal({ 
  student, 
  monthStr, 
  onClose, 
  onSuccess 
}: { 
  student: DefaulterStudent; 
  monthStr: string; 
  onClose: () => void; 
  onSuccess: () => void; 
}) {
  const [amount, setAmount] = useState<string>(student.total_payable ? student.total_payable.toString() : student.monthly_fee.toString());
  const [paymentDate, setPaymentDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [isAdjustment, setIsAdjustment] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const handleSave = async () => {
    if (!amount || !paymentDate) {
      setError("Please fill all required fields.");
      return;
    }
    setSaving(true);
    setError("");

    try {
      let discount = 0;
      const paidAmount = parseFloat(amount);
      if (isAdjustment && student.total_payable > paidAmount) {
        discount = student.total_payable - paidAmount;
      }

      const res = await fetch(`${API}/fees`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          student_id: student.id,
          month: monthStr,
          amount_paid: amount,
          discount_amount: discount,
          payment_date: paymentDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to record payment");

      onSuccess();
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl shadow-2xl z-10 flex flex-col bg-white border border-blue-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white">
          <div>
            <h3 className="text-lg font-bold">Collect Fee</h3>
            <p className="text-xs text-blue-200">{student.name} • {student.class_name} • {monthStr}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && <div className="p-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">{error}</div>}

          {/* Quick Breakdown */}
          <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3.5 space-y-1.5 text-xs text-gray-700">
            <div className="flex justify-between">
              <span className="text-gray-500">Monthly Tuition Fee:</span>
              <span className="font-bold text-gray-900">Rs {student.monthly_fee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Current Month Due:</span>
              <span className="font-bold text-amber-700">Rs {student.current_month_net_due.toLocaleString()}</span>
            </div>
            {student.previous_arrears > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Previous Arrears:</span>
                <span className="font-bold text-red-600">Rs {student.previous_arrears.toLocaleString()}</span>
              </div>
            )}
            <div className="pt-2 border-t border-blue-200 flex justify-between text-sm">
              <span className="font-bold text-blue-900">Total Pending:</span>
              <span className="font-black text-blue-900">Rs {student.total_payable.toLocaleString()}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Amount to Collect (PKR)</label>
            <input 
              type="number" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)} 
              placeholder="Enter amount"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-base font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Payment Date</label>
            <input 
              type="date" 
              value={paymentDate} 
              onChange={(e) => setPaymentDate(e.target.value)} 
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input 
              type="checkbox" 
              checked={isAdjustment} 
              onChange={(e) => setIsAdjustment(e.target.checked)} 
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" 
            />
            <span className="text-xs text-gray-600 font-medium">Auto-apply remainder as waiver/discount if paying less</span>
          </label>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={handleSave} 
            disabled={saving}
            className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-md disabled:opacity-50"
          >
            {saving ? "Saving..." : "Confirm Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Fee Follow Up Modal ───────────────────────────────────────────────────────
function FeeFollowUpModal({ 
  student, 
  onClose, 
  onSuccess 
}: { 
  student: DefaulterStudent; 
  onClose: () => void; 
  onSuccess: () => void; 
}) {
  const [promiseDate, setPromiseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [comments, setComments] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!promiseDate) {
      setError("Please select a promise date.");
      return;
    }
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`${API}/fee-follow-ups`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          student_id: student.id,
          promise_date: promiseDate,
          comments,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save follow up");

      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to save follow up");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl shadow-2xl z-10 flex flex-col bg-white border" style={{ borderColor: '#bfdbfe' }}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: '#dbeafe' }}>
          <div>
            <h3 className="text-lg font-bold" style={{ color: '#0f224a' }}>
              Add Follow Up
            </h3>
            <p className="text-xs mt-0.5" style={{ color: '#38bdf8' }}>{student.name} • {student.class_name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {error && <div className="p-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">{error}</div>}
          
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: '#1e3a8a' }}>Promise Date</label>
            <DatePicker value={promiseDate} onChange={setPromiseDate} />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: '#1e3a8a' }}>Comments</label>
            <textarea 
              rows={3} 
              value={comments} 
              onChange={e => setComments(e.target.value)} 
              placeholder="e.g. Promised to pay next week" 
              className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none" 
              style={{ borderColor: '#bfdbfe' }} 
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-end gap-3" style={{ borderColor: '#dbeafe' }}>
          <button 
            type="button" 
            onClick={onClose} 
            className="px-5 py-2.5 rounded-lg text-sm font-medium border transition" 
            style={{ borderColor: '#bfdbfe', color: '#1e40af', background: '#f0f4f8' }}
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={handleSave} 
            disabled={saving} 
            className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition active:scale-95 disabled:opacity-50" 
            style={{ background: 'linear-gradient(135deg, #2563eb, #1e3a8a)' }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Class-wise Fee Defaulters Page ──────────────────────────────────
export default function FeeDefaultersPage() {
  const router = useRouter();

  const [monthStr, setMonthStr] = useState<string>(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${d.getFullYear()}-${mm}`;
  });

  const [filterClassId, setFilterClassId] = useState<number | "">("");
  const [filterSectionId, setFilterSectionId] = useState<number | "">("");
  const [defaulterType, setDefaulterType] = useState<string>("this_month_unpaid"); // this_month_unpaid, this_month_partial, all_defaulters, critical, arrears_only
  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  const [classes, setClasses] = useState<AcademyClass[]>([]);
  const [sections, setSections] = useState<{ id: number; name: string }[]>([]);

  const [data, setData] = useState<DefaultersResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const [expandedClassIds, setExpandedClassIds] = useState<number[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<"class_wise" | "flat_table">("class_wise");

  const [collectTarget, setCollectTarget] = useState<DefaulterStudent | null>(null);
  const [followUpTarget, setFollowUpTarget] = useState<DefaulterStudent | null>(null);

  const [sendingWhatsAppId, setSendingWhatsAppId] = useState<number | null>(null);
  const [isSendingBulkWhhatsApp, setIsSendingBulkWhhatsApp] = useState<boolean>(false);
  const [isSendingBulkEmail, setIsSendingBulkEmail] = useState<boolean>(false);
  const [downloadingPdf, setDownloadingPdf] = useState<number | "all" | null>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // Load Classes and Sections
  useEffect(() => {
    async function loadMeta() {
      try {
        const [resCls, resSec] = await Promise.all([
          fetch(`${API}/classes`, { headers: getAuthHeaders() }),
          fetch(`${API}/sections`, { headers: getAuthHeaders() }),
        ]);
        const dataCls = await resCls.json();
        const dataSec = await resSec.json();
        setClasses(Array.isArray(dataCls) ? dataCls : []);
        setSections(Array.isArray(dataSec) ? dataSec : []);
      } catch {
        // ignore
      }
    }
    loadMeta();
  }, []);

  // Fetch Defaulters Data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        month: monthStr,
        defaulter_type: defaulterType,
      });

      if (filterClassId) params.append("class_id", filterClassId.toString());
      if (filterSectionId) params.append("section_id", filterSectionId.toString());
      if (debouncedSearch) params.append("search", debouncedSearch);

      const res = await fetch(`${API}/fees/defaulters?${params.toString()}`, {
        headers: getAuthHeaders(),
      });

      const resJson = await res.json();
      if (res.ok) {
        setData(resJson);
        // By default expand classes that have defaulters
        if (resJson.classes && Array.isArray(resJson.classes)) {
          const classIdsWithDefaulters = resJson.classes
            .filter((c: ClassSummary) => c.defaulters_count > 0)
            .map((c: ClassSummary) => c.class_id);
          setExpandedClassIds(classIdsWithDefaulters);
        }
      }
    } catch (e) {
      console.error("Failed to load defaulters", e);
    } finally {
      setLoading(false);
    }
  }, [monthStr, defaulterType, filterClassId, filterSectionId, debouncedSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Toggle class accordion
  const toggleClassAccordion = (classId: number) => {
    setExpandedClassIds((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
    );
  };

  const expandAllClasses = () => {
    if (data?.classes) {
      setExpandedClassIds(data.classes.map((c) => c.class_id));
    }
  };

  const collapseAllClasses = () => {
    setExpandedClassIds([]);
  };

  // Selection handlers
  const handleSelectAllInClass = (students: DefaulterStudent[]) => {
    const studentIds = students.map((s) => s.id);
    const allSelected = studentIds.every((id) => selectedStudentIds.includes(id));

    if (allSelected) {
      setSelectedStudentIds((prev) => prev.filter((id) => !studentIds.includes(id)));
    } else {
      setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...studentIds])));
    }
  };

  const handleSelectAllGlobal = () => {
    if (!data?.defaulters_flat) return;
    const allIds = data.defaulters_flat.map((s) => s.id);
    if (selectedStudentIds.length === allIds.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(allIds);
    }
  };

  // WhatsApp Single Reminder
  const handleSendSingleWhatsAppReminder = async (student: DefaulterStudent) => {
    setSendingWhatsAppId(student.id);
    try {
      const res = await fetch(`${API}/fees/whatsapp-reminder/${student.id}`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.message || "Failed to send WhatsApp reminder");
      alert(`✅ ${resData.message}`);
    } catch (err: any) {
      alert(`❌ Error: ${err.message}`);
    } finally {
      setSendingWhatsAppId(null);
    }
  };

  // Bulk WhatsApp Reminders
  const handleBulkWhatsAppReminders = async (idsToQueue?: number[], contextLabel?: string) => {
    const targetIds = idsToQueue || selectedStudentIds;
    if (targetIds.length === 0) {
      alert("Please select at least one student.");
      return;
    }

    const label = contextLabel || `${targetIds.length} student(s)`;
    if (!confirm(`Send official WhatsApp fee reminders to ${label}?`)) return;

    setIsSendingBulkWhhatsApp(true);
    try {
      const res = await fetch(`${API}/fees/whatsapp-reminder-bulk`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ student_ids: targetIds, month: monthStr }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.message || "Failed to queue reminders");
      alert(`✅ ${resData.message} (${resData.total_students} queued)`);
      if (!idsToQueue) setSelectedStudentIds([]);
    } catch (err: any) {
      alert(`❌ Error: ${err.message}`);
    } finally {
      setIsSendingBulkWhhatsApp(false);
    }
  };

  // Bulk Email Ledgers
  const handleBulkEmailLedgers = async () => {
    if (selectedStudentIds.length === 0) return;
    setIsSendingBulkEmail(true);
    try {
      const res = await fetch(`${API}/fees/ledger/bulk-email`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ student_ids: selectedStudentIds }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.message || "Failed to dispatch ledger emails");
      alert(`✅ ${resData.message} (${resData.dispatched_count} emails queued)`);
      setSelectedStudentIds([]);
    } catch (err: any) {
      alert(`❌ Error: ${err.message}`);
    } finally {
      setIsSendingBulkEmail(false);
    }
  };

  // Download Official Class-Wise PDF Report
  const handleDownloadPdf = async (classId?: number, className?: string) => {
    try {
      setDownloadingPdf(classId ?? "all");
      const params = new URLSearchParams({
        month: monthStr,
        defaulter_type: defaulterType,
      });

      if (classId) {
        params.append("class_id", classId.toString());
      } else if (filterClassId) {
        params.append("class_id", filterClassId.toString());
      }

      if (filterSectionId) {
        params.append("section_id", filterSectionId.toString());
      }

      if (debouncedSearch.trim()) {
        params.append("search", debouncedSearch.trim());
      }

      const res = await fetch(`${API}/fees/defaulters/pdf?${params.toString()}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.message || "Failed to download PDF report");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const targetLabel = className 
        ? `Class_${className.replace(/[^a-zA-Z0-9]/g, "_")}` 
        : filterClassId && classes.find(c => c.id === filterClassId)
        ? `Class_${classes.find(c => c.id === filterClassId)?.name.replace(/[^a-zA-Z0-9]/g, "_")}`
        : "Class_Wise";
      a.download = `Fee_Defaulters_${targetLabel}_${monthStr}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(`❌ PDF Download Error: ${err.message}`);
    } finally {
      setDownloadingPdf(null);
    }
  };

  // CSV Export
  const exportToCSV = () => {
    if (!data || !data.defaulters_flat || data.defaulters_flat.length === 0) {
      alert("No data available to export.");
      return;
    }

    const headers = [
      "Roll No",
      "Student Name",
      "Father Name",
      "Class",
      "Section",
      "Contact Number",
      "Monthly Fee",
      "Paid This Month",
      "Current Month Due",
      "Previous Arrears",
      "Total Due (PKR)",
      "Status",
      "Months Overdue",
      "Latest Follow Up Promise"
    ];

    const rows = data.defaulters_flat.map((s) => [
      `"${s.roll_number}"`,
      `"${s.name}"`,
      `"${s.father_name || ""}"`,
      `"${s.class_name}"`,
      `"${s.section_name || ""}"`,
      `"${s.contact_number || ""}"`,
      s.monthly_fee,
      s.current_month_paid,
      s.current_month_net_due,
      s.previous_arrears,
      s.total_payable,
      `"${s.computed_status.toUpperCase()}"`,
      s.months_overdue,
      `"${s.latest_follow_up?.promise_date || ""}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Fee_Defaulters_${monthStr}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Native Print
  const handlePrint = () => {
    window.print();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        
        {/* Printable Header (visible on print only) */}
        <div className="hidden print:block mb-6 border-b-2 border-gray-900 pb-4 text-center">
          <h1 className="text-2xl font-black uppercase tracking-wider text-gray-900">KIPS SCHOOL CHUNIAN CAMPUS</h1>
          <p className="text-sm font-bold text-gray-700 mt-1">CLASS-WISE FEE DEFAULTERS REPORT — {data?.month_label || monthStr}</p>
          <div className="flex justify-between items-center text-xs text-gray-600 mt-3 pt-2 border-t border-gray-300">
            <span>Generated on: {new Date().toLocaleString()}</span>
            <span>Total Defaulters: {data?.summary?.total_defaulters || 0}</span>
            <span>Total Outstanding: Rs {data?.summary?.total_outstanding_amount?.toLocaleString()}</span>
          </div>
        </div>

        {/* Top Header & Navigation */}
        <div className="print:hidden flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-50 text-red-600 border border-red-100 shadow-sm">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900">
                  Class-Wise Fee Defaulters
                </h1>
                <p className="text-xs lg:text-sm font-medium text-slate-500 mt-0.5">
                  Track students who haven&apos;t paid fee this month, past arrears, and send bulk reminders.
                </p>
              </div>
            </div>
          </div>

          {/* Top Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => router.push("/dashboard/fees")}
              className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm transition flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Fee Collection
            </button>
            <button
              onClick={() => router.push("/dashboard/fee-follow-ups")}
              className="px-3.5 py-2 rounded-xl text-xs font-bold border border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-amber-800 shadow-sm transition flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Follow-Ups
            </button>
            <button
              onClick={() => handleDownloadPdf()}
              disabled={downloadingPdf !== null}
              title="Download official PDF report for all classes or currently filtered class"
              className="px-3.5 py-2 rounded-xl text-xs font-bold border border-rose-200 bg-rose-50/90 hover:bg-rose-100 text-rose-800 shadow-sm transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {downloadingPdf === "all" ? (
                <svg className="animate-spin w-4 h-4 text-rose-700" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              ) : (
                <svg className="w-4 h-4 text-rose-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              )}
              <span>Download PDF</span>
            </button>
            <button
              onClick={exportToCSV}
              className="px-3.5 py-2 rounded-xl text-xs font-bold border border-emerald-200 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 shadow-sm transition flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Export CSV
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-black text-white shadow-sm transition flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              Print Report
            </button>
          </div>
        </div>

        {/* KPI Executive Summary Cards */}
        {data?.summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
            {/* Total Defaulters */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-red-500/10 via-red-50 to-white border border-red-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-red-700">Total Defaulters</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-red-100 text-red-800">
                  {data.summary.overall_defaulter_rate}% of students
                </span>
              </div>
              <div className="mt-3">
                <p className="text-3xl font-black text-red-950">
                  {data.summary.total_defaulters}
                  <span className="text-xs font-bold text-red-600 ml-1.5">/ {data.summary.total_enrolled} enrolled</span>
                </p>
                <p className="text-xs text-red-700 font-medium mt-1">
                  {data.summary.total_paid_students} students fully cleared
                </p>
              </div>
            </div>

            {/* Total Pending / Due */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-50 to-white border border-amber-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Total Outstanding</span>
                <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-xs">
                  Rs
                </div>
              </div>
              <div className="mt-3">
                <p className="text-3xl font-black text-amber-950">
                  Rs {data.summary.total_outstanding_amount.toLocaleString()}
                </p>
                <div className="flex items-center justify-between text-[11px] text-amber-800/90 font-medium mt-1">
                  <span>This Month: Rs {data.summary.current_month_outstanding.toLocaleString()}</span>
                  <span>Arrears: Rs {data.summary.previous_arrears_outstanding.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Total Month Collection */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-50 to-white border border-emerald-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Collected ({monthStr})</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                  {data.summary.overall_recovery_rate}% Recovery
                </span>
              </div>
              <div className="mt-3">
                <p className="text-3xl font-black text-emerald-950">
                  Rs {data.summary.total_collected_month.toLocaleString()}
                </p>
                <p className="text-xs text-emerald-700 font-medium mt-1">
                  Target: Rs {data.summary.total_expected_revenue.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Classes with Defaulters */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-500/10 via-blue-50 to-white border border-blue-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-800">Active Classes</span>
                <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h4" /></svg>
                </div>
              </div>
              <div className="mt-3">
                <p className="text-3xl font-black text-blue-950">
                  {data.classes.filter(c => c.defaulters_count > 0).length}
                  <span className="text-xs font-bold text-blue-600 ml-1.5">/ {data.classes.length} classes</span>
                </p>
                <p className="text-xs text-blue-700 font-medium mt-1">
                  {data.classes.filter(c => c.defaulters_count === 0 && c.total_enrolled > 0).length} classes 100% cleared!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filter Bar & Defaulter Criteria Tabs */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-4 print:hidden">
          
          {/* Top Row: Criteria Scope Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 mr-1">Filter by:</span>
              <button
                onClick={() => setDefaulterType("this_month_unpaid")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition flex items-center gap-1.5 ${
                  defaulterType === "this_month_unpaid"
                    ? "bg-red-600 text-white shadow"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-red-400" />
                Unpaid This Month (0 Paid)
              </button>

              <button
                onClick={() => setDefaulterType("this_month_partial")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition flex items-center gap-1.5 ${
                  defaulterType === "this_month_partial"
                    ? "bg-amber-600 text-white shadow"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Partial Paid This Month
              </button>

              <button
                onClick={() => setDefaulterType("all_defaulters")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition flex items-center gap-1.5 ${
                  defaulterType === "all_defaulters"
                    ? "bg-blue-600 text-white shadow"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                All Defaulters (Total Balance &gt; 0)
              </button>

              <button
                onClick={() => setDefaulterType("critical")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition flex items-center gap-1.5 ${
                  defaulterType === "critical"
                    ? "bg-purple-600 text-white shadow"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                Critical (2+ Months Overdue)
              </button>

              <button
                onClick={() => setDefaulterType("arrears_only")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition flex items-center gap-1.5 ${
                  defaulterType === "arrears_only"
                    ? "bg-slate-800 text-white shadow"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Past Arrears Only
              </button>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode("class_wise")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                  viewMode === "class_wise"
                    ? "bg-white text-blue-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                Class-Wise View
              </button>
              <button
                onClick={() => setViewMode("flat_table")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                  viewMode === "flat_table"
                    ? "bg-white text-blue-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                Consolidated Table
              </button>
            </div>
          </div>

          {/* Bottom Row: Month, Class, Section, Search */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Month Picker */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Target Billing Month</label>
              <input
                type="month"
                value={monthStr}
                onChange={(e) => setMonthStr(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Class Filter */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Class</label>
              <CustomDropdown
                name="class_id"
                value={filterClassId}
                onChange={(_, val) => {
                  setFilterClassId(val ? Number(val) : "");
                  setFilterSectionId("");
                }}
                className="w-full"
                options={[{ label: "All Classes", value: "" }, ...classes.map((c) => ({ label: c.name, value: c.id }))]}
              />
            </div>

            {/* Section Filter */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Section</label>
              {(() => {
                const availableSections = filterClassId
                  ? classes.find((c) => c.id === filterClassId)?.sections || []
                  : sections;

                return (
                  <CustomDropdown
                    name="section_id"
                    value={filterSectionId}
                    onChange={(_, val) => setFilterSectionId(val ? Number(val) : "")}
                    className="w-full"
                    options={[{ label: "All Sections", value: "" }, ...availableSections.map((s) => ({ label: s.name, value: s.id }))]}
                  />
                );
              })()}
            </div>

            {/* Search */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Search Student</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Name, Roll #, Father, Phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <svg className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Action Sticky Bar when students are selected */}
        {selectedStudentIds.length > 0 && (
          <div className="sticky top-20 z-20 flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900 text-white shadow-xl border border-slate-800 print:hidden animate-in fade-in">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center font-black text-xs">
                {selectedStudentIds.length}
              </span>
              <span className="text-sm font-bold">Students Selected</span>
              <button
                onClick={() => setSelectedStudentIds([])}
                className="text-xs text-slate-400 hover:text-white underline"
              >
                Clear Selection
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleBulkWhatsAppReminders()}
                disabled={isSendingBulkWhhatsApp}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow flex items-center gap-1.5 disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
                {isSendingBulkWhhatsApp ? "Queuing WhatsApp..." : `Send WhatsApp Reminders (${selectedStudentIds.length})`}
              </button>

              <button
                onClick={handleBulkEmailLedgers}
                disabled={isSendingBulkEmail}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow flex items-center gap-1.5 disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                {isSendingBulkEmail ? "Sending..." : "Send Ledger Emails"}
              </button>
            </div>
          </div>
        )}

        {/* Global Expand / Collapse & Count status */}
        {viewMode === "class_wise" && data?.classes && data.classes.length > 0 && (
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-1 print:hidden">
            <span>
              Showing {data.summary.total_defaulters} defaulter student(s) across {data.classes.length} class(es)
            </span>
            <div className="flex items-center gap-3">
              <button onClick={expandAllClasses} className="hover:text-blue-600 font-bold">
                Expand All
              </button>
              <span>•</span>
              <button onClick={collapseAllClasses} className="hover:text-blue-600 font-bold">
                Collapse All
              </button>
            </div>
          </div>
        )}

        {/* Content Area */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-slate-200 shadow-sm gap-3">
            <svg className="animate-spin w-9 h-9 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm font-semibold text-slate-600">Calculating class-wise defaulters...</p>
          </div>
        ) : !data || (data.defaulters_flat.length === 0 && data.classes.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm gap-3 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900">No Fee Defaulters Found!</h3>
            <p className="text-xs text-slate-500 max-w-md">
              All students have cleared their fees for {monthStr} according to the selected filter criteria.
            </p>
          </div>
        ) : viewMode === "class_wise" ? (
          
          /* ─── CLASS-WISE ACCORDION VIEW ─── */
          <div className="space-y-4">
            {data.classes.map((cls) => {
              const isExpanded = expandedClassIds.includes(cls.class_id);
              const classStudentIds = cls.students.map((s) => s.id);
              const allClassSelected = classStudentIds.length > 0 && classStudentIds.every((id) => selectedStudentIds.includes(id));
              const someClassSelected = classStudentIds.some((id) => selectedStudentIds.includes(id));

              return (
                <div 
                  key={cls.class_id} 
                  className={`bg-white rounded-2xl border transition-all shadow-sm overflow-hidden ${
                    cls.defaulters_count > 0 ? "border-slate-200" : "border-slate-100 opacity-80"
                  }`}
                >
                  {/* Class Header Card */}
                  <div 
                    className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/70 transition"
                    onClick={() => toggleClassAccordion(cls.class_id)}
                  >
                    {/* Left side: Class Name, Badges, Defaulters Count */}
                    <div className="flex items-center gap-3.5">
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectAllInClass(cls.students);
                        }}
                        className="print:hidden p-1"
                      >
                        <input
                          type="checkbox"
                          checked={allClassSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = someClassSelected && !allClassSelected;
                          }}
                          onChange={() => handleSelectAllInClass(cls.students)}
                          disabled={cls.students.length === 0}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                        />
                      </div>

                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                        cls.defaulters_count > 0 ? "bg-red-50 text-red-700 border border-red-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}>
                        {cls.class_name.substring(0, 3).toUpperCase()}
                      </div>

                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h2 className="text-lg font-black text-slate-900">{cls.class_name}</h2>
                          {cls.defaulters_count > 0 ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-red-100 text-red-800">
                              {cls.defaulters_count} Defaulter{cls.defaulters_count > 1 ? "s" : ""} ({cls.defaulter_rate}%)
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                              100% Paid Cleared
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {cls.total_enrolled} enrolled • {cls.paid_count} paid
                        </p>
                      </div>
                    </div>

                    {/* Right side: Financials & Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between md:justify-end gap-4">
                      {/* Financial amounts */}
                      <div className="text-left md:text-right">
                        <div className="flex items-baseline md:justify-end gap-1.5">
                          <span className="text-xs text-slate-500 font-semibold">Total Pending:</span>
                          <span className={`text-base font-black ${cls.total_pending_amount > 0 ? "text-red-600" : "text-emerald-700"}`}>
                            Rs {cls.total_pending_amount.toLocaleString()}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium">
                          Collected: Rs {cls.total_collected_month.toLocaleString()} ({cls.recovery_rate}%)
                        </p>
                      </div>

                      {/* Class Level Actions */}
                      <div className="flex items-center gap-2 print:hidden" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleDownloadPdf(cls.class_id, cls.class_name)}
                          disabled={downloadingPdf !== null}
                          title={`Download official PDF defaulters statement for ${cls.class_name}`}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                        >
                          {downloadingPdf === cls.class_id ? (
                            <svg className="animate-spin w-3.5 h-3.5 text-rose-700" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                          ) : (
                            <svg className="w-3.5 h-3.5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          )}
                          <span>Class PDF</span>
                        </button>

                        {cls.defaulters_count > 0 && (
                          <button
                            onClick={() => handleBulkWhatsAppReminders(classStudentIds, `all ${cls.defaulters_count} defaulters of ${cls.class_name}`)}
                            title="Send WhatsApp fee reminder to all defaulters in this class"
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition flex items-center gap-1 shadow-sm"
                          >
                            <svg className="w-3.5 h-3.5 text-emerald-600" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.815 11.815 0 018.413 3.48A11.821 11.821 0 0124 11.893c-.003 6.558-5.338 11.893-11.893 11.893h-.005a11.882 11.882 0 01-5.683-1.448L0 24l.057-.001zm6.547-3.719l.361.214a9.87 9.87 0 005.031 1.378h.004c5.448 0 9.882-4.434 9.885-9.884a9.825 9.825 0 00-2.893-6.994 9.825 9.825 0 00-6.988-2.898c-5.452 0-9.887 4.434-9.888 9.884 0 1.848.514 3.655 1.51 5.26l.235.374-.998 3.648 3.741-.982z"/></svg>
                            WhatsApp Class
                          </button>
                        )}

                        <button
                          onClick={() => toggleClassAccordion(cls.class_id)}
                          className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition"
                        >
                          <svg className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Student Defaulters Table */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/40 p-3 sm:p-4">
                      {cls.students.length === 0 ? (
                        <div className="py-6 text-center text-xs font-semibold text-emerald-700 bg-emerald-50/60 rounded-xl border border-emerald-100">
                          🎉 Excellent! No fee defaulters in {cls.class_name}.
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                              <tr>
                                <th className="p-3 w-10 text-center print:hidden">
                                  <input
                                    type="checkbox"
                                    checked={allClassSelected}
                                    onChange={() => handleSelectAllInClass(cls.students)}
                                    className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                                  />
                                </th>
                                <th className="p-3">Student Details</th>
                                <th className="p-3">Contact</th>
                                <th className="p-3">Section / Stream</th>
                                <th className="p-3 text-right">Monthly Fee</th>
                                <th className="p-3 text-right">Paid ({monthStr})</th>
                                <th className="p-3 text-right">Month Due</th>
                                <th className="p-3 text-right">Prev Arrears</th>
                                <th className="p-3 text-right font-black text-red-700">Total Pending</th>
                                <th className="p-3">Status</th>
                                <th className="p-3 text-right print:hidden">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {cls.students.map((student) => {
                                const isSelected = selectedStudentIds.includes(student.id);

                                return (
                                  <tr key={student.id} className={`hover:bg-blue-50/40 transition ${isSelected ? "bg-blue-50/70" : ""}`}>
                                    {/* Checkbox */}
                                    <td className="p-3 text-center print:hidden">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setSelectedStudentIds((prev) => [...prev, student.id]);
                                          } else {
                                            setSelectedStudentIds((prev) => prev.filter((id) => id !== student.id));
                                          }
                                        }}
                                        className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                                      />
                                    </td>

                                    {/* Student Name & Roll No */}
                                    <td className="p-3">
                                      <div className="flex items-center gap-2.5">
                                        <img
                                          src={student.image ? `${STORAGE_URL}/${student.image}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=f1f5f9&color=334155`}
                                          alt=""
                                          className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                                        />
                                        <div>
                                          <p className="font-extrabold text-slate-900 text-sm">
                                            {student.name}{" "}
                                            <span className="text-[10px] font-normal text-slate-400">#{student.roll_number}</span>
                                          </p>
                                          <p className="text-[11px] text-slate-500">S/D/O {student.father_name || "—"}</p>
                                          {student.latest_follow_up && (
                                            <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[9px] font-bold">
                                              Promise: {student.latest_follow_up.promise_date}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </td>

                                    {/* Contact Phone & Direct WhatsApp */}
                                    <td className="p-3">
                                      <span className="text-slate-700 font-semibold block">{student.contact_number || "—"}</span>
                                      {student.contact_number && (
                                        <div className="flex items-center gap-1.5 mt-1 print:hidden">
                                          <a
                                            href={`tel:${student.contact_number}`}
                                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                                            title="Call Parent"
                                          >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                          </a>
                                          <a
                                            href={formatWhatsApp(student.contact_number)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition"
                                            title="Direct WhatsApp Chat"
                                          >
                                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                          </a>
                                        </div>
                                      )}
                                    </td>

                                    {/* Section / Major */}
                                    <td className="p-3">
                                      <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-800">
                                        {student.section_name || "A"}
                                      </span>
                                      {student.major_name && (
                                        <span className="block text-[10px] text-slate-500 mt-0.5">{student.major_name}</span>
                                      )}
                                    </td>

                                    {/* Monthly Fee */}
                                    <td className="p-3 text-right font-semibold text-slate-800">
                                      Rs {student.monthly_fee.toLocaleString()}
                                    </td>

                                    {/* Paid this month */}
                                    <td className="p-3 text-right font-semibold text-emerald-700">
                                      {student.current_month_paid > 0 ? `Rs ${student.current_month_paid.toLocaleString()}` : "—"}
                                    </td>

                                    {/* Month Due */}
                                    <td className="p-3 text-right font-bold text-amber-700">
                                      Rs {student.current_month_net_due.toLocaleString()}
                                    </td>

                                    {/* Prev Arrears */}
                                    <td className="p-3 text-right font-medium text-slate-600">
                                      {student.previous_arrears > 0 ? `Rs ${student.previous_arrears.toLocaleString()}` : "0"}
                                    </td>

                                    {/* Total Payable */}
                                    <td className="p-3 text-right font-black text-red-600 text-sm">
                                      Rs {student.total_payable.toLocaleString()}
                                    </td>

                                    {/* Status Badge */}
                                    <td className="p-3">
                                      {student.is_this_month_unpaid ? (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-800 inline-block">
                                          Unpaid This Month
                                        </span>
                                      ) : student.is_this_month_partial ? (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 inline-block">
                                          Partial Paid
                                        </span>
                                      ) : student.is_past_arrears_only ? (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 inline-block">
                                          Past Arrears Only
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 inline-block">
                                          Paid
                                        </span>
                                      )}
                                      {student.months_overdue >= 2 && (
                                        <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-800">
                                          {student.months_overdue}m Overdue
                                        </span>
                                      )}
                                    </td>

                                    {/* Student Action Buttons */}
                                    <td className="p-3 text-right print:hidden">
                                      <div className="flex items-center justify-end gap-1.5">
                                        {/* Follow Up Button */}
                                        <button
                                          onClick={() => setFollowUpTarget(student)}
                                          className="py-1 px-2.5 rounded-lg text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition active:scale-95 shadow-sm flex items-center gap-1.5"
                                          title="Add Follow Up"
                                        >
                                          <svg className="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                          </svg>
                                          <span>Follow up</span>
                                        </button>

                                        {/* Collect Fee Button */}
                                        <button
                                          onClick={() => setCollectTarget(student)}
                                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm active:scale-95"
                                          title="Collect Fee"
                                        >
                                          Collect
                                        </button>

                                        {/* WhatsApp Direct Reminder */}
                                        <button
                                          onClick={() => handleSendSingleWhatsAppReminder(student)}
                                          disabled={sendingWhatsAppId === student.id}
                                          className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition active:scale-95"
                                          title="Send WhatsApp Fee Notice"
                                        >
                                          {sendingWhatsAppId === student.id ? (
                                            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                          ) : (
                                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                          )}
                                        </button>

                                        {/* Ledger */}
                                        <button
                                          onClick={() => router.push(`/dashboard/fees/ledger?student_id=${student.id}`)}
                                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition active:scale-95"
                                          title="View Ledger Statement"
                                        >
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
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
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          
          /* ─── CONSOLIDATED FLAT TABLE VIEW ─── */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="p-3 w-10 text-center print:hidden">
                      <input
                        type="checkbox"
                        checked={data.defaulters_flat.length > 0 && selectedStudentIds.length === data.defaulters_flat.length}
                        onChange={handleSelectAllGlobal}
                        className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                      />
                    </th>
                    <th className="p-3">Student Details</th>
                    <th className="p-3">Class & Section</th>
                    <th className="p-3">Contact</th>
                    <th className="p-3 text-right">Monthly Fee</th>
                    <th className="p-3 text-right">Paid ({monthStr})</th>
                    <th className="p-3 text-right">Month Due</th>
                    <th className="p-3 text-right">Prev Arrears</th>
                    <th className="p-3 text-right font-black text-red-700">Total Pending</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right print:hidden">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.defaulters_flat.map((student) => {
                    const isSelected = selectedStudentIds.includes(student.id);

                    return (
                      <tr key={student.id} className={`hover:bg-blue-50/40 transition ${isSelected ? "bg-blue-50/70" : ""}`}>
                        <td className="p-3 text-center print:hidden">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStudentIds((prev) => [...prev, student.id]);
                              } else {
                                setSelectedStudentIds((prev) => prev.filter((id) => id !== student.id));
                              }
                            }}
                            className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                          />
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={student.image ? `${STORAGE_URL}/${student.image}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=f1f5f9&color=334155`}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                            <div>
                              <p className="font-extrabold text-slate-900 text-sm">
                                {student.name}{" "}
                                <span className="text-[10px] font-normal text-slate-400">#{student.roll_number}</span>
                              </p>
                              <p className="text-[11px] text-slate-500">S/D/O {student.father_name || "—"}</p>
                              {student.latest_follow_up && (
                                <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[9px] font-bold">
                                  Promise: {student.latest_follow_up.promise_date}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 font-semibold text-slate-800">
                          <span className="font-black text-blue-900">{student.class_name}</span>
                          <span className="block text-[11px] text-slate-500">Section {student.section_name || "A"}</span>
                        </td>
                        <td className="p-3">
                          <span className="text-slate-700 font-semibold block">{student.contact_number || "—"}</span>
                          {student.contact_number && (
                            <div className="flex items-center gap-1.5 mt-1 print:hidden">
                              <a
                                href={`tel:${student.contact_number}`}
                                className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                                title="Call Parent"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                              </a>
                              <a
                                href={formatWhatsApp(student.contact_number)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition"
                                title="Direct WhatsApp Chat"
                              >
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                              </a>
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-right font-semibold text-slate-800">
                          Rs {student.monthly_fee.toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-semibold text-emerald-700">
                          {student.current_month_paid > 0 ? `Rs ${student.current_month_paid.toLocaleString()}` : "—"}
                        </td>
                        <td className="p-3 text-right font-bold text-amber-700">
                          Rs {student.current_month_net_due.toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-medium text-slate-600">
                          {student.previous_arrears > 0 ? `Rs ${student.previous_arrears.toLocaleString()}` : "0"}
                        </td>
                        <td className="p-3 text-right font-black text-red-600 text-sm">
                          Rs {student.total_payable.toLocaleString()}
                        </td>
                        <td className="p-3">
                          {student.is_this_month_unpaid ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-800 inline-block">
                              Unpaid This Month
                            </span>
                          ) : student.is_this_month_partial ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 inline-block">
                              Partial Paid
                            </span>
                          ) : student.is_past_arrears_only ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 inline-block">
                              Past Arrears Only
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 inline-block">
                              Paid
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right print:hidden">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Follow Up Button */}
                            <button
                              onClick={() => setFollowUpTarget(student)}
                              className="py-1 px-2.5 rounded-lg text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition active:scale-95 shadow-sm flex items-center gap-1.5"
                              title="Add Follow Up"
                            >
                              <svg className="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span>Follow up</span>
                            </button>

                            {/* Collect Fee Button */}
                            <button
                              onClick={() => setCollectTarget(student)}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm active:scale-95"
                              title="Collect Fee"
                            >
                              Collect
                            </button>

                            {/* WhatsApp Direct Reminder */}
                            <button
                              onClick={() => handleSendSingleWhatsAppReminder(student)}
                              disabled={sendingWhatsAppId === student.id}
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition active:scale-95"
                              title="Send WhatsApp Fee Notice"
                            >
                              {sendingWhatsAppId === student.id ? (
                                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                              ) : (
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                              )}
                            </button>

                            {/* Ledger */}
                            <button
                              onClick={() => router.push(`/dashboard/fees/ledger?student_id=${student.id}`)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition active:scale-95"
                              title="View Ledger Statement"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Fee Collection Modal */}
        {collectTarget && (
          <FeeCollectionModal
            student={collectTarget}
            monthStr={monthStr}
            onClose={() => setCollectTarget(null)}
            onSuccess={() => {
              setCollectTarget(null);
              fetchData();
            }}
          />
        )}

        {/* Follow-Up Modal */}
        {followUpTarget && (
          <FeeFollowUpModal
            student={followUpTarget}
            onClose={() => setFollowUpTarget(null)}
            onSuccess={() => {
              setFollowUpTarget(null);
              fetchData();
            }}
          />
        )}

      </div>
    </DashboardLayout>
  );
}
