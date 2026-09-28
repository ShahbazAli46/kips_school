"use client";

import React, { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import CustomDropdown from "@/components/CustomDropdown";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

interface AdvanceSalaryRequest {
  id: number;
  teacher_id: number;
  amount: string;
  reason: string;
  deduction_month: string | null;
  status: "pending" | "approved" | "paid" | "rejected";
  admin_notes: string | null;
  payment_method: string | null;
  paid_at: string | null;
  created_at: string;
  teacher?: {
    id: number;
    name: string;
    contact_number: string | null;
    monthly_salary: string | null;
    advance_balance: string | null;
  };
  action_by?: {
    id: number;
    name: string;
  };
}

const getMonthOptions = () => {
  const options = [{ value: "all", label: "All Months" }];
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 6);
  
  for (let i = 0; i < 18; i++) {
    const value = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString("default", { month: "long", year: "numeric" });
    options.push({ value, label });
    d.setMonth(d.getMonth() + 1);
  }
  return options;
};

const statusOptions = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending Review" },
  { value: "approved", label: "Approved (Unpaid)" },
  { value: "paid", label: "Paid / Disbursed" },
  { value: "rejected", label: "Rejected" },
];

export default function AdvanceSalariesPage() {
  const [requests, setRequests] = useState<AdvanceSalaryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState("all");
  const [status, setStatus] = useState("all");

  // Action Modal State
  const [selectedRequest, setSelectedRequest] = useState<AdvanceSalaryRequest | null>(null);
  const [actionType, setActionType] = useState<"paid" | "approved" | "rejected">("paid");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [adminNotes, setAdminNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState("");

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API}/admin/advance-salaries?`;
      const params = new URLSearchParams();
      if (month !== "all") params.append("month", month);
      if (status !== "all") params.append("status", status);
      
      const res = await fetch(url + params.toString(), { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to load advance requests");
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [month, status]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleOpenActionModal = (req: AdvanceSalaryRequest, type: "paid" | "approved" | "rejected") => {
    setSelectedRequest(req);
    setActionType(type);
    setPaymentMethod(req.payment_method || "Cash");
    setAdminNotes(req.admin_notes || "");
    setActionError("");
  };

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    setIsProcessing(true);
    setActionError("");

    try {
      const res = await fetch(`${API}/admin/advance-salaries/${selectedRequest.id}/status`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          status: actionType,
          payment_method: actionType === "paid" ? paymentMethod : null,
          admin_notes: adminNotes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update advance request");

      setSelectedRequest(null);
      fetchRequests();
    } catch (err: any) {
      setActionError(err.message || "Error updating advance request");
    } finally {
      setIsProcessing(false);
    }
  };

  // Stats calculation
  const totalPendingCount = requests.filter(r => r.status === "pending").length;
  const totalPendingAmount = requests.filter(r => r.status === "pending").reduce((sum, r) => sum + parseFloat(r.amount || "0"), 0);
  const totalPaidAmount = requests.filter(r => r.status === "paid").reduce((sum, r) => sum + parseFloat(r.amount || "0"), 0);

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-[#1e3a8a] tracking-tight">Teacher Advance Salaries</h1>
            <p className="text-sm text-gray-500 mt-1">Review, approve, and disburse advance salary requests submitted by teachers.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="w-44">
              <CustomDropdown
                options={getMonthOptions()}
                value={month}
                onChange={(_, val) => setMonth(val as string)}
                name="month"
                placeholder="Filter Month"
              />
            </div>
            <div className="w-44">
              <CustomDropdown
                options={statusOptions}
                value={status}
                onChange={(_, val) => setStatus(val as string)}
                name="status"
                placeholder="Filter Status"
              />
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-amber-200 rounded-xl p-5 shadow-sm">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Pending Requests</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-amber-900">{totalPendingCount}</span>
              <span className="text-sm font-bold text-amber-700">Rs {totalPendingAmount.toLocaleString()}</span>
            </div>
          </div>

          <div className="bg-white border border-emerald-200 rounded-xl p-5 shadow-sm">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Total Disbursed (Paid)</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-emerald-900">Rs {totalPaidAmount.toLocaleString()}</span>
              <span className="text-xs font-bold text-emerald-600">Active Cycle</span>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Requests</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-gray-800">{requests.length}</span>
              <span className="text-xs font-medium text-gray-500">Filtered</span>
            </div>
          </div>
        </div>

        {/* Main Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500 font-medium">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#1e3a8a] border-t-transparent mb-2"></div>
              <p>Loading advance salary requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="p-12 text-center text-gray-500 font-medium">
              <p>No advance salary requests found matching the filter criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-[#f2f3ff] text-[#434655] text-xs font-bold uppercase tracking-wider border-b border-gray-200">
                    <th className="py-3.5 px-4">Teacher</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4">Reason</th>
                    <th className="py-3.5 px-4">Deduction Month</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Applied Date</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {requests.map((req) => {
                    const amt = parseFloat(req.amount || "0");
                    const dateFormatted = req.created_at ? new Date(req.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "N/A";
                    
                    return (
                      <tr key={req.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-gray-900">{req.teacher?.name || "Teacher"}</div>
                          <div className="text-xs text-gray-500 flex gap-2">
                            {req.teacher?.contact_number && <span>📞 {req.teacher.contact_number}</span>}
                            {req.teacher?.advance_balance && parseFloat(req.teacher.advance_balance) > 0 && (
                              <span className="text-blue-600 font-semibold">Bal: Rs {parseFloat(req.teacher.advance_balance).toLocaleString()}</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-black text-[#1e3a8a] text-base">Rs {amt.toLocaleString()}</span>
                        </td>

                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="line-clamp-2 text-gray-800">{req.reason}</p>
                          {req.admin_notes && (
                            <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-0.5 mt-1 border border-amber-200">
                              <strong>Remark:</strong> {req.admin_notes}
                            </p>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-800">
                            📅 {req.deduction_month || "Next Salary"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          {req.status === "pending" && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              Pending Review
                            </span>
                          )}
                          {req.status === "approved" && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                              Approved (Unpaid)
                            </span>
                          )}
                          {req.status === "paid" && (
                            <div className="flex flex-col">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 w-fit">
                                Paid / Disbursed
                              </span>
                              {req.payment_method && (
                                <span className="text-[11px] text-gray-500 mt-0.5">Via {req.payment_method}</span>
                              )}
                            </div>
                          )}
                          {req.status === "rejected" && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                              Rejected
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-xs text-gray-500">
                          {dateFormatted}
                        </td>

                        <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                          {req.status !== "paid" && (
                            <button
                              onClick={() => handleOpenActionModal(req, "paid")}
                              className="px-3 py-1.5 bg-[#1e3a8a] text-white text-xs font-bold rounded-lg hover:bg-[#660000] transition-colors shadow-sm"
                            >
                              Disburse / Pay
                            </button>
                          )}
                          {req.status === "pending" && (
                            <button
                              onClick={() => handleOpenActionModal(req, "rejected")}
                              className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 text-xs font-bold rounded-lg hover:bg-red-100 transition-colors"
                            >
                              Reject
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Action Modal (Disburse / Approve / Reject) */}
        {selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-start border-b border-gray-100 pb-3">
                <div>
                  <h3 className="text-lg font-black text-gray-900">
                    {actionType === "paid" ? "Disburse Advance Salary" : actionType === "approved" ? "Approve Advance Request" : "Reject Advance Request"}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Teacher: <strong className="text-gray-800">{selectedRequest.teacher?.name}</strong> | Amount: <strong className="text-[#1e3a8a]">Rs {parseFloat(selectedRequest.amount).toLocaleString()}</strong>
                  </p>
                </div>
                <button onClick={() => setSelectedRequest(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">
                  &times;
                </button>
              </div>

              {actionError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-lg">
                  {actionError}
                </div>
              )}

              <form onSubmit={handleActionSubmit} className="space-y-4">
                {actionType === "paid" && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="EasyPaisa">EasyPaisa</option>
                      <option value="JazzCash">JazzCash</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                    <p className="text-[11px] text-gray-500 mt-1">
                      Marking as Paid will add <strong>Rs {parseFloat(selectedRequest.amount).toLocaleString()}</strong> to the teacher's advance balance for auto-recovery on their salary slip.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    {actionType === "rejected" ? "Rejection Reason / Notes" : "Admin Remarks (Optional)"}
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={3}
                    placeholder={actionType === "rejected" ? "Explain why this request is rejected..." : "Add any notes or references..."}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                    required={actionType === "rejected"}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRequest(null)}
                    disabled={isProcessing}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className={`px-5 py-2 rounded-lg text-sm font-bold text-white shadow-sm transition ${
                      actionType === "rejected" ? "bg-red-600 hover:bg-red-700" : "bg-[#1e3a8a] hover:bg-[#660000]"
                    }`}
                  >
                    {isProcessing ? "Saving..." : actionType === "paid" ? "Confirm & Disburse" : actionType === "rejected" ? "Reject Request" : "Approve"}
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
