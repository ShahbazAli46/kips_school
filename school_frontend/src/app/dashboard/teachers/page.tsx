"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import CustomDropdown from "@/components/CustomDropdown";
import NumberInput from "@/components/NumberInput";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AcademyClass { id: number; name: string; sections?: { id: number; name: string }[]; }
interface Subject { id: number; name: string; }
interface TeacherAssignment {
  id: number;
  class_id: number;
  section_id: number;
  subject_id: number;
  payment_type?: string;
  fixed_amount?: number | string | null;
  academy_class: { id: number; name: string };
  section: { id: number; name: string };
  subject: { id: number; name: string };
}

interface AppDetails {
  device_name: string | null;
  device_type: string | null;
  app_version: string | null;
  last_used_at: string | null;
}

interface LocationTelemetry {
  presence_status: "inside_academy" | "outside_academy" | "no_pings_today";
  total_pings_today: number;
  inside_pings_today: number;
  latest_distance_meters: number | null;
  latest_accuracy_meters: number | null;
  latest_battery_level: number | null;
  latest_ping_time: string | null;
  latest_ping_human: string | null;
  first_arrival_time: string | null;
  latest_latitude: number | null;
  latest_longitude: number | null;
}

interface TodayAttendance {
  status: string;
  check_in_time: string | null;
  check_out_time: string | null;
}

interface Teacher {
  id: number;
  name: string;
  email: string | null;
  contact_number: string | null;
  qualification: string | null;
  emergency_contact: string | null;
  teaching_exp_year: number | null;
  monthly_salary: string | null;
  image: string | null;
  teacher_assignments?: TeacherAssignment[];
  is_online?: boolean;
  last_seen_at?: string | null;
  last_seen_human?: string;
  has_app?: boolean;
  app_details?: AppDetails | null;
  location_telemetry?: LocationTelemetry;
  today_attendance?: TodayAttendance;
}

