"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import CustomDropdown from "@/components/CustomDropdown";
import NumberInput from "@/components/NumberInput";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Designation {
  id: number;
  name: string;
  description?: string | null;
  is_active?: boolean;
}

interface AcademyClass {
  id: number;
  name: string;
  sections?: { id: number; name: string }[];
}

interface Subject {
  id: number;
  name: string;
}

interface TeacherAssignment {
  id: number;
  class_id: number;
  section_id?: number | null;
  subject_id?: number | null;
  payment_type?: string;
  fixed_amount?: number | string | null;
  is_class_incharge?: boolean;
  academy_class?: { id: number; name: string };
  section?: { id: number; name: string } | null;
  subject?: { id: number; name: string } | null;
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

interface StaffMember {
  id: number;
  name: string;
  email: string | null;
  contact_number: string | null;
  qualification: string | null;
  emergency_contact: string | null;
  teaching_exp_year: number | null;
  monthly_salary: string | null;
  image: string | null;
  signature?: string | null;
  designation_id?: number | null;
  designation?: Designation | null;
  teacher_assignments?: TeacherAssignment[];
  is_online?: boolean;
  last_seen_at?: string | null;
  last_seen_human?: string;
  has_app?: boolean;
  app_details?: AppDetails | null;
  location_telemetry?: LocationTelemetry;
  today_attendance?: TodayAttendance;
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

// ─── Staff Modal (Create / Edit with Designation & Signature) ──────────────────
interface StaffModalProps {
  title: string;
  initialData?: StaffMember;
  designations: Designation[];
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
  loading: boolean;
  error?: string;
}

function StaffModal({
  title,
  initialData,
  designations,
  onClose,
  onSubmit,
  loading,
  error,
}: StaffModalProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    email: initialData?.email || "",
    contact_number: initialData?.contact_number || "",
    qualification: initialData?.qualification || "",
    emergency_contact: initialData?.emergency_contact || "",
    teaching_exp_year: initialData?.teaching_exp_year?.toString() || "",
    monthly_salary: initialData?.monthly_salary?.toString() || "",
    designation_id: initialData?.designation_id?.toString() || initialData?.designation?.id?.toString() || "",
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [signatureMode, setSignatureMode] = useState<"keep" | "upload" | "draw">(
    initialData?.signature ? "keep" : "upload"
  );
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Canvas drawing state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    setUserRole(localStorage.getItem("userRole"));
  }, []);

  useEffect(() => {
    if (signatureMode === "draw" && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
    }
  }, [signatureMode]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSignatureFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSignatureFile(file);
      const reader = new FileReader();
      reader.onload = () => setSignaturePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData();
    data.append("name", formData.name);
    data.append("email", formData.email);
    if (formData.designation_id) data.append("designation_id", formData.designation_id);
    if (formData.contact_number) data.append("contact_number", formData.contact_number);
    if (formData.qualification) data.append("qualification", formData.qualification);
    if (formData.emergency_contact) data.append("emergency_contact", formData.emergency_contact);
    if (formData.teaching_exp_year) data.append("teaching_exp_year", formData.teaching_exp_year);
    if (userRole !== "5" && formData.monthly_salary) data.append("monthly_salary", formData.monthly_salary);
    if (imageFile) data.append("image", imageFile);

    // Signature processing
    if (signatureMode === "upload" && signatureFile) {
      data.append("signature", signatureFile);
    } else if (signatureMode === "draw" && hasDrawn && canvasRef.current) {
      const base64 = canvasRef.current.toDataURL("image/png");
      data.append("signature_base64", base64);
    }

    onSubmit(data);
  };

