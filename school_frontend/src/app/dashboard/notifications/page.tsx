"use client";

import React, { useState, useEffect, useCallback } from "react";

interface NotificationLog {
  id: number;
  title: string;
  body: string;
  channel_id: string;
  screen: string | null;
  target_type: string;
  target_id: string | null;
  recipient_count: number;
  success_count: number;
  failure_count: number;
  created_at: string;
  sender?: {
    id: number;
    name: string;
    email: string;
  } | null;
}

interface NotificationStats {
  total_devices: number;
  android_devices: number;
  total_campaigns: number;
  teachers_registered: number;
  students_registered: number;
}

interface UserOption {
  id: number;
  name: string;
  role_id: number;
  contact_number?: string;
}

export default function PushNotificationsPage() {
  const [stats, setStats] = useState<NotificationStats>({
    total_devices: 0,
    android_devices: 0,
    total_campaigns: 0,
    teachers_registered: 0,
    students_registered: 0,
  });

  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetType, setTargetType] = useState<"all" | "role" | "user">("all");
  const [targetRole, setTargetRole] = useState<"2" | "3">("2"); // 2 = Teacher, 3 = Student
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [channelId, setChannelId] = useState<string>("general_channel");
  const [screen, setScreen] = useState<string>("");
  const [isSending, setIsSending] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const getHeaders = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
    return {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  const getApiUrl = () => {
    return process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
  };

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${getApiUrl()}/admin/notifications/stats`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error("Error fetching stats:", e);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch(`${getApiUrl()}/admin/notifications/logs`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.data || []);
      }
    } catch (e) {
      console.error("Error fetching logs:", e);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch(`${getApiUrl()}/users`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.data || data || []);
      }
    } catch (e) {
      console.error("Error fetching users:", e);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchLogs();
    fetchUsers();
  }, [fetchStats, fetchLogs, fetchUsers]);

  const handleApplyTemplate = (
    tplTitle: string,
    tplBody: string,
    tplTarget: "all" | "role" | "user",
    tplRole?: "2" | "3",
    tplChannel?: string,
    tplScreen?: string
  ) => {
    setTitle(tplTitle);
    setBody(tplBody);
    setTargetType(tplTarget);
    if (tplRole) setTargetRole(tplRole);
    if (tplChannel) setChannelId(tplChannel);
    if (tplScreen) setScreen(tplScreen);
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setToast({ type: "error", message: "Please provide both title and body." });
      return;
    }

    if (targetType === "user" && !selectedUserId) {
      setToast({ type: "error", message: "Please select a specific recipient user." });
      return;
    }

    setIsSending(true);
    setToast(null);

    try {
      const payload = {
        title,
        body,
        target_type: targetType,
        target_id: targetType === "role" ? targetRole : targetType === "user" ? selectedUserId : null,
        channel_id: channelId,
        screen: screen || null,
      };

      const res = await fetch(`${getApiUrl()}/admin/notifications/send`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to dispatch notification.");
      }

      const recipientCount = data.result?.recipient_count ?? 0;
      setToast({
        type: "success",
        message: `Notification dispatched successfully! (Sent to ${recipientCount} active devices)`,
      });

      // Clear form
      setTitle("");
      setBody("");
      setScreen("");
      setSelectedUserId("");

      // Refresh stats & logs
      fetchStats();
      fetchLogs();
    } catch (error: unknown) {
      const errStr = error instanceof Error ? error.message : "Failed to dispatch notification.";
      setToast({ type: "error", message: errStr });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-blue-500/10 text-orange-400 border border-orange-500/20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </span>
            Push Notifications
          </h1>
          <p className="text-stone-400 text-sm mt-1">
            Dispatch instant Firebase push notifications to teachers, students, and parent mobile devices.
          </p>
        </div>

        <button
          onClick={() => {
            fetchStats();
            fetchLogs();
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-900 border border-stone-700 text-stone-300 hover:text-white hover:bg-stone-800 transition text-sm font-medium self-start sm:self-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh Data
        </button>
      </div>

      {/* Toast Alert */}
      {toast && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between border ${
            toast.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
              : "bg-rose-950/40 border-rose-500/40 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-3">
            {toast.type === "success" ? (
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-stone-400 hover:text-white text-xs ml-4">
            Dismiss
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-stone-900/70 border border-stone-800 p-4 rounded-2xl">
          <p className="text-xs text-stone-400 font-medium">Total Registered Devices</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.total_devices}</p>
          <p className="text-xs text-orange-400/80 mt-1">Live FCM Tokens</p>
        </div>
        <div className="bg-stone-900/70 border border-stone-800 p-4 rounded-2xl">
          <p className="text-xs text-stone-400 font-medium">Android Devices</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.android_devices}</p>
          <p className="text-xs text-emerald-400/80 mt-1">Active Mobile Phones</p>
        </div>
        <div className="bg-stone-900/70 border border-stone-800 p-4 rounded-2xl">
          <p className="text-xs text-stone-400 font-medium">Teachers Online</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.teachers_registered}</p>
          <p className="text-xs text-stone-500 mt-1">Staff with installed app</p>
        </div>
        <div className="bg-stone-900/70 border border-stone-800 p-4 rounded-2xl">
          <p className="text-xs text-stone-400 font-medium">Students & Parents</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.students_registered}</p>
          <p className="text-xs text-stone-500 mt-1">Portal devices registered</p>
        </div>
        <div className="bg-stone-900/70 border border-stone-800 p-4 rounded-2xl col-span-2 lg:col-span-1">
          <p className="text-xs text-stone-400 font-medium">Total Campaigns</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.total_campaigns}</p>
          <p className="text-xs text-purple-400/80 mt-1">Broadcasts dispatched</p>
        </div>
      </div>

      {/* Main Composer & Mobile Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Composer Form (7 Cols) */}
        <div className="lg:col-span-7 bg-stone-900/80 border border-stone-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Compose Push Broadcast
            </h2>
            <p className="text-xs text-stone-400 mt-1">
              Select your target audience and craft your notification message.
            </p>
          </div>

          {/* Quick Templates */}
          <div>
            <label className="block text-xs font-semibold text-stone-400 mb-2 uppercase tracking-wider">
              Quick Templates
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  handleApplyTemplate(
                    "Important Academy Announcement",
                    "Please check the notices section for crucial updates regarding upcoming exams and schedules.",
                    "all",
                    undefined,
                    "announcements_channel",
                    "announcements"
                  )
                }
                className="px-3 py-1.5 rounded-lg text-xs bg-stone-800 hover:bg-stone-700 text-stone-300 transition border border-stone-700/60"
              >
                📢 Announcement
              </button>
              <button
                type="button"
                onClick={() =>
                  handleApplyTemplate(
                    "Salary Slips Available",
                    "Monthly salary slips have been generated. You can view your slip and payment details now.",
                    "role",
                    "2",
                    "salaries_channel",
                    "teacher_salary"
                  )
                }
                className="px-3 py-1.5 rounded-lg text-xs bg-stone-800 hover:bg-stone-700 text-stone-300 transition border border-stone-700/60"
              >
                💼 Teacher Salary
              </button>
              <button
                type="button"
                onClick={() =>
                  handleApplyTemplate(
                    "Test Results Published",
                    "Recent test session marks have been uploaded. View your detailed report card in the portal.",
                    "role",
                    "3",
                    "academic_channel",
                    "student_dashboard"
                  )
                }
                className="px-3 py-1.5 rounded-lg text-xs bg-stone-800 hover:bg-stone-700 text-stone-300 transition border border-stone-700/60"
              >
                📊 Exam Results
              </button>
              <button
                type="button"
                onClick={() =>
                  handleApplyTemplate(
                    "Holiday Notice",
                    "Kips School Chunian Campus will remain closed on upcoming Monday. Regular classes resume Tuesday.",
                    "all",
                    undefined,
                    "announcements_channel"
                  )
                }
                className="px-3 py-1.5 rounded-lg text-xs bg-stone-800 hover:bg-stone-700 text-stone-300 transition border border-stone-700/60"
              >
                🏖️ Holiday Notice
              </button>
            </div>
          </div>

          <form onSubmit={handleSendNotification} className="space-y-5">
            {/* Target Audience */}
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-2 uppercase tracking-wider">
                Target Audience
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetType("all")}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition text-center ${
                    targetType === "all"
                      ? "bg-blue-500/20 border-orange-500 text-orange-300"
                      : "bg-stone-800/60 border-stone-700 text-stone-400 hover:text-white"
                  }`}
                >
                  All Devices (Broadcast)
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType("role")}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition text-center ${
                    targetType === "role"
                      ? "bg-blue-500/20 border-orange-500 text-orange-300"
                      : "bg-stone-800/60 border-stone-700 text-stone-400 hover:text-white"
                  }`}
                >
                  By User Role
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType("user")}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition text-center ${
                    targetType === "user"
                      ? "bg-blue-500/20 border-orange-500 text-orange-300"
                      : "bg-stone-800/60 border-stone-700 text-stone-400 hover:text-white"
                  }`}
                >
                  Specific User
                </button>
              </div>
            </div>

            {/* Target Role Sub-select */}
            {targetType === "role" && (
              <div className="p-4 rounded-xl bg-stone-950/60 border border-stone-800 space-y-2">
                <label className="block text-xs font-semibold text-stone-400">Select Role</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-stone-300 cursor-pointer">
                    <input
                      type="radio"
                      name="targetRole"
                      checked={targetRole === "2"}
                      onChange={() => setTargetRole("2")}
                      className="text-orange-500 focus:ring-blue-500"
                    />
                    Teachers Only ({stats.teachers_registered} devices)
                  </label>
                  <label className="flex items-center gap-2 text-sm text-stone-300 cursor-pointer">
                    <input
                      type="radio"
                      name="targetRole"
                      checked={targetRole === "3"}
                      onChange={() => setTargetRole("3")}
                      className="text-orange-500 focus:ring-blue-500"
                    />
                    Students & Parents ({stats.students_registered} devices)
                  </label>
                </div>
              </div>
            )}

            {/* Target User Sub-select */}
            {targetType === "user" && (
              <div className="p-4 rounded-xl bg-stone-950/60 border border-stone-800 space-y-2">
                <label className="block text-xs font-semibold text-stone-400">Select Recipient</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full bg-stone-900 border border-stone-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500"
                >
                  <option value="">-- Choose User --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role_id === 2 ? "Teacher" : u.role_id === 3 ? "Student" : "Staff"} - {u.contact_number || "No Phone"})
                    </option>
                  ))}
                </select>
                {loadingUsers && <p className="text-xs text-stone-500">Loading user directory...</p>}
              </div>
            )}

            {/* Notification Title */}
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">Notification Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Important Notice from Kips School Chunian Campus"
                maxLength={100}
                required
                className="w-full bg-stone-950 border border-stone-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500"
              />
              <p className="text-[11px] text-stone-500 text-right mt-1">{title.length}/100</p>
            </div>

            {/* Notification Body */}
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">Message Body *</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Type your message here..."
                rows={3}
                maxLength={300}
                required
                className="w-full bg-stone-950 border border-stone-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500 resize-none"
              />
              <p className="text-[11px] text-stone-500 text-right mt-1">{body.length}/300</p>
            </div>

            {/* Channel & Deep Link Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-400 mb-1">Notification Sound Channel</label>
                <select
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-orange-500"
                >
                  <option value="general_channel">General Alerts</option>
                  <option value="announcements_channel">Announcements & News</option>
                  <option value="attendance_channel">Attendance Alerts</option>
                  <option value="salaries_channel">Salary & Advances</option>
                  <option value="academic_channel">Academic & Results</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-400 mb-1">Tap Destination Screen</label>
                <select
                  value={screen}
                  onChange={(e) => setScreen(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-orange-500"
                >
                  <option value="">Dashboard Home (Default)</option>
                  <option value="teacher_salary">Teacher Salary Slips</option>
                  <option value="teacher_advance_salary">Teacher Advance Salary</option>
                  <option value="teacher_attendance">Teacher Attendance</option>
                  <option value="attendance">Student Attendance</option>
                  <option value="ledger">Student Fee Ledger</option>
                  <option value="announcements">School Announcements</option>
                </select>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSending || !title.trim() || !body.trim()}
              className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-sm shadow-lg shadow-orange-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              {isSending ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Dispatching to Firebase...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Send Push Notification Now
                </>
              )}
            </button>
          </form>
        </div>

        {/* Live Mobile Device Preview (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-2">
              <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Live Device Preview
            </h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-800 text-stone-400">Android 14 / Compose</span>
          </div>

          {/* Android Mockup Device */}
          <div className="bg-stone-950 border-[6px] border-stone-800 rounded-[38px] p-4 shadow-2xl relative overflow-hidden min-h-[460px] flex flex-col justify-between">
            {/* Speaker & Camera Notch */}
            <div className="w-24 h-4 bg-stone-800 rounded-full mx-auto mb-4 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-stone-950" />
            </div>

            {/* Status Bar */}
            <div className="flex justify-between items-center text-[10px] text-stone-400 px-2 mb-4 font-mono">
              <span>09:41</span>
              <div className="flex items-center gap-1">
                <span>5G</span>
                <span>100%</span>
              </div>
            </div>

            {/* Notification Banner Simulation */}
            <div className="my-auto space-y-3">
              <div className="bg-stone-900/95 border border-orange-500/30 rounded-2xl p-4 shadow-2xl backdrop-blur-md transition-all">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-orange-600 flex items-center justify-center text-white text-[10px] font-bold">
                      U
                    </div>
                    <span className="text-xs font-semibold text-stone-200">Kips School Chunian Campus</span>
                  </div>
                  <span className="text-[10px] text-stone-500">Just now</span>
                </div>

                <h4 className="text-sm font-bold text-white tracking-tight">
                  {title.trim() || "Notification Title Placeholder"}
                </h4>
                <p className="text-xs text-stone-300 mt-1 leading-relaxed line-clamp-3">
                  {body.trim() || "Your notification message preview will appear here in real-time as you type."}
                </p>

                {screen && (
                  <div className="mt-3 pt-2 border-t border-stone-800/80 flex items-center gap-1.5 text-[11px] text-orange-400 font-medium">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    Opens: {screen}
                  </div>
                )}
              </div>

              <div className="p-3 bg-stone-900/40 rounded-xl border border-stone-800 text-[11px] text-stone-400 space-y-1">
                <p className="flex justify-between">
                  <span>Channel:</span>
                  <span className="text-stone-300 font-mono text-[10px]">{channelId}</span>
                </p>
                <p className="flex justify-between">
                  <span>Priority:</span>
                  <span className="text-emerald-400 font-semibold">HIGH (Heads-Up Banner)</span>
                </p>
              </div>
            </div>

            {/* Home Indicator */}
            <div className="w-28 h-1 bg-stone-700 rounded-full mx-auto mt-4" />
          </div>
        </div>
      </div>

      {/* Campaign Logs History */}
      <div className="bg-stone-900/80 border border-stone-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Notification Campaign History
            </h2>
            <p className="text-xs text-stone-400 mt-1">
              Audit trail of recent broadcasts and automated notifications sent across devices.
            </p>
          </div>
        </div>

        {loadingLogs ? (
          <div className="py-12 text-center text-stone-500 text-sm">Loading campaign history...</div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-stone-500 text-sm">
            No push notifications recorded yet. Send your first campaign above!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-stone-300">
              <thead className="bg-stone-950 text-xs font-semibold text-stone-400 uppercase tracking-wider border-b border-stone-800">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Author</th>
                  <th className="py-3 px-4">Audience</th>
                  <th className="py-3 px-4">Title & Message</th>
                  <th className="py-3 px-4 text-center">Devices</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-stone-800/40 transition">
                    <td className="py-3.5 px-4 text-xs text-stone-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("en-PK", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-stone-200">
                      {log.sender?.name || "Automated System"}
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full font-semibold capitalize ${
                          log.target_type === "all"
                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                            : log.target_type === "role"
                            ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                            : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        }`}
                      >
                        {log.target_type === "role"
                          ? log.target_id === "2"
                            ? "Teachers"
                            : "Students"
                          : log.target_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="font-semibold text-white truncate text-xs">{log.title}</p>
                      <p className="text-stone-400 text-[11px] truncate">{log.body}</p>
                    </td>
                    <td className="py-3.5 px-4 text-center text-xs font-mono">
                      <span className="text-emerald-400">{log.success_count}</span>
                      <span className="text-stone-600"> / </span>
                      <span className="text-stone-300">{log.recipient_count}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {log.success_count > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Delivered
                        </span>
                      ) : log.recipient_count === 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-500/30">
                          No Devices
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded-full border border-rose-500/30">
                          Failed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
