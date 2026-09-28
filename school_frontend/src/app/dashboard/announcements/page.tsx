"use client";

import React, { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";
import { Plus, Edit2, Trash2, Calendar, FileText } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Announcement {
  id: number;
  title: string;
  date: string;
  details: string;
  image: string | null;
  attachment?: string | null;
  attachment_name?: string | null;
  target_type?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const STORAGE_URL = process.env.NEXT_PUBLIC_STORAGE_URL || "http://localhost:8000/storage";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
}

// ─── Delete Modal ──────────────────────────────────────────────────────────────
interface DeleteModalProps {
  announcementTitle: string;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

function DeleteModal({ announcementTitle, onClose, onConfirm, loading }: DeleteModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
          <Trash2 size={32} />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Announcement?</h3>
        <p className="text-gray-500 mb-6 text-sm">
          Are you sure you want to delete "<span className="font-semibold text-gray-800">{announcementTitle}</span>"? This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} disabled={loading} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 py-2.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition">
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/announcements`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch announcements");
      const data = await res.json();
      setAnnouncements(data);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleDelete = async () => {
    if (!selectedAnnouncement) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${API}/announcements/${selectedAnnouncement.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete announcement");
      setAnnouncements((prev) => prev.filter((a) => a.id !== selectedAnnouncement.id));
      setDeleteModalOpen(false);
    } catch (err: any) {
      alert(err.message || "Delete failed");
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteModal = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setDeleteModalOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-brand-200/50">
          <div>
            <h1 className="text-2xl font-bold text-brand-950">Announcements</h1>
            <p className="text-sm text-gray-500 mt-1">Manage public announcements shown in the marquee</p>
          </div>
          <Link href="/dashboard/announcements/new" className="bg-brand-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-brand-800 transition flex items-center gap-2 shadow-sm">
            <Plus size={18} /> Add Announcement
          </Link>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-200">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-brand-200/50 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading announcements...</div>
          ) : announcements.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="text-gray-400" size={32} />
              </div>
              <p>No announcements found.</p>
              <Link href="/dashboard/announcements/new" className="text-brand-800 font-medium hover:underline mt-2 inline-block">Create the first one</Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-brand-50/50 border-b border-brand-200/50 text-brand-900">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Title</th>
                    <th className="px-6 py-4 font-semibold">Target</th>
                    <th className="px-6 py-4 font-semibold">Date</th>
                    <th className="px-6 py-4 font-semibold">Image</th>
                    <th className="px-6 py-4 font-semibold">Document / Schedule</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-200/30">
                  {announcements.map((ann) => (
                    <tr key={ann.id} className="hover:bg-brand-50/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900 truncate max-w-[250px]">{ann.title}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[250px]">{ann.details}</div>
                      </td>
                      <td className="px-6 py-4">
                        {ann.target_type === 'global' && <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Global</span>}
                        {ann.target_type === 'class' && <span className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">Class Specific</span>}
                        {ann.target_type === 'student' && <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Student Specific</span>}
                        {!ann.target_type && <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Global</span>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar size={14} />
                          {ann.date}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {ann.image ? (
                          <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Yes</span>
                        ) : (
                          <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">No</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {ann.attachment ? (
                          <a href={`${STORAGE_URL}/${ann.attachment}`} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold hover:underline inline-block">
                            📄 Download File
                          </a>
                        ) : (
                          <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">None</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/dashboard/announcements/edit?id=${ann.id}`} className="w-8 h-8 flex items-center justify-center rounded-lg bg-brand-50 text-brand-800 hover:bg-brand-100 transition" title="Edit">
                            <Edit2 size={16} />
                          </Link>
                          <button onClick={() => openDeleteModal(ann)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition" title="Delete">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {deleteModalOpen && selectedAnnouncement && (
        <DeleteModal
          announcementTitle={selectedAnnouncement.title}
          onClose={() => setDeleteModalOpen(false)}
          onConfirm={handleDelete}
          loading={isDeleting}
        />
      )}
    </DashboardLayout>
  );
}
