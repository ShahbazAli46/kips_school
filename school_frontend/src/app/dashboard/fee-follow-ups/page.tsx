"use client";

import React, { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { DatePicker } from "@/components/ui/date-picker";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };
}

interface Student {
  id: number;
  name: string;
  father_name: string;
  contact_number: string;
}

interface FeeFollowUp {
  id: number;
  student_id: number;
  promise_date: string;
  next_promise_date?: string | null;
  comments: string;
  student?: Student;
}

function EditFollowUpModal({ followUp, onClose, onSuccess }: { followUp: FeeFollowUp, onClose: () => void, onSuccess: () => void }) {
  const [promiseDate, setPromiseDate] = useState(followUp.promise_date);
  const [nextPromiseDate, setNextPromiseDate] = useState(followUp.next_promise_date || "");
  const [comments, setComments] = useState(followUp.comments || "");
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
      const payload: any = { promise_date: promiseDate, comments };
      if (nextPromiseDate) payload.next_promise_date = nextPromiseDate;
      
      const res = await fetch(`${API}/fee-follow-ups/${followUp.id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to update follow up");
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
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: '#dbeafe' }}>
          <div>
            <h3 className="text-lg font-bold" style={{ color: '#0f224a' }}>Edit Follow Up</h3>
            <p className="text-xs mt-0.5" style={{ color: '#38bdf8' }}>{followUp.student?.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && <div className="p-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">{error}</div>}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold mb-1" style={{ color: '#1e3a8a' }}>Original Date</label>
              <DatePicker value={promiseDate} onChange={setPromiseDate} />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold mb-1" style={{ color: '#1e3a8a' }}>Next Promise Date</label>
              <DatePicker value={nextPromiseDate} onChange={setNextPromiseDate} placeholder="Select Date" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: '#1e3a8a' }}>Comments</label>
            <textarea rows={3} value={comments} onChange={e => setComments(e.target.value)} placeholder="e.g. Student requested another week" className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none" style={{ borderColor: '#bfdbfe' }} />
          </div>
        </div>
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

export default function FeeFollowUpsPage() {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [followUps, setFollowUps] = useState<FeeFollowUp[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingFollowUp, setEditingFollowUp] = useState<FeeFollowUp | null>(null);

  const fetchFollowUps = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/fee-follow-ups?promise_date=${date}`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      setFollowUps(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchFollowUps();
  }, [fetchFollowUps]);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this follow up?")) return;
    try {
      const res = await fetch(`${API}/fee-follow-ups/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });
      if (res.ok) {
        fetchFollowUps();
      } else {
        alert("Failed to delete follow up");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatWhatsApp = (number: string) => {
    if (!number) return '';
    let formatted = number.replace(/\D/g, '');
    if (formatted.startsWith('0')) {
        formatted = '92' + formatted.substring(1);
    }
    return `https://wa.me/${formatted}`;
  };

  const formatComments = (text: string) => {
    if (!text) return <span className="text-gray-400 italic">No comments</span>;
    const parts = text.split(/(\[[^\]]+\])/g);
    return (
      <>
        {parts.map((part, i) => {
          if (part.startsWith('[') && part.endsWith(']')) {
            return <span key={i} className="font-semibold text-[#2563eb]">{part}</span>;
          }
          return <span key={i}>{part}</span>;
        })}
      </>
    );
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "#0f224a" }}>Fee Follow Ups</h1>
          <p className="mt-1 text-sm font-medium" style={{ color: "#38bdf8" }}>Track fee collection promises by date.</p>
        </div>
        <div className="flex flex-col gap-1 w-full md:w-auto">
          <label className="text-xs font-semibold" style={{ color: '#1e3a8a' }}>Select Date</label>
          <DatePicker value={date} onChange={setDate} className="w-full md:w-48" />
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden shadow-sm border" style={{ background: "#fff", borderColor: "#bfdbfe" }}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin w-8 h-8" style={{ color: "#2563eb" }} fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          </div>
        ) : followUps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <svg className="w-14 h-14" style={{ color: "#bfdbfe" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            <p className="text-sm font-medium" style={{ color: "#38bdf8" }}>No follow ups scheduled for this date.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#f0f4f8", borderBottom: "1px solid #bfdbfe" }}>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Next Date</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Comments</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="text-right px-5 py-3.5 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "#dbeafe" }}>
                {followUps.map(fu => (
                  <tr key={fu.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-6 py-4">
                      <p className="font-semibold" style={{ color: "#0f224a" }}>{fu.student?.name}</p>
                      <p className="text-[11px]" style={{ color: "#38bdf8" }}>{fu.student?.father_name}</p>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium" style={{ color: '#0f224a' }}>
                      {new Date(fu.promise_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium" style={{ color: '#2563eb' }}>
                      {fu.next_promise_date ? new Date(fu.next_promise_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-pre-wrap max-w-xs leading-relaxed">{formatComments(fu.comments)}</td>
                    <td className="px-5 py-4">
                      <span className="text-gray-600 block mb-1">{fu.student?.contact_number || 'N/A'}</span>
                      {fu.student?.contact_number && (
                        <div className="flex items-center gap-2">
                          <a href={`tel:${fu.student.contact_number}`} className="flex items-center justify-center w-7 h-7 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition shadow-sm" title="Call">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                          </a>
                          <a href={formatWhatsApp(fu.student.contact_number)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-7 h-7 rounded bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition shadow-sm" title="WhatsApp">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          </a>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setEditingFollowUp(fu)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#2563eb] border transition active:scale-95 shadow-sm hover:bg-[#f0f4f8]" style={{ borderColor: '#bfdbfe' }}>
                          Edit
                        </button>
                        <button onClick={() => handleDelete(fu.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 border border-red-200 transition active:scale-95 shadow-sm hover:bg-red-50">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden flex flex-col divide-y" style={{ borderColor: "#dbeafe" }}>
              {followUps.map(fu => (
                <div key={fu.id} className="p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-[15px]" style={{ color: "#0f224a" }}>{fu.student?.name}</p>
                      <p className="text-[11px]" style={{ color: "#38bdf8" }}>{fu.student?.father_name}</p>
                    </div>
                    <div className="flex flex-col items-end text-xs font-medium">
                       <span style={{ color: '#0f224a' }}>{new Date(fu.promise_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                       {fu.next_promise_date && (
                         <span style={{ color: '#2563eb' }}>→ {new Date(fu.next_promise_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                       )}
                    </div>
                  </div>

                  <div className="bg-gray-50/50 p-3 rounded-lg text-sm text-gray-700 whitespace-pre-wrap border leading-relaxed" style={{ borderColor: '#bfdbfe' }}>
                    {formatComments(fu.comments)}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                     <div className="flex items-center gap-2">
                        {fu.student?.contact_number ? (
                          <>
                            <a href={`tel:${fu.student.contact_number}`} className="flex items-center justify-center w-8 h-8 rounded bg-blue-50 text-blue-600 border border-blue-100" title="Call">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                            </a>
                            <a href={formatWhatsApp(fu.student.contact_number)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-8 h-8 rounded bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20" title="WhatsApp">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            </a>
                          </>
                        ) : (
                          <span className="text-gray-400 text-xs italic">No Contact</span>
                        )}
                     </div>
                     <div className="flex items-center gap-2">
                        <button onClick={() => setEditingFollowUp(fu)} className="px-4 py-1.5 rounded-md text-xs font-bold text-[#2563eb] border border-[#bfdbfe] bg-white">Edit</button>
                        <button onClick={() => handleDelete(fu.id)} className="px-4 py-1.5 rounded-md text-xs font-bold text-red-600 border border-red-200 bg-red-50">Del</button>
                     </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {editingFollowUp && (
        <EditFollowUpModal
          followUp={editingFollowUp}
          onClose={() => setEditingFollowUp(null)}
          onSuccess={() => {
            setEditingFollowUp(null);
            fetchFollowUps();
          }}
        />
      )}
    </DashboardLayout>
  );
}
