'use client';

import React from 'react';

interface PageLoaderProps {
  text?: string;
  fullScreen?: boolean;
}

export default function PageLoader({ text = "Loading...", fullScreen = false }: PageLoaderProps) {
  return (
    <div
      className={`w-full flex flex-col items-center justify-center p-6 ${
        fullScreen ? "fixed inset-0 z-50 bg-[#060a12]/90 backdrop-blur-md" : "min-h-[70vh]"
      }`}
    >
      <div className="relative flex flex-col items-center">
        {/* Glowing aura ring */}
        <div className="absolute -inset-4 rounded-3xl bg-blue-500/20 blur-xl animate-pulse" />

        {/* Outer subtle spinning ring */}
        <div className="relative flex items-center justify-center">
          <div className="w-24 h-24 rounded-2xl border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
          
          {/* Centered Logo */}
          <div className="absolute inset-2 bg-white rounded-xl shadow-lg p-2 flex items-center justify-center overflow-hidden">
            <img
              src="/logo.png"
              alt="KIPS School Logo"
              className="w-full h-full object-contain transform animate-pulse"
            />
          </div>
        </div>

        {/* School Name & Optional Status */}
        <div className="mt-5 text-center">
          <h3 className="text-sm font-bold text-slate-800 tracking-wide">
            KIPS School Chunian
          </h3>
          <p className="text-xs font-medium text-blue-600 mt-1 animate-pulse">
            {text}
          </p>
        </div>
      </div>
    </div>
  );
}
