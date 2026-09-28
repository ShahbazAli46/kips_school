"use client";

import React, { useState, useEffect } from "react";
import { MessageCircle, X, ChevronLeft, User as UserIcon } from "lucide-react";
import ChatWindow from "./ChatWindow";
import getEcho from "@/lib/echo";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface User {
  id: number;
  role_id: number;
  name: string;
  unread_count?: number;
}

export default function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Super Admin states
  const [conversations, setConversations] = useState<User[]>([]);
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);
  const [selectedParentName, setSelectedParentName] = useState<string>("");
  const [parentHasUnread, setParentHasUnread] = useState(false);

  useEffect(() => {
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
            fetchConversations(token);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchUser();
  }, []);

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
    }
  };

  // Listen for incoming messages globally for auto-open and badges
  useEffect(() => {
    if (!currentUser) return;

    const echo = getEcho();
    const channel = echo.private(`chat.${currentUser.id}`);

    channel.listen('MessageSent', (e: any) => {
      if (currentUser.role_id === 1) {
        // Refresh conversations to update unread counts and move sender to top
        const token = localStorage.getItem("token");
        if (token) fetchConversations(token);
      } else {
        // Parent view
        if (!isOpen) {
          setParentHasUnread(true);
        }
      }
    });

    return () => {
      channel.stopListening('MessageSent');
      echo.leave(`chat.${currentUser.id}`);
    };
  }, [currentUser, isOpen]);

  // Clear unread when opening
  useEffect(() => {
    if (isOpen && currentUser && currentUser.role_id !== 1) {
      setParentHasUnread(false);
    }
  }, [isOpen, currentUser]);

  if (!currentUser) return null;

  const isAdmin = currentUser.role_id === 1;
  const totalUnreadAdmin = conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0);
  const totalUnread = isAdmin ? totalUnreadAdmin : (parentHasUnread ? 1 : 0);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div 
          className="mb-4 bg-white shadow-2xl rounded-2xl overflow-hidden flex flex-col"
          style={{ width: "350px", height: "500px", border: "1px solid #e5e7eb" }}
        >
          {isAdmin ? (
            // SUPER ADMIN VIEW
            selectedParentId ? (
              // Specific Parent Chat
              <>
                <div className="bg-[#0b1329] text-white p-3 flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setSelectedParentId(null)}
                      className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <div>
                      <h3 className="font-semibold text-sm">{selectedParentName}</h3>
                      <p className="text-xs text-white/70">Parent</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="flex-1 overflow-hidden relative">
                  <ChatWindow 
                    currentUserId={currentUser.id} 
                    targetUserId={selectedParentId}
                    targetUserName={selectedParentName}
                    isFloating={true}
                  />
                </div>
              </>
            ) : (
              // Conversations List
              <>
                <div className="bg-[#0b1329] text-white p-4 flex justify-between items-center shrink-0">
                  <h3 className="font-semibold text-md">Active Chats</h3>
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto bg-gray-50">
                  {conversations.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm">No active conversations.</div>
                  ) : (
                    conversations.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedParentId(c.id);
                          setSelectedParentName(c.name);
                          // Optimistically clear the unread count locally
                          setConversations(prev => prev.map(conv => conv.id === c.id ? { ...conv, unread_count: 0 } : conv));
                        }}
                        className="w-full text-left p-4 border-b border-gray-100 flex items-center gap-3 hover:bg-gray-100 transition-colors bg-white"
                      >
                        <div className="w-10 h-10 rounded-full bg-[#38bdf8]/20 flex items-center justify-center text-[#38bdf8]">
                          <UserIcon size={18} />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-gray-800">{c.name}</p>
                          <p className="text-xs text-gray-400">
                            {c.unread_count && c.unread_count > 0 ? (
                              <span className="text-red-500 font-semibold">{c.unread_count} unread message(s)</span>
                            ) : (
                              "Tap to view messages"
                            )}
                          </p>
                        </div>
                        {c.unread_count && c.unread_count > 0 && (
                          <div className="ml-auto bg-red-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full">
                            {c.unread_count > 9 ? '9+' : c.unread_count}
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </>
            )
          ) : (
            // PARENT / STUDENT VIEW
            <>
              <div className="bg-[#0b1329] text-white p-3 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="font-semibold text-sm">Kips School Chunian Campus</h3>
                  <p className="text-xs text-white/70">Usually replies instantly</p>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-hidden relative">
                <ChatWindow 
                  currentUserId={currentUser.id} 
                  targetUserId={1} // Super Admin ID
                  targetUserName="Super Admin"
                  isFloating={true}
                />
              </div>
            </>
          )}
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-105 active:scale-95 ${isOpen ? 'bg-[#1d4ed8]' : 'bg-[#38bdf8]'} relative`}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={28} />}
        {!isOpen && totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-white">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </button>
    </div>
  );
}
