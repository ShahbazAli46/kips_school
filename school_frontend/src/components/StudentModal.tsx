"use client";

import React from "react";
import StudentAdmissionForm from "@/components/StudentAdmissionForm";

interface StudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (student: any) => void;
  initialData?: any | null;
}

export default function StudentModal({ isOpen, onClose, onSuccess, initialData }: StudentModalProps) {
  if (!isOpen) return null;

  const title = initialData
    ? `Edit Student Admission — ${initialData.name}`
    : "New Student School Admission";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-5xl my-auto bg-slate-100 rounded-2xl shadow-2xl border border-slate-300 z-10 flex flex-col max-h-[96vh] overflow-hidden">
        {/* Header */}
        <div className="px-4 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>{title}</span>
              {initialData?.roll_number && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  Roll No: {initialData.roll_number}
                </span>
              )}
            </h2>
            <p className="text-[11px] text-slate-500">
              Student personal data, admission stream, 15 fee heads matrix &amp; discounts.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Compact Form Body */}
        <div className="flex-1 p-3 sm:p-4 overflow-y-auto">
          <StudentAdmissionForm
            initialData={initialData}
            onSuccess={(student) => {
              onSuccess(student);
              onClose();
            }}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}
