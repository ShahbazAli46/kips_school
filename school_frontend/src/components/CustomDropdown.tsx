import React, { useState, useRef, useEffect } from "react";

export default function CustomDropdown({
  options,
  value,
  onChange,
  placeholder = "Select...",
  name,
  className = "",
  size = "md",
}: {
  options: { label: string; value: string | number }[];
  value: string | number;
  onChange: (name: string, value: string | number) => void;
  placeholder?: string;
  name: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => String(o.value) === String(value));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isSmall = size === "sm";

  return (
    <div
      className={`relative ${isOpen ? "z-50" : "z-10"} ${className}`}
      ref={dropdownRef}
      style={{ zIndex: isOpen ? 9999 : undefined }}
    >
      <div
        className={`w-full ${
          isSmall ? "h-[30px] px-2.5 py-1 text-xs rounded-md" : "h-[38px] px-3.5 py-2 text-xs rounded-lg"
        } border outline-none transition-all cursor-pointer font-semibold flex items-center justify-between shadow-2xs hover:border-slate-400`}
        style={{
          borderColor: isOpen ? "#2563eb" : "#cbd5e1",
          background: "#fff",
          color: value && value !== "" && value !== "all" ? "#0f172a" : "#64748b",
          boxShadow: isOpen ? "0 0 0 2px rgba(37, 99, 235, 0.2)" : "none",
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate pr-1.5 font-semibold">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180" : ""}`}
          style={{ color: "#2563eb" }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isOpen && (
        <div
          className="absolute z-[9999] min-w-full w-max max-w-[320px] left-0 mt-1.5 bg-white rounded-xl shadow-2xl border overflow-hidden"
          style={{
            borderColor: "#bfdbfe",
            maxHeight: "260px",
            overflowY: "auto",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.18), 0 8px 10px -6px rgba(0, 0, 0, 0.12)",
          }}
        >
          <div className={isSmall ? "p-1 space-y-0.5" : "p-1.5 space-y-0.5"}>
            {options.map((option) => (
              <div
                key={option.value}
                className={`${
                  isSmall ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm"
                } rounded-lg font-medium cursor-pointer transition-all truncate flex items-center ${
                  String(value) === String(option.value)
                    ? "bg-[#dbeafe] text-[#2563eb] font-bold"
                    : "text-[#434655] hover:bg-[#f0f4f8] hover:text-[#0f224a]"
                }`}
                onClick={() => {
                  onChange(name, option.value);
                  setIsOpen(false);
                }}
              >
                {String(value) === String(option.value) && (
                  <span className="mr-1.5 font-bold text-[#2563eb]">✓</span>
                )}
                {option.label}
              </div>
            ))}
            {options.length === 0 && (
              <div className="px-4 py-3 text-xs text-[#38bdf8] text-center italic font-medium">
                No options available
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

