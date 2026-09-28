"use client";

import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Calendar, Image as ImageIcon, Trash2, Edit3, Eye, Layers } from "lucide-react";

interface MemoryImage {
  id: number;
  image_path: string;
  caption: string | null;
}

interface Memory {
  id: number;
  title: string;
  description: string | null;
  type: "function" | "trip" | "event" | "other";
  date: string;
  created_at: string;
  images_count?: number;
  images?: MemoryImage[];
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const STORAGE_URL = process.env.NEXT_PUBLIC_STORAGE_URL || "http://localhost:8000/storage";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
}

export default function AdminMemoriesPage() {
  const router = useRouter();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchMemories = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/memories`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch memories");
      const data = await res.json();
      setMemories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this memory and all associated photos?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${API}/memories/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete memory");
      setMemories(prev => prev.filter(m => m.id !== id));
    } catch (err: any) {
      alert(err.message || "Deletion failed");
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = memories.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(search.toLowerCase()) || 
      (m.description && m.description.toLowerCase().includes(search.toLowerCase()));
    const matchesType = selectedType === "all" || m.type === selectedType;
    return matchesSearch && matchesType;
  });

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "function": return "bg-purple-50 text-purple-700 border-purple-200";
      case "trip": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "event": return "bg-blue-50 text-blue-700 border-blue-200";
      default: return "bg-amber-50 text-amber-700 border-amber-200";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-brand-200/60 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-brand-950 flex items-center gap-2">
              <Layers className="text-brand-800" size={26} />
              Academy Memories
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Create and publish photo albums for events, trips, annual functions, and academy moments.
            </p>
          </div>
          <Link
            href="/dashboard/memories/new"
            className="bg-brand-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-brand-800 transition flex items-center gap-2 shadow-md shrink-0"
          >
            <Plus size={18} /> Add New Memory
          </Link>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-brand-200/60 shadow-sm">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search memories by title..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-brand-200/80 bg-brand-50/30 outline-none focus:bg-white focus:ring-2 focus:ring-brand-800/20 focus:border-brand-800 transition"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {["all", "function", "trip", "event", "other"].map(t => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
                  selectedType === t 
                    ? "bg-brand-900 text-white shadow-sm" 
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Memories Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-brand-200/60 shadow-sm">
            <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-800 rounded-full animate-spin mb-3"></div>
            <p className="text-xs font-semibold text-brand-800 uppercase tracking-wide">Loading Memories...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-brand-200/60 shadow-sm p-8">
            <ImageIcon size={48} className="mx-auto text-brand-300 mb-3" />
            <h3 className="text-base font-bold text-gray-800">No Memories Found</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              No academy memories match your search query or filter. Click the button below to add a new memory album.
            </p>
            <Link
              href="/dashboard/memories/new"
              className="mt-4 inline-flex items-center gap-2 bg-brand-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-brand-800 transition"
            >
              <Plus size={16} /> Create Memory
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(memory => {
              const coverImage = memory.images && memory.images.length > 0 
                ? (memory.images[0].image_path.startsWith('http') ? memory.images[0].image_path : `${STORAGE_URL}/${memory.images[0].image_path}`)
                : null;
              const photoCount = memory.images_count ?? memory.images?.length ?? 0;

              return (
                <div 
                  key={memory.id}
                  onClick={() => router.push(`/dashboard/memories/edit?id=${memory.id}`)}
                  className="bg-white rounded-2xl border border-brand-200/70 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between group cursor-pointer hover:border-brand-300"
                >
                  <div>
                    {/* Image Cover Preview */}
                    <div className="relative h-48 bg-gray-100 overflow-hidden">
                      {coverImage ? (
                        <img 
                          src={coverImage} 
                          alt={memory.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-brand-50/50">
                          <ImageIcon size={36} />
                          <span className="text-xs mt-1">No Cover Photo</span>
                        </div>
                      )}

                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border shadow-sm ${getTypeBadgeColor(memory.type)}`}>
                          {memory.type}
                        </span>
                        <span className="bg-black/60 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                          <ImageIcon size={12} /> {photoCount} {photoCount === 1 ? 'Photo' : 'Photos'}
                        </span>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-5 space-y-3">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                        <Calendar size={13} className="text-brand-800" />
                        <span>{memory.date}</span>
                      </div>

                      <h3 className="text-base font-bold text-brand-950 line-clamp-1 group-hover:text-brand-800 transition">
                        {memory.title}
                      </h3>

                      {memory.description && (
                        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                          {memory.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="px-5 py-3.5 border-t border-brand-100 bg-brand-50/30 flex items-center justify-between">
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`/memories/detail?id=${memory.id}`, '_blank');
                      }}
                      className="text-xs font-bold text-gray-600 hover:text-brand-900 flex items-center gap-1 transition cursor-pointer"
                      title="Preview on website"
                    >
                      <Eye size={14} /> Website View
                    </span>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-brand-900 flex items-center gap-1 group-hover:underline">
                        <Edit3 size={14} /> Open &amp; Edit
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(memory.id);
                        }}
                        disabled={deletingId === memory.id}
                        className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                        title="Delete Memory"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
