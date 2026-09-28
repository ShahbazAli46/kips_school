"use client";

import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Upload, X, Image as ImageIcon } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    Authorization: `Bearer ${token}`,
  };
}

export default function NewMemoryPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    title: "",
    date: new Date().toISOString().split("T")[0],
    type: "event" as "function" | "trip" | "event" | "other",
    description: "",
  });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files);
    
    // Append to existing files
    const updatedFiles = [...selectedFiles, ...filesArray];
    setSelectedFiles(updatedFiles);

    // Create object URLs for previews
    const newPreviews = filesArray.map(f => URL.createObjectURL(f));
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = new FormData();
      data.append("title", formData.title);
      data.append("date", formData.date);
      data.append("type", formData.type);
      data.append("description", formData.description);

      selectedFiles.forEach((file, index) => {
        data.append(`images[${index}]`, file);
      });

      const res = await fetch(`${API}/memories`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: data,
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.message || "Failed to create memory");
      }

      router.push("/dashboard/memories");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/memories"
              className="p-2 rounded-xl border border-brand-200/80 text-gray-600 hover:text-brand-900 hover:bg-white transition shadow-sm"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-brand-950">Add New Memory</h1>
              <p className="text-xs text-gray-500">Publish photo album for events, functions, or educational trips.</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-2xl border border-brand-200/60 shadow-sm space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Title */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider">
                Memory Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Annual Prize Distribution Ceremony 2026"
                className="w-full px-4 py-3 rounded-xl border border-brand-200/80 bg-brand-50/20 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-brand-800/20 focus:border-brand-800 transition font-medium"
              />
            </div>

            {/* Category / Type */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider">
                Category / Type (Optional)
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-4 py-3 rounded-xl border border-brand-200/80 bg-white text-sm outline-none focus:ring-2 focus:ring-brand-800/20 focus:border-brand-800 transition font-medium"
              >
                <option value="event">Event (Academic/Sports)</option>
                <option value="function">Function (Annual/Cultural)</option>
                <option value="trip">Educational Trip</option>
                <option value="other">Other Campus Moments</option>
              </select>
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider">
                Event Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-brand-200/80 bg-white text-sm outline-none focus:ring-2 focus:ring-brand-800/20 focus:border-brand-800 transition font-medium"
              />
            </div>

            {/* Details / Description */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider">
                Memory Details & Highlights (Optional)
              </label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Write a brief overview of this event, student achievements, trip highlights, or key moments..."
                className="w-full px-4 py-3 rounded-xl border border-brand-200/80 bg-brand-50/20 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-brand-800/20 focus:border-brand-800 transition"
              />
            </div>
          </div>

          {/* Multiple Image Upload Box */}
          <div className="space-y-3 pt-2">
            <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider">
              Upload Photos / Gallery Images
            </label>

            <div className="border-2 border-dashed border-brand-200 rounded-2xl p-6 text-center hover:bg-brand-50/50 transition relative">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                <div className="w-12 h-12 rounded-full bg-brand-100/60 text-brand-800 flex items-center justify-center">
                  <Upload size={24} />
                </div>
                <div className="text-sm font-bold text-brand-950">
                  Click or drag photos here to upload
                </div>
                <p className="text-xs text-gray-500">
                  Select multiple photos (PNG, JPG, WEBP up to 5MB each)
                </p>
              </div>
            </div>

            {/* Selected Images Preview Grid */}
            {previews.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <ImageIcon size={14} className="text-brand-800" />
                  <span>Selected Photos ({previews.length})</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {previews.map((url, index) => (
                    <div key={index} className="relative group rounded-xl overflow-hidden border border-brand-200 aspect-square bg-gray-100">
                      <img src={url} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute top-1.5 right-1.5 bg-red-600 text-white p-1 rounded-full opacity-90 hover:opacity-100 shadow-md transition"
                        title="Remove photo"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Form Submit Footer */}
          <div className="pt-4 border-t border-brand-200/50 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-brand-900 text-white px-8 py-3 rounded-xl text-sm font-bold hover:bg-brand-800 transition shadow-md disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? "Publishing Memory..." : <><Save size={18} /> Publish Memory</>}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