  const designationOptions = [
    { label: "-- No Designation Assigned --", value: "" },
    ...designations.map((d) => ({ label: d.name, value: d.id.toString() })),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-2xl rounded-2xl shadow-2xl p-6 z-10 max-h-[92vh] overflow-y-auto bg-white border border-[#bfdbfe] animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#dbeafe]">
          <div>
            <h3 className="text-xl font-bold text-[#0f224a]">{title}</h3>
            <p className="text-xs text-slate-500">Staff profile, designated post, and digital signature</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-slate-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200 flex items-start gap-2">
            <svg className="w-5 h-5 shrink-0 text-red-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1 text-[#1e3a8a]">Full Name *</label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Prof. Muhammad Tariq"
                className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition"
                style={{ borderColor: "#bfdbfe", background: "#f0f4f8" }}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1 text-[#1e3a8a]">Email Address *</label>
              <input
                required
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="staff@example.com"
                className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition"
                style={{ borderColor: "#bfdbfe", background: "#f0f4f8" }}
              />
            </div>

            {/* Designation dropdown */}
            <div className="sm:col-span-2 bg-blue-50/60 p-3.5 rounded-xl border border-blue-200">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#1e3a8a]">
                  Assigned Designation / Post
                </label>
                <Link
                  href="/dashboard/designations"
                  target="_blank"
                  className="text-xs font-semibold text-[#2563eb] hover:underline flex items-center gap-1"
                >
                  <span>+ Manage Designations</span>
                </Link>
              </div>
              <CustomDropdown
                name="designation_id"
                value={formData.designation_id}
                onChange={(_, val) => setFormData({ ...formData, designation_id: val as string })}
                options={designationOptions}
                placeholder="Select official designation"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Designates hierarchy, department role, or title (e.g. Lecturer, Senior Teacher, HOD).
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1 text-[#1e3a8a]">Contact Number</label>
              <input
                type="text"
                value={formData.contact_number}
                onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                placeholder="03XXXXXXXXX"
                className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition"
                style={{ borderColor: "#bfdbfe", background: "#f0f4f8" }}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1 text-[#1e3a8a]">Qualification</label>
              <input
                type="text"
                value={formData.qualification}
                onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                placeholder="e.g. M.Phil Physics, MS CS"
                className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition"
                style={{ borderColor: "#bfdbfe", background: "#f0f4f8" }}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1 text-[#1e3a8a]">Emergency Contact</label>
              <input
                type="text"
                value={formData.emergency_contact}
                onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                placeholder="Alternative phone"
                className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition"
                style={{ borderColor: "#bfdbfe", background: "#f0f4f8" }}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1 text-[#1e3a8a]">Teaching Experience (Year)</label>
              <input
                type="number"
                value={formData.teaching_exp_year}
                onChange={(e) => setFormData({ ...formData, teaching_exp_year: e.target.value })}
                placeholder="e.g. 2018"
                className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition"
                style={{ borderColor: "#bfdbfe", background: "#f0f4f8" }}
              />
            </div>

            {userRole !== "5" && (
              <div>
                <label className="block text-sm font-semibold mb-1 text-[#1e3a8a]">
                  Monthly Salary (PKR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.monthly_salary}
                  onChange={(e) => setFormData({ ...formData, monthly_salary: e.target.value })}
                  placeholder="e.g. 35000"
                  className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition"
                  style={{ borderColor: "#bfdbfe", background: "#f0f4f8" }}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold mb-1 text-[#1e3a8a]">Profile Photo (Optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="w-full text-xs file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#2563eb] hover:file:bg-blue-100"
              />
            </div>
          </div>

          {/* ── Signature Section ── */}
          <div className="p-4 rounded-xl border border-blue-200 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">✍️</span>
                <span className="text-sm font-bold text-[#0f224a]">Staff Digital Signature</span>
              </div>
              <div className="flex bg-white p-0.5 rounded-lg border border-blue-200 text-xs">
                {initialData?.signature && (
                  <button
                    type="button"
                    onClick={() => setSignatureMode("keep")}
                    className={`px-2.5 py-1 rounded-md font-semibold transition ${
                      signatureMode === "keep" ? "bg-[#2563eb] text-white" : "text-slate-600"
                    }`}
                  >
                    Keep Current
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSignatureMode("upload")}
                  className={`px-2.5 py-1 rounded-md font-semibold transition ${
                    signatureMode === "upload" ? "bg-[#2563eb] text-white" : "text-slate-600"
                  }`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setSignatureMode("draw")}
                  className={`px-2.5 py-1 rounded-md font-semibold transition ${
                    signatureMode === "draw" ? "bg-[#2563eb] text-white" : "text-slate-600"
                  }`}
                >
                  Draw Now
                </button>
              </div>
            </div>

            {signatureMode === "keep" && initialData?.signature && (
              <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-emerald-200">
                <img
                  src={
                    initialData.signature.startsWith("http")
                      ? initialData.signature
                      : `${STORAGE_URL}/${initialData.signature}`
                  }
                  alt="Existing Signature"
                  className="h-10 max-w-[120px] object-contain"
                />
                <span className="text-xs text-emerald-700 font-semibold">Active signature attached</span>
              </div>
            )}

            {signatureMode === "upload" && (
              <div className="space-y-2">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleSignatureFileChange}
                  className="w-full text-xs file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-100 file:text-[#2563eb] hover:file:bg-blue-200"
                />
                {signaturePreview && (
                  <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-blue-200">
                    <img src={signaturePreview} alt="Signature Preview" className="h-12 max-w-[150px] object-contain" />
                    <span className="text-xs text-slate-600">New signature preview</span>
                  </div>
                )}
              </div>
            )}

            {signatureMode === "draw" && (
              <div className="space-y-2">
                <div className="border border-slate-300 rounded-xl bg-white overflow-hidden shadow-inner">
                  <canvas
                    ref={canvasRef}
                    width={480}
                    height={120}
                    className="w-full touch-none cursor-crosshair bg-white"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Sign with your mouse or finger above</span>
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="text-red-500 hover:text-red-700 font-semibold"
                  >
                    Clear Drawing
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-3 border-t border-[#dbeafe]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition hover:bg-slate-50 text-[#1e40af]"
              style={{ borderColor: "#bfdbfe", background: "#f0f4f8" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition active:scale-95 disabled:opacity-50 shadow-md shadow-blue-500/20"
              style={{ background: "linear-gradient(135deg, #2563eb, #1e3a8a)" }}
            >
              {loading ? "Saving Staff..." : "Save Staff Member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Staff Assignment & Class Incharge Modal ─────────────────────────────────
interface StaffAssignmentModalProps {
  staff: StaffMember;
  classes: AcademyClass[];
  subjects: Subject[];
  onClose: () => void;
  onUpdated: () => void;
}

function StaffAssignmentModal({
  staff,
  classes,
  subjects,
  onClose,
  onUpdated,
}: StaffAssignmentModalProps) {
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [selectedClass, setSelectedClass] = useState<number | "">("");
  const [selectedSection, setSelectedSection] = useState<number | "">("");
  const [selectedSubject, setSelectedSubject] = useState<number | "">("");
  const [isClassIncharge, setIsClassIncharge] = useState<boolean>(false);
  const [paymentType, setPaymentType] = useState<"fixed" | "percentage">("fixed");
  const [fixedAmount, setFixedAmount] = useState<string>("");

  const availableSections = useMemo(() => {
    if (!selectedClass) return [];
    const cls = classes.find((c) => c.id === selectedClass);
    return cls?.sections || [];
  }, [classes, selectedClass]);

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/staff/${staff.id}/assignments`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      setAssignments(Array.isArray(data) ? data : []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [staff.id]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const handleAddAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass) {
      setError("Please select a Class.");
      return;
    }
    if (!selectedSubject && !isClassIncharge) {
      setError("Please choose a Teaching Subject OR select 'Designate as Class Incharge'.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccessMsg("");

    try {
      const payload: any = {
        class_id: selectedClass,
        section_id: selectedSection ? selectedSection : null,
        subject_id: selectedSubject ? selectedSubject : null,
        is_class_incharge: isClassIncharge,
        payment_type: paymentType,
      };
      if (paymentType === "fixed" && fixedAmount) {
        payload.fixed_amount = fixedAmount;
      }

      const res = await fetch(`${API}/staff/${staff.id}/assignments`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to add assignment");
      }

      setAssignments(Array.isArray(data) ? data : []);
      setSuccessMsg(
        isClassIncharge
          ? "🎉 Subject & Class Incharge designated successfully!"
          : "🎉 Teaching assignment saved successfully!"
      );
      setTimeout(() => setSuccessMsg(""), 3500);

      // Reset fields
      setSelectedSubject("");
      setIsClassIncharge(false);
      setFixedAmount("");
      onUpdated();
    } catch (err: any) {
      setError(err.message || "Failed to add assignment");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleIncharge = async (assignmentId: number) => {
    try {
      const res = await fetch(`${API}/staff/${staff.id}/assignments/${assignmentId}/toggle-incharge`, {
        method: "PATCH",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.assignments) {
          setAssignments(data.assignments);
        } else {
          fetchAssignments();
        }
        onUpdated();
      }
    } catch {
      // ignore
    }
  };

  const handleDeleteAssignment = async (assignmentId: number) => {
    if (!confirm("Are you sure you want to remove this assignment?")) return;
    try {
      const res = await fetch(`${API}/staff/${staff.id}/assignments/${assignmentId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
        onUpdated();
      }
    } catch {
      // ignore
    }
  };

  const classOptions = [
    { label: "-- Select Class --", value: "" },
    ...classes.map((c) => ({ label: c.name, value: c.id.toString() })),
  ];

  const sectionOptions = [
    { label: "-- All Sections / No Section --", value: "" },
    ...availableSections.map((s) => ({ label: s.name, value: s.id.toString() })),
  ];

  const subjectOptions = [
    { label: "-- No Subject (Class Incharge Role Only) --", value: "" },
    ...subjects.map((s) => ({ label: s.name, value: s.id.toString() })),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-4xl rounded-2xl shadow-2xl p-6 z-10 max-h-[92vh] flex flex-col bg-white border border-[#bfdbfe] animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="flex justify-between items-start mb-4 pb-3 border-b border-[#dbeafe] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#2563eb] text-lg shrink-0">
              📚
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-[#0f224a] flex items-center gap-2">
                <span>Manage Teaching Subjects &amp; Class Incharge</span>
              </h3>
              <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                <span className="font-semibold text-[#1e3a8a]">{staff.name}</span>
                {staff.designation?.name && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] bg-blue-50 text-blue-700 font-bold border border-blue-200">
                    {staff.designation.name}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-slate-100 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl text-xs bg-red-50 text-red-700 border border-red-200 shrink-0">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0 font-medium">
            {successMsg}
          </div>
        )}

        {/* Modal Body: Left form, Right list */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-6 pr-1">
          {/* Left Form: Add Assignment */}
          <form
            onSubmit={handleAddAssignment}
            className="md:col-span-5 flex flex-col gap-3.5 p-4 rounded-2xl border border-blue-100 bg-[#f8fafc] h-fit"
          >
            <div className="flex items-center justify-between pb-2 border-b border-blue-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#1e3a8a]">
                + Assign Class / Subject
              </h4>
              <span className="text-[11px] text-slate-400">Step 1 of 2</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1e3a8a] mb-1">
                Academic Class <span className="text-red-500">*</span>
              </label>
              <CustomDropdown
                name="class_id"
                value={selectedClass ? selectedClass.toString() : ""}
                onChange={(_, val) => {
                  setSelectedClass(val ? Number(val) : "");
                  setSelectedSection("");
                }}
                options={classOptions}
                placeholder="Select Class"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1e3a8a] mb-1">
                Section (Optional)
              </label>
              <CustomDropdown
                name="section_id"
                value={selectedSection ? selectedSection.toString() : ""}
                onChange={(_, val) => setSelectedSection(val ? Number(val) : "")}
                options={sectionOptions}
                placeholder={!selectedClass ? "Choose class first" : "All Sections / No Section"}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1e3a8a] mb-1">
                Teaching Subject
              </label>
              <CustomDropdown
                name="subject_id"
                value={selectedSubject ? selectedSubject.toString() : ""}
                onChange={(_, val) => setSelectedSubject(val ? Number(val) : "")}
                options={subjectOptions}
                placeholder="Choose Subject (or Class Incharge only)"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">
                Leave empty if assigning purely as Class Incharge without teaching subject.
              </p>
            </div>

            {/* Class Incharge Card */}
            <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50/70 transition hover:bg-amber-50">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isClassIncharge}
                  onChange={(e) => setIsClassIncharge(e.target.checked)}
                  className="w-4 h-4 mt-0.5 text-amber-600 rounded border-amber-400 focus:ring-amber-500"
                />
                <div className="flex-1">
                  <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <span>⭐</span>
                    <span>Designate as Official Class Incharge</span>
                  </span>
                  <p className="text-[11px] text-amber-800/90 mt-0.5 leading-snug">
                    Sets this staff member as the Class Incharge for this class/section. Their signature will be printed on report cards, attendance registers, and result slips.
                  </p>
                </div>
              </label>
            </div>

            {/* Remuneration */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="block text-xs font-bold text-[#1e3a8a] mb-1">Payment</label>
                <CustomDropdown
                  name="payment_type"
                  value={paymentType}
                  onChange={(_, val) => setPaymentType(val as any)}
                  options={[
                    { label: "Fixed Amount", value: "fixed" },
                    { label: "Percentage Pool", value: "percentage" },
                  ]}
                  placeholder="Payment"
                />
              </div>

              {paymentType === "fixed" && (
                <div>
                  <label className="block text-xs font-bold text-[#1e3a8a] mb-1">Amount (PKR)</label>
                  <NumberInput
                    value={fixedAmount}
                    onChange={setFixedAmount}
                    placeholder="e.g. 5000"
                    min={0}
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={saving || !selectedClass || (!selectedSubject && !isClassIncharge)}
              className="w-full mt-2 py-2.5 rounded-xl text-xs font-bold text-white transition active:scale-95 disabled:opacity-50 shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #2563eb, #1e3a8a)" }}
            >
              {saving ? "Saving Assignment..." : "+ Save Assignment"}
            </button>
          </form>

          {/* Right List: Current Assignments */}
          <div className="md:col-span-7 flex flex-col min-h-[300px]">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#dbeafe]">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#1e3a8a] flex items-center gap-2">
                <span>Current Assignments &amp; Incharge Roles</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] bg-blue-100 text-[#2563eb] font-bold">
                  {assignments.length}
                </span>
              </h4>
            </div>

            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-10 text-slate-400">
                <svg className="animate-spin w-6 h-6 text-[#2563eb] mb-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-xs">Loading assignments...</span>
              </div>
            ) : assignments.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-[#bfdbfe] rounded-2xl p-6 text-center bg-[#fafafa]">
                <span className="text-2xl mb-1.5">📋</span>
                <p className="text-xs font-bold text-[#0f224a]">No assignments or class incharge role assigned yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs">
                  Use the form on the left to assign classes, teaching subjects, or make this staff member a Class Incharge.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 overflow-y-auto max-h-[460px] pr-1">
                {assignments.map((a) => (
                  <div
                    key={a.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      a.is_class_incharge
                        ? "bg-amber-50/50 border-amber-300 shadow-xs"
                        : "bg-white border-[#dbeafe] hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-[#0f224a]">
                            {a.academy_class?.name || `Class #${a.class_id}`}
                            {a.section?.name && (
                              <span className="text-xs text-blue-700 ml-1 font-semibold">
                                ({a.section.name})
                              </span>
                            )}
                          </span>

                          {a.is_class_incharge ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 shadow-xs">
                              <span>⭐</span>
                              <span>Class Incharge</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleIncharge(a.id)}
                              className="text-[10px] font-semibold text-slate-500 hover:text-amber-700 hover:bg-amber-100/60 px-2 py-0.5 rounded-full border border-slate-200 transition"
                              title="Click to make Class Incharge"
                            >
                              + Make Incharge
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-600">
                          <span className="flex items-center gap-1">
                            <span className="text-[#2563eb] font-semibold">Subject:</span>
                            <span className="font-bold text-[#0f224a]">
                              {a.subject?.name || <span className="italic text-slate-400">Class Incharge (No Subject)</span>}
                            </span>
                          </span>

                          <span className="text-slate-300">•</span>

                          <span className="text-[11px] text-slate-500">
                            {a.payment_type === "fixed"
                              ? `Fixed: Rs ${Number(a.fixed_amount || 0).toLocaleString()}`
                              : "Percentage Pool"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {a.is_class_incharge && (
                          <button
                            type="button"
                            onClick={() => handleToggleIncharge(a.id)}
                            className="p-1 rounded-lg text-amber-700 hover:bg-amber-100 transition text-xs font-bold"
                            title="Remove Class Incharge Role"
                          >
                            Remove Incharge
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteAssignment(a.id)}
                          className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition"
                          title="Delete Assignment"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end pt-3 mt-4 border-t border-[#dbeafe] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-xs font-bold border transition hover:bg-slate-50 text-[#1e40af]"
            style={{ borderColor: "#bfdbfe", background: "#f0f4f8" }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Staff Signature Modal (Dedicated View / Draw / Upload) ────────────────────
interface StaffSignatureModalProps {
  staff: StaffMember;
  onClose: () => void;
  onSuccess: (updatedStaff?: StaffMember) => void;
}

function StaffSignatureModal({ staff, onClose, onSuccess }: StaffSignatureModalProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "draw">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    if (activeTab === "draw" && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
    }
  }, [activeTab]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (!selected.type.startsWith("image/")) {
        setError("Please select a valid image file (PNG, JPG, WEBP).");
        return;
      }
      setFile(selected);
      setError("");
      const reader = new FileReader();
      reader.onload = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(selected);
    }
  };

  const handleSaveSignature = async () => {
    setError("");
    setSaving(true);
    try {
      if (activeTab === "upload") {
        if (!file) {
          setError("Please select a signature image file to upload.");
          setSaving(false);
          return;
        }
        const formData = new FormData();
        formData.append("signature", file);

        const res = await fetch(`${API}/staff/${staff.id}/signature`, {
          method: "POST",
          headers: getAuthHeaders(true),
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to upload signature");
        onSuccess({ ...staff, signature: data.signature });
      } else {
        if (!hasDrawn || !canvasRef.current) {
          setError("Please draw a signature before saving.");
          setSaving(false);
          return;
        }
        const base64Data = canvasRef.current.toDataURL("image/png");

        const res = await fetch(`${API}/staff/${staff.id}/signature`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ signature_base64: base64Data }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to save signature");
        onSuccess({ ...staff, signature: data.signature });
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while saving signature.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSignature = async () => {
    if (!confirm("Are you sure you want to remove this staff member's signature?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API}/staff/${staff.id}/signature`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete signature");
      onSuccess({ ...staff, signature: null });
    } catch (err: any) {
      setError(err.message || "Failed to delete signature.");
    } finally {
      setDeleting(false);
    }
  };

  const currentSigUrl = staff.signature
    ? staff.signature.startsWith("http") || staff.signature.startsWith("data:")
      ? staff.signature
      : `${STORAGE_URL}/${staff.signature}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl shadow-2xl p-6 z-10 bg-white border border-[#bfdbfe] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-start mb-4 pb-3 border-b border-[#dbeafe]">
          <div>
            <h3 className="text-lg font-bold text-[#0f224a] flex items-center gap-2">
              <span>✍️</span> Staff Member Signature — {staff.name}
            </h3>
            <p className="text-xs text-slate-500">
              {staff.designation?.name ? `Designation: ${staff.designation.name}` : "Used on admission slips, certificates & official reports"}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-slate-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl text-xs bg-red-50 text-red-700 border border-red-200">
            {error}
          </div>
        )}

        {/* Existing Signature */}
        {currentSigUrl && (
          <div className="mb-5 p-4 rounded-xl border border-emerald-200 bg-emerald-50/40">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-emerald-800">Current Active Signature:</span>
              <button
                type="button"
                onClick={handleDeleteSignature}
                disabled={deleting}
                className="text-xs font-semibold text-red-600 hover:text-red-800 hover:underline"
              >
                {deleting ? "Removing..." : "Remove Signature"}
              </button>
            </div>
            <div className="h-20 bg-white rounded-lg border border-emerald-200 flex items-center justify-center p-2 shadow-inner">
              <img src={currentSigUrl} alt="Current Signature" className="max-h-full max-w-full object-contain" />
            </div>
          </div>
        )}

        {/* Tabs: Upload / Draw */}
        <div className="flex rounded-xl bg-[#f0f4f8] p-1 mb-4 border border-[#bfdbfe]">
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
              activeTab === "upload" ? "bg-white text-[#2563eb] shadow-sm" : "text-slate-600 hover:text-[#0f224a]"
            }`}
          >
            📁 Upload Image
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("draw")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
              activeTab === "draw" ? "bg-white text-[#2563eb] shadow-sm" : "text-slate-600 hover:text-[#0f224a]"
            }`}
          >
            🖋️ Draw Signature
          </button>
        </div>

        {activeTab === "upload" && (
          <div className="space-y-4">
            <label className="border-2 border-dashed border-[#bfdbfe] hover:border-[#2563eb] rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer bg-[#fafafa] hover:bg-blue-50/50 transition">
              <svg className="w-10 h-10 text-[#38bdf8] mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs font-bold text-[#2563eb] block">Click to select signature file</span>
              <span className="text-[11px] text-slate-400 mt-0.5">PNG transparent background recommended (Max 2MB)</span>
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>

            {previewUrl && (
              <div className="p-3 bg-white rounded-xl border border-blue-200">
                <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">File Preview:</span>
                <div className="h-20 bg-slate-50 rounded-lg flex items-center justify-center p-2 border">
                  <img src={previewUrl} alt="Preview" className="max-h-full max-w-full object-contain" />
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "draw" && (
          <div className="space-y-3">
            <div className="border border-[#bfdbfe] rounded-xl bg-white overflow-hidden shadow-inner">
              <canvas
                ref={canvasRef}
                width={480}
                height={160}
                className="w-full touch-none cursor-crosshair bg-white"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
            <div className="flex justify-between items-center text-xs text-slate-500">
              <span>Sign inside the canvas above using finger or stylus</span>
              <button
                type="button"
                onClick={clearCanvas}
                className="text-red-500 hover:text-red-700 font-bold"
              >
                Clear Drawing
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t border-[#dbeafe] mt-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold border transition hover:bg-slate-50 text-[#1e40af]"
            style={{ borderColor: "#bfdbfe", background: "#f0f4f8" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveSignature}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition active:scale-95 disabled:opacity-50 shadow-md shadow-blue-500/20"
            style={{ background: "linear-gradient(135deg, #2563eb, #1e3a8a)" }}
          >
            {saving ? "Saving Signature..." : "Save Signature"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Modal ──────────────────────────────────────────────────────────────
interface DeleteModalProps {
  staffName: string;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

function DeleteModal({ staffName, onClose, onConfirm, loading }: DeleteModalProps) {
  const [confirmText, setConfirmText] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl shadow-2xl p-6 z-10 text-center bg-white border border-red-200">
        <h3 className="text-lg font-bold mb-2 text-[#0b1329]">Delete Staff Member?</h3>
        <p className="text-sm mb-4 text-[#1e40af]">
          Are you sure you want to remove <strong>&ldquo;{staffName}&rdquo;</strong>? This action cannot be undone.
        </p>

        <div className="mb-6 text-left">
          <label className="block text-xs font-medium mb-1.5 text-[#1e3a8a]">
            Type <strong>{staffName}</strong> to confirm:
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition"
            style={{ borderColor: "#fca5a5", background: "#fef2f2", color: "#991b1b" }}
            placeholder={staffName}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition text-[#1e40af]"
            style={{ borderColor: "#bfdbfe", background: "#f0f4f8" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading || confirmText !== staffName}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition active:scale-95 disabled:opacity-50 bg-red-600 hover:bg-red-700 shadow-md shadow-red-600/20"
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Staff Page ───────────────────────────────────────────────────────────
export default function ManageStaffPage() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [classes, setClasses] = useState<AcademyClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedDesignationFilter, setSelectedDesignationFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "at_academy" | "online" | "signed" | "incharge">("all");
  const [userRole, setUserRole] = useState<string | null>(null);

  // Modals state
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffMember | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);
  const [signatureTarget, setSignatureTarget] = useState<StaffMember | null>(null);
  const [assignmentTarget, setAssignmentTarget] = useState<StaffMember | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch all staff & auxiliary data
  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const [resPresence, resDesignations, resC, resS] = await Promise.all([
        fetch(`${API}/admin/teachers/live-presence`, { headers: getAuthHeaders() }),
        fetch(`${API}/designations?active_only=1`, { headers: getAuthHeaders() }),
        fetch(`${API}/classes`, { headers: getAuthHeaders() }),
        fetch(`${API}/subjects`, { headers: getAuthHeaders() }),
      ]);

      const dataP = await resPresence.json();
      setStaffList(dataP.teachers || []);
      setSummary(dataP.summary || null);

      const dataD = await resDesignations.json();
      setDesignations(Array.isArray(dataD) ? dataD : []);

      const dataC = await resC.json();
      setClasses(Array.isArray(dataC) ? dataC : []);

      const dataS = await resS.json();
      setSubjects(Array.isArray(dataS) ? dataS : []);
    } catch (err: any) {
      showToast("Failed to fetch staff data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setUserRole(localStorage.getItem("userRole"));
    fetchData();

    // Auto-refresh presence every 30 seconds
    const interval = setInterval(() => {
      fetchData(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchData]);

  // Handle Save (Create or Update)
  const handleSaveStaff = async (formData: FormData) => {
    setModalLoading(true);
    setModalError("");
    try {
      const isEdit = !!editTarget;
      const url = isEdit ? `${API}/staff/${editTarget.id}` : `${API}/staff`;

      const res = await fetch(url, {
        method: "POST",
        headers: getAuthHeaders(true),
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          json.message ||
            (json.errors ? Object.values(json.errors).flat().join(", ") : "Failed to save staff member")
        );
      }

      showToast(isEdit ? "✨ Staff member updated successfully!" : "🎉 Staff member added successfully!");
      setShowCreate(false);
      setEditTarget(null);
      fetchData(true);
    } catch (err: any) {
      setModalError(err.message || "Something went wrong.");
    } finally {
      setModalLoading(false);
    }
  };

  // Handle Delete
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setModalLoading(true);
    try {
      const res = await fetch(`${API}/staff/${deleteTarget.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete staff member");
      showToast("🗑️ Staff member deleted successfully");
      setDeleteTarget(null);
      fetchData(true);
    } catch (err: any) {
      showToast(err.message || "Failed to delete");
    } finally {
      setModalLoading(false);
    }
  };

  // Filtered staff members
  const filtered = useMemo(() => {
    return staffList.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.email && s.email.toLowerCase().includes(search.toLowerCase())) ||
        (s.qualification && s.qualification.toLowerCase().includes(search.toLowerCase())) ||
        (s.contact_number && s.contact_number.includes(search)) ||
        (s.designation?.name && s.designation.name.toLowerCase().includes(search.toLowerCase()));

      if (!matchesSearch) return false;

      // Filter by designation
      if (selectedDesignationFilter !== "all") {
        if (selectedDesignationFilter === "none") {
          if (s.designation_id || s.designation) return false;
        } else {
          const desId = Number(selectedDesignationFilter);
          if (s.designation_id !== desId && s.designation?.id !== desId) return false;
        }
      }

      // Filter by status
      if (statusFilter === "at_academy") return s.location_telemetry?.presence_status === "inside_academy";
      if (statusFilter === "online") return s.is_online;
      if (statusFilter === "signed") return !!s.signature;
      if (statusFilter === "incharge") {
        return s.teacher_assignments?.some((a) => a.is_class_incharge);
      }

      return true;
    });
  }, [staffList, search, selectedDesignationFilter, statusFilter]);

  const isOfficeAdmin = userRole === "5";

  // Metric counts
  const totalCount = summary?.total_teachers ?? staffList.length;
  const signedCount = staffList.filter((s) => !!s.signature).length;
  const inchargeCount = staffList.filter((s) => s.teacher_assignments?.some((a) => a.is_class_incharge)).length;
  const atAcademyCount = summary?.at_academy_today ?? staffList.filter((s) => s.location_telemetry?.presence_status === "inside_academy").length;
  const onlineCount = summary?.online_now ?? staffList.filter((s) => s.is_online).length;

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-[#0b1329] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-[#2563eb] animate-bounce">
            <span className="text-sm font-semibold">{toastMessage}</span>
          </div>
        )}

        {/* Header Banner */}
        <div
          className="rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl"
          style={{
            background: "linear-gradient(135deg, #0b1329 0%, #0f224a 55%, #1e3a8a 100%)",
          }}
        >
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 text-blue-200 border border-white/20">
                  Staff &amp; Faculty Administration
                </span>
                <span className="text-xs text-blue-200/80">• Academic Roles &amp; Incharge</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Staff Members, Subjects &amp; Class Incharge
              </h1>
              <p className="mt-1.5 text-sm text-blue-100/90 max-w-2xl leading-relaxed">
                Manage teaching faculty, assign specific subjects to classes &amp; sections, designate official <strong>Class Incharge</strong> roles, and manage digital signatures.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard/designations"
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-white/10 hover:bg-white/20 border border-white/20 text-white transition flex items-center gap-2 backdrop-blur-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Manage Designations
              </Link>

              <button
                onClick={() => fetchData(true)}
                disabled={refreshing}
                className="px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-white/10 hover:bg-white/20 border border-white/20 text-white transition flex items-center gap-1.5"
                title="Refresh staff"
              >
                <svg className={`w-4 h-4 ${refreshing ? "animate-spin text-blue-300" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{refreshing ? "Syncing..." : "Sync"}</span>
              </button>

              {!isOfficeAdmin && (
                <button
                  onClick={() => {
                    setModalError("");
                    setShowCreate(true);
                  }}
                  className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-white text-[#0f224a] hover:bg-blue-50 transition shadow-lg shadow-black/10 flex items-center gap-2 active:scale-95"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Staff Member
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div
            onClick={() => setStatusFilter("all")}
            className={`p-4 rounded-2xl bg-white border transition-all cursor-pointer ${
              statusFilter === "all" ? "ring-2 ring-[#2563eb] shadow-md border-transparent" : "border-[#bfdbfe] hover:border-[#2563eb]"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563eb]">Total Staff</span>
              <span className="text-base">👥</span>
            </div>
            <div className="text-2xl font-black text-[#0f224a]">{totalCount}</div>
            <p className="text-[10px] text-slate-400 mt-0.5">Faculty &amp; administrative</p>
          </div>

          <div
            onClick={() => setStatusFilter("incharge")}
            className={`p-4 rounded-2xl bg-white border transition-all cursor-pointer ${
              statusFilter === "incharge" ? "ring-2 ring-amber-500 shadow-md border-transparent" : "border-amber-200 hover:border-amber-400"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">⭐ Class Incharges</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 font-bold text-amber-800">
                {inchargeCount}
              </span>
            </div>
            <div className="text-2xl font-black text-amber-900">{inchargeCount}</div>
            <p className="text-[10px] text-amber-700 mt-0.5">Appointed class incharge</p>
          </div>

          <div
            onClick={() => setStatusFilter("signed")}
            className={`p-4 rounded-2xl bg-white border transition-all cursor-pointer ${
              statusFilter === "signed" ? "ring-2 ring-indigo-500 shadow-md border-transparent" : "border-indigo-200 hover:border-indigo-400"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">✍️ Verified Signatures</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 font-bold text-indigo-700">
                {Math.round((signedCount / (totalCount || 1)) * 100)}%
              </span>
            </div>
            <div className="text-2xl font-black text-indigo-900">{signedCount}</div>
            <p className="text-[10px] text-indigo-600 mt-0.5">Signatures on report cards</p>
          </div>

          <div
            onClick={() => setStatusFilter("at_academy")}
            className={`p-4 rounded-2xl bg-white border transition-all cursor-pointer ${
              statusFilter === "at_academy" ? "ring-2 ring-emerald-500 shadow-md border-transparent" : "border-emerald-200 hover:border-emerald-400"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">📍 At Academy</span>
              <span className="relative flex h-2.5 w-2.5">
                {atAcademyCount > 0 && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${atAcademyCount > 0 ? "bg-emerald-500" : "bg-gray-300"}`}></span>
              </span>
            </div>
            <div className="text-2xl font-black text-emerald-800">{atAcademyCount}</div>
            <p className="text-[10px] text-emerald-600 mt-0.5">Inside 50m geofence</p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 rounded-2xl bg-white border border-[#bfdbfe] shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-1">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <svg
                className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search staff, designation, phone..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none transition focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563eb]"
                style={{ borderColor: "#bfdbfe", background: "#f0f4f8" }}
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
                  ✕
                </button>
              )}
            </div>

            {/* Designation Filter */}
            <div className="w-full sm:w-60">
              <CustomDropdown
                name="designation_filter"
                value={selectedDesignationFilter}
                onChange={(_, val) => setSelectedDesignationFilter(val as string)}
                options={[
                  { label: "All Designations", value: "all" },
                  { label: "Unassigned Designation", value: "none" },
                  ...designations.map((d) => ({ label: d.name, value: d.id.toString() })),
                ]}
                placeholder="Filter by Designation"
              />
            </div>
          </div>

          {/* Quick status tabs */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <div className="flex bg-[#f0f4f8] p-1 rounded-xl border border-[#bfdbfe] overflow-x-auto">
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  statusFilter === "all" ? "bg-[#2563eb] text-white shadow-sm" : "text-slate-600 hover:text-[#0f224a]"
                }`}
              >
                All ({staffList.length})
              </button>
              <button
                onClick={() => setStatusFilter("incharge")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  statusFilter === "incharge" ? "bg-amber-600 text-white shadow-sm" : "text-amber-800 hover:text-amber-900"
                }`}
              >
                ⭐ Incharge ({inchargeCount})
              </button>
              <button
                onClick={() => setStatusFilter("signed")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  statusFilter === "signed" ? "bg-[#2563eb] text-white shadow-sm" : "text-slate-600 hover:text-[#0f224a]"
                }`}
              >
                ✍️ Signed ({signedCount})
              </button>
              <button
                onClick={() => setStatusFilter("at_academy")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  statusFilter === "at_academy" ? "bg-[#2563eb] text-white shadow-sm" : "text-slate-600 hover:text-[#0f224a]"
                }`}
              >
                📍 At Academy ({atAcademyCount})
              </button>
            </div>
          </div>
        </div>

        {/* Staff Table */}
        <div className="bg-white rounded-2xl border border-[#bfdbfe] shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-500">
              <svg className="animate-spin w-8 h-8 text-[#2563eb] mb-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm font-medium">Loading staff members...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-500 px-4">
              <div className="w-16 h-16 rounded-full bg-blue-50 text-[#2563eb] flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h4 className="text-base font-bold text-[#0f224a]">No staff members found</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {search ? `No staff matched "${search}".` : "No staff members have been added yet."}
              </p>
              {!isOfficeAdmin && (
                <button
                  onClick={() => {
                    setModalError("");
                    setShowCreate(true);
                  }}
                  className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#2563eb] hover:bg-[#1e3a8a] transition inline-flex items-center gap-1.5"
                >
                  + Add Staff Member Now
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f0f4f8] text-[#1e3a8a] text-xs font-bold uppercase tracking-wider border-b border-[#bfdbfe]">
                    <th className="py-3.5 px-5">Staff Member</th>
                    <th className="py-3.5 px-5">Designation</th>
                    <th className="py-3.5 px-5">Teaching &amp; Class Incharge</th>
                    <th className="py-3.5 px-5 text-center">Digital Signature</th>
                    <th className="py-3.5 px-5">GPS / Geofence</th>
                    <th className="py-3.5 px-5 text-center">Mobile App</th>
                    <th className="py-3.5 px-5">Contact</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dbeafe] text-sm">
                  {filtered.map((staff) => {
                    const telemetry = staff.location_telemetry;
                    const signatureUrl = staff.signature
                      ? staff.signature.startsWith("http") || staff.signature.startsWith("data:")
                        ? staff.signature
                        : `${STORAGE_URL}/${staff.signature}`
                      : null;

                    const inchargeAssignments = staff.teacher_assignments?.filter((a) => a.is_class_incharge) || [];
                    const totalAssignments = staff.teacher_assignments?.length || 0;

                    return (
                      <tr key={staff.id} className="hover:bg-blue-50/40 transition-colors group">
                        {/* Profile Info */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            {staff.image ? (
                              <img
                                src={staff.image.startsWith("http") ? staff.image : `${STORAGE_URL}/${staff.image}`}
                                alt={staff.name}
                                className="w-10 h-10 rounded-full object-cover border border-[#bfdbfe] shrink-0"
                              />
                            ) : (
                              <div
                                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-sm"
                                style={{ background: "linear-gradient(135deg, #38bdf8, #2563eb)" }}
                              >
                                {staff.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="flex-1 overflow-hidden">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-[#0f224a] group-hover:text-[#2563eb] transition truncate">
                                  {staff.name}
                                </span>
                                {staff.is_online && (
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Active now" />
                                )}
                              </div>
                              <span className="block text-xs text-slate-400 truncate">
                                {staff.email || "No email"}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Assigned Designation */}
                        <td className="py-3.5 px-5">
                          {staff.designation?.name ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-[#1e40af] border border-blue-200 shadow-xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#2563eb]" />
                              {staff.designation.name}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs text-slate-400 bg-slate-50 border border-slate-200">
                              Unassigned
                            </span>
                          )}
                          {staff.qualification && (
                            <p className="text-[11px] text-slate-500 mt-1 truncate max-w-[150px]">
                              {staff.qualification}
                            </p>
                          )}
                        </td>

                        {/* Teaching & Class Incharge Role */}
                        <td className="py-3.5 px-5">
                          <div className="space-y-1">
                            {inchargeAssignments.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {inchargeAssignments.map((ia) => (
                                  <span
                                    key={ia.id}
                                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 shadow-xs"
                                    title="Designated Class Incharge"
                                  >
                                    <span>⭐ Incharge:</span>
                                    <span>
                                      {ia.academy_class?.name || `Class #${ia.class_id}`}
                                      {ia.section?.name ? ` (${ia.section.name})` : ""}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            ) : null}

                            <div className="flex items-center gap-2">
                              {totalAssignments > 0 ? (
                                <button
                                  onClick={() => setAssignmentTarget(staff)}
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563eb] hover:text-[#1e3a8a] hover:underline"
                                >
                                  <span>📘 {totalAssignments} Assigned</span>
                                  <span className="text-[10px] text-slate-400">✏️</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => setAssignmentTarget(staff)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold text-[#2563eb] bg-blue-50 hover:bg-blue-100 border border-dashed border-blue-300 transition"
                                >
                                  <span>+</span>
                                  <span>Assign Subjects &amp; Incharge</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Digital Signature */}
                        <td className="py-3.5 px-5 text-center">
                          {signatureUrl ? (
                            <button
                              onClick={() => setSignatureTarget(staff)}
                              className="group/sig inline-flex flex-col items-center gap-1 p-1.5 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/60 transition"
                              title="Click to view or change signature"
                            >
                              <div className="h-8 max-w-[100px] flex items-center justify-center bg-white px-2 rounded border border-emerald-100">
                                <img src={signatureUrl} alt="Signature" className="max-h-7 max-w-full object-contain" />
                              </div>
                              <span className="text-[10px] font-bold text-emerald-800 flex items-center gap-1">
                                <span>✓ Signed</span>
                                <span className="text-slate-400 group-hover/sig:text-emerald-700">✏️</span>
                              </span>
                            </button>
                          ) : (
                            <button
                              onClick={() => setSignatureTarget(staff)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#2563eb] bg-blue-50 hover:bg-blue-100 border border-dashed border-blue-300 transition active:scale-95"
                            >
                              <span>✍️</span>
                              <span>Add Sig</span>
                            </button>
                          )}
                        </td>

                        {/* GPS Geofence Presence */}
                        <td className="py-3.5 px-5">
                          {telemetry?.presence_status === "inside_academy" ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                📍 At Academy
                              </span>
                              <p className="text-[11px] text-emerald-700">
                                {telemetry.first_arrival_time || telemetry.latest_ping_time} ({telemetry.latest_distance_meters}m)
                              </p>
                            </div>
                          ) : telemetry?.presence_status === "outside_academy" ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-300 text-xs font-semibold text-amber-800">
                                🚗 Outside ({telemetry.latest_distance_meters ? `${Math.round(telemetry.latest_distance_meters)}m` : ""})
                              </span>
                              <p className="text-[10px] text-slate-400">
                                Last: {telemetry.latest_ping_time}
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">
                              {staff.last_seen_human || "No GPS today"}
                            </span>
                          )}
                        </td>

                        {/* Mobile App */}
                        <td className="py-3.5 px-5 text-center">
                          {staff.has_app ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <span>📱</span>
                              <span>Installed</span>
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">No App</span>
                          )}
                        </td>

                        {/* Contact */}
                        <td className="py-3.5 px-5">
                          <p className="text-xs font-semibold text-[#1e3a8a]">{staff.contact_number || "—"}</p>
                          {staff.monthly_salary && !isOfficeAdmin && (
                            <p className="text-[11px] text-slate-500">
                              Rs {Number(staff.monthly_salary).toLocaleString()}
                            </p>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setAssignmentTarget(staff)}
                              title="Assign Subjects & Class Incharge"
                              className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition"
                            >
                              <span className="text-sm">📚</span>
                            </button>

                            <button
                              onClick={() => setSignatureTarget(staff)}
                              title="Manage Signature"
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition"
                            >
                              <span className="text-sm">✍️</span>
                            </button>

                            <button
                              onClick={() => {
                                setModalError("");
                                setEditTarget(staff);
                              }}
                              title="Edit Staff Member"
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>

                            {!isOfficeAdmin && (
                              <button
                                onClick={() => setDeleteTarget(staff)}
                                title="Delete Staff Member"
                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
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
      </div>

      {/* Staff Create / Edit Modal */}
      {(showCreate || editTarget) && (
        <StaffModal
          title={editTarget ? `Edit Staff — ${editTarget.name}` : "Add New Staff Member"}
          initialData={editTarget || undefined}
          designations={designations}
          onClose={() => {
            setShowCreate(false);
            setEditTarget(null);
          }}
          onSubmit={handleSaveStaff}
          loading={modalLoading}
          error={modalError}
        />
      )}

      {/* Class & Subject Assignments + Class Incharge Modal */}
      {assignmentTarget && (
        <StaffAssignmentModal
          staff={assignmentTarget}
          classes={classes}
          subjects={subjects}
          onClose={() => setAssignmentTarget(null)}
          onUpdated={() => fetchData(true)}
        />
      )}

      {/* Dedicated Signature Modal */}
      {signatureTarget && (
        <StaffSignatureModal
          staff={signatureTarget}
          onClose={() => setSignatureTarget(null)}
          onSuccess={(updated) => {
            setSignatureTarget(null);
            showToast("✍️ Digital signature updated successfully!");
            fetchData(true);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <DeleteModal
          staffName={deleteTarget.name}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          loading={modalLoading}
        />
      )}
    </DashboardLayout>
  );
}
