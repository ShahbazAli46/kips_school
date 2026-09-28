"use client";

import React, { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";

interface Student {
  id: number;
  name: string;
  email: string;
  father_name: string | null;
  gender: string | null;
  contact_number: string | null;
  class_id: number | null;
  major_id: number | null;
  image: string | null;
  is_active: boolean;
  academy_class: { name: string } | null;
  major: { name: string } | null;
  deleted_at: string;
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const STORAGE_URL = process.env.NEXT_PUBLIC_STORAGE_URL || "http://localhost:8000/storage";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export default function TrashedStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchTrashed = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/students/trashed`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setStudents(Array.isArray(data) ? data : []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTrashed(); }, [fetchTrashed]);

  const handleRestore = async (id: number) => {
    setActionLoading(id);
    try {
      const res = await fetch(`${API}/students/${id}/restore`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setStudents(prev => prev.filter(s => s.id !== id));
      }
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.email && s.email.toLowerCase().includes(search.toLowerCase())) ||
    (s.father_name && s.father_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "#0f224a" }}>Deleted Students (Trash Bin)</h2>
          <p className="text-sm mt-1" style={{ color: "#2563eb" }}>Recover students that were accidentally deleted.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => window.location.href = '/dashboard/students'}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all active:scale-95 hover:shadow-md"
            style={{ borderColor: "#bfdbfe", color: "#1e3a8a", background: "#f0f4f8" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back to Active Students
          </button>
        </div>
      </div>

      <div className="relative mb-5 max-w-sm">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#38bdf8" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search deleted students..." className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none transition" style={{ background: "#fff", borderColor: "#bfdbfe", color: "#0f224a" }} />
      </div>

      <div className="rounded-2xl overflow-hidden shadow-sm border" style={{ background: "#fff", borderColor: "#bfdbfe" }}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin w-8 h-8" style={{ color: "#2563eb" }} fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <svg className="w-14 h-14" style={{ color: "#bfdbfe" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            <p className="text-sm font-medium" style={{ color: "#38bdf8" }}>{search ? `No deleted students match "${search}"` : "The trash bin is empty."}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#fef2f2", borderBottom: "1px solid #fca5a5" }}>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wide" style={{ color: "#991b1b" }}>Student</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wide" style={{ color: "#991b1b" }}>Deleted At</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wide" style={{ color: "#991b1b" }}>Class / Major</th>
                  <th className="text-right px-5 py-3.5 font-semibold text-xs uppercase tracking-wide" style={{ color: "#991b1b" }}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "#dbeafe" }}>
                {filtered.map((student) => (
                  <tr key={student.id} className="transition-colors hover:bg-[#f0f4f8]">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3 opacity-75">
                        {student.image ? (
                          <img 
                            src={student.image.startsWith('http') ? student.image : `${STORAGE_URL}/${student.image}`} 
                            alt={student.name} 
                            className="w-10 h-10 rounded-full object-cover border grayscale" 
                            style={{ borderColor: "#bfdbfe" }} 
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-xs grayscale" style={{ background: "linear-gradient(135deg, #38bdf8, #2563eb)" }}>
                            {student.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-[#0f224a] line-through">{student.name}</p>
                          <p className="text-xs text-[#38bdf8]">{student.contact_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-[#1e40af]">
                      {new Date(student.deleted_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-2">
                        {student.academy_class && (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-gray-200 text-gray-600">
                            {student.academy_class.name}
                          </span>
                        )}
                        {student.major && (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold border border-gray-300 text-gray-600">
                            {student.major.name}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end">
                        <button 
                          onClick={() => handleRestore(student.id)} 
                          disabled={actionLoading === student.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition active:scale-95 disabled:opacity-50"
                          style={{ background: "linear-gradient(135deg, #10b981, #047857)" }}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                          {actionLoading === student.id ? "Restoring..." : "Restore"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
