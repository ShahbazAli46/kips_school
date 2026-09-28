"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import AdminDashboard from "./admin-dashboard/AdminDashboard";
import ParentDashboard from "./parent/ParentDashboard";

export default function DashboardPage() {
  const [role, setRole] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const userRole = localStorage.getItem("userRole");
    setRole(userRole);
    if (userRole === "6") {
      router.replace("/dashboard/attendance");
    }
  }, [router]);

  const renderContent = () => {
    switch (role) {
      case "1":
      case "5":           return <AdminDashboard />;
      case "2":           return <div className="p-8 text-center text-sm font-semibold" style={{ color: "#1e3a8a" }}>Teacher Dashboard — coming soon</div>;
      case "3":           return <ParentDashboard />;
      case "4":           return <ParentDashboard />;
      case "6":           return null; // Redirecting
      default:            return null;
    }
  };

  return <DashboardLayout>{renderContent()}</DashboardLayout>;
}
