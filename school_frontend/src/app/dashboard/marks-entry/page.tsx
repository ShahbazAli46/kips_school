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
  searchable = false,
}: {
  options: { label: string; value: string | number }[];
  value: string | number;
  onChange: (name: string, value: string | number) => void;
  placeholder?: string;
  name: string;
  className?: string;
  searchable?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => String(o.value) === String(value));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = searchable && searchQuery
    ? options.filter(o => o.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : options;

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
          className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border overflow-hidden flex flex-col"
          style={{ borderColor: "#bfdbfe", maxHeight: "240px", animation: "fadeIn 0.2s ease-out" }}
        >
          {searchable && (
            <div className="p-2 border-b border-[#bfdbfe] bg-[#f0f4f8] sticky top-0 z-10 shrink-0">
              <input
                type="text"
                autoFocus
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-lg outline-none transition-colors"
                style={{ borderColor: "#bfdbfe", color: "#0f224a" }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
          <div className="p-1.5 space-y-0.5 overflow-y-auto">
            {filteredOptions.map((option) => (
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
                  setSearchQuery("");
                }}
              >
                {String(value) === String(option.value) && (
                  <span className="mr-2 inline-block">✓</span>
                )}
                {option.label}
              </div>
            ))}
            {filteredOptions.length === 0 && (
              <div className="px-4 py-4 text-sm text-[#38bdf8] text-center italic font-medium">
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Error Modal ──────────────────────────────────────────────────────────────
function ErrorModal({ message, onClose }: { message: string, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl shadow-2xl p-6 z-10 text-center" style={{ background: "#fff", border: "1px solid #fca5a5" }}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(220,38,38,0.1)" }}>
          <svg className="w-7 h-7" fill="none" stroke="#dc2626" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h3 className="text-lg font-bold mb-2" style={{ color: "#0b1329" }}>Invalid Input</h3>
        <p className="text-sm mb-6" style={{ color: "#1e40af" }}>{message}</p>
        
        <button onClick={onClose} className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition active:scale-95 hover:bg-red-700" style={{ background: "#dc2626" }}>Okay</button>
      </div>
    </div>
  );
}

export default function MarksEntryPage() {
  const [tests, setTests] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedTestId, setSelectedTestId] = useState<string>("");
  const [selectedTest, setSelectedTest] = useState<any>(null);
  
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedGender, setSelectedGender] = useState<string>("");
  
  const [studentsData, setStudentsData] = useState<any[]>([]);
  const [loadingTests, setLoadingTests] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [globalImporting, setGlobalImporting] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [errorModalMsg, setErrorModalMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const globalFileInputRef = useRef<HTMLInputElement>(null);

  const fetchTests = useCallback(async () => {
    setLoadingTests(true);
    try {
      const [resTests, resCls, resSubj] = await Promise.all([
        fetch(`${API}/tests`, { headers: getAuthHeaders() }),
        fetch(`${API}/classes`, { headers: getAuthHeaders() }),
        fetch(`${API}/subjects`, { headers: getAuthHeaders() }),
      ]);
      const dataTests = await resTests.json();
      const dataCls = await resCls.json();
      const dataSubj = await resSubj.json();

      setTests(Array.isArray(dataTests) ? dataTests : []);
      setClasses(Array.isArray(dataCls) ? dataCls : []);
      setSubjects(Array.isArray(dataSubj) ? dataSubj : []);
    } catch { } finally { setLoadingTests(false); }
  }, []);

  useEffect(() => { fetchTests(); }, [fetchTests]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const testId = params.get("test_id");
      if (testId) setSelectedTestId(testId);
    }
  }, []);

  useEffect(() => {
    if (!selectedTestId) {
      setStudentsData([]);
      setSelectedTest(null);
      return;
    }
    
    const testObj = tests.find(t => t.id.toString() === selectedTestId);
    setSelectedTest(testObj);

    const fetchStudents = async () => {
      setLoadingStudents(true);
      try {
        const res = await fetch(`${API}/tests/${selectedTestId}/students`, { headers: getAuthHeaders() });
        const data = await res.json();
        // format data into local state array for editing
        const formatted = data.map((item: any) => ({
          student_id: item.student.id,
          name: item.student.name,
          roll_no: item.student.roll_number || item.student.id, // Or however roll numbers are tracked
          gender: item.student.gender || "",
          obtained_marks: item.mark?.obtained_marks ?? "",
          is_absent: item.mark?.is_absent ?? false,
          remarks: item.mark?.remarks ?? "",
        }));
        setStudentsData(formatted);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingStudents(false);
      }
    };
    
    fetchStudents();
  }, [selectedTestId, tests]);

  const handleMarkChange = (studentId: number, field: string, value: any) => {
    setStudentsData(prev => prev.map(s => {
      if (s.student_id === studentId) {
        const updated = { ...s, [field]: value };
        if (field === "is_absent" && value === true) {
          updated.obtained_marks = ""; // clear marks if absent
        }
        return updated;
      }
      return s;
    }));
  };

  const filteredStudents = studentsData.filter(s => !selectedGender || s.gender?.toLowerCase() === selectedGender.toLowerCase());

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split('\n');
      const updatedStudents = [...studentsData];
      let importCount = 0;

      lines.forEach((line) => {
        // Handle common CSV delimiters
        const cols = line.split(',');
        if (cols.length >= 4) {
          const rollNoStr = cols[0].trim();
          const marksStr = cols[3].trim();
          
          if (!rollNoStr || isNaN(Number(rollNoStr))) return; // skip header
          
          const rollNo = parseInt(rollNoStr, 10);
          const studentIndex = updatedStudents.findIndex(s => s.student_id === rollNo);
          
          if (studentIndex !== -1) {
             if (marksStr.toUpperCase() === 'A' || marksStr.toUpperCase() === 'ABSENT') {
               updatedStudents[studentIndex].is_absent = true;
               updatedStudents[studentIndex].obtained_marks = "";
             } else {
               const parsedMarks = parseFloat(marksStr);
               if (!isNaN(parsedMarks)) {
                 updatedStudents[studentIndex].obtained_marks = parsedMarks;
                 updatedStudents[studentIndex].is_absent = false;
               }
             }
             importCount++;
          }
        }
      });

      setStudentsData(updatedStudents);
      setMessage({ text: `Imported marks for ${importCount} students from CSV. Remember to save!`, type: "success" });
      setTimeout(() => setMessage({ text: "", type: "" }), 5000);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  const handleGlobalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split('\n');
      const marksPayload: any[] = [];

      lines.forEach((line) => {
        const cols = line.split(',');
        if (cols.length >= 7) {
          const rollNoStr = cols[0].trim();
          if (!rollNoStr || isNaN(Number(rollNoStr))) return; // skip header

          const rollNo = parseInt(rollNoStr, 10);
          const subjId = parseInt(cols[1].trim(), 10);
          const obtainedMarks = parseFloat(cols[3].trim());
          const totalMarks = parseFloat(cols[4].trim());
          const seriesName = cols[5].trim();
          const className = cols[6].trim();

          if (!isNaN(rollNo) && !isNaN(subjId) && !isNaN(obtainedMarks) && !isNaN(totalMarks) && seriesName && className) {
            marksPayload.push({
              student_roll_number: rollNo,
              subject_id: subjId,
              obtained_marks: obtainedMarks,
              total_marks: totalMarks,
              test_series_name: seriesName,
              class_name: className
            });
          }
        }
      });

      if (marksPayload.length === 0) {
        setMessage({ text: "No valid marks found in CSV.", type: "error" });
        return;
      }

      setGlobalImporting(true);
      setMessage({ text: "Importing tests and marks... this may take a moment.", type: "" });
      try {
        const res = await fetch(`${API}/tests/bulk-import`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ marks: marksPayload })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Bulk import failed");

        setMessage({ text: data.message || "Bulk import successful!", type: "success" });
        fetchTests(); // Refresh the tests dropdown
      } catch (err: any) {
        setMessage({ text: err.message, type: "error" });
      } finally {
        setGlobalImporting(false);
        if (globalFileInputRef.current) globalFileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  const handleBulkSave = async () => {
    if (!selectedTestId) return;
    setSaving(true);
    setMessage({ text: "", type: "" });
    try {
      const payload = {
        marks: studentsData.map(s => ({
          student_id: s.student_id,
          obtained_marks: s.obtained_marks === "" ? null : Number(s.obtained_marks),
          is_absent: s.is_absent,
          remarks: s.remarks,
        }))
      };

      const res = await fetch(`${API}/tests/${selectedTestId}/marks/bulk`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to save marks");
      
      setMessage({ text: "Marks saved successfully!", type: "success" });
      setTimeout(() => setMessage({ text: "", type: "" }), 3000);
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#0f224a]">Enter Test Marks</h2>
        <p className="text-sm mt-1 text-[#2563eb]">Select a test to enter marks for your class.</p>
      </div>

      {!selectedTest && message.text && (
        <div className={`mb-6 text-sm px-4 py-3 rounded-lg font-medium border ${message.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-[#bfdbfe] mb-6">
        {loadingTests ? (
          <div className="text-sm text-gray-500">Loading tests...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-[#1e3a8a]">Filter by Class</label>
              <CustomDropdown
                name="selectedClassId"
                value={selectedClassId}
                onChange={(name, val) => {
                  setSelectedClassId(String(val));
                  setSelectedTestId(""); // reset test on filter change
                }}
                searchable={true}
                placeholder="All Classes"
                options={[
                  { label: "All Classes", value: "" },
                  ...classes.map(cls => ({ label: cls.name, value: cls.id }))
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[#1e3a8a]">Filter by Subject</label>
              <CustomDropdown
                name="selectedSubjectId"
                value={selectedSubjectId}
                onChange={(name, val) => {
                  setSelectedSubjectId(String(val));
                  setSelectedTestId(""); // reset test on filter change
                }}
                searchable={true}
                placeholder="All Subjects"
                options={[
                  { label: "All Subjects", value: "" },
                  ...subjects.map(sub => ({ label: sub.name, value: sub.id }))
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[#1e3a8a]">Select Test</label>
              <CustomDropdown
                name="selectedTestId"
                value={selectedTestId}
                onChange={(name, val) => setSelectedTestId(String(val))}
                searchable={true}
                placeholder="-- Select Test --"
                options={[...tests]
                  .filter(t => !selectedClassId || String(t.academy_class_id) === String(selectedClassId))
                  .filter(t => !selectedSubjectId || String(t.subject_id) === String(selectedSubjectId))
                  .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
                  .map(t => ({
                    label: `${t.title} (${t.test_category?.name}) - ${t.academy_class?.name} - ${t.subject?.name} [${t.date}]`,
                    value: t.id
                  }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[#1e3a8a]">Filter by Gender</label>
              <CustomDropdown
                name="selectedGender"
                value={selectedGender}
                onChange={(name, val) => setSelectedGender(String(val))}
                placeholder="All Genders"
                options={[
                  { label: "All Genders", value: "" },
                  { label: "Male", value: "male" },
                  { label: "Female", value: "female" },
                ]}
              />
            </div>
          </div>
        )}
      </div>

      {selectedTest && (
        <div className="bg-white rounded-xl shadow-sm border border-[#bfdbfe] overflow-hidden">
          <div className="p-4 bg-[#f0f4f8] border-b border-[#bfdbfe] flex justify-between items-center">
            <div>
              <h3 className="font-bold text-[#1e3a8a]">{selectedTest.title} Marks</h3>
              <p className="text-xs text-[#2563eb]">Total Marks: {selectedTest.total_marks} | Passing: {selectedTest.passing_marks}</p>
            </div>
            {message.text && (
              <div className={`text-sm px-3 py-1 rounded font-medium ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {message.text}
              </div>
            )}
            <div className="flex gap-3">
              <button 
                onClick={handleBulkSave} 
                disabled={saving || loadingStudents || !(filteredStudents.length > 0 && filteredStudents.every(s => s.is_absent || (s.obtained_marks !== "" && s.obtained_marks !== null)))}
                className="px-6 py-2 bg-[#2563eb] text-white rounded-lg font-medium hover:bg-[#1e3a8a] disabled:opacity-50 transition-all shadow-md active:scale-95"
              >
                {saving ? "Saving..." : "Save All Marks"}
              </button>
            </div>
          </div>

          {loadingStudents ? (
            <div className="p-10 text-center text-gray-500">Loading students...</div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-10 text-center text-[#38bdf8]">No students found for this test's class/section and gender filter.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#f0f4f8] text-[#2563eb] border-b border-[#bfdbfe]">
                  <tr>
                    <th className="px-5 py-3">Roll No.</th>
                    <th className="px-5 py-3">Student Name</th>
                    <th className="px-5 py-3">Absent?</th>
                    <th className="px-5 py-3">Obtained Marks (out of {selectedTest.total_marks})</th>
                    <th className="px-5 py-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dbeafe]">
                  {filteredStudents.map((s, idx) => (
                    <tr key={s.student_id} className="hover:bg-blue-50">
                      <td className="px-5 py-3 font-medium text-gray-500">{s.roll_no}</td>
                      <td className="px-5 py-3 font-bold text-[#1e3a8a]">{s.name}</td>
                      <td className="px-5 py-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={s.is_absent} 
                            onChange={(e) => handleMarkChange(s.student_id, 'is_absent', e.target.checked)}
                            className="w-4 h-4 text-[#2563eb] rounded" style={{ accentColor: "#2563eb" }}
                          />
                        </label>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <input 
                            type="text" 
                            inputMode="decimal"
                            disabled={s.is_absent}
                            value={s.obtained_marks} 
                            onChange={(e) => {
                              let val = e.target.value.replace(/[^0-9.]/g, '');
                              // prevent multiple decimals
                              const parts = val.split('.');
                              if (parts.length > 2) {
                                val = parts[0] + '.' + parts.slice(1).join('');
                              }
                              
                              if (val !== "" && Number(val) > selectedTest.total_marks) {
                                setErrorModalMsg(`Marks entered (${val}) cannot exceed the total marks of ${selectedTest.total_marks}.`);
                                val = "";
                              }
                              handleMarkChange(s.student_id, 'obtained_marks', val);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                const nextInput = document.querySelector(`[data-marks-input="${idx + 1}"]`) as HTMLInputElement;
                                if (nextInput) {
                                  nextInput.focus();
                                  nextInput.select();
                                }
                              }
                            }}
                            data-marks-input={idx}
                            placeholder="0.0"
                            className="w-24 px-3 py-2 text-center font-bold text-[#0f224a] bg-white border border-[#bfdbfe] rounded-lg shadow-inner focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent transition-all disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none placeholder-gray-300"
                          />
                          <span className="text-sm text-[#2563eb] font-bold bg-[#f0f4f8] px-2 py-1 rounded-md border border-[#dbeafe]">/ {selectedTest.total_marks}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <input 
                          type="text" 
                          value={s.remarks} 
                          onChange={(e) => handleMarkChange(s.student_id, 'remarks', e.target.value)}
                          placeholder="Optional remarks"
                          className="w-full px-4 py-2 bg-white border border-[#bfdbfe] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent transition-all placeholder-gray-400 text-sm"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {errorModalMsg && <ErrorModal message={errorModalMsg} onClose={() => setErrorModalMsg("")} />}
    </DashboardLayout>
  );
}
