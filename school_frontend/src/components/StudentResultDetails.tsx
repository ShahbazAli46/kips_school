"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export default function StudentResultDetails({
  details,
  individualTests,
  categoryName,
}: {
  details: any[];
  individualTests: any[];
  categoryName: string;
}) {
  const [selectedTestTitle, setSelectedTestTitle] = useState<string>("all");

  // Reset test title filter when category changes
  useEffect(() => {
    setSelectedTestTitle("all");
  }, [categoryName]);

  // Custom colors for bars
  const colors = ["#2563eb", "#38bdf8", "#d97706", "#1e3a8a", "#c2410c", "#b45309", "#78350f"];

  // Unique test titles for the graph filter
  const testTitles = Array.from(new Set(individualTests.map((t) => t.test_title)));

  // Compute chart data based on selected test title
  const chartData = selectedTestTitle === "all"
    ? details
    : individualTests
        .filter((t) => t.test_title === selectedTestTitle)
        .map((t) => ({
          subject_name: t.subject_name,
          total_obtained: t.is_absent ? 0 : parseFloat(t.obtained_marks || 0),
          total_max: parseFloat(t.total_marks || 0),
          percentage: parseFloat(t.total_marks || 0) > 0 ? Number((((t.is_absent ? 0 : parseFloat(t.obtained_marks || 0)) / parseFloat(t.total_marks || 0)) * 100).toFixed(2)) : 0
        }));

  if (details.length === 0) {
    return (
      <div className="text-center py-10 bg-white rounded-xl border border-[#bfdbfe] mt-6">
        <p className="text-gray-500 font-medium">No results found for this category.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#bfdbfe] p-6 mt-6">
      <h3 className="text-lg font-black text-[#1e3a8a] mb-6 flex items-center gap-2">
        <svg className="w-5 h-5 text-[#2563eb]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        {categoryName || "Performance Analytics"}
      </h3>
      
      {testTitles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setSelectedTestTitle("all")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              selectedTestTitle === "all"
                ? "bg-[#2563eb] text-white shadow-md"
                : "bg-[#f0f4f8] text-[#2563eb] border border-[#bfdbfe] hover:bg-blue-100"
            }`}
          >
            Overall (Aggregate)
          </button>
          {testTitles.map((title: any) => (
            <button
              key={title}
              onClick={() => setSelectedTestTitle(title)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                selectedTestTitle === title
                  ? "bg-[#2563eb] text-white shadow-md"
                  : "bg-[#f0f4f8] text-[#2563eb] border border-[#bfdbfe] hover:bg-blue-100"
              }`}
            >
              {title}
            </button>
          ))}
        </div>
      )}

      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="subject_name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 600 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} domain={[0, 100]} />
            <Tooltip 
              cursor={{ fill: '#f0f4f8' }} 
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-3 rounded-xl border border-[#bfdbfe] shadow-md">
                      <p className="font-bold text-[#1e3a8a] mb-1 text-base">{label}</p>
                      <p className="text-sm font-bold text-[#2563eb]">Percentage: {data.percentage}%</p>
                      <p className="text-xs font-bold text-gray-500 mt-1 uppercase tracking-wider">Marks: {data.total_obtained} / {data.total_max}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="percentage" radius={[6, 6, 0, 0]} animationDuration={1500}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
