"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  BookOpen,
  Calendar,
  DollarSign,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  PenTool,
  Upload,
  Plus,
  Trash2,
  Eye,
  Check,
  ChevronRight,
  MapPin,
  Send,
  Sparkles,
  Award,
  CalendarCheck,
  RefreshCw,
  TrendingUp,
  X,
  CreditCard,
  Building2,
  CalendarDays,
  Smartphone,
  CheckCheck,
  Printer,
  Search,
  Receipt,
  ArrowDownToLine,
} from "lucide-react";
import CustomDropdown from "@/components/CustomDropdown";
import CustomDatePicker from "@/components/CustomDatePicker";
import CustomNumberInput from "@/components/CustomNumberInput";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export default function TeacherDashboard() {
  const router = useRouter();
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
  const storageUrl = baseUrl.replace("/api", "/storage/");

  // ─── Active Tab State ──────────────────────────────────────
  const [activeTab, setActiveTab] = useState<
    "overview" | "assignments" | "subject_attendance" | "class_diary" | "my_attendance" | "student_receivings" | "salaries" | "advance" | "leaves" | "profile"
  >("overview");

  // ─── Student Receivings (Cash Collections) State ──────────
  const [teacherReceivings, setTeacherReceivings] = useState<any[]>([]);
  const [loadingTeacherReceivings, setLoadingTeacherReceivings] = useState(false);
  const [teacherReceivingsStats, setTeacherReceivingsStats] = useState<{
    total_pending_amount: number;
    pending_count: number;
    total_cleared: number;
    total_all_time: number;
  }>({
    total_pending_amount: 0,
    pending_count: 0,
    total_cleared: 0,
    total_all_time: 0,
  });
  const [showTeacherCollectModal, setShowTeacherCollectModal] = useState(false);
  const [showTeacherReceiptModal, setShowTeacherReceiptModal] = useState(false);
  const [teacherActiveReceipt, setTeacherActiveReceipt] = useState<any | null>(null);
  const [teacherReceivingSearch, setTeacherReceivingSearch] = useState("");
  const [teacherStatusFilter, setTeacherStatusFilter] = useState<"all" | "pending_handover" | "received_by_admin">("all");
  const [allSchoolClasses, setAllSchoolClasses] = useState<{ id: number; name: string }[]>([]);

  // ─── User Profile State ────────────────────────────────────
  const [teacher, setTeacher] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);

  // ─── Assigned Classes & Subjects ──────────────────────────
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  // ─── Subject Attendance State ─────────────────────────────
  const [selectedAssignment, setSelectedAssignment] = useState<string>("");
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  const [studentStatuses, setStudentStatuses] = useState<Record<number, "present" | "absent" | "late">>({});
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [attendanceSuccess, setAttendanceSuccess] = useState<string | null>(null);

  // ─── Class Diary State ─────────────────────────────────────
  const [diaries, setDiaries] = useState<any[]>([]);
  const [diaryDateFilter, setDiaryDateFilter] = useState(() => new Date().toISOString().split("T")[0]);
  const [loadingDiaries, setLoadingDiaries] = useState(false);
  const [showAddDiaryModal, setShowAddDiaryModal] = useState(false);
  const [newDiaryAssignmentId, setNewDiaryAssignmentId] = useState<string>("");
  const [newDiaryDate, setNewDiaryDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [newDiaryContent, setNewDiaryContent] = useState("");
  const [savingDiary, setSavingDiary] = useState(false);

  // ─── Self Attendance & GPS State ───────────────────────────
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [myAttendances, setMyAttendances] = useState<any[]>([]);
  const [loadingMyAttendance, setLoadingMyAttendance] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsResult, setGpsResult] = useState<any>(null);

  // ─── Salary Slips State ────────────────────────────────────
  const [salarySlips, setSalarySlips] = useState<any[]>([]);
  const [loadingSlips, setLoadingSlips] = useState(false);
  const [selectedSlipDetail, setSelectedSlipDetail] = useState<any>(null);
  const [loadingSlipDetail, setLoadingSlipDetail] = useState(false);

  // ─── Advance Salary State ──────────────────────────────────
  const [advanceSummary, setAdvanceSummary] = useState<any>(null);
  const [loadingAdvance, setLoadingAdvance] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [advanceReason, setAdvanceReason] = useState("");
  const [advanceMonth, setAdvanceMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [submittingAdvance, setSubmittingAdvance] = useState(false);

  // ─── Leave Applications State ──────────────────────────────
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveStartDate, setLeaveStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [leaveEndDate, setLeaveEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [leaveReason, setLeaveReason] = useState("");
  const [submittingLeave, setSubmittingLeave] = useState(false);

  // ─── Signature Canvas & Modal State ─────────────────────────
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureMode, setSignatureMode] = useState<"draw" | "upload">("draw");
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [savingSignature, setSavingSignature] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // ─── Profile Edit State ────────────────────────────────────
  const [editProfileName, setEditProfileName] = useState("");
  const [editProfileEmail, setEditProfileEmail] = useState("");
  const [editProfilePhone, setEditProfilePhone] = useState("");
  const [editProfileEmergency, setEditProfileEmergency] = useState("");
  const [editProfileQualification, setEditProfileQualification] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // ─── Initial Load ──────────────────────────────────────────
  useEffect(() => {
    fetchProfile();
    fetchAssignments();
    fetchMyAttendances(selectedMonth);
    fetchSalarySlips();
    fetchAdvanceData(selectedMonth);
    fetchLeaves();
    fetchDiaries(diaryDateFilter);
    fetchTeacherReceivings();
    fetchAllSchoolClasses();
  }, []);

  // ─── API Fetchers ──────────────────────────────────────────
  const fetchProfile = async () => {
    setLoadingUser(true);
    try {
      const res = await fetch(`${API}/user`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setTeacher(data);
        setEditProfileName(data.name || "");
        setEditProfileEmail(data.email || "");
        setEditProfilePhone(data.contact_number || "");
        setEditProfileEmergency(data.emergency_contact || "");
        setEditProfileQualification(data.qualification || "");
      }
    } catch (err) {
      console.error("Failed to load user profile", err);
    } finally {
      setLoadingUser(false);
    }
  };

  const fetchAssignments = async () => {
    setLoadingAssignments(true);
    try {
      const res = await fetch(`${API}/teacher/subject-attendance/assignments`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAssignments(data.data || []);
        if (data.data && data.data.length > 0 && !selectedAssignment) {
          setSelectedAssignment(String(data.data[0].id));
        }
      }
    } catch (err) {
      console.error("Failed to load teacher assignments", err);
    } finally {
      setLoadingAssignments(false);
    }
  };

  const fetchMyAttendances = async (month: string) => {
    setLoadingMyAttendance(true);
    try {
      const res = await fetch(`${API}/teacher-attendance?month=${month}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setMyAttendances(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load teacher attendance", err);
    } finally {
      setLoadingMyAttendance(false);
    }
  };

  const fetchSalarySlips = async () => {
    setLoadingSlips(true);
    try {
      const res = await fetch(`${API}/teacher-salaries`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSalarySlips(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load salary slips", err);
    } finally {
      setLoadingSlips(false);
    }
  };

  const fetchAdvanceData = async (month: string) => {
    setLoadingAdvance(true);
    try {
      const res = await fetch(`${API}/teacher/advance-salary?month=${month}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAdvanceSummary(data);
      }
    } catch (err) {
      console.error("Failed to load advance salary data", err);
    } finally {
      setLoadingAdvance(false);
    }
  };

  const fetchLeaves = async () => {
    setLoadingLeaves(true);
    try {
      const res = await fetch(`${API}/teacher/leaves`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setLeaves(data.leaves || []);
      }
    } catch (err) {
      console.error("Failed to load leaves", err);
    } finally {
      setLoadingLeaves(false);
    }
  };

  const fetchDiaries = async (date: string) => {
    setLoadingDiaries(true);
    try {
      const res = await fetch(`${API}/teacher/diaries?date=${date}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setDiaries(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load diaries", err);
    } finally {
      setLoadingDiaries(false);
    }
  };

  // ─── Enrolled Students for Subject Attendance ─────────────
  useEffect(() => {
    if (selectedAssignment && attendanceDate) {
      loadStudentsForAssignment(selectedAssignment, attendanceDate);
    }
  }, [selectedAssignment, attendanceDate]);

  const loadStudentsForAssignment = async (assignId: string, date: string) => {
    const assignment = assignments.find((a) => String(a.id) === String(assignId));
    if (!assignment) return;

    setLoadingStudents(true);
    setAttendanceSuccess(null);
    try {
      const params = new URLSearchParams({
        class_id: String(assignment.class_id),
        section_id: String(assignment.section_id),
        subject_id: String(assignment.subject_id),
        date: date,
      });
      if (assignment.major_id) {
        params.append("major_id", String(assignment.major_id));
      }

      const res = await fetch(`${API}/teacher/subject-attendance/students?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        const students = data.data || [];
        setEnrolledStudents(students);

        const initialStatuses: Record<number, "present" | "absent" | "late"> = {};
        students.forEach((st: any) => {
          initialStatuses[st.id] = (st.current_attendance_status as "present" | "absent" | "late") || "present";
        });
        setStudentStatuses(initialStatuses);
      }
    } catch (err) {
      console.error("Failed to load subject students", err);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleSaveSubjectAttendance = async () => {
    const assignment = assignments.find((a) => String(a.id) === String(selectedAssignment));
    if (!assignment) return;

    setSavingAttendance(true);
    setAttendanceSuccess(null);
    try {
      const attendances = enrolledStudents.map((st) => ({
        student_id: st.id,
        status: studentStatuses[st.id] || "present",
      }));

      const res = await fetch(`${API}/teacher/subject-attendance`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          subject_id: assignment.subject_id,
          date: attendanceDate,
          attendances: attendances,
        }),
      });

      if (res.ok) {
        setAttendanceSuccess("Subject attendance saved successfully! Parents have been notified.");
        setTimeout(() => setAttendanceSuccess(null), 5000);
      } else {
        const data = await res.json();
        alert(data.message || "Failed to save subject attendance");
      }
    } catch (err: any) {
      alert("Error saving subject attendance: " + err.message);
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleMarkAllStudents = (status: "present" | "absent" | "late") => {
    const updated: Record<number, "present" | "absent" | "late"> = {};
    enrolledStudents.forEach((st) => {
      updated[st.id] = status;
    });
    setStudentStatuses(updated);
  };

  // ─── Mark Self Attendance Present ──────────────────────────
  const handleMarkSelfPresent = async () => {
    setCheckingIn(true);
    try {
      const now = new Date();
      const timeStr = now.toTimeString().split(" ")[0]; // HH:mm:ss
      const dateStr = now.toISOString().split("T")[0];

      const res = await fetch(`${API}/teacher-attendance/mark-self-present`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          date: dateStr,
          check_in_time: timeStr,
        }),
      });

      if (res.ok) {
        alert(`Attendance marked successfully at ${now.toLocaleTimeString()}!`);
        fetchMyAttendances(selectedMonth);
      } else {
        const data = await res.json();
        alert(data.message || "Failed to mark attendance.");
      }
    } catch (err: any) {
      alert("Error marking attendance: " + err.message);
    } finally {
      setCheckingIn(false);
    }
  };

  // ─── GPS Telemetry Ping ────────────────────────────────────
  const handleGpsPing = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setGpsLoading(true);
    setGpsResult(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const payload = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            device_info: `${navigator.platform} - Browser Web`,
          };

          const res = await fetch(`${API}/teacher/ping-location`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(payload),
          });

          const data = await res.json();
          setGpsResult(data);
          if (data.attendance_marked) {
            fetchMyAttendances(selectedMonth);
          }
        } catch (err: any) {
          alert("Error sending location ping: " + err.message);
        } finally {
          setGpsLoading(false);
        }
      },
      (err) => {
        alert("Geolocation error: " + err.message);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // ─── Class Diary Creation & Delete ─────────────────────────
  const handleCreateDiary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDiaryAssignmentId || !newDiaryContent.trim()) {
      alert("Please select a class/subject assignment and enter homework notes.");
      return;
    }

    const assignment = assignments.find((a) => String(a.id) === String(newDiaryAssignmentId));
    if (!assignment) return;

    setSavingDiary(true);
    try {
      const res = await fetch(`${API}/teacher/diaries`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          class_id: assignment.class_id,
          subject_id: assignment.subject_id,
          section_id: assignment.section_id || null,
          diary_date: newDiaryDate,
          content: newDiaryContent,
        }),
      });

      if (res.ok) {
        setShowAddDiaryModal(false);
        setNewDiaryContent("");
        fetchDiaries(diaryDateFilter);
        alert("Class diary published successfully!");
      } else {
        const data = await res.json();
        alert(data.message || "Failed to publish diary.");
      }
    } catch (err: any) {
      alert("Error saving diary: " + err.message);
    } finally {
      setSavingDiary(false);
    }
  };

  const handleDeleteDiary = async (id: number) => {
    if (!confirm("Are you sure you want to delete this diary entry?")) return;

    try {
      const res = await fetch(`${API}/teacher/diaries/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setDiaries((prev) => prev.filter((d) => d.id !== id));
      } else {
        const data = await res.json();
        alert(data.message || "Failed to delete diary.");
      }
    } catch (err: any) {
      alert("Error deleting diary: " + err.message);
    }
  };

  // ─── Advance Salary Submission ─────────────────────────────
  const handleSubmitAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(advanceAmount);
    if (isNaN(amt) || amt < 100) {
      alert("Please enter a valid amount (minimum Rs 100).");
      return;
    }
    if (!advanceReason.trim()) {
      alert("Please state a reason for the advance salary request.");
      return;
    }

    setSubmittingAdvance(true);
    try {
      const res = await fetch(`${API}/teacher/advance-salary`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          amount: amt,
          reason: advanceReason,
          deduction_month: advanceMonth,
        }),
      });

      if (res.ok) {
        setShowAdvanceModal(false);
        setAdvanceAmount("");
        setAdvanceReason("");
        fetchAdvanceData(selectedMonth);
        alert("Advance salary request submitted successfully! Admin will review it.");
      } else {
        const data = await res.json();
        alert(data.message || "Failed to submit request.");
      }
    } catch (err: any) {
      alert("Error submitting request: " + err.message);
    } finally {
      setSubmittingAdvance(false);
    }
  };

  // ─── Leave Application Submission ──────────────────────────
  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveReason.trim()) {
      alert("Please enter a reason for the leave application.");
      return;
    }

    setSubmittingLeave(true);
    try {
      const res = await fetch(`${API}/teacher/leaves`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          start_date: leaveStartDate,
          end_date: leaveEndDate,
          reason: leaveReason,
        }),
      });

      if (res.ok) {
        setShowLeaveModal(false);
        setLeaveReason("");
        fetchLeaves();
        alert("Leave application submitted successfully!");
      } else {
        const data = await res.json();
        alert(data.message || "Failed to submit leave application.");
      }
    } catch (err: any) {
      alert("Error submitting leave application: " + err.message);
    } finally {
      setSubmittingLeave(false);
    }
  };

  // ─── Salary Slip Details Modal ──────────────────────────────
  const handleOpenSlipDetail = async (slipId: number) => {
    setLoadingSlipDetail(true);
    try {
      const res = await fetch(`${API}/teacher-salaries/${slipId}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedSlipDetail(data);
      }
    } catch (err) {
      console.error("Failed to load slip details", err);
    } finally {
      setLoadingSlipDetail(false);
    }
  };

  // ─── Student Receivings Fetchers & Slip Generator ──────────
  const fetchTeacherReceivings = async () => {
    setLoadingTeacherReceivings(true);
    try {
      const res = await fetch(`${API}/staff-receivings`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        setTeacherReceivings(Array.isArray(json.data) ? json.data : []);
        if (json.stats) {
          setTeacherReceivingsStats({
            total_pending_amount: Number(json.stats.total_pending_amount || 0),
            pending_count: Number(json.stats.pending_count || 0),
            total_cleared: Number(json.stats.total_cleared || 0),
            total_all_time: Number(json.stats.total_all_time || 0),
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch teacher student receivings", err);
    } finally {
      setLoadingTeacherReceivings(false);
    }
  };

  const fetchAllSchoolClasses = async () => {
    try {
      const res = await fetch(`${API}/classes`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAllSchoolClasses(Array.isArray(data) ? data : (data.data || []));
      }
    } catch (err) {
      console.error("Failed to load classes", err);
    }
  };

  const triggerTeacherPrintSlip = (item: any) => {
    const formattedDate = new Date(item.received_date || new Date()).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const studentName = item.student?.name || "Student";
    const fatherName = item.student?.father_name || "";
    const rollNo = item.student?.roll_number || `#${item.student?.id || ""}`;
    const className = item.student?.academyClass?.name || item.student?.academy_class?.name || "N/A";
    const sectionName = item.student?.section?.name || "";
    const staffName = item.staff?.name || teacher?.name || "Teacher";
    const amountNum = parseFloat(String(item.amount) || "0").toLocaleString();
    const adminClearStatus =
      item.status === "received_by_admin"
        ? `Deposited to School Accounts (${item.adminReceiver?.name || item.admin_receiver?.name || "Admin"})`
        : "Pending Handover (Cash with Teacher)";

    const printHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Receipt - ${item.receipt_no}</title>
          <style>
            @page { size: 80mm auto; margin: 4mm; }
            @media print {
              html, body { width: 100%; margin: 0 !important; padding: 0 !important; background: #fff !important; }
            }
            * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
            body { background: #fff; color: #0f172a; padding: 8px; display: flex; justify-content: center; }
            .slip { width: 100%; max-width: 320px; border: 1px dashed #64748b; border-radius: 8px; padding: 14px; }
            .center { text-align: center; }
            .school-title { font-size: 16px; font-weight: 900; text-transform: uppercase; color: #0f224a; }
            .sub-title { font-size: 10px; color: #64748b; margin-top: 2px; }
            .divider { border-top: 1px dashed #cbd5e1; margin: 10px 0; }
            .receipt-no { font-family: monospace; font-size: 12px; font-weight: 800; background: #f1f5f9; padding: 4px 8px; border-radius: 4px; display: inline-block; }
            .row { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 5px; }
            .label { color: #64748b; }
            .value { font-weight: 700; color: #0f172a; text-align: right; }
            .amount-box { background: #f8fafc; border: 1.5px solid #0f224a; border-radius: 6px; padding: 10px; margin: 10px 0; text-align: center; }
            .amount-val { font-size: 20px; font-weight: 900; color: #0f224a; font-family: monospace; }
            .desc-box { font-size: 11px; background: #eff6ff; border-radius: 4px; padding: 6px 8px; margin-bottom: 10px; color: #1e3a8a; }
            .footer-note { font-size: 9px; color: #94a3b8; text-align: center; margin-top: 12px; }
            .signatures { display: flex; justify-content: space-between; margin-top: 25px; padding-top: 10px; font-size: 10px; color: #475569; }
            .sig-line { border-top: 1px solid #94a3b8; width: 45%; text-align: center; padding-top: 4px; }
          </style>
        </head>
        <body>
          <div class="slip">
            <div class="center">
              <div class="school-title">KIPS SCHOOL</div>
              <div class="sub-title">Student Payment Receipt</div>
              <div style="margin-top: 6px;">
                <span class="receipt-no">${item.receipt_no}</span>
              </div>
            </div>
            <div class="divider"></div>
            <div class="row"><span class="label">Date:</span><span class="value">${formattedDate}</span></div>
            <div class="row"><span class="label">Student:</span><span class="value">${studentName}</span></div>
            ${fatherName ? `<div class="row"><span class="label">Father:</span><span class="value">${fatherName}</span></div>` : ""}
            <div class="row"><span class="label">Class & Roll:</span><span class="value">${className} ${sectionName ? `(${sectionName})` : ""} • #${rollNo}</span></div>
            <div class="row"><span class="label">Received By:</span><span class="value">${staffName}</span></div>
            <div class="row"><span class="label">Method:</span><span class="value">${(item.payment_method || "cash").toUpperCase()}</span></div>
            <div class="desc-box"><strong>Purpose:</strong> ${item.description}</div>
            <div class="amount-box">
              <div style="font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase;">Amount Paid</div>
              <div class="amount-val">Rs. ${amountNum}</div>
            </div>
            <div class="row" style="margin-top: 6px;">
              <span class="label">Status:</span>
              <span class="value" style="color: ${item.status === "received_by_admin" ? "#059669" : "#d97706"}">
                ${adminClearStatus}
              </span>
            </div>
            <div class="signatures">
              <div class="sig-line">Teacher Signature</div>
              <div class="sig-line">Parent / Student</div>
            </div>
          </div>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `;
    const printWin = window.open("", "_blank", "width=420,height=600");
    if (printWin) {
      printWin.document.open();
      printWin.document.write(printHtml);
      printWin.document.close();
    }
  };

  // ─── Profile Image Upload ──────────────────────────────────
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/user/image`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setTeacher((prev: any) => ({ ...prev, image: data.image }));
        alert("Profile picture updated!");
      } else {
        const data = await res.json();
        alert(data.message || "Failed to upload image");
      }
    } catch (err: any) {
      alert("Error uploading image: " + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  // ─── Profile Update ─────────────────────────────────────────
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch(`${API}/user/profile`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: editProfileName,
          email: editProfileEmail,
          contact_number: editProfilePhone,
          emergency_contact: editProfileEmergency,
          qualification: editProfileQualification,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTeacher(data);
        alert("Profile updated successfully!");
      } else {
        const data = await res.json();
        alert(data.message || "Failed to update profile");
      }
    } catch (err: any) {
      alert("Error updating profile: " + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  // ─── Canvas Signature Drawing Logic ─────────────────────────
  useEffect(() => {
    if (showSignatureModal && signatureMode === "draw") {
      setTimeout(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }, 100);
    }
  }, [showSignatureModal, signatureMode]);

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

  const handleSaveSignature = async () => {
    setSavingSignature(true);
    try {
      const token = localStorage.getItem("token");

      if (signatureMode === "draw") {
        const canvas = canvasRef.current;
        if (!canvas || !hasDrawn) {
          alert("Please draw your signature before saving.");
          setSavingSignature(false);
          return;
        }
        const base64 = canvas.toDataURL("image/png");
        const res = await fetch(`${API}/teacher/signature`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ signature_base64: base64 }),
        });

        if (res.ok) {
          const data = await res.json();
          setTeacher((prev: any) => ({ ...prev, signature: data.signature }));
          setShowSignatureModal(false);
          alert("Signature saved successfully! It will now appear on student result cards.");
        } else {
          const data = await res.json();
          alert(data.message || "Failed to save signature");
        }
      } else {
        if (!signatureFile) {
          alert("Please select a signature image file to upload.");
          setSavingSignature(false);
          return;
        }

        const formData = new FormData();
        formData.append("signature", signatureFile);

        const res = await fetch(`${API}/teacher/signature`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          setTeacher((prev: any) => ({ ...prev, signature: data.signature }));
          setShowSignatureModal(false);
          setSignatureFile(null);
          alert("Signature uploaded successfully!");
        } else {
          const data = await res.json();
          alert(data.message || "Failed to upload signature");
        }
      }
    } catch (err: any) {
      alert("Error saving signature: " + err.message);
    } finally {
      setSavingSignature(false);
    }
  };

  const handleDeleteSignature = async () => {
    if (!confirm("Are you sure you want to remove your signature?")) return;
    try {
      const res = await fetch(`${API}/teacher/signature`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setTeacher((prev: any) => ({ ...prev, signature: null }));
        alert("Signature removed.");
      }
    } catch (err: any) {
      alert("Error removing signature: " + err.message);
    }
  };

  // ─── Calculations for Overview ─────────────────────────────
  const todayStr = new Date().toISOString().split("T")[0];
  const todayAttendance = myAttendances.find((a) => a.date === todayStr);

  const presentDaysCount = myAttendances.filter((a) => a.status === "Present").length;
  const absentDaysCount = myAttendances.filter((a) => a.status === "Absent").length;
  const leaveDaysCount = myAttendances.filter((a) => a.status === "Leave").length;
  const totalMarkedDays = presentDaysCount + absentDaysCount + leaveDaysCount;
  const attendancePercentage = totalMarkedDays > 0 ? Math.round((presentDaysCount / totalMarkedDays) * 100) : 0;

  const currentMonthSlip = salarySlips.find((s) => s.month === selectedMonth);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ─── Welcome Header ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#0f224a] tracking-tight">
            Welcome, {teacher?.name || "Teacher"}!
          </h1>
          <p className="mt-1 text-xs md:text-sm text-[#2563eb] font-medium">
            Teacher Portal — KIPS School Chunian Campus
          </p>
        </div>
        {teacher?.qualification && (
          <div className="self-start sm:self-auto">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              {teacher.qualification}
            </span>
          </div>
        )}
      </div>

      {/* ─── Navigation Tabs ────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
        {[
          { id: "overview", label: "Overview", icon: Sparkles },
          { id: "assignments", label: "My Classes & Subjects", icon: BookOpen, badge: assignments.length },
          { id: "subject_attendance", label: "Mark Subject Attendance", icon: CheckCircle2 },
          { id: "class_diary", label: "Class Diary", icon: FileText, badge: diaries.length },
          { id: "my_attendance", label: "My Attendance", icon: Calendar },
          {
            id: "student_receivings",
            label: "Student Receivings",
            icon: DollarSign,
            badge: teacherReceivingsStats.pending_count > 0 ? teacherReceivingsStats.pending_count : undefined,
          },
          { id: "salaries", label: "My Salary", icon: CreditCard },
          { id: "advance", label: "Advance Salary", icon: DollarSign },
          { id: "leaves", label: "Leaves", icon: Clock },
          { id: "profile", label: "Profile & Settings", icon: User },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm whitespace-nowrap transition-all duration-200 flex items-center gap-2 shrink-0 ${
                isActive
                  ? "bg-[#1e3a8a] text-white shadow-md shadow-blue-900/20"
                  : "bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-sky-300" : "text-slate-500"}`} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    isActive ? "bg-sky-400 text-[#0b1329]" : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── TAB 1: OVERVIEW ───────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned Classes</p>
                <h3 className="text-2xl font-black text-[#0f224a]">{assignments.length}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Active course subjects</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CalendarCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Attendance ({selectedMonth})</p>
                <h3 className="text-2xl font-black text-emerald-600">{attendancePercentage}%</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {presentDaysCount} Present • {absentDaysCount} Absent • {leaveDaysCount} Leave
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Class Diaries</p>
                <h3 className="text-2xl font-black text-[#0f224a]">{diaries.length}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Recorded homework entries</p>
              </div>
            </div>

            {/* Cash With Me (Student Collections) */}
            <div
              onClick={() => setActiveTab("student_receivings")}
              className="bg-white p-5 rounded-2xl border border-amber-200/90 shadow-sm flex items-center gap-4 cursor-pointer hover:border-amber-400 hover:shadow-md transition bg-gradient-to-br from-amber-50/50 to-white group"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Cash With Me</p>
                <h3 className="text-2xl font-black text-amber-950">
                  Rs. {Number(teacherReceivingsStats.total_pending_amount || 0).toLocaleString()}
                </h3>
                <p className="text-[11px] text-amber-700/80 font-medium mt-0.5">
                  {teacherReceivingsStats.pending_count} pending handover to admin
                </p>
              </div>
            </div>
          </div>

          {/* Quick Shortcuts & Assignments Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* My Active Assigned Classes */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#0f224a]">My Active Classes</h3>
                    <p className="text-xs text-slate-500">Quickly access student attendance and homework</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab("assignments")}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  View All <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {assignments.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  No classes or subjects assigned yet. Contact administrator.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {assignments.slice(0, 4).map((assign) => (
                    <div
                      key={assign.id}
                      className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-blue-300 hover:shadow-md transition duration-200 group"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-sm text-[#0f224a] group-hover:text-blue-700 transition">
                            {assign.subject?.name || "Subject"}
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5 font-medium">
                            {assign.academy_class?.name || "Class"} • Section {assign.section?.name || "All"}
                          </p>
                          {assign.major && (
                            <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-200/60">
                              {assign.major.name}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 capitalize">
                          {assign.payment_type || "fixed"}
                        </span>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedAssignment(String(assign.id));
                            setActiveTab("subject_attendance");
                          }}
                          className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#1e3a8a] hover:bg-[#152e6f] text-white text-[11px] font-bold transition flex items-center justify-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Attendance
                        </button>
                        <button
                          onClick={() => {
                            setNewDiaryAssignmentId(String(assign.id));
                            setShowAddDiaryModal(true);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-bold transition flex items-center justify-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Diary
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions & Recent Notices */}
            <div className="space-y-6">
              {/* Quick Links Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                <h3 className="text-base font-bold text-[#0f224a] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" /> Quick Teacher Actions
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setShowTeacherCollectModal(true)}
                    className="w-full p-3 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200/80 hover:border-emerald-300 transition flex items-center justify-between text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#0f224a] group-hover:text-emerald-700">Receive from Student</p>
                        <p className="text-[11px] text-slate-500">Collect fees/charges & send WhatsApp</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
                  </button>

                  <button
                    onClick={() => router.push("/dashboard/marks-entry")}
                    className="w-full p-3 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200/80 hover:border-blue-300 transition flex items-center justify-between text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <Award className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#0f224a] group-hover:text-blue-700">Enter Student Marks</p>
                        <p className="text-[11px] text-slate-500">Submit marks for round tests</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                  </button>

                  <button
                    onClick={() => setShowSignatureModal(true)}
                    className="w-full p-3 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200/80 hover:border-blue-300 transition flex items-center justify-between text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                        <PenTool className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#0f224a] group-hover:text-blue-700">Digital Signature</p>
                        <p className="text-[11px] text-slate-500">{teacher?.signature ? "Update official signature" : "Upload or draw signature"}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: MY CLASSES & SUBJECTS ───────────────────────── */}
      {activeTab === "assignments" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-lg font-bold text-[#0f224a]">My Assigned Classes & Subjects</h2>
              <p className="text-xs text-slate-500">These courses are configured by administration for you to teach.</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200">
              Total {assignments.length} Course Assignments
            </span>
          </div>

          {assignments.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              No assignments found. Please contact administration.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignments.map((assign) => (
                <div
                  key={assign.id}
                  className="p-5 rounded-2xl border border-slate-200 bg-slate-50/40 hover:bg-white hover:border-blue-400 hover:shadow-lg transition-all duration-200 flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                        {assign.academy_class?.name || "Class"}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        Section: <strong className="text-slate-800">{assign.section?.name || "All"}</strong>
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-[#0f224a] mt-2">{assign.subject?.name || "Subject"}</h3>
                    {assign.major && (
                      <p className="text-xs text-indigo-600 font-semibold mt-0.5">Major: {assign.major.name}</p>
                    )}
                    <div className="mt-3 p-2.5 rounded-xl bg-slate-100 text-[11px] text-slate-600 flex items-center justify-between">
                      <span>Salary Basis:</span>
                      <strong className="capitalize text-slate-800">
                        {assign.payment_type === "percentage" ? "Percentage Share" : "Fixed Amount"}
                      </strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80">
                    <button
                      onClick={() => {
                        setSelectedAssignment(String(assign.id));
                        setActiveTab("subject_attendance");
                      }}
                      className="px-3 py-2 rounded-xl bg-[#1e3a8a] hover:bg-[#152e6f] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Attendance
                    </button>
                    <button
                      onClick={() => {
                        setNewDiaryAssignmentId(String(assign.id));
                        setShowAddDiaryModal(true);
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5" /> Diary
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: SUBJECT ATTENDANCE ─────────────────────────── */}
      {activeTab === "subject_attendance" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
            <div>
              <h2 className="text-lg font-bold text-[#0f224a]">Mark Subject-wise Attendance</h2>
              <p className="text-xs text-slate-500">
                Mark attendance for students enrolled in your specific subject. Parents will receive real-time notifications.
              </p>
            </div>

            {/* Assignment & Date Selector Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-64">
                <CustomDropdown
                  name="selectedAssignment"
                  value={selectedAssignment}
                  onChange={(_, val) => setSelectedAssignment(String(val))}
                  options={assignments.map((a) => ({
                    label: `${a.subject?.name || "Subject"} (${a.academy_class?.name || "Class"} - ${a.section?.name || "Sec"})`,
                    value: String(a.id),
                  }))}
                  placeholder="Select Class & Subject"
                />
              </div>

              <div>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="h-[38px] px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {attendanceSuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{attendanceSuccess}</span>
            </div>
          )}

          {/* Quick Mark Shortcuts & Table */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Quick Set:</span>
              <button
                onClick={() => handleMarkAllStudents("present")}
                className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition"
              >
                All Present
              </button>
              <button
                onClick={() => handleMarkAllStudents("absent")}
                className="px-3 py-1 rounded-lg text-xs font-bold bg-rose-100 text-rose-800 hover:bg-rose-200 transition"
              >
                All Absent
              </button>
              <button
                onClick={() => handleMarkAllStudents("late")}
                className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 hover:bg-amber-200 transition"
              >
                All Late
              </button>
            </div>

            <button
              onClick={handleSaveSubjectAttendance}
              disabled={savingAttendance || enrolledStudents.length === 0}
              className="px-5 py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-[#152e6f] text-white text-xs font-bold shadow-md transition active:scale-95 flex items-center gap-2"
            >
              {savingAttendance ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Save & Notify Parents
            </button>
          </div>

          {loadingStudents ? (
            <div className="py-16 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-600" /> Loading enrolled students...
            </div>
          ) : enrolledStudents.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              No enrolled students found for this class & subject.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Roll #</th>
                    <th className="px-4 py-3">Student Name</th>
                    <th className="px-4 py-3">Father Name</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3 text-center">Attendance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70">
                  {enrolledStudents.map((student) => {
                    const status = studentStatuses[student.id] || "present";
                    return (
                      <tr key={student.id} className="hover:bg-blue-50/40 transition">
                        <td className="px-4 py-3 font-bold text-slate-700">
                          {student.roll_number || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                              {student.image ? (
                                <img
                                  src={`${storageUrl}${student.image}`}
                                  alt={student.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <User className="w-3.5 h-3.5 text-slate-500" />
                              )}
                            </div>
                            <span className="font-bold text-[#0f224a]">{student.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{student.father_name || "—"}</td>
                        <td className="px-4 py-3 text-slate-500">{student.contact_number || "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setStudentStatuses((prev) => ({ ...prev, [student.id]: "present" }))
                              }
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                                status === "present"
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              Present
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setStudentStatuses((prev) => ({ ...prev, [student.id]: "absent" }))
                              }
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                                status === "absent"
                                  ? "bg-rose-600 text-white shadow-xs"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              Absent
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setStudentStatuses((prev) => ({ ...prev, [student.id]: "late" }))
                              }
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                                status === "late"
                                  ? "bg-amber-500 text-white shadow-xs"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              Late
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

      {/* ─── TAB 4: CLASS DIARY ─────────────────────────────────── */}
      {activeTab === "class_diary" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
            <div>
              <h2 className="text-lg font-bold text-[#0f224a]">Daily Class Diary & Homework</h2>
              <p className="text-xs text-slate-500">Post daily homework tasks and lesson summaries for students and parents.</p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="date"
                value={diaryDateFilter}
                onChange={(e) => {
                  setDiaryDateFilter(e.target.value);
                  fetchDiaries(e.target.value);
                }}
                className="h-[38px] px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-800 outline-none"
              />

              <button
                onClick={() => setShowAddDiaryModal(true)}
                className="px-4 py-2 rounded-xl bg-[#1e3a8a] hover:bg-[#152e6f] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Post Diary
              </button>
            </div>
          </div>

          {loadingDiaries ? (
            <div className="py-16 text-center text-slate-400 text-sm">Loading diary entries...</div>
          ) : diaries.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              No class diary entries found for {diaryDateFilter}.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {diaries.map((diary) => (
                <div key={diary.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3 relative group">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                        {diary.academy_class?.name || "Class"}
                      </span>
                      <h3 className="text-base font-bold text-[#0f224a] mt-1">{diary.subject?.name || "Subject"}</h3>
                      <p className="text-xs text-slate-500">
                        Date: {diary.diary_date} • Section: {diary.section?.name || "All"}
                      </p>
                    </div>

                    <button
                      onClick={() => handleDeleteDiary(diary.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                      title="Delete entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 whitespace-pre-line font-medium leading-relaxed">
                    {diary.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 5: MY ATTENDANCE ───────────────────────────────── */}
      {activeTab === "my_attendance" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
            <div>
              <h2 className="text-lg font-bold text-[#0f224a]">My Monthly Attendance Register</h2>
              <p className="text-xs text-slate-500">Review your daily punch-in times, leaves, and attendance statistics.</p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  fetchMyAttendances(e.target.value);
                }}
                className="h-[38px] px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-800 outline-none"
              />
            </div>
          </div>

          {/* Attendance Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <p className="text-[11px] font-bold text-emerald-800 uppercase">Present Days</p>
              <h3 className="text-2xl font-black text-emerald-700 mt-1">{presentDaysCount}</h3>
            </div>
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
              <p className="text-[11px] font-bold text-rose-800 uppercase">Absent Days</p>
              <h3 className="text-2xl font-black text-rose-700 mt-1">{absentDaysCount}</h3>
            </div>
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-[11px] font-bold text-amber-800 uppercase">Leave Days</p>
              <h3 className="text-2xl font-black text-amber-700 mt-1">{leaveDaysCount}</h3>
            </div>
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
              <p className="text-[11px] font-bold text-blue-800 uppercase">Overall Attendance</p>
              <h3 className="text-2xl font-black text-blue-700 mt-1">{attendancePercentage}%</h3>
            </div>
          </div>

          {loadingMyAttendance ? (
            <div className="py-16 text-center text-slate-400 text-sm">Loading attendance register...</div>
          ) : myAttendances.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">No attendance records found for {selectedMonth}.</div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Day</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Check In</th>
                    <th className="px-4 py-3">Check Out</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70">
                  {myAttendances.map((record) => {
                    const recDate = new Date(record.date);
                    const dayName = recDate.toLocaleDateString("en-US", { weekday: "short" });
                    return (
                      <tr key={record.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 font-bold text-slate-800">{record.date}</td>
                        <td className="px-4 py-3 text-slate-600">{dayName}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              record.status === "Present"
                                ? "bg-emerald-100 text-emerald-800"
                                : record.status === "Absent"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {record.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-700">{record.check_in_time || "—"}</td>
                        <td className="px-4 py-3 font-mono text-slate-700">{record.check_out_time || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: STUDENT RECEIVINGS (CASH COLLECTIONS) ─────────── */}
      {activeTab === "student_receivings" && (
        <div className="space-y-6">
          {/* Header & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-[#0f224a] flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-600" />
                Student Receivings & Handover
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Collect payments from any student across all classes. Hand over cash to Super Admin to clear your balance.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchTeacherReceivings}
                disabled={loadingTeacherReceivings}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingTeacherReceivings ? "animate-spin text-blue-600" : "text-slate-500"}`} />
                <span>Refresh</span>
              </button>
              <button
                onClick={() => setShowTeacherCollectModal(true)}
                className="px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-[#0f224a] hover:bg-[#1e3a8a] shadow-md shadow-blue-950/20 transition flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4 text-sky-300" />
                <span>+ Collect from Student</span>
              </button>
            </div>
          </div>

          {/* KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Card 1: Cash in Hand (Pending Handover) */}
            <div className="p-5 rounded-2xl border border-amber-300/80 bg-gradient-to-br from-amber-500/10 via-amber-50 to-white shadow-2xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-800">
                  Cash In Hand (With You)
                </span>
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-amber-950">
                Rs. {Number(teacherReceivingsStats.total_pending_amount || 0).toLocaleString()}
              </div>
              <div className="mt-2 text-[11px] font-bold text-amber-800 flex items-center gap-1">
                <span>{teacherReceivingsStats.pending_count} collections</span>
                <span>• Pay to Admin to clear</span>
              </div>
            </div>

            {/* Card 2: Handed Over to Admin */}
            <div className="p-5 rounded-2xl border border-emerald-300/80 bg-gradient-to-br from-emerald-500/10 via-emerald-50 to-white shadow-2xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800">
                  Handed Over to Admin
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <CheckCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-950">
                Rs. {Number(teacherReceivingsStats.total_cleared || 0).toLocaleString()}
              </div>
              <div className="mt-2 text-[11px] font-semibold text-emerald-700">
                Cleared & deposited into School Receivings
              </div>
            </div>

            {/* Card 3: Total Collections Volume */}
            <div className="p-5 rounded-2xl border border-blue-300/80 bg-gradient-to-br from-blue-500/10 via-blue-50 to-white shadow-2xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-blue-800">
                  Total Collected (All-Time)
                </span>
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-blue-950">
                Rs. {Number(teacherReceivingsStats.total_all_time || 0).toLocaleString()}
              </div>
              <div className="mt-2 text-[11px] font-semibold text-blue-700">
                Overall student payment volume collected
              </div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
              <button
                onClick={() => setTeacherStatusFilter("all")}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  teacherStatusFilter === "all" ? "bg-white text-[#0f224a] shadow-2xs" : "text-slate-600"
                }`}
              >
                All ({teacherReceivings.length})
              </button>
              <button
                onClick={() => setTeacherStatusFilter("pending_handover")}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  teacherStatusFilter === "pending_handover"
                    ? "bg-amber-500 text-white shadow-2xs"
                    : "text-amber-700"
                }`}
              >
                Pending Handover ({teacherReceivings.filter((r) => r.status === "pending_handover").length})
              </button>
              <button
                onClick={() => setTeacherStatusFilter("received_by_admin")}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  teacherStatusFilter === "received_by_admin"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "text-emerald-700"
                }`}
              >
                Cleared by Admin ({teacherReceivings.filter((r) => r.status === "received_by_admin").length})
              </button>
            </div>

            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder="Search student, receipt # or reason..."
                value={teacherReceivingSearch}
                onChange={(e) => setTeacherReceivingSearch(e.target.value)}
                className="w-full h-[36px] pl-8 pr-3 text-xs font-semibold rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* Collections Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Receipt #</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4">Reason / Purpose</th>
                    <th className="py-3 px-4 text-center">WhatsApp Receipt</th>
                    <th className="py-3 px-4 text-center">Admin Handover</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingTeacherReceivings ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-4 h-4 animate-spin inline-block mr-1 text-blue-600" />
                        Loading collections...
                      </td>
                    </tr>
                  ) : teacherReceivings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <div className="space-y-2">
                          <DollarSign className="w-8 h-8 text-slate-300 mx-auto" />
                          <div className="font-bold text-slate-700">No student collections recorded yet</div>
                          <p className="text-[11px] text-slate-500">
                            Click &ldquo;+ Collect from Student&rdquo; to record a payment.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    teacherReceivings
                      .filter((item) => {
                        if (teacherStatusFilter !== "all" && item.status !== teacherStatusFilter) return false;
                        if (!teacherReceivingSearch.trim()) return true;
                        const q = teacherReceivingSearch.toLowerCase();
                        return (
                          item.receipt_no?.toLowerCase().includes(q) ||
                          item.description?.toLowerCase().includes(q) ||
                          item.student?.name?.toLowerCase().includes(q) ||
                          String(item.student?.roll_number || "").includes(q)
                        );
                      })
                      .map((item) => {
                        const isPending = item.status === "pending_handover";
                        const studentClass =
                          item.student?.academyClass?.name || item.student?.academy_class?.name || "N/A";
                        const studentSec = item.student?.section?.name || "";

                        return (
                          <tr key={item.id} className="hover:bg-slate-50 transition">
                            {/* Receipt # & Date */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="font-mono font-bold text-slate-900">{item.receipt_no}</span>
                              <div className="text-[10px] text-slate-400 mt-0.5">{item.received_date}</div>
                            </td>

                            {/* Student */}
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">{item.student?.name}</div>
                              <div className="text-[10px] text-slate-500">
                                {studentClass} {studentSec ? `(${studentSec})` : ""} • Roll #{item.student?.roll_number || item.student_id}
                              </div>
                            </td>

                            {/* Amount */}
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <span className="font-mono font-black text-sm text-[#0f224a]">
                                Rs. {parseFloat(String(item.amount)).toLocaleString()}
                              </span>
                              <div className="text-[10px] text-slate-400 uppercase">{item.payment_method || "cash"}</div>
                            </td>

                            {/* Purpose */}
                            <td className="py-3 px-4 max-w-xs">
                              <div className="text-slate-700 font-medium line-clamp-2">{item.description}</div>
                            </td>

                            {/* WhatsApp status */}
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              {item.whatsapp_status === "sent" ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCheck className="w-3 h-3 text-emerald-600" />
                                  <span>Sent to Parent</span>
                                </span>
                              ) : item.whatsapp_status === "pending" ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  <span>Queued</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  <AlertCircle className="w-3 h-3 text-rose-600" />
                                  <span>Pending</span>
                                </span>
                              )}
                            </td>

                            {/* Handover Status */}
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              {isPending ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                  <span>Pending Handover (Cash with You)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Cleared by Admin</span>
                                </span>
                              )}
                            </td>

                            {/* Action */}
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <button
                                onClick={() => {
                                  setTeacherActiveReceipt(item);
                                  setShowTeacherReceiptModal(true);
                                }}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
                                title="Print Receipt Slip"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 6: SALARY SLIPS ─────────────────────────────────── */}
      {activeTab === "salaries" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-lg font-bold text-[#0f224a]">Monthly Salary Slips</h2>
              <p className="text-xs text-slate-500">View generated monthly salary slips, deductions, and payment status.</p>
            </div>
          </div>

          {loadingSlips ? (
            <div className="py-16 text-center text-slate-400 text-sm">Loading salary slips...</div>
          ) : salarySlips.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">No salary slips generated yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {salarySlips.map((slip) => (
                <div
                  key={slip.id}
                  className="p-5 rounded-2xl border border-slate-200 bg-slate-50/40 hover:bg-white hover:border-blue-300 hover:shadow-lg transition-all space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#0f224a]">{slip.month}</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                        slip.payment_status === "paid"
                          ? "bg-emerald-100 text-emerald-800"
                          : slip.payment_status === "partial"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {slip.payment_status}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-200">
                    <div className="flex justify-between">
                      <span>Gross Amount:</span>
                      <strong className="text-slate-800">Rs {Number(slip.total_amount).toLocaleString()}</strong>
                    </div>
                    {Number(slip.advance_deducted) > 0 && (
                      <div className="flex justify-between text-rose-600">
                        <span>Advance Deducted:</span>
                        <span>- Rs {Number(slip.advance_deducted).toLocaleString()}</span>
                      </div>
                    )}
                    {Number(slip.bf_deduction) > 0 && (
                      <div className="flex justify-between text-amber-700 font-medium">
                        <span>Benevolent Fund {slip.bf_percentage ? `(${slip.bf_percentage}%)` : ""}:</span>
                        <span>- Rs {Number(slip.bf_deduction).toLocaleString()}</span>
                      </div>
                    )}
                    {Number(slip.bonus) > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>Bonus Added:</span>
                        <span>+ Rs {Number(slip.bonus).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-1 border-t font-bold text-sm text-[#0f224a]">
                      <span>Net Payable:</span>
                      <span>Rs {Number(slip.payable_salary).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>Total Paid:</span>
                      <span className="font-bold text-emerald-700">Rs {Number(slip.total_paid || 0).toLocaleString()}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenSlipDetail(slip.id)}
                    className="w-full py-2 rounded-xl bg-[#1e3a8a] hover:bg-[#152e6f] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Eye className="w-3.5 h-3.5" /> View Breakdown
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 7: ADVANCE SALARY ───────────────────────────────── */}
      {activeTab === "advance" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
            <div>
              <h2 className="text-lg font-bold text-[#0f224a]">Advance Salary Requests</h2>
              <p className="text-xs text-slate-500">Request salary in advance and view request approval history.</p>
            </div>

            <button
              onClick={() => setShowAdvanceModal(true)}
              className="px-4 py-2 rounded-xl bg-[#1e3a8a] hover:bg-[#152e6f] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Request Advance
            </button>
          </div>

          {/* Balance Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">Advance Balance</p>
              <h3 className="text-2xl font-black text-amber-700 mt-1">
                Rs {Number(advanceSummary?.advance_balance || 0).toLocaleString()}
              </h3>
              <p className="text-[11px] text-amber-900/70 mt-1">To be adjusted in upcoming salary slips.</p>
            </div>

            <div className="p-5 rounded-2xl bg-blue-50 border border-blue-200">
              <p className="text-xs font-bold text-blue-800 uppercase tracking-wider">Arrears Balance</p>
              <h3 className="text-2xl font-black text-blue-700 mt-1">
                Rs {Number(advanceSummary?.arrears_balance || 0).toLocaleString()}
              </h3>
              <p className="text-[11px] text-blue-900/70 mt-1">Previous unpaid balance due from institution.</p>
            </div>
          </div>

          {/* Advance Requests Table */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-[#0f224a]">My Advance Requests History</h3>
            {loadingAdvance ? (
              <div className="py-12 text-center text-slate-400 text-sm">Loading requests...</div>
            ) : !advanceSummary?.requests || advanceSummary.requests.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">No advance salary requests recorded.</div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Deduction Month</th>
                      <th className="px-4 py-3">Reason</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Admin Notes</th>
                      <th className="px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/70">
                    {advanceSummary.requests.map((req: any) => (
                      <tr key={req.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 font-bold text-slate-900">
                          Rs {Number(req.amount).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-700">{req.deduction_month || "Current"}</td>
                        <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{req.reason}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold capitalize ${
                              req.status === "paid"
                                ? "bg-emerald-100 text-emerald-800"
                                : req.status === "approved"
                                ? "bg-blue-100 text-blue-800"
                                : req.status === "rejected"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {req.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 italic">{req.admin_notes || "—"}</td>
                        <td className="px-4 py-3 text-slate-500">
                          {new Date(req.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 8: LEAVES ──────────────────────────────────────── */}
      {activeTab === "leaves" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
            <div>
              <h2 className="text-lg font-bold text-[#0f224a]">Leave Applications</h2>
              <p className="text-xs text-slate-500">Submit formal leave applications and monitor approval status.</p>
            </div>

            <button
              onClick={() => setShowLeaveModal(true)}
              className="px-4 py-2 rounded-xl bg-[#1e3a8a] hover:bg-[#152e6f] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Apply for Leave
            </button>
          </div>

          {loadingLeaves ? (
            <div className="py-16 text-center text-slate-400 text-sm">Loading leave applications...</div>
          ) : leaves.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">No leave applications submitted yet.</div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Start Date</th>
                    <th className="px-4 py-3">End Date</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Submitted On</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70">
                  {leaves.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-bold text-slate-800">{l.start_date}</td>
                      <td className="px-4 py-3 font-bold text-slate-800">{l.end_date}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-md">{l.reason}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold capitalize ${
                            l.status === "approved"
                              ? "bg-emerald-100 text-emerald-800"
                              : l.status === "rejected"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {l.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(l.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 9: PROFILE & SETTINGS ──────────────────────────── */}
      {activeTab === "profile" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Form */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <h2 className="text-lg font-bold text-[#0f224a] border-b pb-3">Faculty Profile Settings</h2>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={editProfileName}
                    onChange={(e) => setEditProfileName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 outline-none focus:border-blue-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={editProfileEmail}
                    onChange={(e) => setEditProfileEmail(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 outline-none focus:border-blue-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={editProfilePhone}
                    onChange={(e) => setEditProfilePhone(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Emergency Contact</label>
                  <input
                    type="text"
                    value={editProfileEmergency}
                    onChange={(e) => setEditProfileEmergency(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 outline-none focus:border-blue-600"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Qualification & Specialization</label>
                  <input
                    type="text"
                    value={editProfileQualification}
                    onChange={(e) => setEditProfileQualification(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 outline-none focus:border-blue-600"
                    placeholder="e.g. M.Phil Physics, B.Sc Mathematics"
                  />
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-6 py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-[#152e6f] text-white text-xs font-bold shadow-md transition active:scale-95 flex items-center gap-2"
                >
                  {savingProfile ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Save Profile Changes
                </button>
              </div>
            </form>
          </div>

          {/* Signature Management Panel */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-bold text-[#0f224a] border-b pb-3 flex items-center gap-2">
              <PenTool className="w-4 h-4 text-blue-600" /> Digital Signature
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Your official signature is automatically rendered on the Result Cards of the classes you teach.
            </p>

            <div className="p-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center min-h-[140px]">
              {teacher?.signature ? (
                <div className="space-y-2 text-center">
                  <img
                    src={`${storageUrl}${teacher.signature}`}
                    alt="Teacher Signature"
                    className="max-h-20 object-contain mx-auto"
                  />
                  <p className="text-[10px] font-bold text-emerald-600 flex items-center justify-center gap-1">
                    <Check className="w-3 h-3" /> Active on Result Cards
                  </p>
                </div>
              ) : (
                <div className="text-center text-slate-400">
                  <PenTool className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-medium">No signature uploaded yet</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSignatureModal(true)}
                className="flex-1 py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-[#152e6f] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <PenTool className="w-3.5 h-3.5" /> {teacher?.signature ? "Update Signature" : "Add Signature"}
              </button>
              {teacher?.signature && (
                <button
                  onClick={handleDeleteSignature}
                  className="p-2.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                  title="Remove signature"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: SIGNATURE (DRAW / UPLOAD) ────────────────────── */}
      {showSignatureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <PenTool className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-[#0f224a]">Manage Teacher Signature</h3>
              </div>
              <button onClick={() => setShowSignatureModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setSignatureMode("draw")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                  signatureMode === "draw" ? "bg-white text-blue-700 shadow-xs" : "text-slate-600"
                }`}
              >
                Draw on Screen
              </button>
              <button
                type="button"
                onClick={() => setSignatureMode("upload")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                  signatureMode === "upload" ? "bg-white text-blue-700 shadow-xs" : "text-slate-600"
                }`}
              >
                Upload Image File
              </button>
            </div>

            {signatureMode === "draw" ? (
              <div className="space-y-2">
                <div className="border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50/80 overflow-hidden relative touch-none">
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={160}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-40 cursor-crosshair block"
                  />
                  {!hasDrawn && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-xs text-slate-400 font-medium">
                      Sign inside this box
                    </div>
                  )}
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="text-xs font-bold text-slate-500 hover:text-rose-600"
                  >
                    Clear Canvas
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center bg-slate-50/50">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">Choose transparent PNG signature</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Max size: 2MB (JPG, PNG, WEBP)</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setSignatureFile(e.target.files?.[0] || null)}
                    className="mt-3 text-xs text-slate-600 block w-full file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowSignatureModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSignature}
                disabled={savingSignature}
                className="px-5 py-2 rounded-xl bg-[#1e3a8a] hover:bg-[#152e6f] text-white text-xs font-bold shadow-md transition flex items-center gap-1.5"
              >
                {savingSignature ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Save Signature
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: POST CLASS DIARY ────────────────────────────── */}
      {showAddDiaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-[#0f224a] flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" /> Post Daily Class Diary
              </h3>
              <button onClick={() => setShowAddDiaryModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDiary} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Class & Subject *</label>
                <CustomDropdown
                  name="newDiaryAssignmentId"
                  value={newDiaryAssignmentId}
                  onChange={(_, val) => setNewDiaryAssignmentId(String(val))}
                  options={assignments.map((a) => ({
                    label: `${a.subject?.name || "Subject"} (${a.academy_class?.name || "Class"} - ${a.section?.name || "Sec"})`,
                    value: String(a.id),
                  }))}
                  placeholder="Select Class & Subject"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Diary Date *</label>
                <input
                  type="date"
                  value={newDiaryDate}
                  onChange={(e) => setNewDiaryDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Homework / Diary Notes *</label>
                <textarea
                  value={newDiaryContent}
                  onChange={(e) => setNewDiaryContent(e.target.value)}
                  rows={4}
                  placeholder="Write homework questions, page numbers, or learning goals..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 outline-none focus:border-blue-600 leading-relaxed"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddDiaryModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDiary}
                  className="px-5 py-2 rounded-xl bg-[#1e3a8a] hover:bg-[#152e6f] text-white text-xs font-bold shadow-md transition flex items-center gap-1.5"
                >
                  {savingDiary ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Publish Diary
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: ADVANCE SALARY REQUEST ───────────────────────── */}
      {showAdvanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-[#0f224a] flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-600" /> Request Advance Salary
              </h3>
              <button onClick={() => setShowAdvanceModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdvance} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Requested Amount (PKR) *</label>
                <input
                  type="number"
                  min="100"
                  step="100"
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 outline-none focus:border-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Deduction Month *</label>
                <input
                  type="month"
                  value={advanceMonth}
                  onChange={(e) => setAdvanceMonth(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 outline-none focus:border-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Advance *</label>
                <textarea
                  value={advanceReason}
                  onChange={(e) => setAdvanceReason(e.target.value)}
                  rows={3}
                  placeholder="Explain the purpose of the advance salary..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 outline-none focus:border-blue-600"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowAdvanceModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdvance}
                  className="px-5 py-2 rounded-xl bg-[#1e3a8a] hover:bg-[#152e6f] text-white text-xs font-bold shadow-md transition flex items-center gap-1.5"
                >
                  {submittingAdvance ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: APPLY FOR LEAVE ──────────────────────────────── */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-[#0f224a] flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" /> Apply for Leave
              </h3>
              <button onClick={() => setShowLeaveModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitLeave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={leaveStartDate}
                    onChange={(e) => setLeaveStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    value={leaveEndDate}
                    onChange={(e) => setLeaveEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Leave *</label>
                <textarea
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  rows={3}
                  placeholder="State the reason for leave application..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 outline-none focus:border-blue-600"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLeave}
                  className="px-5 py-2 rounded-xl bg-[#1e3a8a] hover:bg-[#152e6f] text-white text-xs font-bold shadow-md transition flex items-center gap-1.5"
                >
                  {submittingLeave ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: SALARY SLIP BREAKDOWN ────────────────────────── */}
      {selectedSlipDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-lg text-[#0f224a]">Salary Slip Breakdown</h3>
                <p className="text-xs text-slate-500">Month: {selectedSlipDetail.month}</p>
              </div>
              <button onClick={() => setSelectedSlipDetail(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Slip Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border text-xs">
                <span className="text-slate-500 font-semibold">Gross Earning</span>
                <p className="font-bold text-sm text-slate-800 mt-0.5">
                  Rs {Number(selectedSlipDetail.total_amount).toLocaleString()}
                </p>
              </div>
              {Number(selectedSlipDetail.bf_deduction || 0) > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs">
                  <span className="text-amber-800 font-semibold">
                    BF Ded {selectedSlipDetail.bf_percentage ? `(${selectedSlipDetail.bf_percentage}%)` : ""}
                  </span>
                  <p className="font-bold text-sm text-amber-900 mt-0.5">
                    - Rs {Number(selectedSlipDetail.bf_deduction).toLocaleString()}
                  </p>
                </div>
              )}
              <div className="p-3 rounded-xl bg-slate-50 border text-xs">
                <span className="text-slate-500 font-semibold">Advance Deducted</span>
                <p className="font-bold text-sm text-rose-600 mt-0.5">
                  Rs {Number(selectedSlipDetail.advance_deducted).toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs">
                <span className="text-blue-800 font-semibold">Net Payable</span>
                <p className="font-bold text-sm text-blue-900 mt-0.5">
                  Rs {Number(selectedSlipDetail.payable_salary).toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                <span className="text-emerald-800 font-semibold">Total Paid</span>
                <p className="font-bold text-sm text-emerald-900 mt-0.5">
                  Rs {Number(selectedSlipDetail.total_paid || 0).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Earnings - Only Fixed Salary */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Earnings</h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                    <tr>
                      <th className="px-3 py-2">Description</th>
                      <th className="px-3 py-2 text-right">Amount (PKR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 font-semibold text-slate-800">Fixed Salary</td>
                      <td className="px-3 py-2.5 text-right font-bold text-slate-900">
                        Rs {Number(selectedSlipDetail.total_amount || 0).toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payments History */}
            {selectedSlipDetail.payments && selectedSlipDetail.payments.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Payment Transactions</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                      <tr>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Method</th>
                        <th className="px-3 py-2">Notes</th>
                        <th className="px-3 py-2 text-right">Amount Paid</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedSlipDetail.payments.map((pmt: any) => (
                        <tr key={pmt.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 text-slate-700">{pmt.payment_date}</td>
                          <td className="px-3 py-2 font-semibold text-slate-800">{pmt.payment_method}</td>
                          <td className="px-3 py-2 text-slate-500">{pmt.notes || "—"}</td>
                          <td className="px-3 py-2 text-right font-bold text-emerald-700">
                            Rs {Number(pmt.amount_paid).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t">
              <button
                onClick={() => window.open(`/dashboard/salaries/print?id=${selectedSlipDetail.id}`, "_blank")}
                className="px-4 py-2 rounded-xl bg-[#1e3a8a] hover:bg-[#152e6f] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" /> Print Official Slip
              </button>
              <button
                onClick={() => setSelectedSlipDetail(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: COLLECT FROM STUDENT ─────────────────────────── */}
      {showTeacherCollectModal && (
        <TeacherCollectStudentModal
          classList={allSchoolClasses}
          onClose={() => setShowTeacherCollectModal(false)}
          onSuccess={(newRec) => {
            setShowTeacherCollectModal(false);
            fetchTeacherReceivings();
            if (newRec) {
              setTeacherActiveReceipt(newRec);
              setShowTeacherReceiptModal(true);
            }
          }}
        />
      )}

      {/* ─── MODAL: PRINT RECEIPT PREVIEW ────────────────────────── */}
      {showTeacherReceiptModal && teacherActiveReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-400" />
                <span className="font-extrabold text-xs">Payment Receipt</span>
              </div>
              <button
                onClick={() => setShowTeacherReceiptModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 text-xs space-y-4">
              <div className="text-center space-y-1">
                <div className="text-base font-black tracking-wide text-[#0f224a]">KIPS SCHOOL</div>
                <div className="text-[10px] text-slate-500">Official Student Collection Receipt</div>
                <div className="inline-block px-3 py-1 bg-slate-100 font-mono font-bold text-slate-800 rounded-md mt-1">
                  {teacherActiveReceipt.receipt_no}
                </div>
              </div>

              <div className="space-y-2 border-y border-dashed border-slate-200 py-3 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Date:</span>
                  <span className="font-semibold text-slate-800">{teacherActiveReceipt.received_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Student:</span>
                  <span className="font-bold text-slate-900">{teacherActiveReceipt.student?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Class & Roll:</span>
                  <span className="font-medium text-slate-800">
                    {teacherActiveReceipt.student?.academyClass?.name || teacherActiveReceipt.student?.academy_class?.name || "N/A"} • #{teacherActiveReceipt.student?.roll_number || teacherActiveReceipt.student_id}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Purpose:</span>
                  <span className="font-semibold text-blue-900">{teacherActiveReceipt.description}</span>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-center">
                <div className="text-[10px] uppercase font-bold text-slate-500">Amount Received</div>
                <div className="text-2xl font-black font-mono text-[#0f224a] mt-0.5">
                  Rs. {parseFloat(String(teacherActiveReceipt.amount)).toLocaleString()}
                </div>
                <div className="text-[10px] font-semibold text-slate-400 uppercase mt-0.5">
                  Method: {teacherActiveReceipt.payment_method || "cash"}
                </div>
              </div>

              <div className="text-center text-[10px]">
                {teacherActiveReceipt.status === "received_by_admin" ? (
                  <span className="text-emerald-700 font-bold">✓ Handed Over & Cleared by Admin</span>
                ) : (
                  <span className="text-amber-700 font-bold">⚠️ Cash in your possession — Please hand over to Admin</span>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTeacherReceiptModal(false)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold text-slate-600 border border-slate-200 hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => triggerTeacherPrintSlip(teacherActiveReceipt)}
                  className="flex-1 py-2 rounded-xl text-xs font-black text-white bg-[#0f224a] hover:bg-[#1e3a8a] flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5 text-sky-300" />
                  <span>Print Slip</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-Component: Teacher Collect Student Receiving Modal ───────
function TeacherCollectStudentModal({
  classList,
  onClose,
  onSuccess,
}: {
  classList: { id: number; name: string }[];
  onClose: () => void;
  onSuccess: (rec: any) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [receivedDate, setReceivedDate] = useState(() => new Date().toISOString().split("T")[0]);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const commonReasons = [
    "Picnic / Field Trip",
    "Annual Sports Day",
    "Uniform Fee",
    "Student ID Card / Badge",
    "Science Lab Charges",
    "Stationery / Workbook",
    "Discipline Fine",
    "Late Fee Fine",
    "Special Coaching",
  ];

  // Real-time student search
  useEffect(() => {
    if (!searchQuery.trim() && selectedClassId === "all") {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingStudents(true);
      try {
        const params = new URLSearchParams();
        if (searchQuery.trim()) params.set("q", searchQuery.trim());
        if (selectedClassId !== "all") params.set("class_id", selectedClassId);

        const res = await fetch(`${API}/staff-receivings/students-search?${params.toString()}`, {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const list = await res.json();
          setSearchResults(Array.isArray(list) ? list : []);
        }
      } catch (err) {
        console.error("Student search error", err);
      } finally {
        setSearchingStudents(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedClassId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      setErrorMsg("Please select a student first.");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setErrorMsg("Please enter a valid amount.");
      return;
    }
    if (!description.trim()) {
      setErrorMsg("Please enter the reason / purpose for receiving this amount.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${API}/staff-receivings`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          student_id: selectedStudent.id,
          amount: parseFloat(amount),
          description: description.trim(),
          payment_method: paymentMethod,
          received_date: receivedDate,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        onSuccess(data.receiving);
      } else {
        setErrorMsg(data.message || "Failed to record payment.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Network error occurred.");
    } finally {
      setSaving(false);
    }
  };

  const parentPhone =
    selectedStudent?.contact_number ||
    selectedStudent?.emergency_contact ||
    selectedStudent?.father_cell ||
    "Not registered";

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-[#0f224a] to-[#1e3a8a] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Plus className="w-4 h-4 text-sky-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm">Receive Amount from Student</h3>
              <p className="text-[11px] text-sky-200">
                Collect amount for any school reason & send instant WhatsApp receipt to parent
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}

          {/* Student Selector */}
          <div className="space-y-2">
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700">
              1. Select Student <span className="text-rose-500">*</span>
            </label>

            {selectedStudent ? (
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-black text-slate-900 text-sm">{selectedStudent.name}</div>
                  <div className="text-[11px] text-slate-600 flex items-center gap-2 mt-0.5">
                    <span className="font-bold text-blue-700">
                      {selectedStudent.academyClass?.name || selectedStudent.academy_class?.name || "Class"}
                    </span>
                    <span>• Roll #{selectedStudent.roll_number || selectedStudent.id}</span>
                    {selectedStudent.father_name && <span>• S/O {selectedStudent.father_name}</span>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2 relative">
                    <input
                      type="text"
                      placeholder="Type student name, roll # or phone..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-[38px] pl-8 pr-8 text-xs font-semibold rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 placeholder:text-slate-400"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                    {searchingStudents && (
                      <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin absolute right-2.5 top-3" />
                    )}
                  </div>
                  <div>
                    <CustomDropdown
                      options={[
                        { label: "All Classes", value: "all" },
                        ...classList.map((c) => ({ label: c.name, value: c.id })),
                      ]}
                      value={selectedClassId}
                      onChange={(_, val) => setSelectedClassId(String(val))}
                      placeholder="Class Filter"
                      name="classSearchFilter"
                    />
                  </div>
                </div>

                {/* Search Results Dropdown List */}
                {searchingStudents && searchResults.length === 0 ? (
                  <div className="p-3 text-center text-slate-500 font-semibold bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                    <span>Searching students...</span>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="max-h-52 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 shadow-md bg-white">
                    {searchResults.map((st) => (
                      <div
                        key={st.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSelectedStudent(st);
                          setSearchResults([]);
                          setSearchQuery("");
                        }}
                        onClick={() => {
                          setSelectedStudent(st);
                          setSearchResults([]);
                          setSearchQuery("");
                        }}
                        className="p-3 hover:bg-blue-50/80 cursor-pointer transition-all flex items-center justify-between border-l-2 border-transparent hover:border-blue-600 group"
                      >
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                            {st.name}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            <span className="font-semibold text-blue-600">
                              {st.academyClass?.name || st.academy_class?.name || "Class"}
                            </span>
                            {st.section?.name && <span> • Sec {st.section.name}</span>}
                            <span> • Roll #{st.roll_number || st.id}</span>
                            {st.father_name && <span> • S/O {st.father_name}</span>}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-100 group-hover:bg-blue-600 group-hover:text-white px-2.5 py-1 rounded-lg transition-colors shrink-0">
                          Select
                        </span>
                      </div>
                    ))}
                  </div>
                ) : !searchingStudents && searchQuery.trim().length >= 2 ? (
                  <div className="p-3 text-center text-slate-500 font-medium bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    No active students found matching &ldquo;{searchQuery}&rdquo;.
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Amount (Rs.) <span className="text-rose-500">*</span>
              </label>
              <CustomNumberInput
                value={amount}
                onChange={(val) => setAmount(val)}
                placeholder="0.00"
                prefix="Rs."
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Payment Date</label>
              <CustomDatePicker
                value={receivedDate}
                onChange={(date) => setReceivedDate(date)}
                placeholder="Select Date"
              />
            </div>
          </div>

          {/* Description / Purpose */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Reason / Purpose <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Annual Picnic, Science Project, Uniform..."
              required
              className="w-full h-[38px] px-3 text-xs font-semibold rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600"
            />
            {/* Chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {commonReasons.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setDescription(r)}
                  className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-blue-100 hover:text-blue-800 text-[10px] font-semibold text-slate-600 transition-colors"
                >
                  + {r}
                </button>
              ))}
            </div>
          </div>


          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !selectedStudent || !amount}
              className="px-5 py-2 rounded-xl text-xs font-black text-white bg-[#0f224a] hover:bg-[#1e3a8a] shadow-md shadow-blue-950/20 flex items-center gap-1.5 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Receipt...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-sky-300" />
                  <span>Save Receipt</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
