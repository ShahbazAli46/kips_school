"use client";

import React, { useEffect, useState } from "react";
import { Megaphone, Calendar, Download, ArrowRight, FileText } from "lucide-react";
import Link from "next/link";

interface Announcement {
  id: number;
  title: string;
  date: string;
  details: string;
  image: string | null;
  attachment: string | null;
  attachment_name: string | null;
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const STORAGE_URL = process.env.NEXT_PUBLIC_STORAGE_URL || "http://localhost:8000/storage";

export default function LatestAnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/website/announcements`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setAnnouncement(data[0]); // Get the latest one
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !announcement) return null;

  return (
    <div className="my-0 w-full p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-brand-900 to-brand-950 text-white shadow-xl border border-brand-800/40 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-xl pointer-events-none"></div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-400 text-brand-950 font-extrabold text-[11px] uppercase tracking-wider shadow-sm">
              <Megaphone size={12} /> Latest Announcement
            </span>
            <span className="text-xs text-white/70 font-semibold flex items-center gap-1">
              <Calendar size={12} /> {announcement.date}
            </span>
          </div>

          <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white leading-snug">
            {announcement.title}
          </h3>

          <p className="text-xs sm:text-sm text-white/80 line-clamp-2 leading-relaxed">
            {announcement.details}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-stretch sm:self-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-white/10">
          {announcement.attachment && (
            <a
              href={`${STORAGE_URL}/${announcement.attachment}`}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition flex items-center gap-1.5 border border-white/20"
            >
              <Download size={14} /> Download File
            </a>
          )}
          <Link
            href="/announcements"
            className="px-4 py-2 rounded-xl bg-white text-brand-950 hover:bg-brand-50 text-xs font-bold transition flex items-center gap-1.5 shadow-md"
          >
            All Notices <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
