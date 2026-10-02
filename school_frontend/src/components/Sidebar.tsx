"use client";

import React from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────
export type NavItem = {
  label: string;
  href?: string;
  icon: React.ReactNode;
  badge?: string | number;
  subItems?: { label: string; href: string }[];
};

// ─── Role-based menu configs ──────────────────────────────
const icon = (d: string) => (
  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={d} />
  </svg>
);

export const adminMenu: NavItem[] = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: icon("M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"),
  },

  {
    label: "Students",
    icon: icon("M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"),
    subItems: [
      { label: "New Admission", href: "/dashboard/students/admission" },
      { label: "Manage Students", href: "/dashboard/students" },
      { label: "Fees", href: "/dashboard/fees" },
      { label: "Fee Vouchers", href: "/dashboard/fees/vouchers" },
      { label: "Extra Charges & POS", href: "/dashboard/extra-charges" },
      { label: "Student Ledger", href: "/dashboard/fees/ledger" },
    ],
  },

  {
    label: "Finance",
    icon: icon("M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"),
    subItems: [
      { label: "Receivings", href: "/dashboard/receivings" },
      { label: "Expenses", href: "/dashboard/expenses" },
      { label: "Salaries", href: "/dashboard/salaries" },
      { label: "Advance Salaries", href: "/dashboard/advance-salaries" },
      { label: "Master Ledger", href: "/dashboard/ledger" },
      { label: "Financial Report", href: "/dashboard/ledger/financial-report" },
    ],
  },
  // {
  //   label: "Masjid & Madrasa",
  //   href: "/dashboard/masjid-madrasa",
  //   icon: icon("M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"),
  // },

  {
    label: "Attendance",
    icon: icon("M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"),
    subItems: [
      { label: "Subject Attendance", href: "/dashboard/subject-attendance" },
      { label: "Teacher Attendance", href: "/dashboard/teacher-attendance" },
      { label: "Teacher Register", href: "/dashboard/teacher-attendance/register" },
      { label: "Teacher Leaves", href: "/dashboard/teacher-leaves" },
      { label: "Attendance Sheet", href: "/dashboard/attendance-sheet" },
      { label: "Attendance", href: "/dashboard/attendance" },
      { label: "Leave Applications", href: "/dashboard/leave-applications" },
      { label: "Follow-ups", href: "/dashboard/follow-ups" },
    ],
  },
  {
    label: "Tests Setup",
    icon: icon("M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"),
    subItems: [
      { label: "Academic Sessions", href: "/dashboard/academic-sessions" },
      { label: "Test Categories", href: "/dashboard/test-categories" },
      { label: "Setup Tests", href: "/dashboard/tests" },
      { label: "Schedule Generator", href: "/dashboard/schedule-generator" },
      { label: "Roll Number Slips", href: "/dashboard/roll-number-slips" },
    ],
  },
  {
    label: "Results",
    icon: icon("M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"),
    subItems: [
      { label: "Marks Entry", href: "/dashboard/marks-entry" },
      { label: "Results", href: "/dashboard/results" },
    ],
  },
  {
    label: "Academic Setup",
    icon: icon("M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h4"),
    subItems: [
      { label: "Manage Sessions", href: "/dashboard/academic-sessions" },
      { label: "Manage Classes", href: "/dashboard/classes" },
      { label: "Manage Sections", href: "/dashboard/sections" },
      { label: "Manage Subjects", href: "/dashboard/subjects" },
      { label: "Manage Majors", href: "/dashboard/majors" },
    ],
  },
  {
    label: "Teachers",
    href: "/dashboard/teachers",
    icon: icon("M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"),
  },
  {
    label: "Announcements",
    href: "/dashboard/announcements",
    icon: icon("M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"),
  },
  {
    label: "Memories",
    href: "/dashboard/memories",
    icon: icon("M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"),
  },
  {
    label: "Messages",
    href: "/dashboard/messages",
    icon: icon("M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"),
  },
  {
    label: "Contact Inquiries",
    href: "/dashboard/contact-messages",
    icon: icon("M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"),
  },
  {
    label: "Notifications",
    href: "/dashboard/notifications",
    icon: icon("M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"),
  },
  {
    label: "App Control",
    href: "/dashboard/app-settings",
    icon: icon("M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"),
  },
  {
    label: "Users",
    href: "/dashboard/users",
    icon: icon("M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"),
  },
];

