"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import CustomDropdown from "@/components/CustomDropdown";
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  AlertCircle, 
  AlertTriangle, 
  X, 
  Check, 
  Layers, 
  FileText 
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface TestCategory {
  id: number;
  name: string;
  type: string;
  short_name?: string;
  created_at: string;
  tests_count?: number;
  test_series_count?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

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

const getTypeBadgeStyle = (type: string) => {
  switch (type) {
    case "school_test":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "rnt":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "class_test":
    default:
      return "bg-blue-50 text-[#1e3a8a] border-[#bfdbfe]";
  }
};

// ─── Add/Edit Modal Component ──────────────────────────────────────────────────
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
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity" 
        onClick={onClose} 
      />
      <div className="relative w-full max-w-md rounded-2xl shadow-2xl p-6 bg-white border border-[#bfdbfe] z-10 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#0f224a]">{title}</h2>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form 
          onSubmit={(e) => { 
            e.preventDefault(); 
            if (name.trim()) onSubmit({ name: name.trim(), type }); 
          }} 
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-semibold mb-1 text-[#1e3a8a]">Category Type</label>
            <CustomDropdown
              name="type"
              value={type}
              onChange={(_, value) => setType(value as string)}
              options={CATEGORY_TYPE_OPTIONS}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1 text-[#1e3a8a]">Category Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g. Round 1, First Term, Pre-Board" 
              required 
              autoFocus
              className="w-full px-4 py-2.5 border border-[#bfdbfe] bg-[#f0f4f8] rounded-xl text-sm text-[#0f224a] focus:outline-none focus:ring-2 focus:ring-[#2563eb] transition" 
            />
          </div>

          <div className="flex gap-3 pt-3">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading || !name.trim()} 
              className="flex-1 py-2.5 rounded-xl text-white font-semibold text-sm bg-gradient-to-r from-[#2563eb] to-[#1e3a8a] hover:opacity-95 disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Category"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirmation Modal ────────────────────────────────────────────────
interface DeleteModalProps {
  category: TestCategory;
  onClose: () => void;
  onConfirm: (force: boolean) => void;
  loading: boolean;
  error?: string;
}

function DeleteModal({ category, onClose, onConfirm, loading, error }: DeleteModalProps) {
  const hasLinkedTests = (category.tests_count ?? 0) > 0 || (category.test_series_count ?? 0) > 0;
  const [confirmedForce, setConfirmedForce] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-xs" 
        onClick={onClose} 
      />
      <div className="relative w-full max-w-md rounded-2xl shadow-2xl p-6 bg-white border border-rose-200 z-10 animate-in fade-in zoom-in-95 duration-150">
        <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4 text-rose-600">
          <Trash2 className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-bold text-gray-900 text-center mb-1">
          Delete Test Category?
        </h3>

        <p className="text-sm text-gray-600 text-center mb-4">
          Are you sure you want to delete <strong className="text-gray-900">&quot;{category.name}&quot;</strong>?
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {hasLinkedTests && (
          <div className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
            <div className="flex items-start gap-2 font-semibold text-amber-950">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>Warning: Active Tests Linked</span>
            </div>
            <p>
              This category has <strong className="font-bold">{category.tests_count ?? 0} test(s)</strong>
              {Boolean(category.test_series_count) && ` and ${category.test_series_count} test series`} recorded under it.
              Deleting it will permanently remove these tests and all entered student marks.
            </p>
            <label className="flex items-start gap-2 pt-1 font-medium cursor-pointer text-amber-950">
              <input 
                type="checkbox"
                checked={confirmedForce}
                onChange={(e) => setConfirmedForce(e.target.checked)}
                className="mt-0.5 rounded border-amber-400 text-rose-600 focus:ring-rose-500 cursor-pointer"
              />
              <span>I understand that all linked tests and marks will be permanently deleted.</span>
            </label>
          </div>
        )}

        <div className="flex gap-3 mt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(hasLinkedTests ? confirmedForce : false)}
            disabled={loading || (hasLinkedTests && !confirmedForce)}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Category"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ManageTestCategoriesPage() {
  const [categories, setCategories] = useState<TestCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");

  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<TestCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TestCategory | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/test-categories`, { headers: getAuthHeaders() });
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Create ───────────────────────────────────────────────
  const handleCreate = async (data: { name: string; type: string }) => {
    setModalLoading(true);
    setModalError("");
    try {
      const res = await fetch(`${API}/test-categories`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.message || "Failed to create category");
      fetchData();
      setShowCreate(false);
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  // ── Update ───────────────────────────────────────────────
  const handleUpdate = async (data: { name: string; type: string }) => {
    if (!editTarget) return;
    setModalLoading(true);
    setModalError("");
    try {
      const res = await fetch(`${API}/test-categories/${editTarget.id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.message || "Failed to update category");
      fetchData();
      setEditTarget(null);
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────
  const handleDelete = async (force: boolean) => {
    if (!deleteTarget) return;
    setModalLoading(true);
    setDeleteError("");
    try {
      const url = `${API}/test-categories/${deleteTarget.id}${force ? "?force=1" : ""}`;
      const res = await fetch(url, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const resData = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(resData?.message || "Failed to delete test category");
      }

      setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: any) {
      setDeleteError(err.message || "An error occurred while deleting.");
    } finally {
      setModalLoading(false);
    }
  };

  // ── Filtered Categories ───────────────────────────────────
  const filtered = useMemo(() => {
    return categories.filter((c) => {
      const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
      const matchesType = selectedType === "all" || c.type === selectedType;
      return matchesSearch && matchesType;
    });
  }, [categories, search, selectedType]);

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#0f224a] flex items-center gap-2">
            <Layers className="w-6 h-6 text-[#2563eb]" />
            Test Categories
          </h2>
          <p className="text-sm mt-1 text-[#2563eb]">
            Manage test classifications (Class Tests, School Tests, R n T)
          </p>
        </div>
        <button
          onClick={() => {
            setModalError("");
            setShowCreate(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md transition-all active:scale-95 hover:shadow-lg shrink-0 cursor-pointer bg-gradient-to-r from-[#2563eb] to-[#1e3a8a]"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      {/* Toolbar: Search and Type Pills */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5">
        {/* Search */}
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories..."
            className="w-full pl-10 pr-4 py-2 border border-[#bfdbfe] bg-white rounded-xl text-sm text-[#0f224a] focus:outline-none focus:ring-2 focus:ring-[#2563eb] transition"
          />
        </div>

        {/* Type Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-white border border-[#bfdbfe] rounded-xl self-start sm:self-auto overflow-x-auto">
          <button
            onClick={() => setSelectedType("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              selectedType === "all"
                ? "bg-[#2563eb] text-white shadow-xs"
                : "text-gray-600 hover:text-[#0f224a] hover:bg-gray-100"
            }`}
          >
            All ({categories.length})
          </button>
          {CATEGORY_TYPE_OPTIONS.map((opt) => {
            const count = categories.filter((c) => c.type === opt.value).length;
            return (
              <button
                key={opt.value}
                onClick={() => setSelectedType(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                  selectedType === opt.value
                    ? "bg-[#2563eb] text-white shadow-xs"
                    : "text-gray-600 hover:text-[#0f224a] hover:bg-gray-100"
                }`}
              >
                {opt.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Table Card */}
      <div className="rounded-2xl overflow-hidden shadow-sm border border-[#bfdbfe] bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="w-8 h-8 border-3 border-[#2563eb]/30 border-t-[#2563eb] rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Layers className="w-12 h-12 text-[#bfdbfe]" />
            <p className="text-sm font-medium text-gray-500">
              {search || selectedType !== "all"
                ? "No categories match your filters"
                : "No test categories yet. Create your first one!"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f0f4f8] text-[#2563eb] border-b border-[#bfdbfe]">
                <tr>
                  <th className="px-5 py-3.5 font-semibold text-xs uppercase tracking-wide">ID</th>
                  <th className="px-5 py-3.5 font-semibold text-xs uppercase tracking-wide">Category Name</th>
                  <th className="px-5 py-3.5 font-semibold text-xs uppercase tracking-wide">Type</th>
                  <th className="px-5 py-3.5 font-semibold text-xs uppercase tracking-wide">Linked Tests</th>
                  <th className="px-5 py-3.5 font-semibold text-xs uppercase tracking-wide text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dbeafe]">
                {filtered.map((cat) => {
                  const testsCount = cat.tests_count ?? 0;
                  return (
                    <tr 
                      key={cat.id} 
                      className="hover:bg-[#f8fafc] transition-colors"
                    >
                      <td className="px-5 py-3.5 text-gray-400 font-mono text-xs">
                        #{cat.id}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-[#0f224a]">
                        {cat.name}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold border ${getTypeBadgeStyle(
                            cat.type
                          )}`}
                        >
                          {getTypeLabel(cat.type)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span 
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${
                            testsCount > 0 
                              ? "bg-blue-50 text-[#1e3a8a] border border-blue-200" 
                              : "bg-gray-100 text-gray-500 border border-gray-200"
                          }`}
                        >
                          <FileText className="w-3.5 h-3.5 opacity-70" />
                          {testsCount} {testsCount === 1 ? "Test" : "Tests"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Edit */}
                          <button
                            onClick={() => {
                              setModalError("");
                              setEditTarget(cat);
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all active:scale-95 bg-white border-[#bfdbfe] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            Edit
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => {
                              setDeleteError("");
                              setDeleteTarget(cat);
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all active:scale-95 border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        {!loading && categories.length > 0 && (
          <div className="px-5 py-3 flex items-center justify-between text-xs border-t border-[#dbeafe] bg-[#f0f4f8] text-gray-500">
            <span>
              Showing {filtered.length} of {categories.length} categories
            </span>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <CategoryModal
          title="Add New Category"
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
          loading={modalLoading}
          error={modalError}
        />
      )}

      {/* Edit Modal */}
      {editTarget && (
        <CategoryModal
          title={`Edit Category — ${editTarget.name}`}
          initialData={editTarget}
          onClose={() => setEditTarget(null)}
          onSubmit={handleUpdate}
          loading={modalLoading}
          error={modalError}
        />
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <DeleteModal
          category={deleteTarget}
          onClose={() => {
            setDeleteTarget(null);
            setDeleteError("");
          }}
          onConfirm={handleDelete}
          loading={modalLoading}
          error={deleteError}
        />
      )}
    </DashboardLayout>
  );
}
