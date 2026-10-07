"use client";

import React, { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import CustomDropdown from "@/components/CustomDropdown";

// ─── Types ────────────────────────────────────────────────────────────────────
interface User {
  id: number;
  name: string;
  email: string;
  role_id: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

const ROLES: Record<number, string> = {
  1: "Super Admin",
  5: "Accountant",
  6: "Attendance Manager",
  7: "Coordinator",
};

// ─── User Modal ────────────────────────────────────────────────────────────────
interface UserModalProps {
  user: User | null;
  onClose: () => void;
  onSaved: () => void;
}

function UserModal({ user, onClose, onSaved }: UserModalProps) {
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState<number>(user?.role_id || 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || (!user && !password)) {
      setError("Please fill all required fields.");
      return;
    }

    setLoading(true);
    setError("");

    const payload: any = { name, email, role_id: roleId };
    if (password) payload.password = password;

    const method = user ? "PUT" : "POST";
    const url = user ? `${API}/users/${user.id}` : `${API}/users`;

    try {
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to save user");
      }
      onSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl shadow-2xl p-6 z-10" style={{ background: "#fff", border: "1px solid #bfdbfe" }}>
        <h3 className="text-xl font-bold mb-4 text-[#0f224a]">
          {user ? "Edit User" : "Add New User"}
        </h3>
        
        {error && <div className="mb-4 p-3 rounded-lg text-sm bg-red-50 text-red-600 border border-red-200">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-[#1e3a8a]">Full Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition" style={{ borderColor: "#bfdbfe", background: "#f0f4f8" }} placeholder="John Doe" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-[#1e3a8a]">Email *</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition" style={{ borderColor: "#bfdbfe", background: "#f0f4f8" }} placeholder="john@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-[#1e3a8a]">Role *</label>
            <CustomDropdown
              name="roleId"
              value={roleId}
              onChange={(n, v) => setRoleId(Number(v))}
              options={[
                { label: "Super Admin", value: 1 },
                { label: "Accountant", value: 5 },
                { label: "Attendance Manager", value: 6 },
                { label: "Coordinator", value: 7 },
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-[#1e3a8a]">Password {user ? "(Leave blank to keep current)" : "*"}</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required={!user} className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition" style={{ borderColor: "#bfdbfe", background: "#f0f4f8" }} placeholder="••••••••" minLength={6} />
          </div>

          <div className="flex gap-3 pt-4 border-t" style={{ borderColor: "#dbeafe" }}>
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium border transition hover:bg-gray-50" style={{ borderColor: "#bfdbfe", color: "#1e40af" }}>Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition active:scale-95 disabled:opacity-50" style={{ background: "#2563eb" }}>
              {loading ? "Saving..." : "Save User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Modal ──────────────────────────────────────────────────────────────
interface DeleteModalProps {
  userName: string;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

function DeleteModal({ userName, onClose, onConfirm, loading }: DeleteModalProps) {
  const [confirmText, setConfirmText] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl shadow-2xl p-6 z-10 text-center" style={{ background: "#fff", border: "1px solid #fca5a5" }}>
        <h3 className="text-lg font-bold mb-2 text-[#0b1329]">Delete User?</h3>
        <p className="text-sm mb-4 text-[#1e40af]">Are you sure you want to delete <strong>&quot;{userName}&quot;</strong>?</p>
        
        <div className="mb-6 text-left">
          <label className="block text-xs font-medium mb-1.5 text-[#1e3a8a]">Type <strong>{userName}</strong> to confirm:</label>
          <input type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition" style={{ borderColor: "#fca5a5", background: "#fef2f2", color: "#991b1b" }} placeholder={userName} />
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium border transition" style={{ borderColor: "#bfdbfe", color: "#1e40af", background: "#f0f4f8" }}>Cancel</button>
          <button onClick={onConfirm} disabled={loading || confirmText !== userName} className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition active:scale-95 disabled:opacity-50" style={{ background: "#dc2626" }}>{loading ? "Deleting..." : "Delete"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ManageUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/users`, { headers: getAuthHeaders() });
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setModalLoading(true);
    try {
      await fetch(`${API}/users/${deleteTarget.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setModalLoading(false);
    }
  };

  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (ROLES[u.role_id] && ROLES[u.role_id].toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "#0f224a" }}>Manage Administrative Users</h2>
          <p className="text-sm mt-1" style={{ color: "#2563eb" }}>Add and manage Admins, Office Admins, and Attendance Managers</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => { setEditingUser(null); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md transition-all active:scale-95 hover:shadow-lg"
            style={{ background: "linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%)" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add User
          </button>
        </div>
      </div>

      <div className="relative mb-5 max-w-sm">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#38bdf8" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, or role..." className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none transition" style={{ background: "#fff", borderColor: "#bfdbfe", color: "#0f224a" }} />
      </div>

      <div className="rounded-2xl overflow-hidden shadow-sm border" style={{ background: "#fff", borderColor: "#bfdbfe" }}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin w-8 h-8" style={{ color: "#2563eb" }} fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <svg className="w-14 h-14" style={{ color: "#bfdbfe" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            <p className="text-sm font-medium" style={{ color: "#38bdf8" }}>{search ? `No users match "${search}"` : "No users found."}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#f0f4f8", borderBottom: "1px solid #bfdbfe" }}>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Name</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Email</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Role</th>
                  <th className="text-right px-5 py-3.5 font-semibold text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "#dbeafe" }}>
                {filtered.map((user) => (
                  <tr key={user.id} className="transition-colors hover:bg-[#f0f4f8]">
                    <td className="px-5 py-3.5 font-bold" style={{ color: "#0f224a" }}>{user.name}</td>
                    <td className="px-5 py-3.5" style={{ color: "#1e3a8a" }}>{user.email}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: "#bfdbfe", color: "#1e3a8a" }}>
                        {ROLES[user.role_id] || `Role ID: ${user.role_id}`}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => { setEditingUser(user); setIsModalOpen(true); }} className="p-1.5 rounded-lg transition hover:bg-amber-50 text-amber-600 hover:text-amber-700">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button onClick={() => setDeleteTarget(user)} className="p-1.5 rounded-lg transition hover:bg-red-50 text-red-500 hover:text-red-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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

      {isModalOpen && (
        <UserModal 
          user={editingUser} 
          onClose={() => setIsModalOpen(false)} 
          onSaved={() => {
            setIsModalOpen(false);
            fetchData();
          }} 
        />
      )}

      {deleteTarget && <DeleteModal userName={deleteTarget.name} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} loading={modalLoading} />}
    </DashboardLayout>
  );
}
