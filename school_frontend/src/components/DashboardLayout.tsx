"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import FloatingChat from "@/components/FloatingChat";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop()?.split(";").shift() || "");
  return null;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("token") || getCookie("token");
    }
    return null;
  });
  const [role, setRole] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("userRole") || getCookie("userRole");
    }
    return null;
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    const storedToken = localStorage.getItem("token") || getCookie("token");
    const storedRole = localStorage.getItem("userRole") || getCookie("userRole");

    if (!storedToken) {
      window.location.href = "/";
      return;
    }
    
    // Sync to cookie for SSR & middleware
    document.cookie = `token=${storedToken}; path=/; max-age=86400; SameSite=Lax;`;
    if (storedRole) document.cookie = `userRole=${storedRole}; path=/; max-age=86400; SameSite=Lax;`;

    if (storedToken !== token) setToken(storedToken);
    if (storedRole !== role) setRole(storedRole);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    document.cookie = "userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    window.location.href = "/";
  };

  if (!token && !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0b1329" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-blue-300 tracking-wider">KIPS School Chunian...</p>
        </div>
      </div>
    );
  }

  if (!token) return null;

  return (
    <div className="min-h-screen flex" style={{ background: "#f0f4f8" }}>
      {/* Sidebar */}
      <Sidebar
        role={role ?? ""}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentPath={pathname}
      />

      {/* Main area */}
      <div
        className="flex-1 flex flex-col transition-all duration-300 min-w-0"
        style={{ marginLeft: "0" }}
      >
        {/* Top Navbar */}
        <header
          className="sticky top-0 z-40 text-white px-4 md:px-6 py-3 shadow-md flex items-center justify-between shrink-0"
          style={{
            background: "linear-gradient(135deg, #0b1329 0%, #1e3a8a 100%)",
            borderBottom: "1px solid #1d4ed8",
          }}
        >
          <div className="flex items-center gap-3">
            <button
              id="sidebar-toggle"
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition hover:opacity-80 active:scale-95"
              style={{ background: "rgba(255,255,255,0.1)" }}
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>

            <div className="hidden sm:block">
              <h1 className="text-sm font-bold leading-tight">KIPS School</h1>
              <p className="text-xs" style={{ color: "var(--brand-300)" }}>Excellence in Education</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className="text-xs font-semibold px-3 py-1 rounded-full capitalize hidden sm:inline-block"
              style={{ background: "rgba(255,255,255,0.15)", color: "var(--brand-300)" }}
            >
              {role === "1" ? "Super Admin" : (role === "5" || role === "accountant") ? "Accountant" : role === "6" ? "Attendance Manager" : role === "2" ? "Teacher" : role === "3" ? "Student" : role === "4" ? "Parent" : role}
            </span>
            <button
              id="logout-btn"
              onClick={handleLogout}
              className="px-3 md:px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 hover:shadow-md active:scale-95"
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              Logout
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-8 overflow-auto relative">
          {(() => {
            const financePaths = [
              "/dashboard/expenses",
              "/dashboard/salaries",
              "/dashboard/receivings",
              "/dashboard/ledger",
              "/dashboard/fees"
            ];
            const isFinancialPage = financePaths.some(p => pathname.startsWith(p));
            
            if (isFinancialPage && role === "5") {
              return (
                <div className="flex flex-col items-center justify-center h-full text-center py-20">
                  <svg className="w-16 h-16 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h2 className="text-2xl font-bold text-[#0f224a]">Access Denied</h2>
                  <p className="text-[#2563eb] mt-2">You do not have permission to view financial pages.</p>
                </div>
              );
            }

            return children;
          })()}
        </main>

        {/* Floating Chat for Admin/Parents/Students */}
        {(role === "1" || role === "3" || role === "4") && <FloatingChat />}
      </div>
    </div>
  );
}