interface LocationTrailItem {
  id: number;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  distance_meters: number;
  is_inside_geofence: boolean;
  device_info: string | null;
  battery_level: number | null;
  recorded_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const STORAGE_URL = process.env.NEXT_PUBLIC_STORAGE_URL || "http://localhost:8000/storage";

function getAuthHeaders(isFormData = false) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: any = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

// ─── Location Trail Modal ─────────────────────────────────────────────────────
interface LocationTrailModalProps {
  teacher: Teacher;
  onClose: () => void;
}

function LocationTrailModal({ teacher, onClose }: LocationTrailModalProps) {
  const [trail, setTrail] = useState<LocationTrailItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTrail() {
      try {
        const res = await fetch(`${API}/admin/teachers/${teacher.id}/location-trail`, {
          headers: getAuthHeaders(),
        });
        const json = await res.json();
        setTrail(json.trail || []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    loadTrail();
  }, [teacher.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div className="relative w-full max-w-xl rounded-2xl shadow-2xl p-6 z-10 max-h-[90vh] flex flex-col" style={{ background: "#fff", border: "1px solid #bfdbfe" }}>
        <div className="flex justify-between items-start mb-4 pb-3 border-b" style={{ borderColor: "#dbeafe" }}>
          <div>
            <h3 className="text-lg font-bold" style={{ color: "#0f224a" }}>
              📍 GPS Location Trail — {teacher.name}
            </h3>
            <p className="text-xs text-[#38bdf8]">Today&apos;s real-time Academy Geofence check-ins</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><svg className="animate-spin w-7 h-7 text-[#2563eb]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg></div>
        ) : trail.length === 0 ? (
          <div className="py-12 text-center text-[#38bdf8] text-sm">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
            No GPS location pings recorded for this teacher today.
          </div>
        ) : (
          <div className="overflow-y-auto space-y-3 pr-1">
            {trail.map((item, idx) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl border flex items-center justify-between transition-all"
                style={{
                  background: item.is_inside_geofence ? "#f0fdf4" : "#fafafa",
                  borderColor: item.is_inside_geofence ? "#bbf7d0" : "#bfdbfe",
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                      item.is_inside_geofence ? "bg-emerald-600 text-white shadow-sm" : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    #{idx + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded ${
                          item.is_inside_geofence
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : "bg-amber-100 text-amber-800 border border-amber-300"
                        }`}
                      >
                        {item.is_inside_geofence ? "✓ Inside Academy (≤50m)" : "Outside Geofence"}
                      </span>
                      <span className="text-xs font-semibold text-[#0f224a]">
                        {item.distance_meters < 1000
                          ? `${item.distance_meters}m away`
                          : `${(item.distance_meters / 1000).toFixed(2)} km away`}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#1e40af] mt-1 flex items-center gap-3">
                      <span>Coordinates: {Number(item.latitude).toFixed(5)}, {Number(item.longitude).toFixed(5)}</span>
                      {item.accuracy && <span>Accuracy: ±{Math.round(item.accuracy)}m</span>}
                      {item.battery_level && <span>🔋 {item.battery_level}%</span>}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-[#1e3a8a]">
                    {new Date(item.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-5 pt-3 border-t flex justify-end" style={{ borderColor: "#dbeafe" }}>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg text-sm font-semibold border transition"
            style={{ borderColor: "#bfdbfe", color: "#1e40af", background: "#f0f4f8" }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── App Details Modal ────────────────────────────────────────────────────────
interface AppDetailsModalProps {
  teacher: Teacher;
  onClose: () => void;
  onRequestPing: (teacher: Teacher) => void;
  pinging: boolean;
}

function AppDetailsModal({ teacher, onClose, onRequestPing, pinging }: AppDetailsModalProps) {
  const telemetry = teacher.location_telemetry;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl shadow-2xl p-6 z-10 max-h-[90vh] overflow-y-auto" style={{ background: "#fff", border: "1px solid #bfdbfe" }}>
        <div className="flex justify-between items-start mb-4 pb-3 border-b" style={{ borderColor: "#dbeafe" }}>
          <div className="flex items-center gap-3">
            {teacher.image ? (
              <img
                src={teacher.image.startsWith("http") ? teacher.image : `${STORAGE_URL}/${teacher.image}`}
                alt={teacher.name}
                className="w-11 h-11 rounded-full object-cover border"
                style={{ borderColor: "#bfdbfe" }}
              />
            ) : (
              <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0" style={{ background: "linear-gradient(135deg, #38bdf8, #2563eb)" }}>
                {teacher.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h3 className="text-base font-bold" style={{ color: "#0f224a" }}>{teacher.name}</h3>
              <p className="text-xs" style={{ color: "#38bdf8" }}>{teacher.email || "No email"}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Live Status Badge */}
        <div className="p-3 rounded-xl mb-4 flex items-center justify-between" style={{ background: teacher.is_online ? "#ecfdf5" : "#f0f4f8", border: `1px solid ${teacher.is_online ? "#a7f3d0" : "#bfdbfe"}` }}>
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              {teacher.is_online && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-3 w-3 ${teacher.is_online ? "bg-emerald-500" : "bg-gray-400"}`}></span>
            </span>
            <span className={`text-xs font-bold ${teacher.is_online ? "text-emerald-800" : "text-[#2563eb]"}`}>
              {teacher.is_online ? "Active & Online Now" : "Currently Offline"}
            </span>
          </div>
          <span className="text-xs font-medium text-[#1e40af]">
            {teacher.last_seen_human || "Never"}
          </span>
        </div>

        {/* GPS Geofence Telemetry */}
        <div className="space-y-3 mb-5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#2563eb]">Academy GPS & Geofence Status</h4>
          <div className="p-4 rounded-xl border space-y-2.5" style={{ background: "#fafafa", borderColor: "#bfdbfe" }}>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#1e40af] font-medium">Academy Presence:</span>
              <span
                className={`font-bold px-2 py-0.5 rounded text-xs ${
                  telemetry?.presence_status === "inside_academy"
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : telemetry?.presence_status === "outside_academy"
                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                    : "bg-gray-100 text-gray-700 border border-gray-300"
                }`}
              >
                {telemetry?.presence_status === "inside_academy"
                  ? "📍 Inside Academy (≤50m)"
                  : telemetry?.presence_status === "outside_academy"
                  ? "🚗 Outside Academy"
                  : "⚠️ No GPS Telemetry Today"}
              </span>
            </div>

            {telemetry?.latest_distance_meters !== null && telemetry?.latest_distance_meters !== undefined && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#1e40af] font-medium">Distance from Center:</span>
                <span className="font-bold text-[#0f224a]">
                  {telemetry.latest_distance_meters < 1000
                    ? `${telemetry.latest_distance_meters} meters`
                    : `${(telemetry.latest_distance_meters / 1000).toFixed(2)} km`}
                </span>
              </div>
            )}

            {telemetry?.first_arrival_time && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#1e40af] font-medium">First Arrival Detected:</span>
                <span className="font-semibold text-emerald-700">{telemetry.first_arrival_time}</span>
              </div>
            )}

            <div className="flex justify-between items-center text-xs">
              <span className="text-[#1e40af] font-medium">Inside Pings Today:</span>
              <span className="font-semibold text-[#1e3a8a]">{telemetry?.inside_pings_today || 0} of 4 required</span>
            </div>

            {telemetry?.latest_ping_time && (
              <div className="flex justify-between items-center text-xs pt-1 border-t" style={{ borderColor: "#f0e2db" }}>
                <span className="text-[#1e40af] font-medium">Latest Check-in Time:</span>
                <span className="font-medium text-[#2563eb]">{telemetry.latest_ping_time} ({telemetry.latest_ping_human})</span>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Device Info */}
        <div className="space-y-3 mb-5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#2563eb]">Device & App Info</h4>
          {teacher.has_app ? (
            <div className="p-4 rounded-xl border space-y-2.5" style={{ background: "#fafafa", borderColor: "#bfdbfe" }}>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#1e40af] font-medium">Device Model:</span>
                <span className="font-bold text-[#0f224a]">{teacher.app_details?.device_name || "Android Device"}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#1e40af] font-medium">Platform / OS:</span>
                <span className="capitalize font-semibold text-[#1e3a8a]">{teacher.app_details?.device_type || "Android"}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#1e40af] font-medium">App Version:</span>
                <span className="font-semibold text-[#1e3a8a]">v{teacher.app_details?.app_version || "1.0"}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#1e40af] font-medium">Push Notification Channel:</span>
                <span className="text-emerald-700 font-semibold">Ready & Registered</span>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl border text-center space-y-2" style={{ background: "#fffaf7", borderColor: "#dbeafe" }}>
              <p className="text-xs font-bold text-[#1e3a8a]">Mobile App Not Installed Yet</p>
              <p className="text-[11px] text-[#38bdf8]">
                This teacher has not logged in through the USA Chunian mobile app yet.
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {teacher.has_app && (
            <button
              onClick={() => onRequestPing(teacher)}
              disabled={pinging}
              className="flex-1 py-2.5 rounded-lg text-xs font-bold text-white transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #0284c7, #0369a1)" }}
            >
              <svg className={`w-4 h-4 ${pinging ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              {pinging ? "Pinging..." : "⚡ Ping Device Now"}
            </button>
          )}

          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-xs font-semibold border transition" style={{ borderColor: "#bfdbfe", color: "#1e40af", background: "#f0f4f8" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Teacher Modal ────────────────────────────────────────────────────────────
interface TeacherModalProps {
  title: string;
  initialData?: Teacher;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
  loading: boolean;
  error?: string;
}

function TeacherModal({ title, initialData, onClose, onSubmit, loading, error }: TeacherModalProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    email: initialData?.email || "",
    contact_number: initialData?.contact_number || "",
    qualification: initialData?.qualification || "",
    emergency_contact: initialData?.emergency_contact || "",
    teaching_exp_year: initialData?.teaching_exp_year?.toString() || "",
    monthly_salary: initialData?.monthly_salary?.toString() || "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    setUserRole(localStorage.getItem("userRole"));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData();
    data.append("name", formData.name);
    data.append("email", formData.email);
    if (formData.contact_number) data.append("contact_number", formData.contact_number);
    if (formData.qualification) data.append("qualification", formData.qualification);
    if (formData.emergency_contact) data.append("emergency_contact", formData.emergency_contact);
    if (formData.teaching_exp_year) data.append("teaching_exp_year", formData.teaching_exp_year);
    if (userRole !== "5" && formData.monthly_salary) data.append("monthly_salary", formData.monthly_salary);
    if (imageFile) data.append("image", imageFile);

    onSubmit(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl shadow-2xl p-6 z-10 max-h-[90vh] overflow-y-auto" style={{ background: "#fff", border: "1px solid #bfdbfe" }}>
        <h3 className="text-xl font-bold mb-4" style={{ color: "#0f224a" }}>{title}</h3>
        {error && <div className="mb-4 p-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#1e3a8a" }}>Full Name *</label>
              <input required type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition" style={{ borderColor: "#bfdbfe", background: "#f0f4f8" }} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#1e3a8a" }}>Email *</label>
              <input required type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="teacher@example.com" className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition" style={{ borderColor: "#bfdbfe", background: "#f0f4f8" }} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#1e3a8a" }}>Contact Number</label>
              <input type="text" value={formData.contact_number} onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition" style={{ borderColor: "#bfdbfe", background: "#f0f4f8" }} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#1e3a8a" }}>Qualification</label>
              <input type="text" value={formData.qualification} onChange={(e) => setFormData({ ...formData, qualification: e.target.value })} placeholder="e.g. MS Computer Science" className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition" style={{ borderColor: "#bfdbfe", background: "#f0f4f8" }} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#1e3a8a" }}>Emergency Contact</label>
              <input type="text" value={formData.emergency_contact} onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition" style={{ borderColor: "#bfdbfe", background: "#f0f4f8" }} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#1e3a8a" }}>Teaching Experience (Starting Year)</label>
              <input type="number" value={formData.teaching_exp_year} onChange={(e) => setFormData({ ...formData, teaching_exp_year: e.target.value })} placeholder="e.g. 2012" className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition" style={{ borderColor: "#bfdbfe", background: "#f0f4f8" }} />
            </div>
            {userRole !== "5" && (
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "#1e3a8a" }}>Monthly Salary (Rs) <span className="text-[10px] text-gray-400 font-normal">— for non-subject teachers</span></label>
                <input type="number" min="0" step="0.01" value={formData.monthly_salary} onChange={(e) => setFormData({ ...formData, monthly_salary: e.target.value })} placeholder="e.g. 15000" className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition" style={{ borderColor: "#bfdbfe", background: "#f0f4f8" }} />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#1e3a8a" }}>Profile Photo (Optional)</label>
              <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="w-full text-sm file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#f0f4f8] file:text-[#2563eb] hover:file:bg-[#dbeafe]" />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t" style={{ borderColor: "#dbeafe" }}>
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium border transition" style={{ borderColor: "#bfdbfe", color: "#1e40af", background: "#f0f4f8" }}>Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition active:scale-95 disabled:opacity-50" style={{ background: "linear-gradient(135deg, #2563eb, #1e3a8a)" }}>{loading ? "Saving..." : "Save Teacher"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Modal ──────────────────────────────────────────────────────────────
interface DeleteModalProps {
  teacherName: string;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

function DeleteModal({ teacherName, onClose, onConfirm, loading }: DeleteModalProps) {
  const [confirmText, setConfirmText] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl shadow-2xl p-6 z-10 text-center" style={{ background: "#fff", border: "1px solid #fca5a5" }}>
        <h3 className="text-lg font-bold mb-2 text-[#0b1329]">Delete Teacher?</h3>
        <p className="text-sm mb-4 text-[#1e40af]">Are you sure you want to delete <strong>&quot;{teacherName}&quot;</strong>? This action cannot be undone.</p>

        <div className="mb-6 text-left">
          <label className="block text-xs font-medium mb-1.5 text-[#1e3a8a]">Type <strong>{teacherName}</strong> to confirm:</label>
          <input type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition" style={{ borderColor: "#fca5a5", background: "#fef2f2", color: "#991b1b" }} placeholder={teacherName} />
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium border transition" style={{ borderColor: "#bfdbfe", color: "#1e40af", background: "#f0f4f8" }}>Cancel</button>
          <button onClick={onConfirm} disabled={loading || confirmText !== teacherName} className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition active:scale-95 disabled:opacity-50" style={{ background: "#dc2626" }}>{loading ? "Deleting..." : "Delete"}</button>
        </div>
      </div>
    </div>
  );
}

interface AssignmentModalProps {
  teacher: Teacher;
  classes: AcademyClass[];
  subjects: Subject[];
  onClose: () => void;
}

// ─── Assignment Modal ────────────────────────────────────────────────────────
function AssignmentModal({ teacher, classes, subjects, onClose }: AssignmentModalProps) {
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [selectedClass, setSelectedClass] = useState<number | "">("");
  const [selectedSection, setSelectedSection] = useState<number | "">("");
  const [selectedSubject, setSelectedSubject] = useState<number | "">("");
  const [paymentType, setPaymentType] = useState<'fixed' | 'percentage'>('fixed');
  const [fixedAmount, setFixedAmount] = useState<string>("");

  const fetchAssignments = useCallback(async () => {
    try {
      const res = await fetch(`${API}/teachers/${teacher.id}/assignments`, { headers: getAuthHeaders() });
      const data = await res.json();
      setAssignments(Array.isArray(data) ? data : []);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [teacher.id]);

  useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

  const handleAdd = async () => {
    if (!selectedClass || !selectedSubject) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${API}/teachers/${teacher.id}/assignments`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          class_id: selectedClass,
          section_id: selectedSection || null,
          subject_id: selectedSubject,
          payment_type: paymentType,
          fixed_amount: paymentType === 'fixed' && fixedAmount ? parseFloat(fixedAmount) : null
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to add assignment");
      setAssignments(json);
      setSelectedSubject("");
      setFixedAmount("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (assignmentId: number) => {
    try {
      const res = await fetch(`${API}/teachers/${teacher.id}/assignments/${assignmentId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete assignment from server");
      setAssignments(prev => prev.filter(a => a.id !== assignmentId));
    } catch (err: any) {
      setError(err.message || "Failed to delete assignment");
    }
  };

  const availableSections = classes.find(c => c.id === selectedClass)?.sections || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl shadow-2xl p-6 z-10 max-h-[90vh] flex flex-col" style={{ background: "#fff", border: "1px solid #bfdbfe" }}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold" style={{ color: "#0f224a" }}>Manage Assignments — {teacher.name}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {error && <div className="mb-4 p-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">{error}</div>}

        {loading ? (
          <div className="flex justify-center py-10"><svg className="animate-spin w-6 h-6 text-[#2563eb]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg></div>
        ) : (
          <div className="flex flex-col md:flex-row gap-6 overflow-y-auto">
            {/* Left: Add Form */}
            <div className="w-full md:w-1/2 flex flex-col gap-4 p-4 rounded-xl border shrink-0" style={{ borderColor: "#dbeafe", background: "#fafafa" }}>
              <h4 className="font-bold text-sm" style={{ color: "#1e3a8a" }}>Add New Assignment</h4>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#1e40af" }}>Class *</label>
                <CustomDropdown
                  name="class_id"
                  placeholder="-- Choose Class --"
                  options={classes.map(c => ({ label: c.name, value: c.id }))}
                  value={selectedClass}
                  onChange={(_, val) => { setSelectedClass(val ? Number(val) : ""); setSelectedSection(""); }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#1e40af" }}>Section (Optional)</label>
                <CustomDropdown
                  name="section_id"
                  placeholder={!selectedClass ? "Select class first" : availableSections.length === 0 ? "No sections available" : "-- All / No Section --"}
                  options={availableSections.map(s => ({ label: s.name, value: s.id }))}
                  value={selectedSection}
                  onChange={(_, val) => setSelectedSection(val ? Number(val) : "")}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#1e40af" }}>Subject *</label>
                <CustomDropdown
                  name="subject_id"
                  placeholder="-- Choose Subject --"
                  options={subjects.map(s => ({ label: s.name, value: s.id }))}
                  value={selectedSubject}
                  onChange={(_, val) => setSelectedSubject(val ? Number(val) : "")}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "#1e40af" }}>Payment</label>
                  <CustomDropdown
                    name="payment_type"
                    placeholder="Select type"
                    options={[
                      { label: "Fixed Amount", value: "fixed" },
                      { label: "Percentage", value: "percentage" },
                    ]}
                    value={paymentType}
                    onChange={(_, val) => setPaymentType(val as any)}
                  />
                </div>
                {paymentType === 'fixed' && (
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: "#1e40af" }}>Amount</label>
                    <NumberInput
                      value={fixedAmount}
                      onChange={setFixedAmount}
                      placeholder="Enter amount"
                      min={0}
                    />
                  </div>
                )}
              </div>

              <button onClick={handleAdd} disabled={saving || !selectedClass || !selectedSubject} className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition active:scale-95 disabled:opacity-50 mt-2" style={{ background: "linear-gradient(135deg, #2563eb, #1e3a8a)" }}>
                {saving ? "Adding..." : "Add Assignment"}
              </button>
            </div>

            {/* Right: Current Assignments List */}
            <div className="w-full md:w-1/2 flex flex-col min-h-[300px]">
              <h4 className="font-bold text-sm mb-3" style={{ color: "#1e3a8a" }}>Current Assignments</h4>
              {assignments.length === 0 ? (
                <div className="flex-1 flex items-center justify-center border rounded-xl p-4 text-sm text-[#38bdf8] text-center" style={{ borderColor: "#dbeafe", background: "#fafafa" }}>
                  No assignments yet.
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto border rounded-xl border-[#dbeafe] divide-y divide-[#dbeafe]" style={{ background: "#fafafa" }}>
                  {assignments.map(a => (
                    <div key={a.id} className="p-3 flex justify-between items-center bg-white hover:bg-[#f0f4f8] transition-colors">
                      <div>
                        <p className="text-[13px] font-bold text-[#0f224a]">
                          {a.academy_class?.name} {a.section ? `(${a.section.name})` : ''} — {a.subject?.name}
                        </p>
                        <p className="text-[11px] text-[#38bdf8]">
                          {a.payment_type === 'fixed' ? `Fixed: Rs ${a.fixed_amount || 0}` : 'Percentage Pool'}
                        </p>
                      </div>
                      <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition" title="Remove">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ManageTeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<AcademyClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "at_academy" | "online" | "outside" | "no_pings" | "has_app">("all");
  const [userRole, setUserRole] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Teacher | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Teacher | null>(null);
  const [assignmentTarget, setAssignmentTarget] = useState<Teacher | null>(null);
  const [appDetailsTarget, setAppDetailsTarget] = useState<Teacher | null>(null);
  const [locationTrailTarget, setLocationTrailTarget] = useState<Teacher | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  const [pingingTeacherId, setPingingTeacherId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const [resPresence, resC, resS] = await Promise.all([
        fetch(`${API}/admin/teachers/live-presence`, { headers: getAuthHeaders() }),
        fetch(`${API}/classes`, { headers: getAuthHeaders() }),
        fetch(`${API}/subjects`, { headers: getAuthHeaders() }),
      ]);
      const dataP = await resPresence.json();
      setTeachers(dataP.teachers || []);
      setSummary(dataP.summary || null);

      const dataC = await resC.json();
      setClasses(Array.isArray(dataC) ? dataC : []);
      const dataS = await resS.json();
      setSubjects(Array.isArray(dataS) ? dataS : []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setUserRole(localStorage.getItem("userRole"));
    fetchData();

    // Auto-refresh presence every 20 seconds
    const interval = setInterval(() => {
      fetchData(true);
    }, 20000);

    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRequestPing = async (teacher: Teacher) => {
    setPingingTeacherId(teacher.id);
    try {
      const res = await fetch(`${API}/admin/teachers/${teacher.id}/request-location-ping`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (res.ok) {
        showToast(`⚡ GPS location request sent to ${teacher.name}'s phone!`);
        setTimeout(() => fetchData(true), 3000);
      } else {
        showToast(`❌ ${json.message || "Failed to ping teacher device"}`);
      }
    } catch {
      showToast("❌ Network error while sending ping request");
    } finally {
      setPingingTeacherId(null);
    }
  };

  const handleCreate = async (formData: FormData) => {
    setModalLoading(true);
    setModalError("");
    try {
      const res = await fetch(`${API}/teachers`, {
        method: "POST",
        headers: getAuthHeaders(true),
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to create teacher");

      setShowCreate(false);
      fetchData(true);
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const handleUpdate = async (formData: FormData) => {
    if (!editTarget) return;
    setModalLoading(true);
    setModalError("");
    try {
      const res = await fetch(`${API}/teachers/${editTarget.id}`, {
        method: "POST",
        headers: getAuthHeaders(true),
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to update teacher");

      setEditTarget(null);
      fetchData(true);
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setModalLoading(true);
    try {
      await fetch(`${API}/teachers/${deleteTarget.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      setDeleteTarget(null);
      fetchData(true);
    } finally {
      setModalLoading(false);
    }
  };

  // Stats calculation
  const totalCount = summary?.total_teachers ?? teachers.length;
  const onlineCount = summary?.online_now ?? teachers.filter(t => t.is_online).length;
  const atAcademyCount = summary?.at_academy_today ?? teachers.filter(t => t.location_telemetry?.presence_status === "inside_academy").length;
  const outsideCount = summary?.outside_academy ?? teachers.filter(t => t.location_telemetry?.presence_status === "outside_academy").length;
  const noPingsCount = summary?.no_pings_today ?? teachers.filter(t => t.location_telemetry?.presence_status === "no_pings_today").length;
  const appInstalledCount = summary?.app_installed ?? teachers.filter(t => t.has_app).length;

  // Filtered teachers
  const filtered = useMemo(() => {
    return teachers.filter((t) => {
      const matchesSearch =
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.email && t.email.toLowerCase().includes(search.toLowerCase())) ||
        (t.qualification && t.qualification.toLowerCase().includes(search.toLowerCase())) ||
        (t.contact_number && t.contact_number.includes(search)) ||
        (t.app_details?.device_name && t.app_details.device_name.toLowerCase().includes(search.toLowerCase()));

      if (!matchesSearch) return false;

      if (statusFilter === "at_academy") return t.location_telemetry?.presence_status === "inside_academy";
      if (statusFilter === "online") return t.is_online;
      if (statusFilter === "outside") return t.location_telemetry?.presence_status === "outside_academy";
      if (statusFilter === "no_pings") return t.location_telemetry?.presence_status === "no_pings_today";
      if (statusFilter === "has_app") return t.has_app;
      return true;
    });
  }, [teachers, search, statusFilter]);

  const isOfficeAdmin = userRole === "5";

  return (
    <DashboardLayout>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0b1329] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-[#2563eb] animate-bounce">
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "#0f224a" }}>Teachers & Real-Time Presence</h2>
          <p className="text-sm mt-1" style={{ color: "#2563eb" }}>
            Live GPS telemetry, academy geofence arrivals (2:00 PM – 4:30 PM), and mobile app tracking
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition active:scale-95 bg-white hover:bg-[#f0f4f8]"
            style={{ borderColor: "#bfdbfe", color: "#1e40af" }}
            title="Refresh presence"
          >
            <svg className={`w-4 h-4 ${refreshing ? "animate-spin text-[#2563eb]" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{refreshing ? "Updating..." : "Refresh"}</span>
          </button>

          {!isOfficeAdmin && (
            <button
              onClick={() => { setModalError(""); setShowCreate(true); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md transition-all active:scale-95 hover:shadow-lg"
              style={{ background: "linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%)" }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add Teacher
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 mb-6">
        {/* Card 1: Total */}
        <div
          onClick={() => setStatusFilter("all")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${statusFilter === "all" ? "ring-2 ring-[#2563eb] shadow-md" : "hover:border-[#2563eb]"}`}
          style={{ background: "#fff", borderColor: "#bfdbfe" }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563eb]">Total Faculty</span>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#f0f4f8", color: "#2563eb" }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
          </div>
          <div className="text-2xl font-black text-[#0f224a]">{totalCount}</div>
          <p className="text-[10px] text-[#38bdf8] mt-0.5">Teaching staff</p>
        </div>

        {/* Card 2: At Academy Geofence */}
        <div
          onClick={() => setStatusFilter("at_academy")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${statusFilter === "at_academy" ? "ring-2 ring-emerald-500 shadow-md" : "hover:border-emerald-300"}`}
          style={{ background: "#fff", borderColor: "#bfdbfe" }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">📍 At Academy</span>
            <span className="relative flex h-2.5 w-2.5">
              {atAcademyCount > 0 && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${atAcademyCount > 0 ? "bg-emerald-500" : "bg-gray-300"}`}></span>
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-800">{atAcademyCount}</div>
          <p className="text-[10px] text-emerald-600 mt-0.5">Inside 50m geofence</p>
        </div>

        {/* Card 3: Online Now */}
        <div
          onClick={() => setStatusFilter("online")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${statusFilter === "online" ? "ring-2 ring-teal-500 shadow-md" : "hover:border-teal-300"}`}
          style={{ background: "#fff", borderColor: "#bfdbfe" }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700">🟢 Online Now</span>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-teal-50 text-teal-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.828a5 5 0 010-7.072m7.072 0a5 5 0 010 7.072M13 12a1 1 0 11-2 0 1 1 0 012 0z" /></svg>
            </div>
          </div>
          <div className="text-2xl font-black text-teal-900">{onlineCount}</div>
          <p className="text-[10px] text-teal-600 mt-0.5">Active in last 5m</p>
        </div>

        {/* Card 4: Outside Academy */}
        <div
          onClick={() => setStatusFilter("outside")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${statusFilter === "outside" ? "ring-2 ring-amber-500 shadow-md" : "hover:border-amber-300"}`}
          style={{ background: "#fff", borderColor: "#bfdbfe" }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">🚗 Outside</span>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
            </div>
          </div>
          <div className="text-2xl font-black text-amber-900">{outsideCount}</div>
          <p className="text-[10px] text-amber-600 mt-0.5">&gt;50m from academy</p>
        </div>

        {/* Card 5: App Installed */}
        <div
          onClick={() => setStatusFilter("has_app")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${statusFilter === "has_app" ? "ring-2 ring-indigo-500 shadow-md" : "hover:border-indigo-300"}`}
          style={{ background: "#fff", borderColor: "#bfdbfe" }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">📱 App Users</span>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-indigo-50 text-indigo-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-900">{appInstalledCount}</div>
          <p className="text-[10px] text-indigo-600 mt-0.5">APK Active</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${statusFilter === "all" ? "bg-[#2563eb] text-white shadow-sm" : "bg-white text-[#1e40af] border border-[#bfdbfe] hover:bg-[#f0f4f8]"}`}
          >
            All Staff ({totalCount})
          </button>
          <button
            onClick={() => setStatusFilter("at_academy")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${statusFilter === "at_academy" ? "bg-emerald-600 text-white shadow-sm" : "bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50"}`}
          >
            📍 At Academy ({atAcademyCount})
          </button>
          <button
            onClick={() => setStatusFilter("online")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${statusFilter === "online" ? "bg-teal-600 text-white shadow-sm" : "bg-white text-teal-800 border border-teal-200 hover:bg-teal-50"}`}
          >
            🟢 Online ({onlineCount})
          </button>
          <button
            onClick={() => setStatusFilter("outside")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${statusFilter === "outside" ? "bg-amber-600 text-white shadow-sm" : "bg-white text-amber-800 border border-amber-200 hover:bg-amber-50"}`}
          >
            🚗 Outside ({outsideCount})
          </button>
          <button
            onClick={() => setStatusFilter("no_pings")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${statusFilter === "no_pings" ? "bg-gray-700 text-white shadow-sm" : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"}`}
          >
            ⚠️ No GPS ({noPingsCount})
          </button>
        </div>

        <div className="relative max-w-xs w-full">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#38bdf8]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search teacher, phone, device..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border text-sm outline-none transition"
            style={{ background: "#fff", borderColor: "#bfdbfe", color: "#0f224a" }}
          />
        </div>
      </div>

      {/* Teachers Table */}
      <div className="rounded-2xl overflow-hidden shadow-sm border" style={{ background: "#fff", borderColor: "#bfdbfe" }}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin w-8 h-8" style={{ color: "#2563eb" }} fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <svg className="w-14 h-14" style={{ color: "#bfdbfe" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            <p className="text-sm font-medium" style={{ color: "#38bdf8" }}>
              {search || statusFilter !== "all"
                ? "No teachers match the selected filters."
                : "No teachers found. Click 'Add Teacher' to create one."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#f0f4f8", borderBottom: "1px solid #bfdbfe" }}>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Teacher</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>GPS Presence & Geofence</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Today&apos;s Attendance</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>App & Device</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wide hidden sm:table-cell" style={{ color: "#2563eb" }}>Contact</th>
                  <th className="text-right px-5 py-3.5 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "#dbeafe" }}>
                {filtered.map((teacher) => {
                  const telemetry = teacher.location_telemetry;
                  const isPingingThis = pingingTeacherId === teacher.id;

                  return (
                    <tr key={teacher.id} className="transition-colors hover:bg-[#f0f4f8]">
                      {/* Teacher profile */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {teacher.image ? (
                            <img
                              src={teacher.image.startsWith('http') ? teacher.image : `${STORAGE_URL}/${teacher.image}`}
                              alt={teacher.name}
                              className="w-10 h-10 rounded-full object-cover border shrink-0"
                              style={{ borderColor: "#bfdbfe" }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0" style={{ background: "linear-gradient(135deg, #38bdf8, #2563eb)" }}>
                              {teacher.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 overflow-hidden">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-[#0f224a] truncate">{teacher.name}</p>
                              {teacher.is_online && (
                                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Active now"></span>
                              )}
                            </div>
                            <p className="text-xs text-[#38bdf8] truncate">{teacher.email || "No email"}</p>
                          </div>
                        </div>
                      </td>

                      {/* GPS Geofence Presence */}
                      <td className="px-5 py-3.5">
                        {telemetry?.presence_status === "inside_academy" ? (
                          <div className="space-y-1">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-800">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                              </span>
                              📍 At Academy ({telemetry.latest_distance_meters}m)
                            </div>
                            <p className="text-[11px] text-emerald-700">
                              Arrived: {telemetry.first_arrival_time || telemetry.latest_ping_time} • {telemetry.inside_pings_today}/4 checks
                            </p>
                          </div>
                        ) : telemetry?.presence_status === "outside_academy" ? (
                          <div className="space-y-1">
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-300 text-xs font-semibold text-amber-800">
                              🚗 Outside (
                              {telemetry.latest_distance_meters! < 1000
                                ? `${telemetry.latest_distance_meters}m`
                                : `${(telemetry.latest_distance_meters! / 1000).toFixed(1)}km`}
                              )
                            </div>
                            <p className="text-[11px] text-[#2563eb]">
                              Last checked: {telemetry.latest_ping_time}
                            </p>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span className="inline-flex items-center gap-1 text-xs text-gray-500 font-medium">
                              <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                              No GPS ping today
                            </span>
                            <span className="text-[10px] text-gray-400">
                              Last seen: {teacher.last_seen_human || "Never"}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Today's Attendance */}
                      <td className="px-5 py-3.5">
                        {teacher.today_attendance?.status === "Present" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 border border-emerald-300 text-xs font-bold text-emerald-800">
                            <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                            Present ({teacher.today_attendance.check_in_time || "GPS Auto"})
                          </span>
                        ) : teacher.today_attendance?.status === "Absent" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                            Absent
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs text-gray-500 bg-gray-50 border border-gray-200">
                            Pending check-in
                          </span>
                        )}
                      </td>

                      {/* Mobile App */}
                      <td className="px-5 py-3.5">
                        {teacher.has_app ? (
                          <button
                            onClick={() => setAppDetailsTarget(teacher)}
                            className="group inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-indigo-50 border border-indigo-200 text-left hover:bg-indigo-100 transition"
                            title="View App & Device Details"
                          >
                            <svg className="w-4 h-4 text-indigo-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-indigo-900 group-hover:underline truncate max-w-[130px]">
                                {teacher.app_details?.device_name || "Android App"}
                              </span>
                              <span className="text-[10px] text-indigo-600">
                                v{teacher.app_details?.app_version || "1.0"} • Ready
                              </span>
                            </div>
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-xs font-medium text-gray-500">
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            Not Installed
                          </span>
                        )}
                      </td>

                      {/* Contact */}
                      <td className="px-5 py-3.5 hidden sm:table-cell">
                        <p className="font-medium text-xs" style={{ color: "#1e3a8a" }}>{teacher.contact_number || "—"}</p>
                        {teacher.emergency_contact && (
                          <p className="text-[10px] text-red-500 mt-0.5">Emerg: {teacher.emergency_contact}</p>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          {teacher.has_app && (
                            <button
                              onClick={() => handleRequestPing(teacher)}
                              disabled={isPingingThis}
                              className="p-1.5 rounded-lg transition hover:bg-sky-100 text-sky-600 hover:text-sky-800 disabled:opacity-50"
                              title="⚡ Ping Device (Request instant location sync)"
                            >
                              <svg className={`w-4 h-4 ${isPingingThis ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            </button>
                          )}

                          <button
                            onClick={() => setLocationTrailTarget(teacher)}
                            className="p-1.5 rounded-lg transition hover:bg-emerald-100 text-emerald-700"
                            title="📍 View GPS Check-in Trail"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          </button>

                          <button
                            onClick={() => setAssignmentTarget(teacher)}
                            className="p-1.5 rounded-lg transition hover:bg-[#bfdbfe]"
                            style={{ color: "#2563eb" }}
                            title="Manage Class & Subject Assignments"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                          </button>

                          <button
                            onClick={() => setAppDetailsTarget(teacher)}
                            className="p-1.5 rounded-lg transition hover:bg-[#bfdbfe] text-[#2563eb]"
                            title="View App & Device Details"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          </button>

                          {!isOfficeAdmin && (
                            <>
                              <button
                                onClick={() => { setModalError(""); setEditTarget(teacher); }}
                                className="p-1.5 rounded-lg transition hover:bg-[#bfdbfe]"
                                style={{ color: "#2563eb" }}
                                title="Edit Teacher"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                              </button>
                              <button
                                onClick={() => setDeleteTarget(teacher)}
                                className="p-1.5 rounded-lg transition hover:bg-red-50 text-red-500 hover:text-red-600"
                                title="Delete Teacher"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </>
                          )}
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

      {/* Modals */}
      {showCreate && (
        <TeacherModal
          title="Add New Teacher"
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
          loading={modalLoading}
          error={modalError}
        />
      )}

      {editTarget && (
        <TeacherModal
          title={`Edit Teacher — ${editTarget.name}`}
          onClose={() => setEditTarget(null)}
          onSubmit={handleUpdate}
          initialData={editTarget}
          loading={modalLoading}
          error={modalError}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          teacherName={deleteTarget.name}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          loading={modalLoading}
        />
      )}

      {assignmentTarget && (
        <AssignmentModal
          teacher={assignmentTarget}
          classes={classes}
          subjects={subjects}
          onClose={() => { setAssignmentTarget(null); fetchData(); }}
        />
      )}

      {appDetailsTarget && (
        <AppDetailsModal
          teacher={appDetailsTarget}
          onClose={() => setAppDetailsTarget(null)}
          onRequestPing={handleRequestPing}
          pinging={pingingTeacherId === appDetailsTarget.id}
        />
      )}

      {locationTrailTarget && (
        <LocationTrailModal
          teacher={locationTrailTarget}
          onClose={() => setLocationTrailTarget(null)}
        />
      )}
    </DashboardLayout>
  );
}
