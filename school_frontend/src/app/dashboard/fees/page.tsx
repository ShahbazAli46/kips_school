"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { DatePicker } from "@/components/ui/date-picker";
import CustomDropdown from "@/components/CustomDropdown";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const STORAGE_URL = process.env.NEXT_PUBLIC_STORAGE_URL || "http://localhost:8000/storage";

function getAuthHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };
}

interface AcademyClass { id: number; name: string; sections?: Section[]; }
interface Major { id: number; name: string; }
interface Section { id: number; name: string; }
interface Student {
  id: number;
  roll_number?: number;
  name: string;
  father_name: string;
  contact_number: string;
  class_id: number;
  major_id: number | null;
  section_id: number | null;
  monthly_fee: string | null;
  academy_class?: AcademyClass;
  major?: Major;
  section?: Section;
  image?: string;
}

interface FeePayment {
  id: number;
  student_id: number;
  month: string;
  amount_paid: string;
  payment_date: string;
}

// ─── Fee Collection Modal ──────────────────────────────────────────────────
function FeeCollectionModal({ 
  student,
  monthStr, 
  editingPayment,
  onClose, 
  onSuccess 
}: { 
  student: Student;
  monthStr: string; 
  editingPayment?: FeePayment | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState(editingPayment ? editingPayment.amount_paid : "");
  const [paymentDate, setPaymentDate] = useState(() => editingPayment ? editingPayment.payment_date : new Date().toISOString().split('T')[0]);
  const [isAdjustment, setIsAdjustment] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [voucher, setVoucher] = useState<any>(null);
  const [loadingVoucher, setLoadingVoucher] = useState(false);
  
  // Custom Allocation State
  const [isCustomAllocation, setIsCustomAllocation] = useState(false);
  const [allocations, setAllocations] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!editingPayment) {
      const fetchVoucher = async () => {
        setLoadingVoucher(true);
        try {
          const res = await fetch(`${API}/fees/vouchers?month=${monthStr}&search=${encodeURIComponent(student.contact_number || student.name)}`, {
            headers: getAuthHeaders(),
          });
          const data = await res.json();
          if (data.vouchers) {
            const v = data.vouchers.find((vx: any) => vx.student_id === student.id);
            if (v) {
              setVoucher(v);
              if (!amount) setAmount(v.total_payable?.toString() || "");
            }
          }
        } catch (e) {
          console.error("Failed to fetch voucher", e);
        } finally {
          setLoadingVoucher(false);
        }
      };
      fetchVoucher();
    }
  }, [student.id, monthStr, student.contact_number, student.name, editingPayment]);

  // Effect to automatically calculate total amount when custom allocations change
  useEffect(() => {
    if (isCustomAllocation) {
      const sum = Object.values(allocations).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
      setAmount(sum.toString());
    }
  }, [allocations, isCustomAllocation]);

  const handleAllocationChange = (idx: string, val: string) => {
    setAllocations(prev => ({ ...prev, [idx]: val }));
  };

  const handleSave = async () => {
    if (!amount || !paymentDate) {
      setError("Please fill all fields.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const isEdit = !!editingPayment;
      const url = isEdit ? `${API}/fees/${editingPayment.id}` : `${API}/fees`;
      const method = isEdit ? 'PUT' : 'POST';

      let discount = 0;
      const paidAmount = parseFloat(amount);
      if (isAdjustment && (student as any).arrears !== undefined) {
        const arrears = parseFloat((student as any).arrears);
        if (arrears > paidAmount) {
          discount = arrears - paidAmount;
        }
      }

      const payload: any = {
        student_id: student.id,
        month: monthStr,
        amount_paid: amount,
        discount_amount: discount,
        payment_date: paymentDate
      };

      if (isCustomAllocation && !editingPayment && voucher) {
        const head_allocations: any[] = [];
        Object.entries(allocations).forEach(([idx, val]) => {
          const v = parseFloat(val);
          if (v > 0) {
            const fi = voucher.fee_items[parseInt(idx, 10)];
            if (fi && fi.head_key) {
              head_allocations.push({
                head_key: fi.head_key,
                amount: v
              });
            }
          }
        });
        payload.head_allocations = head_allocations;
      }

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save');
      
      onSuccess();
    } catch (err: any) {
      setError(err.message);
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
              {editingPayment ? "Edit Fee Payment" : "Collect Fee"}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: '#38bdf8' }}>{student.name} • {monthStr}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && <div className="p-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">{error}</div>}
          
          {!editingPayment && (
            <div className="bg-gray-50 border rounded-xl p-4 shadow-inner" style={{ borderColor: '#dbeafe' }}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Voucher Breakdown</h4>
                {voucher && voucher.fee_items && voucher.fee_items.length > 0 && (
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-blue-700">
                    <input 
                      type="checkbox" 
                      checked={isCustomAllocation} 
                      onChange={e => {
                        setIsCustomAllocation(e.target.checked);
                        if (e.target.checked) {
                          // Initialize allocations with exact pending amounts
                          const init: Record<string, string> = {};
                          voucher.fee_items.forEach((fi: any, idx: number) => {
                            if (fi.amount > 0) {
                              init[idx.toString()] = fi.amount.toString();
                            }
                          });
                          setAllocations(init);
                        }
                      }} 
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    Pay Specific Heads
                  </label>
                )}
              </div>

              {loadingVoucher ? (
                <div className="text-center py-4 text-sm text-gray-400">Loading breakdown...</div>
              ) : voucher && voucher.fee_items && voucher.fee_items.length > 0 ? (
                <div className="space-y-2">
                  {voucher.fee_items.map((fi: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 font-medium">{fi.label}</span>
                      {isCustomAllocation && fi.amount > 0 ? (
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400 text-xs">Rs</span>
                          <input 
                            type="number" 
                            min="0"
                            max={fi.amount}
                            className="w-20 px-2 py-1 text-right rounded border outline-none font-mono font-bold"
                            style={{ borderColor: '#bfdbfe' }}
                            value={allocations[idx.toString()] ?? ""}
                            onChange={e => handleAllocationChange(idx.toString(), e.target.value)}
                          />
                        </div>
                      ) : (
                        <span className={`font-mono font-bold ${fi.amount < 0 ? 'text-emerald-600' : 'text-gray-900'}`}>
                          {fi.amount < 0 ? '-' : ''}Rs {Math.abs(fi.amount).toLocaleString()}
                        </span>
                      )}
                    </div>
                  ))}
                  <div className="pt-3 mt-3 border-t border-gray-200 flex justify-between font-black text-blue-700">
                    <span>Total Payable</span>
                    <span className="font-mono">Rs {voucher.total_payable.toLocaleString()}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-sm text-gray-400">No pending breakdown found.</div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: '#1e3a8a' }}>Amount Paid (Rs)</label>
            <input type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)} disabled={isCustomAllocation} placeholder="e.g. 5000" className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none ${isCustomAllocation ? 'bg-gray-100 cursor-not-allowed text-gray-500 font-bold' : ''}`} style={{ borderColor: '#bfdbfe' }} autoFocus={!isCustomAllocation} />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: '#1e3a8a' }}>Payment Date</label>
            <DatePicker value={paymentDate} onChange={setPaymentDate} />
          </div>

          <div className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              id="isAdjustment"
              checked={isAdjustment}
              onChange={(e) => setIsAdjustment(e.target.checked)}
              className="w-4 h-4 rounded text-[#2563eb] focus:ring-[#2563eb] border-gray-300"
              style={{ accentColor: '#2563eb' }}
            />
            <label htmlFor="isAdjustment" className="text-sm font-medium" style={{ color: '#1e3a8a' }}>
              Mark as Full Adjustment / Settlement
            </label>
          </div>
          {isAdjustment && (
            <p className="text-[11px] mt-1 p-2 rounded bg-[#f0f4f8]" style={{ color: '#2563eb', border: '1px solid #bfdbfe' }}>
              Any remaining arrears will be perfectly waived and recorded as a discount, clearing the student's debt completely.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-end gap-3" style={{ borderColor: '#dbeafe' }}>
          <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-sm font-medium border transition" style={{ borderColor: '#bfdbfe', color: '#1e40af', background: '#f0f4f8' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition active:scale-95 disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #2563eb, #1e3a8a)' }}>
            {saving ? 'Saving...' : (editingPayment ? 'Update Payment' : 'Record Payment')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Update Fee Modal ────────────────────────────────────────────────────────
function UpdateFeeModal({
  student,
  onClose,
  onSuccess
}: {
  student: Student;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [monthlyFee, setMonthlyFee] = useState(student.monthly_fee || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!monthlyFee) {
      setError("Please enter a fee amount.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch(`${API}/students/${student.id}/fee`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ monthly_fee: monthlyFee })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update fee');
      
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl shadow-2xl z-10 flex flex-col bg-white border" style={{ borderColor: '#bfdbfe' }}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: '#dbeafe' }}>
          <div>
            <h3 className="text-lg font-bold" style={{ color: '#0f224a' }}>
              Update Monthly Fee
            </h3>
            <p className="text-xs mt-0.5" style={{ color: '#38bdf8' }}>{student.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {error && <div className="p-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">{error}</div>}
          
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: '#1e3a8a' }}>Monthly Fee (Rs)</label>
            <input type="number" min="0" value={monthlyFee} onChange={e => setMonthlyFee(e.target.value)} placeholder="e.g. 5000" className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none" style={{ borderColor: '#bfdbfe' }} autoFocus />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-end gap-3" style={{ borderColor: '#dbeafe' }}>
          <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-sm font-medium border transition" style={{ borderColor: '#bfdbfe', color: '#1e40af', background: '#f0f4f8' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition active:scale-95 disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #2563eb, #1e3a8a)' }}>
            {saving ? 'Saving...' : 'Update'}
          </button>
        </div>
      </div>
    </div>
  );
}


// ─── Fee Follow Up Modal ───────────────────────────────────────────────────────
function FeeFollowUpModal({ student, onClose }: { student: Student; onClose: () => void }) {
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
        body: JSON.stringify({ student_id: student.id, promise_date: promiseDate, comments })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save follow up');
      onClose();
    } catch (err: any) {
      setError(err.message);
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
            <p className="text-xs mt-0.5" style={{ color: '#38bdf8' }}>{student.name}</p>
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
            <textarea rows={3} value={comments} onChange={e => setComments(e.target.value)} placeholder="e.g. Promised to pay next week" className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none" style={{ borderColor: '#bfdbfe' }} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-end gap-3" style={{ borderColor: '#dbeafe' }}>
          <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-sm font-medium border transition" style={{ borderColor: '#bfdbfe', color: '#1e40af', background: '#f0f4f8' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition active:scale-95 disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #2563eb, #1e3a8a)' }}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
const formatWhatsApp = (number: string) => {
  if (!number) return '';
  let formatted = number.replace(/\D/g, '');
  if (formatted.startsWith('0')) {
      formatted = '92' + formatted.substring(1);
  }
  return `https://wa.me/${formatted}`;
};
export default function FeesPage() {
  const router = useRouter();
  const [monthStr, setMonthStr] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<AcademyClass[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterClassId, setFilterClassId] = useState<number | "">("");
  const [filterSectionId, setFilterSectionId] = useState<number | "">("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  const [stats, setStats] = useState({ expected: 0, received: 0, remaining: 0 });

  const [collectTarget, setCollectTarget] = useState<Student | null>(null);
  const [editingPayment, setEditingPayment] = useState<FeePayment | null>(null);
  const [updateFeeTarget, setUpdateFeeTarget] = useState<Student | null>(null);
  const [followUpTarget, setFollowUpTarget] = useState<Student | null>(null);

  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [isSendingBulk, setIsSendingBulk] = useState(false);
  const [sendingWhatsAppId, setSendingWhatsAppId] = useState<number | null>(null);
  const [isSendingBulkWhhatsApp, setIsSendingBulkWhhatsApp] = useState(false);

  const [confirmReceiveTarget, setConfirmReceiveTarget] = useState<{student: any, amount: number} | null>(null);
  const [isReceivingFull, setIsReceivingFull] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.fee-actions-dropdown-container')) {
        setOpenDropdownId(null);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1); // Reset to page 1 on new search
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedStudentIds([]);
    setOpenDropdownId(null);
  }, [filterClassId, filterSectionId, filterStatus, monthStr, search]);

  // Fetch static classes and sections once on mount
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: currentPage.toString(),
        search: debouncedSearch,
        class_id: filterClassId.toString(),
        section_id: filterSectionId.toString(),
        status: filterStatus,
        month: monthStr
      }).toString();

      const resBalances = await fetch(`${API}/fees/balances?${query}`, { headers: getAuthHeaders() });
      const balancesData = await resBalances.json();
      if (balancesData && balancesData.data) {
        setStudents(balancesData.data);
        setLastPage(balancesData.last_page);
        setTotalStudents(balancesData.total);
        if (balancesData.stats) {
          setStats(balancesData.stats);
        }
      } else {
        setStudents(Array.isArray(balancesData) ? balancesData : []);
        setLastPage(1);
        setTotalStudents(0);
        setStats({ expected: 0, received: 0, remaining: 0 });
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [monthStr, currentPage, debouncedSearch, filterClassId, filterSectionId, filterStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const handleDeleteFee = (id: number) => {
    setDeleteTargetId(id);
  };

  const executeDeleteFee = async () => {
    if (!deleteTargetId) return;
    try {
      const res = await fetch(`${API}/fees/${deleteTargetId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed to delete payment');
      fetchData(); // Refresh balances
    } catch (err: any) {
      alert(err.message || 'Error deleting payment');
    } finally {
      setDeleteTargetId(null);
    }
  };

  // Removed client-side filtered logic because it's now handled by the backend
  const filtered = students;

  const paymentsByStudent = useMemo(() => {
    const map = new Map<number, FeePayment[]>();
    payments.forEach(p => {
      const existing = map.get(p.student_id) || [];
      map.set(p.student_id, [...existing, p]);
    });
    return map;
  }, [payments]);

  const handleSendSingleWhatsAppReminder = async (student: any) => {
    setSendingWhatsAppId(student.id);
    try {
      const res = await fetch(`${API}/fees/whatsapp-reminder/${student.id}`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send WhatsApp reminder");
      alert(`✅ ${data.message}`);
    } catch (err: any) {
      alert(`❌ Error: ${err.message}`);
    } finally {
      setSendingWhatsAppId(null);
    }
  };

  const handleBulkWhatsAppReminders = async () => {
    if (selectedStudentIds.length === 0) return;
    if (!confirm(`Send official WhatsApp fee reminders to ${selectedStudentIds.length} selected student(s)?`)) return;

    setIsSendingBulkWhhatsApp(true);
    try {
      const res = await fetch(`${API}/fees/whatsapp-reminder-bulk`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ student_ids: selectedStudentIds, month: monthStr })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to dispatch bulk WhatsApp reminders");
      alert(`✅ ${data.message} (${data.total_students} students queued with anti-ban delay)`);
      setSelectedStudentIds([]);
    } catch (err: any) {
      alert(`❌ Error: ${err.message}`);
    } finally {
      setIsSendingBulkWhhatsApp(false);
    }
  };

  const handleBulkEmailLedger = async () => {
    if (selectedStudentIds.length === 0) return;
    setIsSendingBulk(true);
    try {
      const res = await fetch(`${API}/fees/ledger/bulk-email`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ student_ids: selectedStudentIds })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send bulk emails');
      alert(`Success: ${data.message} (${data.dispatched_count} emails queued)`);
      setSelectedStudentIds([]); // clear selection
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSendingBulk(false);
    }
  };

  const handleReceiveFullClick = (student: any, amountToReceive: number) => {
    if (amountToReceive <= 0) {
      alert('Fee for this month is already fully paid or not set.');
      return;
    }
    setConfirmReceiveTarget({ student, amount: amountToReceive });
  };

  const executeReceiveFull = async () => {
    if (!confirmReceiveTarget) return;

    setIsReceivingFull(true);
    try {
      const res = await fetch(`${API}/fees`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          student_id: confirmReceiveTarget.student.id,
          month: monthStr,
          amount_paid: confirmReceiveTarget.amount.toString(),
          discount_amount: 0,
          payment_date: new Date().toISOString().split('T')[0]
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to record payment');
      
      setConfirmReceiveTarget(null);
      fetchData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsReceivingFull(false);
    }
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "#0f224a" }}>Fee Collection</h1>
            <button onClick={() => router.push('/dashboard/fees/defaulters')} className="px-3.5 py-2 rounded-lg text-xs font-bold border transition shadow-sm bg-red-50 text-red-700 hover:bg-red-100 flex items-center gap-1.5" style={{ borderColor: '#fecaca' }}>
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Class-Wise Defaulters
            </button>
            <button onClick={() => router.push('/dashboard/fee-follow-ups')} className="px-3.5 py-2 rounded-lg text-xs font-bold border transition shadow-sm hover:bg-[#f0f4f8]" style={{ borderColor: '#bfdbfe', color: '#2563eb' }}>
              View Follow Ups
            </button>
          </div>
          <p className="mt-1 text-sm font-medium" style={{ color: "#38bdf8" }}>Track and collect monthly fees.</p>
        </div>
        
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold" style={{ color: '#1e3a8a' }}>Collection Month</label>
          <input 
            type="month" 
            value={monthStr} 
            onChange={e => setMonthStr(e.target.value)} 
            className="px-4 py-2.5 rounded-xl border-2 text-sm font-semibold outline-none transition-colors w-full md:w-auto" 
            style={{ borderColor: '#bfdbfe', color: '#1e3a8a', background: '#fff' }} 
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 rounded-2xl flex items-center justify-between shadow-sm" style={{ background: 'linear-gradient(135deg, #f0f4f8, #fff)', border: '1px solid #bfdbfe' }}>
          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: '#38bdf8' }}>Expected Amount</p>
            <p className="text-2xl font-black" style={{ color: '#1e3a8a' }}>Rs {stats.expected.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#bfdbfe', color: '#2563eb' }}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
        </div>
        <div className="p-6 rounded-2xl flex items-center justify-between shadow-sm" style={{ background: 'linear-gradient(135deg, #f0fdf4, #fff)', border: '1px solid #bbf7d0' }}>
          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: '#166534' }}>Received Amount</p>
            <p className="text-2xl font-black" style={{ color: '#15803d' }}>Rs {stats.received.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#dcfce3', color: '#16a34a' }}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
        </div>
        <div className="p-6 rounded-2xl flex items-center justify-between shadow-sm" style={{ background: 'linear-gradient(135deg, #fef2f2, #fff)', border: '1px solid #fecaca' }}>
          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: '#991b1b' }}>Remaining Amount</p>
            <p className="text-2xl font-black" style={{ color: '#b91c1c' }}>Rs {stats.remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#fee2e2', color: '#dc2626' }}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <svg className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input 
            type="text" 
            placeholder="Search students by name, phone..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none transition"
            style={{ background: "#fff", borderColor: "#bfdbfe" }}
          />
        </div>
        <div className="flex gap-3">
          <CustomDropdown 
            name="class_id"
            value={filterClassId} 
            onChange={(_, val) => {
              setFilterClassId(val ? Number(val) : "");
              setFilterSectionId("");
            }}
            className="min-w-[140px]"
            options={[{label: "All Classes", value: ""}, ...classes.map(c => ({label: c.name, value: c.id}))]}
          />
          
          {(() => {
            const availableSections: Section[] = filterClassId 
              ? classes.find(c => c.id === filterClassId)?.sections || [] 
              : sections;
            
            return (
              <CustomDropdown 
                name="section_id"
                value={filterSectionId} 
                onChange={(_, val) => setFilterSectionId(val ? Number(val) : "")}
                className="min-w-[140px]"
                options={[{label: "All Sections", value: ""}, ...availableSections.map(s => ({label: s.name, value: s.id}))]}
              />
            );
          })()}

          <CustomDropdown 
            name="status"
            value={filterStatus} 
            onChange={(_, val) => setFilterStatus(String(val))}
            className="min-w-[140px]"
            options={[
              {label: "All Statuses", value: ""},
              {label: "Paid", value: "paid"},
              {label: "Unpaid", value: "unpaid"},
              {label: "Partial", value: "partial"},
            ]}
          />
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedStudentIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 p-4 rounded-xl border shadow-sm" style={{ background: '#f0f4f8', borderColor: '#bfdbfe' }}>
          <span className="text-sm font-semibold" style={{ color: '#1e3a8a' }}>
            {selectedStudentIds.length} student(s) selected
          </span>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleBulkWhatsAppReminders}
              disabled={isSendingBulkWhhatsApp}
              className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
              {isSendingBulkWhhatsApp ? 'Queuing Reminders...' : 'Send WhatsApp Reminders'}
            </button>
            <button 
              onClick={handleBulkEmailLedger}
              disabled={isSendingBulk}
              className="px-5 py-2 rounded-lg text-sm font-bold text-white transition active:scale-95 disabled:opacity-50" 
              style={{ background: 'linear-gradient(135deg, #2563eb, #1e3a8a)' }}
            >
              {isSendingBulk ? 'Sending...' : 'Send Ledgers via Email'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="rounded-2xl overflow-hidden shadow-sm border" style={{ background: "#fff", borderColor: "#bfdbfe" }}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin w-8 h-8" style={{ color: "#2563eb" }} fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <svg className="w-14 h-14" style={{ color: "#bfdbfe" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            <p className="text-sm font-medium" style={{ color: "#38bdf8" }}>{search ? `No students match "${search}"` : "No students found."}</p>
          </div>
        ) : (
          <>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#f0f4f8", borderBottom: "1px solid #bfdbfe" }}>
                  <th className="px-5 py-3.5 w-12 text-center">
                    <input type="checkbox" className="w-4 h-4 rounded text-[#2563eb] focus:ring-[#2563eb] border-gray-300 cursor-pointer" style={{ accentColor: '#2563eb' }} checked={filtered.length > 0 && selectedStudentIds.length === filtered.length} onChange={(e) => { if (e.target.checked) { setSelectedStudentIds(filtered.map(s => s.id)); } else { setSelectedStudentIds([]); } }} />
                  </th>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Student</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Phone</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Class</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Section</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Monthly Fee</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Status ({monthStr})</th>
                  <th className="text-right px-5 py-3.5 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "#dbeafe" }}>
                {filtered.map(s => {
                  const studentPayments = s.fee_payments || s.feePayments || paymentsByStudent.get(s.id) || [];
                  const totalPaidThisMonth = s.current_month_paid !== undefined ? parseFloat(s.current_month_paid || '0') : studentPayments.reduce((sum: number, p: any) => sum + parseFloat(p.amount_paid), 0);
                  const monthlyFee = parseFloat(s.monthly_fee || '0');
                  const totalPayable = s.total_payable !== undefined ? parseFloat(s.total_payable || '0') : (s.arrears !== undefined ? parseFloat(s.arrears || '0') : Math.max(0, monthlyFee - totalPaidThisMonth));
                  const feeStatus = s.computed_status || (totalPayable <= 0 ? 'paid' : (totalPaidThisMonth > 0 ? 'partial' : 'unpaid'));

                  return (
                    <tr key={s.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-5 py-3 text-center">
                        <input type="checkbox" className="w-4 h-4 rounded text-[#2563eb] focus:ring-[#2563eb] border-gray-300 cursor-pointer" style={{ accentColor: '#2563eb' }} checked={selectedStudentIds.includes(s.id)} onChange={(e) => { if (e.target.checked) { setSelectedStudentIds(prev => [...prev, s.id]); } else { setSelectedStudentIds(prev => prev.filter(id => id !== s.id)); } }} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <img src={s.image ? `${STORAGE_URL}/${s.image}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=ead0c3&color=8a3218`} alt="" className="w-8 h-8 rounded-full object-cover" />
                          <div>
                            <p className="font-semibold" style={{ color: "#0f224a" }}>{s.name} <span className="text-[11px] font-normal text-gray-400">#{s.roll_number || s.id}</span></p>
                            <p className="text-[11px]" style={{ color: "#38bdf8" }}>{s.father_name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-gray-600 block mb-1">{s.contact_number}</span>
                        {s.contact_number && (
                          <div className="flex items-center gap-2">
                            <a href={`tel:${s.contact_number}`} className="flex items-center justify-center w-7 h-7 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition shadow-sm" title="Call">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                            </a>
                            <a href={formatWhatsApp(s.contact_number)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-7 h-7 rounded bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition shadow-sm" title="WhatsApp">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            </a>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-medium" style={{ color: "#1e3a8a" }}>{s.academy_class?.name}</p>
                      </td>
                      <td className="px-5 py-3">
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide" style={{ background: "#f0f4f8", color: "#2563eb" }}>
                          {s.section?.name || "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm" style={{ color: "#0f224a" }}>
                            {s.monthly_fee ? `Rs ${parseFloat(s.monthly_fee).toLocaleString()}` : "Not Set"}
                          </p>
                          <button onClick={() => setUpdateFeeTarget(s)} className="p-1 rounded text-gray-400 hover:text-[#2563eb] hover:bg-[#f0f4f8] transition" title="Update Monthly Fee">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {feeStatus === 'paid' && (
                              <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-800 w-max">
                                Paid Rs {totalPaidThisMonth.toLocaleString()}
                              </span>
                            )}
                            {feeStatus === 'partial' && (
                              <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800 w-max">
                                Partial Rs {totalPaidThisMonth.toLocaleString()}
                              </span>
                            )}
                            {feeStatus === 'unpaid' && (
                              <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-500 w-max">
                                Unpaid
                              </span>
                            )}
                          </div>

                          {/* Payable Amount / Voucher Balance */}
                          {totalPayable > 0 ? (
                            <div className="flex items-center gap-1 text-[11px] font-extrabold text-red-600 mt-0.5">
                              <span className="text-[10px] uppercase font-bold text-gray-500">Payable:</span>
                              <span className="font-mono">Rs {totalPayable.toLocaleString()}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-emerald-600 font-bold mt-0.5">
                              ✓ Dues Cleared
                            </span>
                          )}

                          {studentPayments.length > 0 && (
                            <div className="mt-1 space-y-1">
                              {studentPayments.map((p: any) => (
                                <div key={p.id} className="flex items-center gap-1.5 text-[10px] bg-[#f0f4f8]/50 border border-[#bfdbfe]/50 rounded px-1.5 py-0.5 w-max">
                                  <span className="font-semibold" style={{ color: "#1e3a8a" }}>Rs {parseFloat(p.amount_paid).toLocaleString()}</span>
                                  <span style={{ color: "#38bdf8" }}>({new Date(p.payment_date).toLocaleDateString(undefined, {day: 'numeric', month: 'short'})})</span>
                                  <div className="flex gap-1 ml-1 border-l border-[#bfdbfe]/50 pl-1">
                                    <button onClick={() => { setCollectTarget(s); setEditingPayment(p); }} className="text-blue-600 hover:text-blue-800 transition p-0.5" title="Edit Payment">
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    </button>
                                    <button onClick={() => handleDeleteFee(p.id)} className="text-red-500 hover:text-red-700 transition p-0.5" title="Delete Payment">
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Voucher Icon */}
                          <button 
                            onClick={() => window.open(`/dashboard/fees/vouchers/print?month=${monthStr}&due_date=${monthStr}-10&selected_keys=${s.id}`, '_blank')} 
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition" 
                            title="View Voucher"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          </button>
                          
                          {/* View Ledger Icon */}
                          <button 
                            onClick={() => router.push('/dashboard/fees/ledger?id=' + s.uuid)} 
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition" 
                            title="View Ledger"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m4 2v-4m4 4v-6m-9 8h10a2 2 0 002-2V7a2 2 0 00-2-2H9a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                          </button>

                          {/* WhatsApp Fee Reminder Icon */}
                          <button
                            onClick={() => handleSendSingleWhatsAppReminder(s)}
                            disabled={sendingWhatsAppId === s.id}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition disabled:opacity-50"
                            title="Send WhatsApp Fee Reminder"
                          >
                            {sendingWhatsAppId === s.id ? (
                              <span className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin inline-block" />
                            ) : (
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                              </svg>
                            )}
                          </button>

                          {/* Actions Dropdown */}
                          <div className="relative inline-block text-left fee-actions-dropdown-container">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdownId(openDropdownId === s.id ? null : s.id);
                              }}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition border cursor-pointer ${
                                openDropdownId === s.id
                                  ? "bg-[#0f224a] text-white border-[#0f224a] shadow-xs"
                                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-blue-400 shadow-2xs"
                              }`}
                            >
                              <span>Actions</span>
                              <svg
                                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                  openDropdownId === s.id ? "rotate-180 text-white" : "text-gray-500"
                                }`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>

                            {openDropdownId === s.id && (
                              <div 
                                className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-2xl border border-gray-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 origin-top-right text-left"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {/* 1. Receive Full / Total Payable */}
                                {totalPayable > 0 && (
                                  <button
                                    onClick={() => {
                                      setOpenDropdownId(null);
                                      handleReceiveFullClick(s, totalPayable);
                                    }}
                                    className="w-full px-3.5 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition flex items-center justify-between group cursor-pointer"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="w-5 h-5 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px]">
                                        ✓
                                      </span>
                                      <span>Receive Full</span>
                                    </div>
                                    <span className="font-mono bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded text-[10.5px]">
                                      Rs {totalPayable.toLocaleString()}
                                    </span>
                                  </button>
                                )}

                                {/* 2. Collect Fee / + Installment */}
                                <button
                                  onClick={() => {
                                    setOpenDropdownId(null);
                                    setCollectTarget(s);
                                  }}
                                  className="w-full px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition flex items-center gap-2 cursor-pointer"
                                >
                                  <span className="w-5 h-5 rounded bg-blue-100 text-blue-700 flex items-center justify-center text-[11px] font-bold">
                                    +
                                  </span>
                                  <span>{studentPayments.length === 0 ? "Collect Fee" : "+ Installment"}</span>
                                </button>

                                {/* 3. Add Follow Up */}
                                <button
                                  onClick={() => {
                                    setOpenDropdownId(null);
                                    setFollowUpTarget(s);
                                  }}
                                  className="w-full px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-amber-50 hover:text-amber-800 transition flex items-center gap-2 cursor-pointer"
                                >
                                  <span className="w-5 h-5 rounded bg-amber-100 text-amber-700 flex items-center justify-center text-[11px]">
                                    📅
                                  </span>
                                  <span>Add Follow Up</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid md:hidden grid-cols-1 gap-4 p-4 bg-gray-50/30">
            {filtered.map(s => {
              const studentPayments = s.fee_payments || s.feePayments || paymentsByStudent.get(s.id) || [];
              const totalPaidThisMonth = s.current_month_paid !== undefined ? parseFloat(s.current_month_paid || '0') : studentPayments.reduce((sum: number, p: any) => sum + parseFloat(p.amount_paid), 0);
              const monthlyFee = parseFloat(s.monthly_fee || '0');
              const totalPayable = s.total_payable !== undefined ? parseFloat(s.total_payable || '0') : (s.arrears !== undefined ? parseFloat(s.arrears || '0') : Math.max(0, monthlyFee - totalPaidThisMonth));
              const feeStatus = s.computed_status || (totalPayable <= 0 ? 'paid' : (totalPaidThisMonth > 0 ? 'partial' : 'unpaid'));

              return (
                <div key={s.id} className="bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-shadow relative flex flex-col" style={{ borderColor: "#bfdbfe" }}>
                  
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4 pb-4 border-b" style={{ borderColor: "#dbeafe" }}>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded text-[#2563eb] focus:ring-[#2563eb] border-gray-300 cursor-pointer mt-1"
                        style={{ accentColor: '#2563eb' }}
                        checked={selectedStudentIds.includes(s.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedStudentIds(prev => [...prev, s.id]);
                          else setSelectedStudentIds(prev => prev.filter(id => id !== s.id));
                        }}
                      />
                      <img src={s.image ? `${STORAGE_URL}/${s.image}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=ead0c3&color=8a3218`} alt="" className="w-11 h-11 rounded-full object-cover border-2 shadow-sm" style={{ borderColor: "#f0f4f8" }} />
                      <div>
                        <p className="font-extrabold text-[15px]" style={{ color: "#0f224a" }}>{s.name}</p>
                        <p className="text-[11px] font-medium" style={{ color: "#38bdf8" }}>{s.father_name} <span className="opacity-50 mx-1">•</span> #{s.roll_number || s.id}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => window.open(`/dashboard/fees/vouchers/print?month=${monthStr}&due_date=${monthStr}-10&selected_keys=${s.id}`, '_blank')} className="p-2 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-full transition shadow-sm" title="View Voucher">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </button>
                      <button onClick={() => router.push('/dashboard/fees/ledger?id=' + s.uuid)} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full transition shadow-sm" title="View Ledger">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m4 2v-4m4 4v-6m-9 8h10a2 2 0 002-2V7a2 2 0 00-2-2H9a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      </button>
                    </div>
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                    <div>
                      <p className="font-bold text-gray-400 mb-1 uppercase tracking-wider text-[10px]">Contact</p>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold" style={{ color: "#1e3a8a" }}>{s.contact_number || "N/A"}</span>
                        {s.contact_number && (
                          <div className="flex gap-1.5">
                            <a href={`tel:${s.contact_number}`} className="flex items-center justify-center w-5 h-5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition" title="Call">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                            </a>
                            <a href={formatWhatsApp(s.contact_number)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-5 h-5 rounded bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition" title="WhatsApp">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="font-bold text-gray-400 mb-1 uppercase tracking-wider text-[10px]">Class & Section</p>
                      <p className="font-semibold" style={{ color: "#1e3a8a" }}>{s.academy_class?.name} <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide" style={{ background: "#f0f4f8", color: "#2563eb" }}>{s.section?.name || "—"}</span></p>
                    </div>
                  </div>

                  {/* Fee & Status Panel */}
                  <div className="flex items-center justify-between mb-4 p-3 rounded-xl border" style={{ background: "#f0f4f8", borderColor: "#dbeafe" }}>
                    <div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Monthly Fee</p>
                      <div className="flex items-center gap-1.5">
                        <p className="font-black text-sm" style={{ color: "#0f224a" }}>
                          {s.monthly_fee ? `Rs ${parseFloat(s.monthly_fee).toLocaleString()}` : "Not Set"}
                        </p>
                        <button onClick={() => setUpdateFeeTarget(s)} className="p-1 rounded text-gray-400 hover:text-[#2563eb] hover:bg-white transition" title="Update Monthly Fee">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Status ({monthStr})</p>
                      {feeStatus === 'paid' && <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-green-100 text-green-800 shadow-sm">Paid</span>}
                      {feeStatus === 'partial' && <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 shadow-sm">Partial</span>}
                      {feeStatus === 'unpaid' && <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-gray-100 text-gray-600 shadow-sm">Unpaid</span>}
                      {totalPayable > 0 && (
                        <span className="text-[10px] font-extrabold text-red-600 mt-1">
                          Payable: Rs {totalPayable.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Installments List */}
                  <div className="flex-1">
                    {studentPayments.length > 0 && (
                      <div className="mb-3 space-y-1.5">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Receipts</p>
                        {studentPayments.map((p: any) => (
                          <div key={p.id} className="flex items-center justify-between text-xs bg-gray-50/50 border rounded-lg px-2.5 py-1.5" style={{ borderColor: "#bfdbfe" }}>
                            <div className="flex items-center gap-2">
                              <span className="font-bold" style={{ color: "#1e3a8a" }}>Rs {parseFloat(p.amount_paid).toLocaleString()}</span>
                              <span className="text-[10px] font-medium" style={{ color: "#38bdf8" }}>{new Date(p.payment_date).toLocaleDateString(undefined, {day: 'numeric', month: 'short'})}</span>
                            </div>
                            <div className="flex gap-1 border-l pl-2" style={{ borderColor: "#bfdbfe" }}>
                              <button onClick={() => { setCollectTarget(s); setEditingPayment(p); }} className="text-blue-600 hover:bg-blue-50 rounded p-1 transition" title="Edit Payment">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                              </button>
                              <button onClick={() => handleDeleteFee(p.id)} className="text-red-500 hover:bg-red-50 rounded p-1 transition" title="Delete Payment">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions (Bottom) */}
                  <div className="mt-4 pt-4 border-t flex items-center gap-2" style={{ borderColor: "#dbeafe" }}>
                    {totalPayable > 0 && (
                      <button onClick={() => handleReceiveFullClick(s, totalPayable)} className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-[#15803d] hover:bg-[#166534] transition active:scale-95 shadow-sm">
                        Receive Rs {totalPayable.toLocaleString()}
                      </button>
                    )}
                    {studentPayments.length === 0 ? (
                      <button onClick={() => setCollectTarget(s)} className="flex-1 py-2 rounded-xl text-xs font-bold text-white transition active:scale-95 shadow-sm" style={{ background: 'linear-gradient(135deg, #2563eb, #1e3a8a)' }}>
                        Collect Fee
                      </button>
                    ) : (
                      <button onClick={() => setCollectTarget(s)} className="flex-1 py-2 rounded-xl text-xs font-bold text-[#2563eb] border transition hover:bg-[#f0f4f8] active:scale-95 shadow-sm" style={{ borderColor: '#bfdbfe', background: '#fff' }}>
                        + Installment
                      </button>
                    )}
                    <button
                      onClick={() => handleSendSingleWhatsAppReminder(s)}
                      disabled={sendingWhatsAppId === s.id}
                      className="py-2 px-3 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 transition active:scale-95 shadow-sm hover:bg-emerald-100 flex items-center gap-1"
                      title="Send WhatsApp Reminder"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                      </svg>
                      {sendingWhatsAppId === s.id ? '...' : 'WhatsApp'}
                    </button>
                    <button onClick={() => setFollowUpTarget(s)} className="py-2 px-3 rounded-xl text-xs font-bold text-[#1e40af] border transition active:scale-95 shadow-sm hover:bg-gray-50" style={{ borderColor: '#bfdbfe' }}>
                      Follow up
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
          </>
        )}

        {/* Pagination Controls */}
        {!loading && filtered.length > 0 && lastPage > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t" style={{ borderColor: "#dbeafe", background: "#f0f4f8" }}>
            <span className="text-sm font-medium" style={{ color: "#38bdf8" }}>
              Showing Page {currentPage} of {lastPage} <span className="mx-1">•</span> {totalStudents} Students Total
            </span>
            <div className="flex gap-2">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "#fff", color: "#2563eb", border: "1px solid #bfdbfe" }}
              >
                Previous
              </button>
              <button 
                disabled={currentPage === lastPage}
                onClick={() => setCurrentPage(p => Math.min(lastPage, p + 1))}
                className="px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "#fff", color: "#2563eb", border: "1px solid #bfdbfe" }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {collectTarget && (
        <FeeCollectionModal 
          student={collectTarget}
          monthStr={monthStr} 
          editingPayment={editingPayment}
          onClose={() => { setCollectTarget(null); setEditingPayment(null); }} 
          onSuccess={() => {
            setCollectTarget(null);
            setEditingPayment(null);
            fetchData();
          }} 
        />
      )}

      {updateFeeTarget && (
        <UpdateFeeModal
          student={updateFeeTarget}
          onClose={() => setUpdateFeeTarget(null)}
          onSuccess={() => {
            setUpdateFeeTarget(null);
            fetchData();
          }}
        />
      )}

      {followUpTarget && (
        <FeeFollowUpModal
          student={followUpTarget}
          onClose={() => setFollowUpTarget(null)}
        />
      )}

      {/* Custom Confirmation Modal */}
      {confirmReceiveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => !isReceivingFull && setConfirmReceiveTarget(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 z-10 flex flex-col items-center text-center animate-in zoom-in-95 duration-200 border" style={{ borderColor: '#bfdbfe' }}>
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4 text-green-600 shadow-sm" style={{ border: '1px solid #bbf7d0' }}>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h3 className="text-xl font-extrabold mb-2" style={{ color: '#0f224a' }}>Confirm Payment</h3>
            <p className="text-sm font-medium text-gray-500 mb-6 leading-relaxed">
              You are about to instantly receive <span className="font-bold text-gray-800">Rs {confirmReceiveTarget.amount.toLocaleString()}</span> for <span className="font-bold text-gray-800">{confirmReceiveTarget.student.name}</span>.
            </p>
            <div className="flex w-full gap-3">
              <button 
                onClick={() => setConfirmReceiveTarget(null)} 
                disabled={isReceivingFull}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold border transition hover:bg-[#dbeafe] disabled:opacity-50"
                style={{ borderColor: '#bfdbfe', color: '#1e40af', background: '#f0f4f8' }}
              >
                Cancel
              </button>
              <button 
                onClick={executeReceiveFull} 
                disabled={isReceivingFull}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition active:scale-95 disabled:opacity-50 shadow-md hover:shadow-lg"
                style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
              >
                {isReceivingFull ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setDeleteTargetId(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 z-10 flex flex-col items-center text-center animate-in zoom-in-95 duration-200 border" style={{ borderColor: '#bfdbfe' }}>
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4 text-red-600 shadow-sm" style={{ border: '1px solid #fecaca' }}>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <h3 className="text-xl font-extrabold mb-2" style={{ color: '#0f224a' }}>Delete Payment</h3>
            <p className="text-sm font-medium text-gray-500 mb-6 leading-relaxed">
              Are you sure you want to permanently delete this fee payment? This action will immediately adjust the student's ledger.
            </p>
            <div className="flex w-full gap-3">
              <button 
                onClick={() => setDeleteTargetId(null)} 
                className="flex-1 py-2.5 rounded-xl text-sm font-bold border transition hover:bg-[#dbeafe]"
                style={{ borderColor: '#bfdbfe', color: '#1e40af', background: '#f0f4f8' }}
              >
                Cancel
              </button>
              <button 
                onClick={executeDeleteFee} 
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition active:scale-95 shadow-md hover:shadow-lg"
                style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
