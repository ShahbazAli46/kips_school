"use client";

import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useRouter } from "next/navigation";

export default function ImportStudentsPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; failed: number; errors: string[] } | null>(null);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
      setError("");
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setResult(null);
      setError("");
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/students/import`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to upload file");
      }

      setResult({
        imported: data.imported,
        failed: data.failed,
        errors: data.errors,
      });
      setFile(null); // Clear file after upload
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "#0f224a" }}>Import Students</h2>
          <p className="text-sm mt-1" style={{ color: "#2563eb" }}>Upload a CSV file to bulk import legacy students</p>
        </div>
        <button
          onClick={() => router.push("/dashboard/students")}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all active:scale-95 shrink-0"
          style={{ borderColor: "#bfdbfe", color: "#1e3a8a", background: "#f0f4f8" }}
        >
          &larr; Back to Students
        </button>
      </div>

      <div className="bg-white rounded-2xl p-8 shadow-sm border" style={{ borderColor: "#bfdbfe" }}>
        
        <div className="mb-8 p-5 rounded-xl text-sm leading-relaxed" style={{ background: "rgba(138, 50, 24, 0.05)", border: "1px dashed rgba(138, 50, 24, 0.3)" }}>
          <h3 className="font-bold text-lg mb-2" style={{ color: "#0f224a" }}>CSV Requirements</h3>
          <p className="mb-3" style={{ color: "#1e3a8a" }}>Your CSV must include the following exact column headers:</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {['Name', 'Mobile No', 'Pass'].map(h => (
              <span key={h} className="px-2 py-1 bg-red-100 text-red-800 font-mono text-xs rounded border border-red-200">{h} (Required)</span>
            ))}
            {['Father Name', 'Gender', 'Class', 'Group', 'Status', 'ID photo'].map(h => (
              <span key={h} className="px-2 py-1 bg-gray-100 text-gray-700 font-mono text-xs rounded border border-gray-200">{h} (Optional)</span>
            ))}
          </div>
          <ul className="list-disc pl-5 space-y-1" style={{ color: "#1e40af" }}>
            <li><strong>Gender:</strong> Use 'M' or 'Male' and 'F' or 'Female'.</li>
            <li><strong>Class & Group (Major):</strong> If they don't exist in the system, they will be automatically created.</li>
            <li><strong>Status:</strong> Use '1' for active, '0' for inactive.</li>
            <li><strong>ID photo:</strong> Provide a valid URL. The system will attempt to download the image.</li>
          </ul>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl text-sm font-semibold border" style={{ background: "rgba(220, 38, 38, 0.08)", borderColor: "rgba(220, 38, 38, 0.2)", color: "#b91c1c" }}>
            {error}
          </div>
        )}

        {result && (
          <div className="mb-6 p-5 rounded-xl border" style={{ background: "#fdfdfdfd", borderColor: "#bfdbfe" }}>
            <h3 className="font-bold text-lg mb-3" style={{ color: "#0f224a" }}>Import Results</h3>
            <div className="flex gap-4 mb-4">
              <div className="p-4 rounded-lg flex-1 text-center bg-green-50 border border-green-200">
                <p className="text-3xl font-black text-green-700">{result.imported}</p>
                <p className="text-xs font-bold text-green-600 uppercase tracking-wide">Successfully Imported</p>
              </div>
              <div className="p-4 rounded-lg flex-1 text-center bg-red-50 border border-red-200">
                <p className="text-3xl font-black text-red-700">{result.failed}</p>
                <p className="text-xs font-bold text-red-600 uppercase tracking-wide">Failed Rows</p>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-bold text-red-800 mb-2">Error Log:</p>
                <div className="max-h-40 overflow-y-auto p-3 rounded bg-red-50 text-xs font-mono text-red-700 border border-red-100 space-y-1">
                  {result.errors.map((err, i) => <div key={i}>{err}</div>)}
                </div>
              </div>
            )}
          </div>
        )}

        <div 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-10 transition-colors" 
          style={{ borderColor: file || isDragging ? "#2563eb" : "#bfdbfe", background: file || isDragging ? "rgba(138,50,24,0.02)" : "#fafafa" }}
        >
          <svg className="w-12 h-12 mb-4" style={{ color: file || isDragging ? "#2563eb" : "#cbb3a6" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
          {file ? (
            <div className="text-center">
              <p className="font-bold text-[#0f224a] mb-1">{file.name}</p>
              <p className="text-xs text-[#38bdf8]">{(file.size / 1024).toFixed(2)} KB</p>
              <button onClick={() => setFile(null)} className="text-xs font-bold text-red-600 mt-3 hover:underline">Remove file</button>
            </div>
          ) : (
            <div className="text-center">
              <p className="font-medium text-[#1e3a8a] mb-1">Drag and drop your CSV file here</p>
              <p className="text-xs text-[#38bdf8] mb-4">or click to browse from your computer</p>
              <label className="cursor-pointer px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all active:scale-95 inline-block" style={{ background: "linear-gradient(135deg, #2563eb, #1e3a8a)" }}>
                Select CSV File
                <input type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
              </label>
            </div>
          )}
        </div>

        {file && (
          <button
            onClick={handleUpload}
            disabled={loading}
            className="w-full mt-6 py-4 rounded-xl text-white font-bold text-sm shadow-lg transition-all duration-200 hover:shadow-xl active:scale-[0.98] disabled:opacity-70 flex justify-center items-center"
            style={{ background: "linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%)" }}
          >
            {loading ? "Uploading & Processing..." : "Start Import"}
          </button>
        )}

      </div>
    </DashboardLayout>
  );
}
