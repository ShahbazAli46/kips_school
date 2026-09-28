"use client";

import React, { useEffect, useState } from "react";
import { Megaphone, Calendar, AlertCircle } from "lucide-react";

interface Announcement {
  id: number;
  title: string;
  date: string;
  details: string;
  target_type: string;
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export default function ParentMarquee({ studentId }: { studentId: number | string }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    if (!studentId) return;
    
    fetch(`${API}/parent/student/${studentId}/announcements`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAnnouncements(data);
        }
      })
      .catch((err) => console.error("Error fetching personalized announcements:", err));
  }, [studentId]);

  if (announcements.length === 0) return null;

  return (
    <div className="block bg-[#0f224a] text-white overflow-hidden relative group py-2 rounded-xl mb-6 shadow-inner">
      <div className="px-6 md:px-8 relative z-10 flex items-center">
        <div className="flex items-center gap-2 pr-4 font-bold uppercase tracking-widest text-xs border-r border-white/20 whitespace-nowrap bg-[#0f224a] z-20">
          <Megaphone size={16} className="text-[#bfdbfe]" />
          <span>Notice Board</span>
        </div>
        
        <div className="flex-1 overflow-hidden ml-4 relative">
          <div className="flex whitespace-nowrap animate-[marquee_25s_linear_infinite] group-hover:[animation-play-state:paused]">
            {/* Double the content for seamless infinite scroll */}
            {[...announcements, ...announcements].map((ann, idx) => (
              <div key={`${ann.id}-${idx}`} className="inline-flex items-center mx-8 gap-3">
                {ann.target_type !== 'global' && (
                  <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 font-bold uppercase tracking-wider">
                    <AlertCircle size={10} /> Private
                  </span>
                )}
                <span className="text-sm font-semibold">{ann.title}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#2563eb] opacity-50 mx-1"></span>
                <div className="flex items-center gap-1.5 text-xs text-gray-300">
                  <Calendar size={12} />
                  {ann.date}
                </div>
                <span className="w-1.5 h-1.5 rounded-full bg-[#2563eb] opacity-50 mx-1"></span>
                <span className="text-sm opacity-90 font-light truncate max-w-[200px] md:max-w-[400px]">
                  {ann.details}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
