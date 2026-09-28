"use client";

import React, { useEffect, useState, useRef } from "react";
import AudioRecorder from "./AudioRecorder";
import { Send, User } from "lucide-react";
import getEcho from "@/lib/echo";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  message: string | null;
  audio_path: string | null;
  type: "text" | "audio";
  is_read: boolean;
  created_at: string;
}

interface ChatWindowProps {
  currentUserId: number;
  targetUserId: number;
  targetUserName?: string;
  isFloating?: boolean;
}

export default function ChatWindow({ currentUserId, targetUserId, targetUserName, isFloating }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [textInput, setTextInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!targetUserId) return;
    loadMessages();
    markAsRead();

    const echo = getEcho();
    const channel = echo.private(`chat.${currentUserId}`);

    channel.listen('MessageSent', (e: { message: Message }) => {
      // Only append if it's from the person we are currently talking to
      if (e.message.sender_id === targetUserId) {
        setMessages((prev) => [...prev, e.message]);
        markAsRead();
      }
    });

    return () => {
      channel.stopListening('MessageSent');
      echo.leave(`chat.${currentUserId}`);
    };
  }, [targetUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadMessages = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_URL}/messages/${targetUserId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    const token = localStorage.getItem("token");
    fetch(`${API_URL}/messages/read/${targetUserId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  const sendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;

    const formData = new FormData();
    formData.append("receiver_id", targetUserId.toString());
    formData.append("type", "text");
    formData.append("message", textInput);

    await sendMessage(formData);
    setTextInput("");
  };

  const sendAudio = async (blob: Blob) => {
    const formData = new FormData();
    formData.append("receiver_id", targetUserId.toString());
    formData.append("type", "audio");
    formData.append("audio", blob, "audio_message.webm");

    await sendMessage(formData);
  };

  const sendMessage = async (formData: FormData) => {
    setSending(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_URL}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        const newMsg = await res.json();
        setMessages((prev) => [...prev, newMsg]);
      } else {
        const errData = await res.json();
        console.error("Server Error:", errData);
        alert("Failed to send message: " + (errData.message || "Unknown error"));
      }
    } catch (e) {
      console.error(e);
      alert("Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="flex-1 flex items-center justify-center">Loading chat...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      {!isFloating && (
        <div className="p-4 border-b border-gray-100 flex items-center gap-3 bg-gray-50">
          <div className="w-10 h-10 rounded-full bg-[#38bdf8] flex items-center justify-center text-white">
            <User size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">{targetUserName || "Chat"}</h3>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto bg-[#f0f4f8]/30 flex flex-col gap-4">
        {messages.map((msg, idx) => {
          const isMe = msg.sender_id === currentUserId;
          return (
            <div key={idx} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[70%] p-3 rounded-2xl ${
                  isMe
                    ? "bg-[#1d4ed8] text-white rounded-br-sm"
                    : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm"
                }`}
              >
                {msg.type === "text" && <p className="text-sm">{msg.message}</p>}
                {msg.type === "audio" && (
                  <audio
                    controls
                    src={`${API_URL.replace("/api", "")}/storage/${msg.audio_path}`}
                    className="max-w-full h-10"
                  />
                )}
                <span className={`text-[10px] mt-1 block ${isMe ? "text-white/70 text-right" : "text-gray-400"}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <div className="p-3 bg-white border-t border-gray-100 flex items-center gap-2">
        <form onSubmit={sendText} className="flex-1 flex gap-2 items-center">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#38bdf8]"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!textInput.trim() || sending}
            className="p-2 bg-[#1d4ed8] text-white rounded-full hover:bg-[#1e3a8a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={18} />
          </button>
        </form>
        <AudioRecorder onAudioReady={sendAudio} isSending={sending} />
      </div>
    </div>
  );
}
