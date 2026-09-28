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

interface LeaveApplication {
  id: number;
  student: {
    name: string;
    roll_number: string;
    academy_class?: { name: string };
    section?: { name: string };
  };
  start_date: string;
  end_date: string;
  remarks: string;
  status: string;
  created_at: string;
}

const getMonthOptions = () => {
  const options = [];
  const d = new Date();
  d.setDate(1); // Set to 1st to avoid month skipping issues on 31st
  d.setMonth(d.getMonth() - 6);
  
  for (let i = 0; i < 18; i++) {
    const value = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString('default', { month: 'long', year: 'numeric' });
    options.push({ value, label });
    d.setMonth(d.getMonth() + 1);
  }
  return options;
};

export default function LeaveApplicationsPage() {
  const [leaves, setLeaves] = useState<LeaveApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    fetchLeaves();
  }, [month]);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/leave-applications?month=${month}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch leaves");
      const data = await res.json();
      setLeaves(data);
    } catch (error) {
      console.error("Failed to fetch leaves:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm("Are you sure you want to cancel this leave application?")) return;
    try {
      const res = await fetch(`${API}/leave-applications/${id}/cancel`, { 
          method: "POST", 
          headers: getAuthHeaders() 
      });
      if (!res.ok) throw new Error("Failed to cancel leave");
      fetchLeaves();
    } catch (error) {
      console.error("Failed to cancel leave:", error);
      alert("Failed to cancel leave");
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <h1 className="text-2xl font-bold text-[#1e3a8a]">Leave Applications</h1>
          <div className="mt-4 sm:mt-0 flex items-center space-x-2">
            <label className="text-sm font-semibold text-gray-700">Month:</label>
            <CustomDropdown
              options={getMonthOptions()}
              value={month}
              onChange={(_, val) => setMonth(val as string)}
              name="month"
              className="w-56"
            />
          </div>
        </div>
        
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-[#1e3a8a] text-white">
                <tr>
                  <th className="px-6 py-4 font-semibold text-xs tracking-wider uppercase">Student</th>
                  <th className="px-6 py-4 font-semibold text-xs tracking-wider uppercase">Dates</th>
                  <th className="px-6 py-4 font-semibold text-xs tracking-wider uppercase">Remarks</th>
                  <th className="px-6 py-4 font-semibold text-xs tracking-wider uppercase">Status</th>
                  <th className="px-6 py-4 font-semibold text-xs tracking-wider uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leaves.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400 italic">No leave applications found.</td>
                  </tr>
                ) : (
                  leaves.map((leave) => (
                    <tr key={leave.id} className="hover:bg-[#faf9f8] transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-800">{leave.student.name}</div>
                        <div className="text-xs text-gray-400">
                          Roll: {leave.student.roll_number || 'N/A'}
                          {leave.student.academy_class?.name ? ` • ${leave.student.academy_class.name}` : ''}
                          {leave.student.section?.name ? ` (${leave.student.section.name})` : ''}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>{leave.start_date} <span className="text-gray-400 text-xs mx-1">to</span> {leave.end_date}</div>
                        <div className="text-xs text-gray-400">Applied: {new Date(leave.created_at).toLocaleDateString()}</div>
                      </td>
                      <td className="px-6 py-4 max-w-xs truncate" title={leave.remarks}>
                        {leave.remarks || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          leave.status === 'approved' ? 'bg-green-100 text-green-700' :
                          leave.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {leave.status !== 'cancelled' && (
                          <button 
                            onClick={() => handleCancel(leave.id)}
                            className="px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded text-xs font-medium transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
