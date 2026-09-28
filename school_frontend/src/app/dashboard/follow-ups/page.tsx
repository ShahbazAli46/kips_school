"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { format } from "date-fns";
import { Calendar as CalendarIcon, ChevronDown, Phone, MessageCircle, Search, Printer, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
}

interface Class {
  id: number;
  name: string;
}

interface Section {
  id: number;
  name: string;
  class_id: number;
  class: { name: string };
}

interface Student {
  id: number;
  name: string;
  section_id: number;
  contact_number: string | null;
  email?: string | null;
}

interface AttendanceRecord {
  id: number;
  student_id: number;
  date: string;
  status: "present" | "absent" | "leave";
}

interface FollowUpModalProps {
  student: Student;
  date: string;
  onClose: () => void;
}

function FollowUpModal({ student, date, onClose }: FollowUpModalProps) {
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [emailing, setEmailing] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");

  useEffect(() => {
    fetch(`${API}/follow-ups?student_id=${student.id}`, { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(data => {
        setHistory(Array.isArray(data) ? data : []);
      })
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [student.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/follow-ups`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ student_id: student.id, note, date })
      });
      if (!res.ok) throw new Error("Failed to save follow-up.");
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmail = async () => {
    setEmailing(true);
    setEmailMessage("");
    setError("");
    try {
      const res = await fetch(`${API}/follow-ups/email`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ student_id: student.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send email.");
      setEmailMessage("Email sent successfully!");
      setTimeout(() => setEmailMessage(""), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setEmailing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl shadow-2xl p-6 z-10 max-h-[90vh] flex flex-col" style={{ background: "#fff", border: "1px solid #bfdbfe" }}>
        <h3 className="text-xl font-bold mb-1" style={{ color: "#0f224a" }}>Follow-up: {student.name}</h3>
        <p className="text-xs mb-4" style={{ color: "#2563eb" }}>Parent Contact: {student.contact_number || "N/A"}</p>
        
        {error && <div className="mb-4 p-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">{error}</div>}
        {emailMessage && <div className="mb-4 p-3 rounded-lg text-sm bg-green-50 text-green-700 border border-green-200">{emailMessage}</div>}
        
        <form onSubmit={handleSubmit} className="mb-6">
          <label className="block text-sm font-medium mb-1.5" style={{ color: "#1e3a8a" }}>Add New Note for {date}</label>
          <textarea 
            required
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition mb-3" 
            style={{ borderColor: "#bfdbfe", background: "#f0f4f8" }} 
            placeholder="e.g. Called parents, student is sick today..."
          />
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium border transition-all hover:bg-gray-50" style={{ borderColor: "#bfdbfe", color: "#1e40af" }}>Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition active:scale-95 disabled:opacity-50" style={{ background: "linear-gradient(135deg, #2563eb, #1e3a8a)" }}>
              {loading ? "Saving..." : "Save Note"}
            </button>
          </div>
        </form>

        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold" style={{ color: "#1e3a8a" }}>History</h4>
            <div className="flex gap-2">
              <button 
                onClick={handleEmail}
                disabled={emailing}
                className="px-3 py-1.5 rounded text-xs font-semibold border transition hover:bg-gray-50 disabled:opacity-50"
                style={{ borderColor: "#bfdbfe", color: "#2563eb" }}
              >
                {emailing ? "Sending..." : "Email History"}
              </button>
              <button 
                onClick={() => window.open(`/dashboard/follow-ups/print?student_id=${student.id}&name=${encodeURIComponent(student.name)}&contact=${encodeURIComponent(student.contact_number || '')}&email=${encodeURIComponent(student.email || '')}`, '_blank')}
                className="px-3 py-1.5 rounded text-xs font-semibold border transition hover:bg-gray-50"
                style={{ borderColor: "#bfdbfe", color: "#2563eb" }}
              >
                Print History
              </button>
            </div>
          </div>
          {historyLoading ? (
            <p className="text-xs text-gray-500">Loading history...</p>
          ) : history.length === 0 ? (
            <p className="text-xs text-gray-500">No previous follow-ups for this student.</p>
          ) : (
            <div className="space-y-3">
              {history.map((h, i) => (
                <div key={i} className="p-3 rounded-lg border text-sm" style={{ borderColor: "#dbeafe", background: "#fafafa" }}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-xs" style={{ color: "#2563eb" }}>{h.date}</span>
                    <span className="text-[10px] text-gray-500">By: {h.creator?.name || 'Unknown'}</span>
                  </div>
                  <p style={{ color: "#0f224a" }}>{h.note}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FollowUpsPage() {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [attendances, setAttendances] = useState<Record<number, "present" | "absent" | "leave">>({});
  const [loading, setLoading] = useState(false);
  const [followUpStudent, setFollowUpStudent] = useState<Student | null>(null);

  const [editingContactId, setEditingContactId] = useState<number | null>(null);
  const [editContactValue, setEditContactValue] = useState("");
  const [savingContactId, setSavingContactId] = useState<number | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      setSearchLoading(true);
      fetch(`${API}/students?search=${encodeURIComponent(searchQuery)}`, { headers: getAuthHeaders() })
        .then(r => r.json())
        .then(data => {
          const list = Array.isArray(data) ? data : (data?.data || []);
          setSearchResults(list);
        })
        .catch(() => {})
        .finally(() => setSearchLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleEditContact = (student: Student) => {
    setEditingContactId(student.id);
    setEditContactValue(student.contact_number || "");
  };

  const handleSaveContact = async (studentId: number) => {
    setSavingContactId(studentId);
    try {
      const res = await fetch(`${API}/students/${studentId}/contact`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ contact_number: editContactValue })
      });
      if (res.ok) {
        const data = await res.json();
        setStudents(prev => prev.map(s => s.id === studentId ? { ...s, contact_number: data.contact_number } : s));
        setEditingContactId(null);
      } else {
        alert("Failed to update contact.");
      }
    } catch {
      alert("Error updating contact.");
    } finally {
      setSavingContactId(null);
    }
  };

  useEffect(() => {
    // Fetch classes
    fetch(`${API}/classes`, { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => {
        setClasses(Array.isArray(data) ? data : []);
      })
      .catch(() => {});

    // Fetch sections
    fetch(`${API}/sections`, { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => {
        setSections(Array.isArray(data) ? data : []);
      })
      .catch(() => {});
  }, []);

  // Reset section when class changes
  useEffect(() => {
    setSelectedSection("");
  }, [selectedClass]);

  const loadData = useCallback(async () => {
    if (!selectedClass || !selectedSection) return;
    setLoading(true);
    try {
      // Fetch students for class and section
      const stdRes = await fetch(`${API}/attendance-students?class_id=${selectedClass}&section_id=${selectedSection}`, { headers: getAuthHeaders() });
      const stdData = await stdRes.json();
      const stList = Array.isArray(stdData) ? stdData : [];
      // we need to make sure we also fetch email in the backend, but for now we can just use the endpoint which might not return email
      // wait, I need to update the endpoint to return email. I'll do that in a sec.
      setStudents(stList);

      // Fetch attendance records for date, class, and section
      const attRes = await fetch(`${API}/attendance?date=${date}&class_id=${selectedClass}&section_id=${selectedSection}`, { headers: getAuthHeaders() });
      const attData = await attRes.json();
      const existing = Array.isArray(attData) ? attData : [];

      const attMap: Record<number, "present" | "absent" | "leave"> = {};
      existing.forEach((r: AttendanceRecord) => {
        attMap[r.student_id] = r.status;
      });
      setAttendances(attMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [date, selectedClass, selectedSection]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Only show absent students
  const absentees = useMemo(() => {
    return students.filter(s => attendances[s.id] === "absent");
  }, [students, attendances]);

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: "#1e3a8a" }}>Follow-ups</h1>
          <p className="text-sm mt-1" style={{ color: "#2563eb" }}>Manage absentees and track parent communication.</p>
        </div>
        <button
          onClick={() => window.open(`/dashboard/follow-ups/report?date=${date}&class_id=${selectedClass}&section_id=${selectedSection}`, '_blank')}
          className="px-4 py-2.5 rounded-xl font-bold text-white transition flex items-center gap-2 shadow-sm shrink-0"
          style={{ background: "linear-gradient(135deg, #2563eb, #1e3a8a)" }}
        >
          <Printer className="w-4 h-4" />
          Full Follow-up Report (Print / PDF)
        </button>
      </div>

      {/* Student Name Search for Printing All Follow-up Reports */}
      <div className="mb-6 bg-white p-5 rounded-2xl border shadow-sm" style={{ borderColor: "#bfdbfe" }}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide flex items-center gap-2" style={{ color: "#1e3a8a" }}>
              <Printer className="w-4 h-4 text-[#2563eb]" />
              Print Follow-up Report by Student Name
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Search any student by name to generate and print their full follow-up history report.</p>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type student name to search for reports..."
            className="w-full pl-11 pr-10 py-3 rounded-xl border text-sm outline-none transition"
            style={{ background: "#f0f4f8", borderColor: "#bfdbfe", color: "#0f224a" }}
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(""); setSearchResults([]); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {searchQuery.trim() !== "" && (
          <div className="mt-4 border-t pt-4" style={{ borderColor: "#dbeafe" }}>
            {searchLoading ? (
              <p className="text-xs text-gray-500 py-2">Searching students...</p>
            ) : searchResults.length === 0 ? (
              <p className="text-xs text-gray-500 py-2">No students found matching "{searchQuery}".</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {searchResults.map((s) => {
                  const className = s.academy_class?.name || s.academyClass?.name || "";
                  const secName = s.section?.name || "";
                  const classSec = [className, secName].filter(Boolean).join(" - ");
                  return (
                    <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border transition gap-3" style={{ borderColor: "#bfdbfe", background: "#fafafa" }}>
                      <div>
                        <span className="font-bold text-sm text-[#0f224a]">{s.name}</span>
                        {classSec && <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-[#f0f4f8] text-[#2563eb] border border-[#bfdbfe]">{classSec}</span>}
                        <p className="text-xs text-gray-500 mt-0.5">Contact: {s.contact_number || "N/A"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => window.open(`/dashboard/follow-ups/print?student_id=${s.id}&name=${encodeURIComponent(s.name)}&contact=${encodeURIComponent(s.contact_number || '')}&email=${encodeURIComponent(s.email || '')}`, '_blank')}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white transition flex items-center gap-1.5 shadow-sm"
                          style={{ background: "linear-gradient(135deg, #2563eb, #1e3a8a)" }}
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Print All Follow-up Reports
                        </button>
                        <button
                          onClick={() => setFollowUpStudent(s)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition hover:bg-white"
                          style={{ borderColor: "#bfdbfe", color: "#2563eb", background: "#fff" }}
                        >
                          + Follow-up
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6 bg-white p-4 rounded-2xl border shadow-sm" style={{ borderColor: "#bfdbfe" }}>
        <div className="flex-1">
          <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "#2563eb" }}>Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-medium px-4 py-6 rounded-xl border transition-all hover:bg-white",
                  !date && "text-muted-foreground"
                )}
                style={{ background: "#f0f4f8", borderColor: "#bfdbfe", color: "#0f224a" }}
              >
                <CalendarIcon className="mr-3 h-5 w-5 text-[#2563eb]" />
                {date ? format(new Date(date), "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-2xl shadow-xl border-[#bfdbfe] bg-white">
              <Calendar
                mode="single"
                selected={new Date(date)}
                onSelect={(d) => {
                  if (d) {
                    const localDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
                    setDate(localDate.toISOString().split("T")[0]);
                  }
                }}

                className="p-4"
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex-1 relative">
          <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "#2563eb" }}>Class</label>
          <div className="relative">
            <select 
              value={selectedClass} 
              onChange={(e) => setSelectedClass(e.target.value)} 
              className="w-full px-4 py-3.5 appearance-none rounded-xl border outline-none font-medium transition cursor-pointer hover:bg-white" 
              style={{ background: "#f0f4f8", borderColor: "#bfdbfe", color: "#0f224a" }}
            >
              <option value="">-- Select Class --</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none text-[#2563eb]" />
          </div>
        </div>
        <div className="flex-1 relative">
          <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "#2563eb" }}>Section</label>
          <div className="relative">
            <select 
              value={selectedSection} 
              onChange={(e) => setSelectedSection(e.target.value)} 
              disabled={!selectedClass}
              className="w-full px-4 py-3.5 appearance-none rounded-xl border outline-none font-medium transition cursor-pointer hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#f0f4f8]" 
              style={{ background: "#f0f4f8", borderColor: "#bfdbfe", color: "#0f224a" }}
            >
              <option value="">-- Select Section --</option>
              {sections.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none text-[#2563eb]" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <svg className="animate-spin w-8 h-8" style={{ color: "#2563eb" }} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
        </div>
      ) : !selectedClass || !selectedSection ? (
        <div className="text-center py-20 text-gray-400 font-medium">Select a class and section to view absentees</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{ borderColor: "#bfdbfe" }}>
          {absentees.length === 0 ? (
            <div className="text-center py-20 font-medium" style={{ color: "#2563eb" }}>
              <div className="text-4xl mb-4">🎉</div>
              No absentees for this class and section today!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "#f0f4f8", borderBottom: "1px solid #bfdbfe" }}>
                    <th className="text-left px-5 py-4 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Student Name</th>
                    <th className="text-left px-5 py-4 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Contact Number</th>
                    <th className="text-right px-5 py-4 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: "#dbeafe" }}>
                  {absentees.map(student => (
                    <tr key={student.id} className="transition-colors hover:bg-gray-50">
                      <td className="px-5 py-4 font-bold" style={{ color: "#0f224a" }}>
                        {student.name}
                        <span className="ml-2 inline-block w-2 h-2 rounded-full bg-red-500"></span>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs" style={{ color: "#1e40af" }}>
                        {editingContactId === student.id ? (
                          <div className="flex items-center gap-1 font-sans">
                            <input 
                              type="text" 
                              value={editContactValue}
                              onChange={(e) => setEditContactValue(e.target.value)}
                              className="border border-gray-300 rounded px-2 py-1 text-xs outline-none focus:border-[#2563eb] transition-colors"
                              placeholder="Contact Number"
                            />
                            <button onClick={() => handleSaveContact(student.id)} disabled={savingContactId === student.id} className="text-green-700 hover:bg-green-100 font-bold bg-green-50 px-2 py-1 rounded transition-colors disabled:opacity-50">
                              {savingContactId === student.id ? "..." : "Save"}
                            </button>
                            <button onClick={() => setEditingContactId(null)} className="text-gray-600 hover:bg-gray-200 font-bold bg-gray-100 px-2 py-1 rounded transition-colors">Cancel</button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <span>{student.contact_number || "Not provided"}</span>
                              <button onClick={() => handleEditContact(student)} className="text-[#2563eb] hover:text-[#1e3a8a] font-bold text-[10px] bg-[#f0f4f8] px-2 py-0.5 rounded border border-[#bfdbfe] transition-colors font-sans">Edit</button>
                            </div>
                            {student.contact_number && (
                              <div className="flex gap-2 mt-2 font-sans">
                                <a 
                                  href={`tel:${student.contact_number.replace(/[^0-9+]/g, '')}`} 
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 transition hover:bg-blue-100"
                                >
                                  <Phone className="w-3 h-3" />
                                  Call
                                </a>
                                <a 
                                  href={`https://wa.me/${student.contact_number.replace(/[^0-9+]/g, '')}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 transition hover:bg-green-100"
                                >
                                  <MessageCircle className="w-3 h-3" />
                                  WhatsApp
                                </a>
                              </div>
                            )}
                          </>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button 
                          onClick={() => setFollowUpStudent(student)} 
                          className="text-xs font-semibold px-4 py-2 rounded-lg border transition hover:bg-white" 
                          style={{ borderColor: "#bfdbfe", color: "#2563eb", background: "#f0f4f8" }}
                        >
                          + Follow-up
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {followUpStudent && (
        <FollowUpModal student={followUpStudent} date={date} onClose={() => setFollowUpStudent(null)} />
      )}
    </DashboardLayout>
  );
}