export const accountantMenu: NavItem[] = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: icon("M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"),
  },
  {
    label: "Fee Management",
    icon: icon("M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"),
    subItems: [
      { label: "Fee Collection", href: "/dashboard/fees" },
      { label: "Fee Vouchers", href: "/dashboard/fees/vouchers" },
      { label: "Extra Charges & POS", href: "/dashboard/extra-charges" },
      { label: "Student Ledger", href: "/dashboard/fees/ledger" },
    ],
  },
  {
    label: "Finance",
    icon: icon("M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"),
    subItems: [
      { label: "Daily Receivings", href: "/dashboard/receivings" },
      { label: "Expenses", href: "/dashboard/expenses" },
      { label: "Salaries", href: "/dashboard/salaries" },
      { label: "Advance Salaries", href: "/dashboard/advance-salaries" },
      { label: "Master Ledger", href: "/dashboard/ledger" },
      { label: "Financial Report", href: "/dashboard/ledger/financial-report" },
    ],
  },
  {
    label: "Students",
    icon: icon("M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"),
    subItems: [
      { label: "New Admission", href: "/dashboard/students/admission" },
      { label: "Manage Students", href: "/dashboard/students" },
    ],
  },
  {
    label: "Announcements",
    href: "/dashboard/announcements",
    icon: icon("M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"),
  },
  {
    label: "Notifications",
    href: "/dashboard/notifications",
    icon: icon("M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"),
  },
];

export const officeAdminMenu = accountantMenu;

export const attendanceManagerMenu: NavItem[] = [
  {
    label: "Mark Attendance",
    href: "/dashboard/attendance",
    icon: icon("M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"),
  },
  {
    label: "Attendance Sheet",
    href: "/dashboard/attendance-sheet",
    icon: icon("M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"),
  },
  {
    label: "Follow-ups",
    href: "/dashboard/follow-ups",
    icon: icon("M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"),
  },
];

export const menuByRole: Record<string, NavItem[]> = {
  "1": adminMenu,
  admin: adminMenu,
  "5": accountantMenu,
  accountant: accountantMenu,
  office_admin: accountantMenu,
  "6": attendanceManagerMenu,
  "attendance-manager": attendanceManagerMenu,

  "2": [
    {
      label: "Overview",
      href: "/dashboard",
      icon: icon("M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"),
    },
    {
      label: "My Classes",
      href: "/dashboard/classes",
      icon: icon("M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5"),
    },
    {
      label: "Attendance",
      href: "/dashboard/attendance",
      icon: icon("M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"),
    },
    {
      label: "Attendance Sheet",
      href: "/dashboard/attendance-sheet",
      icon: icon("M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"),
    },
    {
      label: "Tests",
      href: "/dashboard/tests",
      icon: icon("M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"),
    },
    {
      label: "Enter Marks",
      href: "/dashboard/marks",
      icon: icon("M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"),
    },
  ],

  "3": [
    {
      label: "Overview",
      href: "/dashboard",
      icon: icon("M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"),
    },
    {
      label: "My Children",
      href: "/dashboard",
      icon: icon("M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"),
    },
  ],

  "4": [
    {
      label: "Overview",
      href: "/dashboard",
      icon: icon("M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"),
    },
    {
      label: "My Children",
      href: "/dashboard/children",
      icon: icon("M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"),
    },
    {
      label: "Attendance",
      href: "/dashboard/attendance",
      icon: icon("M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2"),
    },
    {
      label: "Results",
      href: "/dashboard/results",
      icon: icon("M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"),
    },
    {
      label: "Fee Status",
      href: "/dashboard/fees",
      icon: icon("M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8"),
    },
  ],
};

// ─── Sidebar Component ────────────────────────────────────

interface SidebarProps {
  role: string;
  isOpen: boolean;
  onClose: () => void;
  currentPath: string;
}

