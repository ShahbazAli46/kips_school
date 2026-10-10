"use client";

import React, { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import CustomDropdown from "@/components/CustomDropdown";

// ─── Types ────────────────────────────────────────────────────────────────────
interface TestCategory {
  id: number;
  name: string;
  type: string;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// ─── Modal Component ──────────────────────────────────────────────────────────
const CATEGORY_TYPE_OPTIONS = [
  { label: "Class Test", value: "class_test" },
  { label: "School Test", value: "school_test" },
  { label: "R n T", value: "rnt" },
];

const getTypeLabel = (type: string) => {
  const match = CATEGORY_TYPE_OPTIONS.find((opt) => opt.value === type);
  if (match) return match.label;
  if (type === "academy_series") return "Class Test";
  return type || "N/A";
};

interface ModalProps {
  title: string;
  onClose: () => void;
  onSubmit: (data: { name: string; type: string }) => void;
  initialData?: TestCategory;
  loading: boolean;
  error: string;
}

function CategoryModal({ title, onClose, onSubmit, initialData, loading, error }: ModalProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [type, setType] = useState(initialData?.type || "class_test");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl shadow-2xl p-6 bg-white border border-[#bfdbfe] z-10">
        <h2 className="text-lg font-bold text-[#0f224a] mb-4">{title}</h2>
        {error && <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">{error}</div>}
        <form onSubmit={(e) => { e.preventDefault(); onSubmit({ name: name.trim(), type }); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-[#1e3a8a]">Category Type</label>
            <CustomDropdown
              name="type"
              value={type}
              onChange={(name, value) => setType(value as string)}
              options={CATEGORY_TYPE_OPTIONS}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-[#1e3a8a]">Category Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Exam Series" required className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-[#2563eb]" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border">Cancel</button>
            <button type="submit" disabled={loading || !name} className="flex-1 py-2 rounded-lg text-white font-semibold bg-[#2563eb] hover:bg-[#1e3a8a]">{loading ? "Saving..." : "Save"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ManageTestCategoriesPage() {
  const [categories, setCategories] = useState<TestCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<TestCategory | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/test-categories`, { headers: getAuthHeaders() });
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async (data: any) => {
    setModalLoading(true); setModalError("");
    try {
      const res = await fetch(`${API}/test-categories`, { method: "POST", headers: getAuthHeaders(), body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Failed to create");
      fetchData(); setShowCreate(false);
    } catch (err: any) { setModalError(err.message); } finally { setModalLoading(false); }
  };

  const handleUpdate = async (data: any) => {
    if (!editTarget) return;
    setModalLoading(true); setModalError("");
    try {
      const res = await fetch(`${API}/test-categories/${editTarget.id}`, { method: "PUT", headers: getAuthHeaders(), body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Failed to update");
      fetchData(); setEditTarget(null);
    } catch (err: any) { setModalError(err.message); } finally { setModalLoading(false); }
  };

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#0f224a]">Test Categories</h2>
        <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-[#2563eb] text-white rounded-lg font-medium">+ Add Category</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#bfdbfe] overflow-hidden">
        {loading ? <div className="p-10 text-center">Loading...</div> : (
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f0f4f8] text-[#2563eb] border-b border-[#bfdbfe]">
              <tr>
                <th className="px-5 py-3">ID</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Category Name</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dbeafe]">
              {categories.map(c => (
                <tr key={c.id} className="hover:bg-blue-50">
                  <td className="px-5 py-3 text-gray-500">{c.id}</td>
                  <td className="px-5 py-3 font-semibold text-[#2563eb]">
                    {getTypeLabel(c.type)}
                  </td>
                  <td className="px-5 py-3 font-bold text-[#1e3a8a]">{c.name}</td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => setEditTarget(c)} className="text-[#2563eb] text-xs font-bold px-2 py-1 hover:bg-[#bfdbfe] rounded">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && <CategoryModal title="Add Category" onClose={() => setShowCreate(false)} onSubmit={handleCreate} loading={modalLoading} error={modalError} />}
      {editTarget && <CategoryModal title="Edit Category" initialData={editTarget} onClose={() => setEditTarget(null)} onSubmit={handleUpdate} loading={modalLoading} error={modalError} />}
    </DashboardLayout>
  );
}
