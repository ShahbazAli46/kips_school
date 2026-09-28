"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Crown,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Zap,
  Clock,
  UserX,
  Target,
  Scale,
  Activity,
  Phone,
  MessageCircle,
  ExternalLink,
  ChevronRight,
  Sparkles,
  LineChart,
  BarChart2,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { useSendAttentionSeekerWhatsAppAlertMutation } from "@/store/apiSlice";

export interface StudentAttentionData {
  id: number;
  name: string;
  father_name: string;
  roll_number: number | string;
  image: string | null;
  contact_number: string | null;
  emergency_contact: string | null;
  class_id?: number | string | null;
  section_id?: number | string | null;
  test_category_id?: number | string | null;
  class_name: string;
  section_name: string;
  major_name: string;
  avg_percentage: number;
  grade: string;
  tests_taken: number;
  tests_absent: number;
  total_tests: number;
  trend_delta: number;
  weakest_subject: { name: string; percentage: number } | null;
  strongest_subject: { name: string; percentage: number } | null;
  attendance_rate: number | null;
  categories: string[];
  diagnostic_note: string;
  recent_tests?: {
    test_title: string;
    subject_name: string;
    obtained_marks: number;
    total_marks: number;
    percentage: number;
    is_absent: boolean;
    date: string;
  }[];
}

const CATEGORY_CONFIG: Record<
  string,
  {
    label: string;
    badgeBg: string;
    badgeText: string;
    borderColor: string;
    icon: any;
    cardBg: string;
  }
> = {
  top_performers: {
    label: "Top Performer",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-900 border-amber-300",
    borderColor: "border-amber-300",
    icon: Crown,
    cardBg: "from-amber-50/40 via-white to-white",
  },
  average: {
    label: "Average",
    badgeBg: "bg-blue-100",
    badgeText: "text-blue-900 border-blue-300",
    borderColor: "border-blue-300",
    icon: Activity,
    cardBg: "from-blue-50/30 via-white to-white",
  },
  attention_seeker: {
    label: "Attention Seeker",
    badgeBg: "bg-rose-100",
    badgeText: "text-rose-900 border-rose-300",
    borderColor: "border-rose-300",
    icon: AlertTriangle,
    cardBg: "from-rose-50/40 via-white to-white",
  },
  at_risk: {
    label: "Attention Seeker",
    badgeBg: "bg-rose-100",
    badgeText: "text-rose-900 border-rose-300",
    borderColor: "border-rose-300",
    icon: AlertTriangle,
    cardBg: "from-rose-50/40 via-white to-white",
  },
  borderline: {
    label: "Borderline",
    badgeBg: "bg-blue-100",
    badgeText: "text-orange-900 border-blue-300",
    borderColor: "border-blue-300",
    icon: Target,
    cardBg: "from-orange-50/30 via-white to-white",
  },
  declining: {
    label: "Declining Score",
    badgeBg: "bg-red-100",
    badgeText: "text-red-900 border-red-300",
    borderColor: "border-red-300",
    icon: TrendingDown,
    cardBg: "from-red-50/40 via-white to-white",
  },
  rising_stars: {
    label: "Rising Star",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-900 border-emerald-300",
    borderColor: "border-emerald-300",
    icon: TrendingUp,
    cardBg: "from-emerald-50/40 via-white to-white",
  },
  single_subject_laggards: {
    label: "Subject Imbalance",
    badgeBg: "bg-purple-100",
    badgeText: "text-purple-900 border-purple-300",
    borderColor: "border-purple-300",
    icon: Scale,
    cardBg: "from-purple-50/30 via-white to-white",
  },
  frequent_absentees: {
    label: "Missing Tests",
    badgeBg: "bg-yellow-100",
    badgeText: "text-yellow-900 border-yellow-300",
    borderColor: "border-yellow-300",
    icon: UserX,
    cardBg: "from-yellow-50/40 via-white to-white",
  },
  centum_aces: {
    label: "Single-Test Ace",
    badgeBg: "bg-teal-100",
    badgeText: "text-teal-900 border-teal-300",
    borderColor: "border-teal-300",
    icon: Zap,
    cardBg: "from-teal-50/30 via-white to-white",
  },
  stagnant: {
    label: "Stagnant",
    badgeBg: "bg-slate-100",
    badgeText: "text-slate-800 border-slate-300",
    borderColor: "border-slate-300",
    icon: Activity,
    cardBg: "from-slate-50/30 via-white to-white",
  },
  double_trouble: {
    label: "Double Trouble",
    badgeBg: "bg-rose-200",
    badgeText: "text-rose-950 border-rose-400 font-bold",
    borderColor: "border-rose-400",
    icon: AlertTriangle,
    cardBg: "from-rose-100/60 via-white to-white",
  },
};

