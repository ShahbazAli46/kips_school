"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CustomDropdown from "@/components/CustomDropdown";
import ParentMarquee from "@/components/ParentMarquee";
import StudentResultDetails from "@/components/StudentResultDetails";

export default function ParentDashboard() {
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const router = useRouter();

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
  const storageUrl = baseUrl.replace('/api', '/storage/');

  // Detail view state
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"marks" | "attendance" | "ledger">("marks");
  const [marks, setMarks] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [attendanceMonth, setAttendanceMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const [categories, setCategories] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const [details, setDetails] = useState<any[]>([]);
  const [individualTests, setIndividualTests] = useState<any[]>([]);
  const [loadingDetailedResults, setLoadingDetailedResults] = useState(false);

  useEffect(() => {
    fetchChildren();
  }, []);

  const fetchChildren = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/parent/my-students`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!res.ok) throw new Error("Failed to fetch your children");
      const data = await res.json();
      setChildren(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, child: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch(`${baseUrl}/parent/student/${child.uuid}/image`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to upload image");
      const data = await res.json();
      
      // Update children list
      setChildren(prev => prev.map(c => c.uuid === child.uuid ? { ...c, image: data.image } : c));
      
      // If updating selected student
      if (selectedStudent?.uuid === child.uuid) {
        setSelectedStudent((prev: any) => ({ ...prev, image: data.image }));
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSelectStudent = async (student: any) => {
    setSelectedStudent(student);
    setDetailLoading(true);
    setDetailError("");
    setActiveTab("marks");

    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

      const [marksRes, attRes, ledgerRes] = await Promise.all([
        fetch(`${baseUrl}/parent/student/${student.uuid}/marks`, { headers }),
        fetch(`${baseUrl}/parent/student/${student.uuid}/attendance`, { headers }),
        fetch(`${baseUrl}/fees/ledger/${student.uuid}`, { headers }),
      ]);

      if (!marksRes.ok || !attRes.ok || !ledgerRes.ok) {
        throw new Error("Failed to fetch student details. You may not be authorized.");
      }

      const marksData = await marksRes.json();
      setMarks(marksData.marks || []);
      setCategories(marksData.categories || []);
      setPositions(marksData.positions || []);
      setSelectedCategory("");
      setAttendance(await attRes.json());
      setLedger(await ledgerRes.json());
    } catch (err: any) {
      setDetailError(err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (selectedStudent && activeTab === "marks") {
      const fetchDetailedResults = async () => {
        setLoadingDetailedResults(true);
        try {
          const res = await fetch(`${baseUrl}/parent/student/${selectedStudent.uuid}/detailed-results?category_type=${selectedCategory === "" ? "all" : selectedCategory}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
          });
          if (res.ok) {
            const data = await res.json();
            setDetails(data.subjects || []);
            setIndividualTests(data.tests || []);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setLoadingDetailedResults(false);
        }
      };
      fetchDetailedResults();
    }
  }, [selectedStudent, selectedCategory, activeTab]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-[#2563eb]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
      </div>
    );
  }

  if (error) {
    return <div className="p-8 text-center text-red-600">{error}</div>;
  }

  // --- DETAIL VIEW ---
  if (selectedStudent) {
    return (
      <div className="p-8 max-w-6xl mx-auto animate-in fade-in duration-500">
        <button onClick={() => setSelectedStudent(null)} className="mb-6 flex items-center gap-2 text-sm text-gray-500 hover:text-[#2563eb] transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to My Children
        </button>

        <ParentMarquee studentId={selectedStudent.id} />

        <div className="flex items-center gap-4 mb-8">
          <div className="relative">
            <label className="cursor-pointer group/avatar relative block" title="Update child picture">
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={(e) => handleImageUpload(e, selectedStudent)}
                disabled={uploadingImage}
              />
              <div 
                className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-md overflow-hidden bg-gray-200 ${uploadingImage ? 'opacity-50' : ''}`}
                style={{ background: selectedStudent.image ? "transparent" : "linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%)" }}
              >
                {selectedStudent.image ? (
                  <img src={`${storageUrl}${selectedStudent.image}`} alt={selectedStudent.name} className="w-full h-full object-cover" />
                ) : (
                  selectedStudent.name.charAt(0).toUpperCase()
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity rounded-full">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full border flex items-center justify-center shadow-sm text-gray-500 hover:text-[#2563eb] transition-colors" style={{ borderColor: "#bfdbfe" }}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              </div>
            </label>
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "#0f224a" }}>{selectedStudent.name}</h1>
            <p className="text-sm text-gray-500 font-medium">
              {selectedStudent.academy_class?.name} {selectedStudent.section ? `• ${selectedStudent.section.name}` : ""}
            </p>
          </div>
        </div>

        {detailLoading ? (
          <div className="flex h-32 items-center justify-center">
            <svg className="animate-spin h-8 w-8 text-[#2563eb]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
          </div>
        ) : detailError ? (
          <div className="text-red-600">{detailError}</div>
        ) : (
          <>
            <div className="mb-8 flex space-x-2 border-b" style={{ borderColor: "#bfdbfe" }}>
              {["marks", "attendance", "ledger"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`px-6 py-3 font-semibold text-sm transition-colors relative ${
                    activeTab === tab ? "text-[#2563eb]" : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {activeTab === tab && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2563eb]" />
                  )}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-2xl border shadow-sm p-6" style={{ borderColor: "#bfdbfe" }}>
              {activeTab === "marks" && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold" style={{ color: "#0f224a" }}>Test Marks</h2>
                    <div className="flex items-center gap-3">
                      <div className="w-64">
                        <CustomDropdown
                          name="categoryFilter"
                          value={selectedCategory === "" ? "all" : selectedCategory}
                          onChange={(_, val) => setSelectedCategory(val === "all" ? "" : String(val))}
                          options={[
                            { label: "All Types", value: "all" },
                            ...categories.map(c => ({ label: c.name, value: c.id }))
                          ]}
                        />
                      </div>
                      <a
                        href={`/dashboard/results/print/?student_id=${selectedStudent.id}&session=${selectedStudent.academic_session_id || 1}&class=${selectedStudent.class_id}&category=${selectedCategory === "" ? "all" : selectedCategory}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-3 bg-[#2563eb] text-white rounded-xl text-sm font-medium hover:bg-[#7a2a12] transition-colors flex items-center gap-2 shadow-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                        Print Card
                      </a>
                    </div>
                  </div>

                  {(selectedCategory !== "" || positions.find(p => p.category_id === 'all')) && positions.find(p => p.category_id === (selectedCategory === "" ? 'all' : selectedCategory)) && (
                    <div className="mb-6 p-4 rounded-xl shadow-sm flex items-center justify-between" style={{ background: "linear-gradient(135deg, #f0f4f8 0%, #fae6dc 100%)", border: "1px solid #bfdbfe" }}>
                      <div>
                        <h3 className="text-sm font-semibold text-[#2563eb] mb-1">Overall Position</h3>
                        <p className="text-2xl font-bold text-[#0f224a]">
                          #{positions.find(p => p.category_id === (selectedCategory === "" ? 'all' : selectedCategory))?.position} 
                          <span className="text-sm font-normal text-gray-500 ml-1">/ {positions.find(p => p.category_id === (selectedCategory === "" ? 'all' : selectedCategory))?.total_students} students</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <h3 className="text-sm font-semibold text-[#2563eb] mb-1">Total Score</h3>
                        <p className="text-lg font-bold text-[#0f224a]">
                          {positions.find(p => p.category_id === (selectedCategory === "" ? 'all' : selectedCategory))?.total_obtained} <span className="text-sm font-normal text-gray-500">/ {positions.find(p => p.category_id === (selectedCategory === "" ? 'all' : selectedCategory))?.total_max}</span>
                        </p>
                        <p className="text-sm font-medium text-green-600">
                          {positions.find(p => p.category_id === (selectedCategory === "" ? 'all' : selectedCategory))?.percentage}%
                        </p>
                      </div>
                    </div>
                  )}

                  {marks.filter(m => selectedCategory === "" || m.test?.test_category?.type === selectedCategory).length === 0 ? (
                    <p className="text-gray-500">No test marks available for this category.</p>
                  ) : (
                    loadingDetailedResults ? (
                      <div className="flex justify-center my-10">
                        <svg className="animate-spin w-8 h-8 text-[#2563eb]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      </div>
                    ) : (
                      <StudentResultDetails 
                        details={details} 
                        individualTests={individualTests} 
                        categoryName={selectedCategory === "" ? "Overall Performance" : categories.find(c => String(c.id) === selectedCategory)?.name || "Performance"} 
                      />
                    )
                  )}
                </div>
              )}

              {activeTab === "attendance" && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold" style={{ color: "#0f224a" }}>Attendance Record</h2>
                    <input 
                      type="month" 
                      value={attendanceMonth} 
                      onChange={(e) => setAttendanceMonth(e.target.value)} 
                      className="border rounded-xl px-3 py-1 text-sm focus:outline-none shadow-sm"
                      style={{ borderColor: "#bfdbfe" }}
                    />
                  </div>
                  {attendance.filter(a => !attendanceMonth || a.date.startsWith(attendanceMonth)).length === 0 ? (
                    <p className="text-gray-500">No attendance records available for this period.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b" style={{ borderColor: "#f0f4f8" }}>
                            <th className="py-3 px-4 font-semibold text-gray-600">Date</th>
                            <th className="py-3 px-4 font-semibold text-gray-600">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendance.filter(a => !attendanceMonth || a.date.startsWith(attendanceMonth)).map((a) => (
                            <tr key={a.id} className="border-b last:border-0 hover:bg-gray-50" style={{ borderColor: "#f0f4f8" }}>
                              <td className="py-3 px-4">{new Date(a.date).toLocaleDateString()}</td>
                              <td className="py-3 px-4">
                                {a.status === 'present' && <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold shadow-sm">Present</span>}
                                {a.status === 'absent' && <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold shadow-sm">Absent</span>}
                                {a.status === 'leave' && <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-semibold shadow-sm">Leave</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "ledger" && (
                <div>
                  <h2 className="text-xl font-bold mb-4" style={{ color: "#0f224a" }}>Fee Ledger</h2>
                  {ledger?.ledger?.length === 0 ? (
                    <p className="text-gray-500">No fee ledger records available.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b" style={{ borderColor: "#f0f4f8" }}>
                            <th className="py-3 px-4 font-semibold text-gray-600">Month</th>
                            <th className="py-3 px-4 font-semibold text-gray-600">Due</th>
                            <th className="py-3 px-4 font-semibold text-gray-600">Paid</th>
                            <th className="py-3 px-4 font-semibold text-gray-600">Discount</th>
                            <th className="py-3 px-4 font-semibold text-gray-600">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ledger?.ledger?.map((l: any, idx: number) => (
                            <tr key={idx} className="border-b last:border-0 hover:bg-gray-50" style={{ borderColor: "#f0f4f8" }}>
                              <td className="py-3 px-4 font-medium">{l.month_name}</td>
                              <td className="py-3 px-4">Rs {l.amount_due}</td>
                              <td className="py-3 px-4">Rs {l.amount_paid}</td>
                              <td className="py-3 px-4">Rs {l.discount}</td>
                              <td className="py-3 px-4">
                                {l.status === 'Received' && <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold shadow-sm">Paid</span>}
                                {l.status === 'Partial' && <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-semibold shadow-sm">Partial</span>}
                                {l.status === 'Unpaid' && <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold shadow-sm">Unpaid</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // --- LIST VIEW ---
  return (
    <div className="p-8 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ color: "#0f224a" }}>My Children</h1>
        <p className="text-sm text-gray-500 mt-2">Select a child to view their academic and financial records.</p>
      </div>

      {children.length === 0 ? (
        <div className="p-8 bg-white rounded-2xl border text-center shadow-sm" style={{ borderColor: "#bfdbfe" }}>
          <p className="text-gray-500 font-medium">No children linked to your account.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {children.map((child) => (
            <div
              key={child.id}
              onClick={() => handleSelectStudent(child)}
              className="bg-white p-6 rounded-2xl border shadow-sm cursor-pointer hover:shadow-xl transition-all duration-300 group hover:-translate-y-1 relative overflow-hidden"
              style={{ borderColor: "#bfdbfe" }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity -mr-8 -mt-8 rounded-full pointer-events-none" style={{ background: "linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%)" }} />
              
              <div className="flex items-center gap-5">
                <div className="relative z-10">
                  <label className="cursor-pointer group/avatar relative block" onClick={(e) => e.stopPropagation()} title="Update child picture">
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handleImageUpload(e, child)}
                      disabled={uploadingImage}
                    />
                    <div 
                      className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-md overflow-hidden bg-gray-200 ${uploadingImage ? 'opacity-50' : ''}`}
                      style={{ background: child.image ? "transparent" : "linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%)" }}
                    >
                      {child.image ? (
                        <img src={`${storageUrl}${child.image}`} alt={child.name} className="w-full h-full object-cover" />
                      ) : (
                        child.name.charAt(0).toUpperCase()
                      )}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity rounded-full">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                      </div>
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full border flex items-center justify-center shadow-sm text-gray-500 hover:text-[#2563eb] transition-colors" style={{ borderColor: "#bfdbfe" }}>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    </div>
                  </label>
                </div>
                <div className="flex-1 relative z-10">
                  <h3 className="font-bold text-lg" style={{ color: "#0f224a" }}>{child.name}</h3>
                  <div className="text-xs font-medium text-gray-500 mt-1 space-y-0.5">
                    {child.academy_class && <p>Class: {child.academy_class.name}</p>}
                    {child.section && <p>Section: {child.section.name}</p>}
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t flex justify-between items-center relative z-10" style={{ borderColor: "#f0f4f8" }}>
                <span className="text-xs font-bold" style={{ color: "#2563eb" }}>View Details</span>
                <svg className="w-5 h-5 text-[#2563eb] transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
