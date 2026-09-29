"use client";

import React, { useEffect, useState, Suspense } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import StudentAdmissionForm from "@/components/StudentAdmissionForm";
import { useRouter, useSearchParams } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function StudentAdmissionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");

  const [initialData, setInitialData] = useState<any | null>(null);
  const [loadingStudent, setLoadingStudent] = useState<boolean>(!!editId);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!editId) {
      setInitialData(null);
      setLoadingStudent(false);
      return;
    }

    setLoadingStudent(true);
    setFetchError(null);

    fetch(`${API}/students/${editId}`, {
      headers: getAuthHeaders(),
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Failed to load student details");
        }
        return res.json();
      })
      .then((data) => {
        setInitialData(data);
      })
      .catch((err: any) => {
        setFetchError(err.message || "Failed to load student");
      })
      .finally(() => {
        setLoadingStudent(false);
      });
  }, [editId]);

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {editId ? "Edit Student Admission" : "New Student School Admission"}
            </h2>
            {editId && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                Edit Mode
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-blue-700 mt-0.5 font-medium">
            Student personal data, admission stream mapping, 15 fee heads structure &amp; payables
          </p>
        </div>

        <button
          onClick={() => router.push("/dashboard/students")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 transition-all active:scale-95 shadow-2xs shrink-0 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Students
        </button>
      </div>

      {loadingStudent ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center shadow-xs">
          <svg className="animate-spin w-8 h-8 text-blue-600 mb-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm font-bold text-slate-700">Loading student admission data...</p>
        </div>
      ) : fetchError ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center space-y-3">
          <p className="text-sm font-bold text-red-700">{fetchError}</p>
          <button
            onClick={() => router.push("/dashboard/students")}
            className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition"
          >
            Return to Students List
          </button>
        </div>
      ) : (
        <div className="bg-slate-100/70 p-3 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <StudentAdmissionForm
            initialData={initialData}
            onSuccess={() => {
              router.push("/dashboard/students");
            }}
            onCancel={() => router.push("/dashboard/students")}
          />
        </div>
      )}
    </DashboardLayout>
  );
}

import PageLoader from "@/components/PageLoader";

export default function StudentAdmissionPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <PageLoader text="Loading admission portal..." />
        </DashboardLayout>
      }
    >
      <StudentAdmissionContent />
    </Suspense>
  );
}
