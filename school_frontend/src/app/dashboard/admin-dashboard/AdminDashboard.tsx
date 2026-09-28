import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ExpenseModal from "@/components/ExpenseModal";
import AttentionSeekersHub from "@/components/dashboard/AttentionSeekersHub";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export default function AdminDashboard() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [stats, setStats] = useState({
    total_students: 0,
    total_teachers: 0,
    total_classes: 0,
    total_sections: 0,
    recent_enrollments: [] as any[],
  });

  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);

  useEffect(() => {
    setUserRole(localStorage.getItem("userRole"));

    fetch(`${API}/dashboard/stats`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.total_students !== undefined) {
          setStats(data);
        }
      })
      .catch((err) => console.error("Error fetching stats:", err));

    fetch(`${API}/announcements`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAnnouncements(data);
        }
      })
      .catch((err) => console.error("Error fetching announcements:", err))
      .finally(() => setAnnouncementsLoading(false));
  }, []);

  const isOfficeAdmin = userRole === "5";

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold" style={{ color: "#0f224a" }}>
          {isOfficeAdmin ? "Office Admin Overview" : "Admin Overview"}
        </h2>
        <p className="mt-1 text-sm" style={{ color: "#2563eb" }}>
          {isOfficeAdmin ? "Welcome to Office Administration — Kips School Chunian Campus" : "Welcome to the central command — Kips School Chunian Campus"}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Students */}
        <div
          className="p-6 rounded-xl shadow-md text-white transform transition-all duration-200 hover:scale-105 hover:shadow-xl cursor-pointer"
          style={{
            background: "linear-gradient(135deg, #1e3a8a 0%, #0f224a 100%)",
          }}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium" style={{ color: "#38bdf8" }}>
                Total Active Students
              </p>
              <p className="text-4xl font-black mt-2">{stats.total_students}</p>
              <p className="text-xs mt-2" style={{ color: "#bfdbfe" }}>
                Currently Enrolled
              </p>
            </div>
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.1)" }}
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Total Teachers */}
        <div
          className="p-6 rounded-xl shadow-md text-white transform transition-all duration-200 hover:scale-105 hover:shadow-xl cursor-pointer"
          style={{
            background: "linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%)",
          }}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium" style={{ color: "#38bdf8" }}>
                Total Active Teachers
              </p>
              <p className="text-4xl font-black mt-2">{stats.total_teachers}</p>
              <p className="text-xs mt-2" style={{ color: "#bfdbfe" }}>
                Currently Employed
              </p>
            </div>
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.1)" }}
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Classes and Sections */}
        <div
          className="p-6 rounded-xl shadow-md text-white transform transition-all duration-200 hover:scale-105 hover:shadow-xl cursor-pointer"
          style={{
            background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
          }}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium" style={{ color: "#38bdf8" }}>
                Classes & Sections
              </p>
              <p className="text-4xl font-black mt-2">{stats.total_classes} / {stats.total_sections}</p>
              <p className="text-xs mt-2" style={{ color: "#bfdbfe" }}>
                Total structure setup
              </p>
            </div>
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.1)" }}
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div
        className="p-6 rounded-xl border shadow-sm mb-6"
        style={{ background: "#fff", borderColor: "#bfdbfe" }}
      >
        <h3 className="text-lg font-bold mb-4" style={{ color: "#0f224a" }}>
          Quick Actions
        </h3>
        <div className="flex gap-3 flex-wrap">
          {(isOfficeAdmin
            ? [
                { label: "Add Student", href: "/dashboard/students/admission" },
                { label: "Mark Attendance", href: "/dashboard/attendance" },
                { label: "View Results", href: "/dashboard/results" },
                { label: "View Attendance Follow up", href: "/dashboard/follow-ups" },
                { label: "Setup Tests", href: "/dashboard/tests" },
              ]
            : [
                { label: "Add Student", href: "/dashboard/students/admission" },
                { label: "Receive Fee", href: "/dashboard/fees" },
                { label: "View Results", href: "/dashboard/results" },
                { label: "Add Expense", href: "/dashboard/expenses" },
                { label: "View Attendance Follow up", href: "/dashboard/follow-ups" },
              ]
          ).map((action) => (
            <button
              key={action.label}
              onClick={() => {
                if (action.label === "Add Expense") {
                  setIsAddExpenseModalOpen(true);
                } else {
                  router.push(action.href);
                }
              }}
              className="px-5 py-2.5 font-medium rounded-lg border transition-all duration-200 hover:shadow-md active:scale-95 text-sm"
              style={{
                background: "#f0f4f8",
                color: "#1e3a8a",
                borderColor: "#bfdbfe",
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.background = "#1e3a8a";
                (e.target as HTMLButtonElement).style.color = "#fff";
                (e.target as HTMLButtonElement).style.borderColor = "#1e3a8a";
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.background = "#f0f4f8";
                (e.target as HTMLButtonElement).style.color = "#1e3a8a";
                (e.target as HTMLButtonElement).style.borderColor = "#bfdbfe";
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Academic Intelligence & Attention Seekers Watchlist Hub */}
      <AttentionSeekersHub />

      {/* Upcoming / Recent section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          className="p-6 rounded-xl border shadow-sm"
          style={{ background: "#fff", borderColor: "#bfdbfe" }}
        >
          <h3 className="text-base font-bold mb-3" style={{ color: "#0f224a" }}>
            Recent Enrollments
          </h3>
          <div className="space-y-3">
            {stats.recent_enrollments && stats.recent_enrollments.length > 0 ? (
              stats.recent_enrollments.map((student: any) => (
                <div
                  key={student.id}
                  className="flex items-center gap-3 p-3 rounded-lg"
                  style={{ background: "#f0f4f8" }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 uppercase"
                    style={{ background: "#1d4ed8" }}
                  >
                    {student.name ? student.name[0] : "?"}
                  </div>
                  <span className="text-sm font-medium" style={{ color: "#0f224a" }}>
                    {student.name} — {student.academy_class?.name || "No Class"}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 italic">No recent enrollments found.</p>
            )}
          </div>
        </div>

        <div
          className="p-6 rounded-xl border shadow-sm flex flex-col justify-between"
          style={{ background: "#fff", borderColor: "#bfdbfe" }}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold" style={{ color: "#0f224a" }}>
                Announcements
              </h3>
              <button
                onClick={() => router.push("/dashboard/announcements")}
                className="text-xs font-semibold text-[#2563eb] hover:underline"
              >
                Manage All →
              </button>
            </div>

            <div className="space-y-3">
              {announcementsLoading ? (
                <div className="text-xs text-gray-500 py-6 text-center">Loading announcements...</div>
              ) : announcements.length === 0 ? (
                <div className="text-xs text-gray-400 py-6 text-center italic">No announcements created yet.</div>
              ) : (
                announcements.slice(0, 4).map((announcement) => (
                  <div
                    key={announcement.id || announcement.title}
                    onClick={() => router.push("/dashboard/announcements")}
                    className="flex items-center justify-between p-3 rounded-lg hover:shadow-xs transition cursor-pointer border border-transparent hover:border-[#bfdbfe]"
                    style={{ background: "#f0f4f8" }}
                  >
                    <div className="pr-3">
                      <span className="text-sm font-semibold block" style={{ color: "#0f224a" }}>
                        {announcement.title}
                      </span>
                      {announcement.details && (
                        <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{announcement.details}</p>
                      )}
                    </div>
                    <span
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0"
                      style={{ background: "#1e3a8a", color: "#fff" }}
                    >
                      {announcement.date}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>



      <ExpenseModal
        isOpen={isAddExpenseModalOpen}
        onClose={() => setIsAddExpenseModalOpen(false)}
        onSuccess={() => {}}
        onRequestCategoryModal={() => {
          // If they need to manage categories, route them to the expenses page
          router.push("/dashboard/expenses");
        }}
      />
    </div>
  );
}
