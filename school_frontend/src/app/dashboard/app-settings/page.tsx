"use client";

import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

interface AppSettings {
  status: "active" | "maintenance";
  maintenance_title: string;
  maintenance_message: string;
  min_version: string;
  latest_version: string;
  update_url: string;
  whatsapp_absent_notification_enabled?: boolean;
  whatsapp_gateway_status?: {
    success?: boolean;
    client?: string;
    credits_balance?: string | number;
    status?: string;
    total_sent?: number;
    error?: string;
  };
}

export default function AppSettingsPage() {
  const [settings, setSettings] = useState<AppSettings>({
    status: "active",
    maintenance_title: "App Under Maintenance",
    maintenance_message: "We are currently upgrading our servers. Please try again soon.",
    min_version: "1.0.0",
    latest_version: "1.0.0",
    update_url: "https://usachunian.com",
    whatsapp_absent_notification_enabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API}/admin/app-settings`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSettings({
          ...data,
          whatsapp_absent_notification_enabled: Boolean(data.whatsapp_absent_notification_enabled),
        });
      }
    } catch (err) {
      console.error("Failed to load settings", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`${API}/admin/app-settings`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(prev => ({
          ...data.settings,
          whatsapp_gateway_status: prev.whatsapp_gateway_status,
          whatsapp_absent_notification_enabled: Boolean(data.settings.whatsapp_absent_notification_enabled),
        }));
        setMessage({ text: "Settings updated successfully!", type: "success" });
      } else {
        setMessage({ text: "Failed to update settings.", type: "error" });
      }
    } catch (err) {
      setMessage({ text: "Network error occurred.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1e3a8a]">Super Admin System & App Controls</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure WhatsApp absentee notifications, remote app maintenance mode, and version controls.
          </p>
        </div>

        {message && (
          <div
            className={`p-4 mb-6 rounded-xl text-sm font-medium ${
              message.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-gray-500 font-medium">Loading settings...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* WhatsApp Automated Absentee Notification Card */}
            <div className="bg-white p-6 rounded-2xl border shadow-sm" style={{ borderColor: "#bfdbfe" }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-[#1e3a8a] flex items-center gap-2">
                  <span className="text-xl">💬</span> WhatsApp Absentee PDF Notice
                </h2>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#f0f4f8] text-[#2563eb] border border-[#bfdbfe]">
                  Super Admin Only
                </span>
              </div>

              <div className="p-4 rounded-xl bg-[#f0f4f8] border border-[#bfdbfe] mb-5">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.whatsapp_absent_notification_enabled)}
                    onChange={(e) =>
                      setSettings({ ...settings, whatsapp_absent_notification_enabled: e.target.checked })
                    }
                    className="mt-1 h-5 w-5 rounded border-gray-300 text-[#2563eb] focus:ring-[#2563eb] cursor-pointer accent-[#2563eb]"
                  />
                  <div>
                    <div className="font-bold text-sm text-[#0f224a]">
                      Enable WhatsApp PDF Notice for Absent Students
                    </div>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                      When checked, marking a student as <strong>ABSENT</strong> on the Mark Attendance screen will automatically generate an official Kips School Chunian Campus Absentee Notice (PDF with student photo, roll no, and date) and send it directly to their parent via WhatsApp.
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-[11px] font-semibold text-[#2563eb]">
                      <span>✓ Absents Only</span>
                      <span>•</span>
                      <span>✓ Present students never receive messages</span>
                      <span>•</span>
                      <span>✓ Includes Student Photo & Academy Header</span>
                    </div>
                  </div>
                </label>
              </div>

              {/* Gateway Connection Status */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs">
                <div className="font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>WhatsApp Gateway Status</span>
                  <span className="font-normal text-gray-500 lowercase">http://13.60.50.153</span>
                </div>
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="font-semibold text-gray-800">
                      {settings.whatsapp_gateway_status?.status || "Active Gateway"}
                    </span>
                  </div>
                  {settings.whatsapp_gateway_status?.client && (
                    <div className="text-gray-600">
                      Client: <span className="font-semibold">{settings.whatsapp_gateway_status.client}</span>
                    </div>
                  )}
                  {settings.whatsapp_gateway_status?.credits_balance && (
                    <div className="text-gray-600">
                      Credits: <span className="font-semibold text-green-700">{settings.whatsapp_gateway_status.credits_balance}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Status Control Card */}
            <div className="bg-white p-6 rounded-2xl border shadow-sm" style={{ borderColor: "#bfdbfe" }}>
              <h2 className="text-lg font-bold text-[#1e3a8a] mb-4 flex items-center gap-2">
                <span>🛡️</span> Mobile App Maintenance Mode
              </h2>

              <div className="flex items-center justify-between p-4 rounded-xl bg-[#f0f4f8] border border-[#bfdbfe] mb-6">
                <div>
                  <div className="font-semibold text-gray-800">
                    Current Mode:{" "}
                    <span className={settings.status === "active" ? "text-green-600 uppercase font-bold" : "text-red-600 uppercase font-bold"}>
                      {settings.status === "active" ? "Live / Active" : "On Hold / Maintenance"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {settings.status === "active"
                      ? "The app is open to all users normally."
                      : "The app is blocked and displays your maintenance message to all mobile users."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, status: settings.status === "active" ? "maintenance" : "active" })}
                  className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${
                    settings.status === "active"
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-green-600 hover:bg-green-700 text-white"
                  }`}
                >
                  {settings.status === "active" ? "Put App On Hold" : "Set App Live"}
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-gray-700">
                    Maintenance Notice Title
                  </label>
                  <input
                    type="text"
                    value={settings.maintenance_title}
                    onChange={(e) => setSettings({ ...settings, maintenance_title: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-gray-700">
                    Maintenance Message (Displayed on Mobile Screen)
                  </label>
                  <textarea
                    rows={3}
                    value={settings.maintenance_message}
                    onChange={(e) => setSettings({ ...settings, maintenance_message: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Version Control Card */}
            <div className="bg-white p-6 rounded-2xl border shadow-sm" style={{ borderColor: "#bfdbfe" }}>
              <h2 className="text-lg font-bold text-[#1e3a8a] mb-4 flex items-center gap-2">
                <span>📱</span> App Versioning & Force Update
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-gray-700">
                    Minimum Supported App Version
                  </label>
                  <input
                    type="text"
                    value={settings.min_version}
                    onChange={(e) => setSettings({ ...settings, min_version: e.target.value })}
                    placeholder="e.g. 1.1.0"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                    required
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Users below this version will be forced to update.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-gray-700">
                    Latest Available App Version
                  </label>
                  <input
                    type="text"
                    value={settings.latest_version}
                    onChange={(e) => setSettings({ ...settings, latest_version: e.target.value })}
                    placeholder="e.g. 2.0.0"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                    required
                  />
                  <p className="text-[11px] text-gray-400 mt-1">The current newest version released.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-gray-700">
                  Update Download URL (Play Store / Direct APK Link)
                </label>
                <input
                  type="url"
                  value={settings.update_url}
                  onChange={(e) => setSettings({ ...settings, update_url: e.target.value })}
                  placeholder="https://usachunian.com/download"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-8 py-3 bg-[#1e3a8a] hover:bg-[#351208] text-white font-bold text-sm rounded-xl transition-all shadow-md disabled:opacity-50 active:scale-95"
              >
                {saving ? "Saving Changes..." : "Save Settings"}
              </button>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}

