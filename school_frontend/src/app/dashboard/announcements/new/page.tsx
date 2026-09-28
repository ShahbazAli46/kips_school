"use client";

import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Upload } from "lucide-react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export default function NewAnnouncementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({
    title: "",
    date: new Date().toISOString().split('T')[0],
    details: "",
    target_type: "global",
    class_id: "",
    student_id: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  React.useEffect(() => {
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    fetch(`${API}/classes`, { headers })
      .then(res => res.json())
      .then(data => setClasses(Array.isArray(data) ? data : (data.data || [])))
      .catch(() => setClasses([]));

    fetch(`${API}/students`, { headers })
      .then(res => res.json())
      .then(data => {
        const list = Array.isArray(data) ? data : (data.data || []);
        setStudents(list);
      })
      .catch(() => setStudents([]));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const data = new FormData();
      data.append("title", formData.title);
      data.append("date", formData.date);
      data.append("details", formData.details);
      data.append("target_type", formData.target_type);
      if (formData.target_type === 'class' && formData.class_id) {
        data.append("class_id", formData.class_id);
      }
      if (formData.target_type === 'student' && formData.student_id) {
        data.append("student_id", formData.student_id);
      }
      if (imageFile) {
        data.append("image", imageFile);
      }
      if (attachmentFile) {
        data.append("attachment", attachmentFile);
      }

      const res = await fetch(`${API}/announcements`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: data,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to create announcement");
      }

      router.push("/dashboard/announcements");
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-brand-200/50">
          <Link href="/dashboard/announcements" className="w-10 h-10 flex items-center justify-center rounded-xl bg-brand-50 text-brand-800 hover:bg-brand-100 transition">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-brand-950">Add Announcement</h1>
            <p className="text-sm text-gray-500 mt-1">Create a new public announcement</p>
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
                  placeholder="e.g. Summer Camp 2024"
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
                placeholder="Write the full announcement details here..."
                className="w-full px-4 py-3 rounded-xl border border-brand-200/60 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-brand-800/20 focus:border-brand-800 outline-none transition resize-y" 
              />
            </div>

            <div className="p-5 rounded-xl border border-brand-200/50 bg-brand-50/30 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-900">Target Audience <span className="text-red-500">*</span></label>
                <select 
                  value={formData.target_type}
                  onChange={(e) => setFormData({ ...formData, target_type: e.target.value, class_id: "", student_id: "" })}
                  className="w-full px-4 py-3 rounded-xl border border-brand-200/60 bg-white focus:ring-2 focus:ring-brand-800/20 focus:border-brand-800 outline-none transition"
                >
                  <option value="global">Global (Public Website & All Parents)</option>
                  <option value="class">Specific Class</option>
                  <option value="student">Specific Student</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.target_type === 'global' && "Visible to everyone on the public home page and all parents in the portal."}
                  {formData.target_type === 'class' && "Only visible to parents of students in the selected class. Will not appear on public site."}
                  {formData.target_type === 'student' && "Only visible to the parent of the selected student. Will not appear on public site."}
                </p>
              </div>

              {formData.target_type === 'class' && (
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-gray-900">Select Class <span className="text-red-500">*</span></label>
                  <select 
                    required
                    value={formData.class_id}
                    onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-brand-200/60 bg-white focus:ring-2 focus:ring-brand-800/20 focus:border-brand-800 outline-none transition"
                  >
                    <option value="">-- Choose Class --</option>
                    {Array.isArray(classes) && classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {formData.target_type === 'student' && (
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-gray-900">Select Student <span className="text-red-500">*</span></label>
                  <select 
                    required
                    value={formData.student_id}
                    onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-brand-200/60 bg-white focus:ring-2 focus:ring-brand-800/20 focus:border-brand-800 outline-none transition"
                  >
                    <option value="">-- Choose Student --</option>
                    {Array.isArray(students) && students.filter((s:any) => s.role_id === 3).map((s:any) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.roll_number || 'No Roll'}) - {s.academy_class?.name || 'No Class'}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-900">Featured Image (Optional)</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-brand-200/60 border-dashed rounded-xl hover:bg-brand-50/50 transition">
                <div className="space-y-2 text-center">
                  <div className="w-12 h-12 bg-brand-50 text-brand-800 rounded-full flex items-center justify-center mx-auto">
                    <Upload size={24} />
                  </div>
                  <div className="flex text-sm text-gray-600 justify-center">
                    <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-brand-800 hover:text-brand-900 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-brand-800">
                      <span>Upload a file</span>
                      <input id="file-upload" name="file-upload" type="file" accept="image/*" className="sr-only" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                  {imageFile && (
                    <div className="text-sm font-medium text-brand-800 mt-2">
                      Selected: {imageFile.name}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-900">Document Attachment / Schedule File (Optional)</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-brand-200/60 border-dashed rounded-xl hover:bg-brand-50/50 transition">
                <div className="space-y-2 text-center">
                  <div className="w-12 h-12 bg-brand-50 text-brand-800 rounded-full flex items-center justify-center mx-auto">
                    <Upload size={24} />
                  </div>
                  <div className="flex text-sm text-gray-600 justify-center">
                    <label htmlFor="attachment-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-brand-800 hover:text-brand-900 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-brand-800">
                      <span>Upload Document (PDF, DOCX, XLSX, etc.)</span>
                      <input id="attachment-upload" name="attachment-upload" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt,.png,.jpg,.jpeg" className="sr-only" onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)} />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">Attach schedules, routine sheets, or notice documents for students to download (up to 20MB)</p>
                  {attachmentFile && (
                    <div className="text-sm font-medium text-green-700 bg-green-50 py-1 px-3 rounded-lg border border-green-200 inline-block mt-2">
                      Selected Document: {attachmentFile.name}
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
                {loading ? "Saving..." : <><Save size={18} /> Publish Announcement</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