export default function Sidebar({ role, isOpen, onClose, currentPath }: SidebarProps) {
  const items = menuByRole[role] ?? [];
  
  const [expandedMenus, setExpandedMenus] = React.useState<string[]>([]);

  React.useEffect(() => {
    items.forEach(item => {
      if (item.subItems?.some(sub => currentPath.startsWith(sub.href))) {
        setExpandedMenus(prev => prev.includes(item.label) ? prev : [...prev, item.label]);
      }
    });
  }, [currentPath, items]);

  const toggleMenu = (label: string) => {
    setExpandedMenus(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }}
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className="fixed top-0 left-0 h-full z-50 flex flex-col transition-transform duration-300 ease-in-out"
        style={{
          width: "256px",
          background: "linear-gradient(180deg, #0b1329 0%, #0f224a 60%, #0b1329 100%)",
          borderRight: "1px solid rgba(107,37,20,0.4)",
          transform: isOpen ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        {/* Logo / Academy name */}
        <div
          className="flex items-center justify-between px-5 py-5 shrink-0"
          style={{ borderBottom: "1px solid rgba(107,37,20,0.4)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(255,255,255,0.08)" }}
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">KIPS</p>
              <p className="text-xs" style={{ color: "var(--brand-300)" }}>School</p>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Role badge */}
        <div className="px-5 py-3 shrink-0">
          <span
            className="inline-block text-xs font-semibold px-3 py-1 rounded-full capitalize"
            style={{ background: "rgba(37,99,235,0.3)", color: "#38bdf8", border: "1px solid rgba(37,99,235,0.4)" }}
          >
            {role === "1" ? "Admin" : role === "5" ? "Office Admin" : role === "6" ? "Attendance Manager" : role} Portal
          </span>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {items.map((item) => {
            if (item.subItems) {
              const isParentActive = item.subItems.some((sub) => currentPath.startsWith(sub.href));
              const isExpanded = expandedMenus.includes(item.label);

              return (
                <div key={item.label} className="space-y-1">
                  <button
                    onClick={() => toggleMenu(item.label)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 group"
                    style={{
                      background: isParentActive ? "rgba(37,99,235,0.15)" : "transparent",
                      color: isParentActive ? "#fff" : "#38bdf8",
                      borderLeft: isParentActive ? "3px solid #38bdf8" : "3px solid transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (!isParentActive) {
                        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                        (e.currentTarget as HTMLElement).style.color = "#fff";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isParentActive) {
                        (e.currentTarget as HTMLElement).style.background = "transparent";
                        (e.currentTarget as HTMLElement).style.color = "#38bdf8";
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span style={{ color: isParentActive ? "#38bdf8" : "inherit" }}>{item.icon}</span>
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isExpanded && (
                    <div className="pl-11 space-y-1 pr-2">
                      {item.subItems.map((sub) => {
                        const isSubActive = currentPath === sub.href;
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            prefetch={false}
                            onClick={onClose}
                            className="block px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150"
                            style={{
                              background: isSubActive ? "rgba(56,189,248,0.15)" : "transparent",
                              color: isSubActive ? "#fff" : "#38bdf8",
                            }}
                            onMouseEnter={(e) => {
                              if (!isSubActive) {
                                (e.currentTarget as HTMLElement).style.color = "#fff";
                                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSubActive) {
                                (e.currentTarget as HTMLElement).style.color = "#38bdf8";
                                (e.currentTarget as HTMLElement).style.background = "transparent";
                              }
                            }}
                          >
                            {sub.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const isActive = item.href ? currentPath === item.href : false;
            return (
              <Link
                key={item.label}
                href={item.href || "#"}
                prefetch={false}
                onClick={onClose}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group"
                style={{
                  background: isActive ? "rgba(37,99,235,0.35)" : "transparent",
                  color: isActive ? "#fff" : "#38bdf8",
                  borderLeft: isActive ? "3px solid #38bdf8" : "3px solid transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                    (e.currentTarget as HTMLElement).style.color = "#fff";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color = "#38bdf8";
                  }
                }}
              >
                <span style={{ color: isActive ? "#38bdf8" : "inherit" }}>{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
                {item.badge && (
                  <span
                    className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: "#1e3a8a", color: "#38bdf8" }}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div
          className="px-5 py-4 shrink-0 flex flex-col items-center gap-1"
          style={{ borderTop: "1px solid rgba(107,37,20,0.4)" }}
        >
          <p className="text-xs text-center" style={{ color: "#1e40af" }}>
            Topper&apos;s First Choice
          </p>
          {process.env.NEXT_PUBLIC_BUILD_TIME && (
            <p className="text-[10px] text-center opacity-50" style={{ color: "#1e40af" }}>
              Build: {process.env.NEXT_PUBLIC_BUILD_TIME}
            </p>
          )}
        </div>
      </aside>
    </>
  );
}