export default function StudentAttentionCard({
  student,
  activeCategory,
  sessionId,
}: {
  student: StudentAttentionData;
  activeCategory: string;
  sessionId: string | number;
}) {
  const [sendAlert, { isLoading: isSendingWhatsApp }] = useSendAttentionSeekerWhatsAppAlertMutation();
  const [sendState, setSendState] = useState<"idle" | "sent" | "error">("idle");
  const [feedbackMsg, setFeedbackMsg] = useState<string>("");
  const [graphMode, setGraphMode] = useState<"graph" | "chips">("graph");
  const [hoveredPointIdx, setHoveredPointIdx] = useState<number | null>(null);

  // Determine primary category badge to display
  const primaryCategory =
    activeCategory !== "all" && student.categories.includes(activeCategory)
      ? activeCategory
      : student.categories[0] || "top_performers";

  const config = CATEGORY_CONFIG[primaryCategory] || CATEGORY_CONFIG.top_performers;
  const CategoryIcon = config.icon;

  // Grade color helper
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "A+":
      case "A":
        return "text-emerald-700 bg-emerald-50 border-emerald-200";
      case "B":
        return "text-blue-700 bg-blue-50 border-blue-200";
      case "C":
        return "text-amber-700 bg-amber-50 border-amber-200";
      case "D":
      case "F":
      default:
        return "text-rose-700 bg-rose-50 border-rose-200";
    }
  };

  // SVG Gauge calculations
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (Math.min(100, Math.max(0, student.avg_percentage)) / 100) * circumference;

  // Theme stroke color for the animated graph
  const strokeColor =
    student.avg_percentage >= 80
      ? "#2563eb"
      : student.avg_percentage >= 60
      ? "#0284c7"
      : student.avg_percentage >= 50
      ? "#d97706"
      : "#dc2626";

  // Sparkline points and bezier curve calculations
  const testsForGraph = student.recent_tests || [];
  const svgWidth = 280;
  const svgHeight = 110;
  const padX = 20;
  const padY = 16;

  const points = testsForGraph.map((t, idx) => {
    const x =
      testsForGraph.length > 1
        ? padX + (idx / (testsForGraph.length - 1)) * (svgWidth - 2 * padX)
        : svgWidth / 2;
    const pct = Math.min(100, Math.max(0, t.is_absent ? 0 : t.percentage));
    const y = svgHeight - padY - (pct / 100) * (svgHeight - 2 * padY);
    return { ...t, x, y, pct };
  });

  let linePath = "";
  if (points.length === 1) {
    linePath = `M ${points[0].x - 20} ${points[0].y} L ${points[0].x + 20} ${points[0].y}`;
  } else if (points.length > 1) {
    linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const midX = (p0.x + p1.x) / 2;
      linePath += ` C ${midX} ${p0.y}, ${midX} ${p1.y}, ${p1.x} ${p1.y}`;
    }
  }

  const areaPath =
    points.length > 1
      ? `${linePath} L ${points[points.length - 1].x} ${svgHeight - padY} L ${points[0].x} ${svgHeight - padY} Z`
      : "";

  const passY = svgHeight - padY - 0.5 * (svgHeight - 2 * padY);
  const honorY = svgHeight - padY - 0.8 * (svgHeight - 2 * padY);

  const handleSendWhatsAppAlert = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isSendingWhatsApp) return;

    try {
      const res = await sendAlert({
        studentId: student.id,
        phone: student.contact_number || student.emergency_contact || undefined,
        avg_percentage: student.avg_percentage,
        grade: student.grade,
        diagnostic_note: student.diagnostic_note,
        tests_taken: student.tests_taken,
        total_tests: student.total_tests,
        weakest_subject: student.weakest_subject?.name,
      }).unwrap();

      if (res.success) {
        setSendState("sent");
        setFeedbackMsg(res.message || "Alert delivered!");
        setTimeout(() => {
          setSendState("idle");
          setFeedbackMsg("");
        }, 3500);
      } else {
        setSendState("error");
        setFeedbackMsg(res.message || "Failed to send");
        setTimeout(() => {
          setSendState("idle");
          setFeedbackMsg("");
        }, 4000);
      }
    } catch (err: any) {
      setSendState("error");
      setFeedbackMsg(err?.data?.message || err?.message || "Delivery failed");
      setTimeout(() => {
        setSendState("idle");
        setFeedbackMsg("");
      }, 4000);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      whileHover={{ y: -3, transition: { duration: 0.18 } }}
      className={`rounded-2xl border bg-gradient-to-b ${config.cardBg} p-5 shadow-xs hover:shadow-md transition-all relative flex flex-col justify-between`}
      style={{ borderColor: "#bfdbfe" }}
    >
      <div>
        {/* Top bar: Roll Number, Class/Section, and Category Badge */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span
              className="px-2.5 py-0.5 rounded-md text-[11px] font-bold tracking-wider uppercase shrink-0"
              style={{ background: "#1e3a8a", color: "#fff" }}
            >
              Roll #{student.roll_number || "—"}
            </span>
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-md border shrink-0"
              style={{
                background: "#f0f4f8",
                color: "#1d4ed8",
                borderColor: "#bfdbfe",
              }}
            >
              {student.class_name} • {student.section_name}
            </span>
          </div>

          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${config.badgeBg} ${config.badgeText}`}
          >
            <CategoryIcon className="w-3 h-3" />
            {config.label}
          </span>
        </div>

        {/* Student Profile Info & Score Gauge */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar */}
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-base shrink-0 shadow-inner uppercase overflow-hidden"
              style={{
                background:
                  student.image
                    ? "transparent"
                    : "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
              }}
            >
              {student.image ? (
                <img
                  src={student.image}
                  alt={student.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                student.name ? student.name[0] : "?"
              )}
            </div>

            {/* Name & Father */}
            <div className="min-w-0">
              <h4
                className="font-bold text-base truncate leading-tight"
                style={{ color: "#0f224a" }}
                title={student.name}
              >
                {student.name}
              </h4>
              <p
                className="text-xs truncate mt-0.5"
                style={{ color: "#2563eb" }}
              >
                S/D of {student.father_name || "—"}
              </p>
              <span className="text-[11px] text-gray-500 font-medium">
                {student.major_name || "General"}
              </span>
            </div>
          </div>

          {/* Circular Score Gauge */}
          <div className="relative w-[68px] h-[68px] shrink-0 flex items-center justify-center">
            <svg className="w-[68px] h-[68px] -rotate-90" viewBox="0 0 68 68">
              {/* Background ring */}
              <circle
                cx="34"
                cy="34"
                r={radius}
                className="text-gray-100"
                strokeWidth="5"
                stroke="currentColor"
                fill="transparent"
              />
              {/* Progress ring */}
              <circle
                cx="34"
                cy="34"
                r={radius}
                className="transition-all duration-700 ease-out"
                strokeWidth="5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                stroke={
                  student.avg_percentage >= 80
                    ? "#2563eb"
                    : student.avg_percentage >= 60
                    ? "#0284c7"
                    : student.avg_percentage >= 50
                    ? "#d97706"
                    : "#dc2626"
                }
                fill="transparent"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[13px] font-black tracking-tight leading-none text-[#0f224a]">
                {student.avg_percentage}%
              </span>
              <span
                className={`text-[10px] font-extrabold uppercase px-1.5 py-[1px] rounded mt-1 border leading-none ${getGradeColor(
                  student.grade
                )}`}
              >
                {student.grade}
              </span>
            </div>
          </div>
        </div>

        {/* Diagnostic Highlight Note */}
        <div
          className="p-2.5 rounded-xl border text-xs leading-snug mb-3 flex items-start gap-2"
          style={{
            background: "#f0f4f8",
            borderColor: "#bfdbfe",
            color: "#1e3a8a",
          }}
        >
          <Sparkles className="w-3.5 h-3.5 text-[#2563eb] shrink-0 mt-0.5" />
          <p className="line-clamp-2">{student.diagnostic_note}</p>
        </div>

        {/* Metrics Grid: Trajectory, Weakest, Strongest, Absents */}
        <div className="grid grid-cols-2 gap-2 mb-3 text-[11px]">
          {/* Trajectory / Delta */}
          <div className="bg-white/80 p-2 rounded-lg border border-[#bfdbfe]/60 flex items-center justify-between">
            <span className="text-gray-500 font-medium">Trend:</span>
            <span
              className={`font-bold flex items-center gap-0.5 ${
                student.trend_delta > 0
                  ? "text-emerald-700"
                  : student.trend_delta < 0
                  ? "text-rose-700"
                  : "text-gray-600"
              }`}
            >
              {student.trend_delta > 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : student.trend_delta < 0 ? (
                <TrendingDown className="w-3 h-3" />
              ) : null}
              {student.trend_delta > 0
                ? `+${student.trend_delta}%`
                : student.trend_delta < 0
                ? `${student.trend_delta}%`
                : "Stable"}
            </span>
          </div>

          {/* Test Attendance */}
          <div className="bg-white/80 p-2 rounded-lg border border-[#bfdbfe]/60 flex items-center justify-between">
            <span className="text-gray-500 font-medium">Tests:</span>
            <span className="font-bold text-[#0f224a]">
              {student.tests_taken}/{student.total_tests} taken
              {student.tests_absent > 0 && (
                <span className="text-rose-600 font-semibold ml-1">
                  ({student.tests_absent} abs)
                </span>
              )}
            </span>
          </div>

          {/* Weakest Subject */}
          {student.weakest_subject && (
            <div className="bg-white/80 p-2 rounded-lg border border-[#bfdbfe]/60 flex items-center justify-between col-span-2">
              <span className="text-gray-500 font-medium truncate mr-2">
                Weakest: <strong className="text-rose-900">{student.weakest_subject.name}</strong>
              </span>
              <span className="font-bold text-rose-700 shrink-0">
                {student.weakest_subject.percentage}%
              </span>
            </div>
          )}

          {/* Strongest Subject */}
          {student.strongest_subject && student.strongest_subject.percentage >= 70 && (
            <div className="bg-white/80 p-2 rounded-lg border border-[#bfdbfe]/60 flex items-center justify-between col-span-2">
              <span className="text-gray-500 font-medium truncate mr-2">
                Strongest: <strong className="text-blue-900">{student.strongest_subject.name}</strong>
              </span>
              <span className="font-bold text-blue-700 shrink-0">
                {student.strongest_subject.percentage}%
              </span>
            </div>
          )}
        </div>

        {/* Animated Performance Graph / Recent Tests */}
        {student.recent_tests && student.recent_tests.length > 0 ? (
          <div className="mb-4 pt-2 border-t border-[#bfdbfe]/70">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <LineChart className="w-3.5 h-3.5 text-[#2563eb]" />
                <span className="text-[10px] font-bold text-[#1e3a8a] uppercase tracking-wider">
                  Performance Progression
                </span>
              </div>

              {/* View Mode Switcher */}
              <div className="inline-flex rounded-md border p-0.5 bg-white/80" style={{ borderColor: "#bfdbfe" }}>
                <button
                  type="button"
                  onClick={() => setGraphMode("graph")}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition ${
                    graphMode === "graph"
                      ? "bg-[#1e3a8a] text-white shadow-xs"
                      : "text-gray-500 hover:text-[#1e3a8a]"
                  }`}
                  title="Animated Trend Graph"
                >
                  Graph
                </button>
                <button
                  type="button"
                  onClick={() => setGraphMode("chips")}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition ${
                    graphMode === "chips"
                      ? "bg-[#1e3a8a] text-white shadow-xs"
                      : "text-gray-500 hover:text-[#1e3a8a]"
                  }`}
                  title="Test Chips"
                >
                  Chips
                </button>
              </div>
            </div>

            {graphMode === "graph" ? (
              <motion.div
                whileHover={{ y: -2 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="relative bg-gradient-to-b from-white to-[#f0f4f8]/60 rounded-xl p-3 border border-[#bfdbfe]/90 shadow-xs hover:shadow-sm transition-all"
              >
                {/* SVG Curve Canvas - Taller with Floating Breathing Animations */}
                <div className="relative h-32 w-full overflow-visible">
                  <svg
                    className="w-full h-full overflow-visible"
                    viewBox="0 0 280 110"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient
                        id={`gradient-${student.id}`}
                        x1="0%"
                        y1="0%"
                        x2="0%"
                        y2="100%"
                      >
                        <stop offset="0%" stopColor={strokeColor} stopOpacity="0.45" />
                        <stop offset="60%" stopColor={strokeColor} stopOpacity="0.15" />
                        <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Dotted 80% Honor Mark line */}
                    <line
                      x1="12"
                      y1={honorY}
                      x2="268"
                      y2={honorY}
                      stroke="#93c5fd"
                      strokeWidth="0.8"
                      strokeDasharray="2 2"
                    />
                    <text
                      x="266"
                      y={honorY - 2.5}
                      fill="#2563eb"
                      fontSize="6.5"
                      fontWeight="bold"
                      textAnchor="end"
                    >
                      80% HONOR
                    </text>

                    {/* Dotted Passing Mark line (50%) */}
                    <line
                      x1="12"
                      y1={passY}
                      x2="268"
                      y2={passY}
                      stroke="#e5e7eb"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                    <text
                      x="266"
                      y={passY - 2.5}
                      fill="#9ca3af"
                      fontSize="6.5"
                      fontWeight="bold"
                      textAnchor="end"
                    >
                      50% PASS
                    </text>

                    {/* Area under curve - graceful fade-in + continuous floating wave */}
                    {areaPath && (
                      <motion.path
                        d={areaPath}
                        fill={`url(#gradient-${student.id})`}
                        initial={{ opacity: 0 }}
                        animate={{
                          opacity: [0, 1, 1],
                          y: [0, 0, -2, 0],
                        }}
                        transition={{
                          opacity: { duration: 1.5, delay: 0.5, ease: "easeOut" },
                          y: {
                            duration: 3.8,
                            repeat: Infinity,
                            repeatType: "reverse",
                            ease: "easeInOut",
                            delay: 2.2,
                          },
                        }}
                      />
                    )}

                    {/* Animated Bezier Line Path - Cinematic shoot + continuous floating wave */}
                    {linePath && (
                      <motion.path
                        d={linePath}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth="3.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ pathLength: 0 }}
                        animate={{
                          pathLength: 1,
                          y: [0, 0, -2.5, 0],
                        }}
                        transition={{
                          pathLength: {
                            duration: 2.2,
                            ease: [0.25, 0.1, 0.25, 1.0],
                          },
                          y: {
                            duration: 3.8,
                            repeat: Infinity,
                            repeatType: "reverse",
                            ease: "easeInOut",
                            delay: 2.2,
                          },
                        }}
                      />
                    )}

                    {/* Data Points - Sequentially springing as line shoots past, then gentle floating bob */}
                    {points.map((pt, idx) => {
                      const isHovered = hoveredPointIdx === idx;
                      const isLatest = idx === points.length - 1;
                      const popDelay = points.length > 1 ? (idx / (points.length - 1)) * 1.85 : 0.4;

                      return (
                        <motion.g
                          key={idx}
                          className="cursor-pointer"
                          animate={{
                            y: [0, idx % 2 === 0 ? -2 : -3.5, 0],
                          }}
                          transition={{
                            duration: 3 + (idx % 3) * 0.4,
                            repeat: Infinity,
                            repeatType: "reverse",
                            ease: "easeInOut",
                            delay: 2.2 + idx * 0.2,
                          }}
                          onMouseEnter={() => setHoveredPointIdx(idx)}
                          onMouseLeave={() => setHoveredPointIdx(null)}
                          onClick={() => setHoveredPointIdx(hoveredPointIdx === idx ? null : idx)}
                        >
                          {/* Invisible larger hover trigger */}
                          <circle cx={pt.x} cy={pt.y} r="12" fill="transparent" />

                          {/* Outer pulse ring for latest point - continuous floating breathe */}
                          {isLatest && (
                            <motion.circle
                              cx={pt.x}
                              cy={pt.y}
                              r="7.5"
                              fill={strokeColor}
                              animate={{
                                scale: [1, 1.45, 1],
                                opacity: [0.15, 0.45, 0.15],
                              }}
                              transition={{
                                duration: 2.2,
                                repeat: Infinity,
                                ease: "easeInOut",
                              }}
                            />
                          )}

                          {/* Node Circle */}
                          <motion.circle
                            cx={pt.x}
                            cy={pt.y}
                            r={isHovered ? 6 : 4.5}
                            fill={pt.is_absent ? "#dc2626" : isHovered ? "#0f224a" : strokeColor}
                            stroke="#ffffff"
                            strokeWidth="2"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{
                              delay: popDelay,
                              type: "spring",
                              stiffness: 350,
                              damping: 18,
                            }}
                          />

                          {pt.is_absent && (
                            <text
                              x={pt.x}
                              y={pt.y - 7}
                              fill="#dc2626"
                              fontSize="8"
                              fontWeight="black"
                              textAnchor="middle"
                            >
                              ABS
                            </text>
                          )}
                        </motion.g>
                      );
                    })}
                  </svg>

                  {/* Floating Interactive Tooltip */}
                  {hoveredPointIdx !== null && points[hoveredPointIdx] && (
                    <motion.div
                      initial={{ opacity: 0, y: 4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className="absolute -top-3 z-30 bg-[#0f224a] text-white px-2 py-1 rounded-md text-[10px] shadow-lg pointer-events-none -translate-x-1/2 whitespace-nowrap border border-white/20"
                      style={{
                        left: `${(points[hoveredPointIdx].x / svgWidth) * 100}%`,
                      }}
                    >
                      <p className="font-bold leading-tight">
                        {points[hoveredPointIdx].subject_name}
                      </p>
                      <p className="text-[#bfdbfe] text-[9px]">
                        {points[hoveredPointIdx].is_absent
                          ? "Absent in exam"
                          : `${points[hoveredPointIdx].obtained_marks} / ${points[hoveredPointIdx].total_marks} (${points[hoveredPointIdx].percentage}%)`}
                      </p>
                    </motion.div>
                  )}
                </div>

                {/* Bottom X-Axis Subject Labels */}
                <div className="flex justify-between items-center text-[9px] text-gray-500 font-semibold pt-1 px-1 border-t border-gray-100">
                  {points.map((pt, idx) => (
                    <span
                      key={idx}
                      className={`truncate max-w-[45px] text-center transition-colors cursor-pointer ${
                        hoveredPointIdx === idx
                          ? "text-[#1e3a8a] font-black"
                          : pt.is_absent
                          ? "text-rose-600 font-bold"
                          : "text-gray-400"
                      }`}
                      onMouseEnter={() => setHoveredPointIdx(idx)}
                      onMouseLeave={() => setHoveredPointIdx(null)}
                      title={`${pt.test_title}: ${pt.subject_name} (${pt.percentage}%)`}
                    >
                      {pt.subject_name.slice(0, 5)}
                    </span>
                  ))}
                </div>
              </motion.div>
            ) : (
              /* Chips View */
              <div className="flex gap-1.5 flex-wrap">
                {student.recent_tests.map((rt, idx) => (
                  <div
                    key={idx}
                    className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border flex items-center gap-1 ${
                      rt.is_absent
                        ? "bg-rose-50 text-rose-800 border-rose-200"
                        : rt.percentage >= 80
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : rt.percentage >= 50
                        ? "bg-amber-50 text-amber-800 border-amber-200"
                        : "bg-red-50 text-red-800 border-red-200"
                    }`}
                    title={`${rt.test_title}: ${rt.subject_name} (${rt.date})`}
                  >
                    <span className="truncate max-w-[70px]">{rt.subject_name}</span>
                    <span className="font-bold">
                      {rt.is_absent ? "ABS" : `${rt.percentage}%`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Action Buttons Footer */}
      <div className="flex items-center gap-2 pt-3 border-t border-[#bfdbfe]/80">
        <Link
          href={`/dashboard/results/student-detail?id=${student.id}&session=${sessionId}&class=${student.class_id || ''}&category=${student.test_category_id || 1}`}
          className="flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold border transition text-center flex items-center justify-center gap-1.5 hover:shadow-xs active:scale-95"
          style={{
            background: "#fff",
            color: "#1e3a8a",
            borderColor: "#bfdbfe",
          }}
        >
          <span>Result Details</span>
          <ExternalLink className="w-3 h-3 text-[#2563eb]" />
        </Link>

        {student.contact_number && (
          <button
            onClick={handleSendWhatsAppAlert}
            disabled={isSendingWhatsApp}
            className={`py-1.5 px-3 rounded-lg text-xs font-bold text-white transition-all duration-200 flex items-center gap-1.5 shadow-xs active:scale-95 shrink-0 ${
              sendState === "sent"
                ? "bg-emerald-700 hover:bg-emerald-800"
                : sendState === "error"
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
            style={{
              background:
                sendState === "sent"
                  ? "#047857"
                  : sendState === "error"
                  ? "#dc2626"
                  : "#059669",
            }}
            title={
              feedbackMsg ||
              (sendState === "sent"
                ? "Alert Delivered via WhatsApp!"
                : sendState === "error"
                ? "Failed to deliver WhatsApp message"
                : "Send Academic Alert via WhatsApp")
            }
          >
            {isSendingWhatsApp ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                <span>Sending...</span>
              </>
            ) : sendState === "sent" ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                <span>Sent!</span>
              </>
            ) : sendState === "error" ? (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-white" />
                <span>Failed</span>
              </>
            ) : (
              <>
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Alert</span>
              </>
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
}
