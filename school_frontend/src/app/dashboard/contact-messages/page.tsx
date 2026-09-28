"use client";

import React, { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { format } from "date-fns";
import { Mail, Phone, User, Calendar, Trash2, MessageSquare, Search } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders() {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };
}

interface ContactMsg {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  message: string;
  created_at: string;
}

export default function ContactMessagesPage() {
  const [messages, setMessages] = useState<ContactMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ContactMsg | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchMessages = useCallback(async () => {
    const storedRole = localStorage.getItem("userRole");
    if (storedRole !== "1") {
      window.location.href = "/dashboard";
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/contact-messages`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error("Failed to fetch contact messages:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API}/contact-messages/${deleteTarget.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setDeleteTarget(null);
        fetchMessages();
      } else {
        alert("Failed to delete message.");
      }
    } catch (err) {
      alert("Error deleting message.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const filtered = messages.filter((m) => {
    const q = searchTerm.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      (m.email && m.email.toLowerCase().includes(q)) ||
      (m.phone && m.phone.toLowerCase().includes(q)) ||
      m.message.toLowerCase().includes(q)
    );
  });

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: "#0f224a" }}>
            Contact Inquiries
          </h1>
          <p className="text-sm mt-1" style={{ color: "#2563eb" }}>
            Messages submitted by visitors through the public Contact Us form.
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search messages..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border rounded-xl outline-none"
            style={{ borderColor: "#bfdbfe" }}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#2563eb", borderTopColor: "transparent" }}></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border shadow-sm" style={{ borderColor: "#bfdbfe" }}>
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: "#2563eb" }} />
          <p className="text-lg font-bold" style={{ color: "#1e3a8a" }}>No Messages Found</p>
          <p className="text-sm text-gray-500 mt-1">There are no contact form inquiries yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((msg) => (
            <div
              key={msg.id}
              className="bg-white rounded-2xl p-5 border shadow-sm flex flex-col justify-between transition-all hover:shadow-md"
              style={{ borderColor: "#bfdbfe" }}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3 pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm" style={{ background: "#2563eb" }}>
                      {msg.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-base leading-snug">{msg.name}</h3>
                      <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                        <Calendar size={12} />
                        {msg.created_at ? format(new Date(msg.created_at), "PPP 'at' p") : "-"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDeleteTarget(msg)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Delete message"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Contact info badges */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {msg.phone && (
                    <a
                      href={`tel:${msg.phone}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200/80 rounded-lg text-xs font-semibold hover:bg-amber-100 transition"
                    >
                      <Phone size={13} /> {msg.phone}
                    </a>
                  )}
                  {msg.email && (
                    <a
                      href={`mailto:${msg.email}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200/80 rounded-lg text-xs font-semibold hover:bg-blue-100 transition"
                    >
                      <Mail size={13} /> {msg.email}
                    </a>
                  )}
                </div>

                {/* Message body */}
                <div className="bg-gray-50/80 border border-gray-100 rounded-xl p-3.5 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {msg.message}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
            onClick={() => setDeleteTarget(null)}
          />
          <div
            className="relative w-full max-w-sm rounded-2xl shadow-2xl p-6 z-10 text-center bg-white"
            style={{ border: "1px solid #fca5a5" }}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(220,38,38,0.1)" }}
            >
              <Trash2 className="w-7 h-7 text-red-600" />
            </div>
            <h3 className="text-lg font-bold mb-2 text-gray-900">Delete Message?</h3>
            <p className="text-sm text-gray-600 mb-5">
              Are you sure you want to delete the message from <strong>&quot;{deleteTarget.name}&quot;</strong>?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleteLoading}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium border text-gray-700 bg-gray-50 border-gray-200 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition active:scale-95 disabled:opacity-50"
              >
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
