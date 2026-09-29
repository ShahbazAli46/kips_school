"use client";

import React, { useEffect, useState, Suspense } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Save, Upload, X, Image as ImageIcon, Trash2 } from "lucide-react";

interface ExistingImage {
  id: number;
  image_path: string;
  caption: string | null;
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const STORAGE_URL = process.env.NEXT_PUBLIC_STORAGE_URL || "http://localhost:8000/storage";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    Authorization: `Bearer ${token}`,
  };
}

function EditMemoryForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const memoryId = searchParams.get("id");

  const [formData, setFormData] = useState({
    title: "",
    date: "",
    type: "event" as "function" | "trip" | "event" | "other",
    description: "",
  });

  const [existingImages, setExistingImages] = useState<ExistingImage[]>([]);
  const [deleteImageIds, setDeleteImageIds] = useState<number[]>([]);
  
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!memoryId) return;
    fetch(`${API}/memories/${memoryId}`, { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => {
        setFormData({
          title: data.title || "",
          date: data.date ? data.date.split("T")[0] : "",
          type: data.type || "event",
          description: data.description || "",
        });
        setExistingImages(Array.isArray(data.images) ? data.images : []);
      })
      .catch(err => setError("Failed to load memory details"))
      .finally(() => setLoading(false));
  }, [memoryId]);

  const handleMarkImageForDelete = (imageId: number) => {
    setDeleteImageIds(prev => [...prev, imageId]);
    setExistingImages(prev => prev.filter(img => img.id !== imageId));
  };

  const handleNewFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files);
    
    setNewFiles(prev => [...prev, ...filesArray]);
    const previewsArray = filesArray.map(f => URL.createObjectURL(f));
    setNewPreviews(prev => [...prev, ...previewsArray]);
  };

  const removeNewFile = (index: number) => {
    URL.revokeObjectURL(newPreviews[index]);
    setNewFiles(prev => prev.filter((_, i) => i !== index));
    setNewPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memoryId) return;
    setSaving(true);
    setError("");

    try {
      const data = new FormData();
      data.append("title", formData.title);
      data.append("date", formData.date);
      data.append("type", formData.type);
      data.append("description", formData.description);

      deleteImageIds.forEach(id => {
        data.append("delete_image_ids[]", id.toString());
      });

      newFiles.forEach((file, index) => {
        data.append(`new_images[${index}]`, file);
      });

      const res = await fetch(`${API}/memories/${memoryId}`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: data,
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.message || "Failed to update memory");
      }

      router.push("/dashboard/memories");
    } catch (err: any) {
      setError(err.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-brand-200 shadow-sm">
        <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-800 rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-semibold text-brand-800 uppercase tracking-wide">Loading Memory...</p>
      </div>
    );
  }

  return (
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
            <h1 className="text-2xl font-bold text-brand-950">Edit Memory</h1>
            <p className="text-xs text-gray-500">Update album details, remove old photos, or add new photos.</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Form */}
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
              className="w-full px-4 py-3 rounded-xl border border-brand-200/80 bg-brand-50/20 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-brand-800/20 focus:border-brand-800 transition font-medium"
            />
          </div>

          {/* Type */}
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

          {/* Description */}
          <div className="space-y-1.5 sm:col-span-2">
            <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider">
              Memory Details & Highlights
            </label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-brand-200/80 bg-brand-50/20 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-brand-800/20 focus:border-brand-800 transition"
            />
          </div>
        </div>

        {/* Existing Gallery Section */}
        {existingImages.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center justify-between">
              <span>Existing Photos ({existingImages.length})</span>
              <span className="text-gray-400 font-normal lowercase">Click trash icon to delete photo</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {existingImages.map((img) => (
                <div key={img.id} className="relative group rounded-xl overflow-hidden border border-brand-200 aspect-square bg-gray-100">
                  <img src={`${STORAGE_URL}/${img.image_path}`} alt="Memory photo" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleMarkImageForDelete(img.id)}
                    className="absolute top-1.5 right-1.5 bg-red-600 text-white p-1.5 rounded-full opacity-90 hover:opacity-100 shadow-md transition"
                    title="Delete photo"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Additional Photos Box */}
        <div className="space-y-3 pt-2">
          <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider">
            Add Additional Photos
          </label>

          <div className="border-2 border-dashed border-brand-200 rounded-2xl p-6 text-center hover:bg-brand-50/50 transition relative">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleNewFileSelect}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
              <div className="w-10 h-10 rounded-full bg-brand-100/60 text-brand-800 flex items-center justify-center">
                <Upload size={20} />
              </div>
              <div className="text-xs font-bold text-brand-950">
                Click or drag to add more photos
              </div>
            </div>
          </div>

          {newPreviews.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 pt-2">
              {newPreviews.map((url, index) => (
                <div key={index} className="relative group rounded-xl overflow-hidden border border-green-300 aspect-square bg-gray-100">
                  <img src={url} alt="New Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeNewFile(index)}
                    className="absolute top-1.5 right-1.5 bg-red-600 text-white p-1 rounded-full opacity-90 hover:opacity-100 shadow-md transition"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-brand-200/50 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-brand-900 text-white px-8 py-3 rounded-xl text-sm font-bold hover:bg-brand-800 transition shadow-md disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? "Updating Memory..." : <><Save size={18} /> Update Memory</>}
          </button>
        </div>
      </form>
    </div>
  );
}

import PageLoader from "@/components/PageLoader";

export default function EditMemoryPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<PageLoader text="Loading memory..." />}>
        <EditMemoryForm />
      </Suspense>
    </DashboardLayout>
  );
}
