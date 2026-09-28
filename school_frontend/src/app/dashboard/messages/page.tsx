"use client";

import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import ChatWindow from "@/components/ChatWindow";
import { User as UserIcon } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface User {
  id: number;
  role_id: number;
  name: string;
}

export default function MessagesPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const user = await res.json();
        setCurrentUser(user);
        
        if (user.role_id === 1) {
          // Super admin, fetch conversations
          fetchConversations(token);
        } else if (user.role_id === 4 || user.role_id === 3) {
          // Parent or Student, automatically select admin (assuming admin id is 1, but we should probably fetch the admin user or hardcode ID 1)
          // Based on our db seeder, super admin might be ID 1. Let's hardcode it as requested:
          setSelectedUserId(1);
          setSelectedUserName("Super Admin");
          setLoading(false);
        } else {
          setLoading(false);
        }
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const fetchConversations = async (token: string) => {
    try {
      const res = await fetch(`${API_URL}/messages/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-full">Loading...</div>
      </DashboardLayout>
    );
  }

  if (currentUser?.role_id !== 1 && currentUser?.role_id !== 4 && currentUser?.role_id !== 3) {
    return (
      <DashboardLayout>
        <div className="text-center mt-10 text-gray-500">You do not have permission to view messages.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-140px)] flex gap-4">
        {currentUser.role_id === 1 && (
          <div className="w-1/3 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <h2 className="font-bold text-gray-800">Parents</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-400">No active conversations.</div>
              ) : (
                conversations.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedUserId(c.id);
                      setSelectedUserName(c.name);
                    }}
                    className={`w-full text-left p-4 border-b border-gray-50 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                      selectedUserId === c.id ? "bg-[#f0f4f8]" : ""
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                      <UserIcon size={18} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-800">{c.name}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        <div className="flex-1 h-full">
          {selectedUserId ? (
            <ChatWindow
              currentUserId={currentUser.id}
              targetUserId={selectedUserId}
              targetUserName={selectedUserName}
            />
          ) : (
            <div className="h-full bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center text-gray-400">
              <UserIcon size={48} className="mb-4 opacity-50" />
              <p>Select a parent to start messaging</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
