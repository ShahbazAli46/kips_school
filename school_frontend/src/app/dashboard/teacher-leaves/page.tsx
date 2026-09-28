"use client";

import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";

import CustomDropdown from "@/components/CustomDropdown";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

const generateMonthOptions = () => {
  const options = [];
  const date = new Date();
  date.setMonth(date.getMonth() - 12);
  
  for (let i = 0; i < 24; i++) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const monthName = date.toLocaleString('default', { month: 'long' });
    options.push({ label: `${monthName} ${y}`, value: `${y}-${m}` });
    date.setMonth(date.getMonth() + 1);
  }
  return options;
};

interface TeacherLeave {
  id: number;
  teacher_id: number;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  teacher: {
    id: number;
    name: string;
  };
}

export default function TeacherLeavesPage() {
  const [leaves, setLeaves] = useState<TeacherLeave[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [monthStr, setMonthStr] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  });

  const monthOptions = React.useMemo(() => generateMonthOptions(), []);

  useEffect(() => {
    fetchLeaves();
  }, [monthStr]);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/teacher-leaves?month=${monthStr}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.status === "success") {
        setLeaves(data.leaves);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    const adminNotes = status === "rejected" ? prompt("Enter a reason for rejection (optional):") : null;
    
    // If they clicked Cancel on the prompt, abort the rejection
    if (status === "rejected" && adminNotes === null) return;

    setProcessingId(id);
    try {
      const res = await fetch(`${API}/admin/teacher-leaves/${id}/status`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          status,
          admin_notes: adminNotes
        })
      });

      const data = await res.json();
      if (data.status === "success") {
        setLeaves((prev) =>
          prev.map((l) => (l.id === id ? data.leave : l))
        );
      } else {
        alert(data.message || "Failed to update status");
      }
    } catch (err) {
      console.error(err);
      alert("Network error");
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded uppercase tracking-wide">Approved</span>;
      case "rejected":
        return <span className="bg-red-100 text-red-800 text-xs font-semibold px-2.5 py-0.5 rounded uppercase tracking-wide">Rejected</span>;
      default:
        return <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2.5 py-0.5 rounded uppercase tracking-wide">Pending</span>;
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Teacher Leaves Management</h1>
          <div className="flex items-center space-x-2">
            <CustomDropdown
              name="monthStr"
              options={monthOptions}
              value={monthStr}
              onChange={(_, val) => setMonthStr(val as string)}
              className="w-48"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-600">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Teacher</th>
                    <th className="px-6 py-4 font-semibold">Date Range</th>
                    <th className="px-6 py-4 font-semibold w-1/3">Reason</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        No teacher leave applications found.
                      </td>
                    </tr>
                  ) : (
                    leaves.map((leave) => (
                      <tr key={leave.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {leave.teacher.name}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium">{leave.start_date}</div>
                          <div className="text-xs text-gray-500">to {leave.end_date}</div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-gray-700 whitespace-pre-wrap">{leave.reason}</p>
                          {leave.admin_notes && (
                            <div className="mt-2 text-xs bg-red-50 text-red-600 p-2 rounded border border-red-100">
                              <span className="font-semibold">Note:</span> {leave.admin_notes}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(leave.status)}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          {leave.status === "pending" && (
                            <>
                              <button
                                disabled={processingId === leave.id}
                                onClick={() => handleUpdateStatus(leave.id, "approved")}
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none disabled:opacity-50 transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                disabled={processingId === leave.id}
                                onClick={() => handleUpdateStatus(leave.id, "rejected")}
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none disabled:opacity-50 transition-colors"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {leave.status === "approved" && (
                            <button
                              disabled={processingId === leave.id}
                              onClick={() => handleUpdateStatus(leave.id, "rejected")}
                              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none disabled:opacity-50 transition-colors"
                            >
                              Revoke & Reject
                            </button>
                          )}
                          {leave.status === "rejected" && (
                            <button
                              disabled={processingId === leave.id}
                              onClick={() => handleUpdateStatus(leave.id, "approved")}
                              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none disabled:opacity-50 transition-colors"
                            >
                              Revoke & Approve
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
