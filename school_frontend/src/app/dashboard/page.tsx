"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import AdminDashboard from "./admin-dashboard/AdminDashboard";
import ParentDashboard from "./parent/ParentDashboard";
import TeacherDashboard from "./teacher/TeacherDashboard";

export default function DashboardPage() {
  const [role, setRole] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("userRole");
    }
    return null;
  });
  const router = useRouter();

  useEffect(() => {
    const userRole = localStorage.getItem("userRole");
    if (userRole !== role) setRole(userRole);
    if (userRole === "6") {
      router.replace("/dashboard/attendance");
    }
  }, [router, role]);

  const renderContent = () => {
    switch (role) {
      case "1":
      case "5":
      case "7":           return <AdminDashboard />;
      case "2":           return <TeacherDashboard />;
      case "3":           return <ParentDashboard />;
      case "4":           return <ParentDashboard />;
      case "6":           return null; // Redirecting
      default:            return null;
    }
  };

  return <DashboardLayout>{renderContent()}</DashboardLayout>;
}
