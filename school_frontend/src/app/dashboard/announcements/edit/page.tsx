"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Save, Upload } from "lucide-react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const STORAGE_URL = process.env.NEXT_PUBLIC_STORAGE_URL || "http://localhost:8000/storage";

function EditAnnouncementForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({
    title: "",
    date: "",
    details: "",
  });
  const [existingImage, setExistingImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [existingAttachment, setExistingAttachment] = useState<{ path: string; name: string } | null>(null);

  const fetchAnnouncement = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/announcements/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (!res.ok) throw new Error("Failed to fetch announcement details");
      const data = await res.json();
      
      setFormData({
        title: data.title || "",
        date: data.date || "",
        details: data.details || "",
      });
      setExistingImage(data.image);
      if (data.attachment) setExistingAttachment({ path: data.attachment, name: data.attachment_name || "Attachment Document" });
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setFetching(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAnnouncement();
  }, [fetchAnnouncement]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const data = new FormData();
      // Use _method=PUT for Laravel when sending FormData
      data.append("_method", "PUT");
      data.append("title", formData.title);
      data.append("date", formData.date);
      data.append("details", formData.details);
      if (imageFile) {
        data.append("image", imageFile);
      }
      if (attachmentFile) {
        data.append("attachment", attachmentFile);
      }

      const res = await fetch(`${API}/announcements/${id}`, {
        method: "POST", // Send as POST with _method=PUT
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: data,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to update announcement");
      }

      router.push("/dashboard/announcements");
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <DashboardLayout>
        <div className="p-12 text-center text-gray-500">Loading announcement details...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-brand-200/50">
          <Link href="/dashboard/announcements" className="w-10 h-10 flex items-center justify-center rounded-xl bg-brand-50 text-brand-800 hover:bg-brand-100 transition">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-brand-950">Edit Announcement</h1>
            <p className="text-sm text-gray-500 mt-1">Update existing announcement details</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-brand-200/50 p-6 sm:p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-900">Title <span className="text-red-500">*</span></label>
                <input 
                  required
                  type="text" 
                  value={formData.title} 
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
                  className="w-full px-4 py-3 rounded-xl border border-brand-200/60 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-brand-800/20 focus:border-brand-800 outline-none transition" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-900">Date <span className="text-red-500">*</span></label>
                <input 
                  required
                  type="date" 
                  value={formData.date} 
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })} 
                  className="w-full px-4 py-3 rounded-xl border border-brand-200/60 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-brand-800/20 focus:border-brand-800 outline-none transition" 
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-900">Details <span className="text-red-500">*</span></label>
              <textarea 
                required
                rows={5}
                value={formData.details} 
                onChange={(e) => setFormData({ ...formData, details: e.target.value })} 
                className="w-full px-4 py-3 rounded-xl border border-brand-200/60 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-brand-800/20 focus:border-brand-800 outline-none transition resize-y" 
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-900">Featured Image</label>
              {existingImage && !imageFile && (
                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-2">Current Image:</p>
                  <img src={`${STORAGE_URL}/${existingImage}`} alt="Current" className="h-32 object-contain rounded-lg border border-gray-200" />
                </div>
              )}
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-brand-200/60 border-dashed rounded-xl hover:bg-brand-50/50 transition">
                <div className="space-y-2 text-center">
                  <div className="w-12 h-12 bg-brand-50 text-brand-800 rounded-full flex items-center justify-center mx-auto">
                    <Upload size={24} />
                  </div>
                  <div className="flex text-sm text-gray-600 justify-center">
                    <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-brand-800 hover:text-brand-900 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-brand-800">
                      <span>Upload a new file</span>
                      <input id="file-upload" name="file-upload" type="file" accept="image/*" className="sr-only" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                  {imageFile && (
                    <div className="text-sm font-medium text-brand-800 mt-2">
                      New selection: {imageFile.name}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-900">Document Attachment / Schedule File (Optional)</label>
              {existingAttachment && !attachmentFile && (
                <div className="mb-3 text-xs bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-700 flex items-center justify-between">
                  <span>Current File: <strong>{existingAttachment.name}</strong></span>
                </div>
              )}
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-brand-200/60 border-dashed rounded-xl hover:bg-brand-50/50 transition">
                <div className="space-y-2 text-center">
                  <div className="w-12 h-12 bg-brand-50 text-brand-800 rounded-full flex items-center justify-center mx-auto">
                    <Upload size={24} />
                  </div>
                  <div className="flex text-sm text-gray-600 justify-center">
                    <label htmlFor="attachment-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-brand-800 hover:text-brand-900 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-brand-800">
                      <span>Upload a new document (PDF, DOCX, XLSX, etc.)</span>
                      <input id="attachment-upload" name="attachment-upload" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt,.png,.jpg,.jpeg" className="sr-only" onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)} />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">Attach schedules, routine sheets, or notice documents for students to download</p>
                  {attachmentFile && (
                    <div className="text-sm font-medium text-green-700 bg-green-50 py-1 px-3 rounded-lg border border-green-200 inline-block mt-2">
                      New Document Selection: {attachmentFile.name}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-brand-200/50 flex justify-end">
              <button 
                type="submit" 
                disabled={loading} 
                className="bg-brand-900 text-white px-8 py-3 rounded-xl text-sm font-semibold hover:bg-brand-800 transition shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? "Saving..." : <><Save size={18} /> Update Announcement</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}

import PageLoader from "@/components/PageLoader";

export default function EditAnnouncementPage() {
  return (
    <Suspense fallback={<PageLoader text="Loading announcement..." />}>
      <EditAnnouncementForm />
    </Suspense>
  );
}
