"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function CustomDropdown({
  options,
  value,
  onChange,
  placeholder = "Select...",
  name,
  className = "",
}: {
  options: { label: string; value: string | number }[];
  value: string | number;
  onChange: (name: string, value: string | number) => void;
  placeholder?: string;
  name: string;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => String(o.value) === String(value));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div
        className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all cursor-pointer font-medium flex items-center justify-between shadow-sm hover:shadow-md"
        style={{
          borderColor: isOpen ? "#2563eb" : "#bfdbfe",
          background: "#fff",
          color: value ? "#0f224a" : "#38bdf8",
          boxShadow: isOpen ? "0 0 0 4px rgba(138, 50, 24, 0.1)" : "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate pr-4">{selectedOption ? selectedOption.label : placeholder}</span>
        <svg
          className={`w-4 h-4 transition-transform duration-300 shrink-0 ${isOpen ? "rotate-180" : ""}`}
          style={{ color: "#2563eb" }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isOpen && (
        <div
          className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border overflow-hidden"
          style={{ borderColor: "#bfdbfe", maxHeight: "240px", overflowY: "auto", animation: "fadeIn 0.2s ease-out" }}
        >
          <div className="p-1.5 space-y-0.5">
            {options.map((option) => (
              <div
                key={option.value}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all truncate flex items-center ${
                  String(value) === String(option.value)
                    ? "bg-[#dbeafe] text-[#2563eb] font-semibold"
                    : "text-[#434655] hover:bg-[#f0f4f8] hover:text-[#0f224a]"
                }`}
                onClick={() => {
                  onChange(name, option.value);
                  setIsOpen(false);
                }}
              >
                {String(value) === String(option.value) && (
                  <span className="mr-2 inline-block">✓</span>
                )}
                {option.label}
              </div>
            ))}
            {options.length === 0 && (
              <div className="px-4 py-4 text-sm text-[#38bdf8] text-center italic font-medium">
                No options available
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AttendanceSheetConfigPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [majors, setMajors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedSession, setSelectedSession] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedMajor, setSelectedMajor] = useState("");
  const [selectedGender, setSelectedGender] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resSess, resCls, resMaj] = await Promise.all([
        fetch(`${API}/academic-sessions`, { headers: getAuthHeaders() }),
        fetch(`${API}/classes`, { headers: getAuthHeaders() }),
        fetch(`${API}/majors`, { headers: getAuthHeaders() }),
      ]);
      const sessData = await resSess.json();
      const clsData = await resCls.json();
      const majData = await resMaj.json();

      setSessions(Array.isArray(sessData) ? sessData : (sessData.data || []));
      setClasses(Array.isArray(clsData) ? clsData : (clsData.data || []));
      setMajors(Array.isArray(majData) ? majData : (majData.data || []));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGenerate = () => {
    if (!selectedSession || !selectedClass) return;
    
    // Find session name and class name to pass via URL
    const sessionName = sessions.find(s => s.id.toString() === selectedSession)?.name || "";
    const className = classes.find(c => c.id.toString() === selectedClass)?.name || "";

    const params = new URLSearchParams({
      session_name: sessionName,
      class_name: className,
      class_id: selectedClass,
      gender: selectedGender,
      major_id: selectedMajor
    });

    window.open(`/dashboard/attendance-sheet/print?${params.toString()}`, "_blank");
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#0f224a]">Generate Attendance Sheet</h2>
        <p className="text-sm mt-1 text-[#2563eb]">Configure filters to generate a printable student attendance sheet.</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-[#bfdbfe] max-w-2xl">
        {loading ? (
          <div className="text-sm text-gray-500">Loading options...</div>
        ) : (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[#1e3a8a]">Academic Session *</label>
              <CustomDropdown
                name="selectedSession"
                value={selectedSession}
                onChange={(name, val) => setSelectedSession(String(val))}
                placeholder="Select Session"
                options={sessions.map(s => ({ label: s.name, value: s.id }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-[#1e3a8a]">Class *</label>
              <CustomDropdown
                name="selectedClass"
                value={selectedClass}
                onChange={(name, val) => setSelectedClass(String(val))}
                placeholder="Select Class"
                options={classes.map(c => ({ label: c.name, value: c.id }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-[#1e3a8a]">Major (Optional)</label>
              <CustomDropdown
                name="selectedMajor"
                value={selectedMajor}
                onChange={(name, val) => setSelectedMajor(String(val))}
                placeholder="All Majors"
                options={majors.map(m => ({ label: m.name, value: m.id }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-[#1e3a8a]">Gender (Optional)</label>
              <CustomDropdown
                name="selectedGender"
                value={selectedGender}
                onChange={(name, val) => setSelectedGender(String(val))}
                placeholder="All Genders"
                options={[
                  { label: "Male", value: "male" },
                  { label: "Female", value: "female" },
                  { label: "Other", value: "other" }
                ]}
              />
            </div>

            <div className="pt-4 mt-6 border-t border-[#dbeafe]">
              <button
                onClick={handleGenerate}
                disabled={!selectedSession || !selectedClass}
                className="w-full py-3 bg-[#2563eb] text-white rounded-xl font-bold hover:bg-[#1e3a8a] disabled:opacity-50 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Generate Sheet
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
