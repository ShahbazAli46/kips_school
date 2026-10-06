"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";

interface CustomDatePickerProps {
  value?: string; // Format: "YYYY-MM-DD"
  onChange?: (date: string) => void;
  placeholder?: string;
  className?: string;
  name?: string;
  startYear?: number;
  endYear?: number;
  disabled?: boolean;
  size?: "sm" | "md" | "default";
  placement?: "auto" | "top" | "bottom";
  align?: "auto" | "left" | "right";
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function CustomDatePicker({
  value,
  onChange,
  placeholder = "Select Date",
  className = "",
  name,
  startYear = 1980,
  endYear = new Date().getFullYear() + 5,
  disabled = false,
  size = "md",
  placement = "auto",
  align = "auto",
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMonthOpen, setIsMonthOpen] = useState(false);
  const [isYearOpen, setIsYearOpen] = useState(false);
  const [resolvedPlacement, setResolvedPlacement] = useState<"top" | "bottom">("bottom");
  const [resolvedAlign, setResolvedAlign] = useState<"left" | "right">("left");

  const containerRef = useRef<HTMLDivElement>(null);
  const monthDropdownRef = useRef<HTMLDivElement>(null);
  const yearDropdownRef = useRef<HTMLDivElement>(null);

  // Parse initial selected date or fallback to current date
  const parsedValue = useMemo(() => {
    if (!value) return null;
    const parts = value.split("-");
    if (parts.length !== 3) return null;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
    return new Date(y, m, d);
  }, [value]);

  // Current view year & month (0-11)
  const [viewYear, setViewYear] = useState<number>(() => {
    return parsedValue ? parsedValue.getFullYear() : new Date().getFullYear();
  });
  const [viewMonth, setViewMonth] = useState<number>(() => {
    return parsedValue ? parsedValue.getMonth() : new Date().getMonth();
  });

  // Sync view when incoming value changes
  useEffect(() => {
    if (parsedValue) {
      setViewYear(parsedValue.getFullYear());
      setViewMonth(parsedValue.getMonth());
    }
  }, [parsedValue]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsMonthOpen(false);
        setIsYearOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close month/year menus when clicking outside them
  useEffect(() => {
    const handleMenuClickOutside = (e: MouseEvent) => {
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(e.target as Node)) {
        setIsMonthOpen(false);
      }
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(e.target as Node)) {
        setIsYearOpen(false);
      }
    };
    if (isMonthOpen || isYearOpen) {
      document.addEventListener("mousedown", handleMenuClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleMenuClickOutside);
    };
  }, [isMonthOpen, isYearOpen]);

  // Dynamic placement & alignment calculation to prevent overflowing viewport
  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      // Vertical placement
      if (placement === "top") {
        setResolvedPlacement("top");
      } else if (placement === "bottom") {
        setResolvedPlacement("bottom");
      } else {
        // "auto" calculation
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const estimatedHeight = 360;

        if (spaceBelow >= estimatedHeight || spaceBelow >= spaceAbove) {
          setResolvedPlacement("bottom");
        } else {
          setResolvedPlacement("top");
        }
      }

      // Horizontal alignment
      if (align === "left") {
        setResolvedAlign("left");
      } else if (align === "right") {
        setResolvedAlign("right");
      } else {
        // "auto" calculation
        const estimatedWidth = 330;
        const spaceRight = window.innerWidth - rect.left;
        if (spaceRight < estimatedWidth && rect.right >= estimatedWidth) {
          setResolvedAlign("right");
        } else {
          setResolvedAlign("left");
        }
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, placement, align]);

  // Year options list
  const yearOptions = useMemo(() => {
    const years: number[] = [];
    const min = Math.min(startYear, viewYear);
    const max = Math.max(endYear, viewYear);
    for (let y = max; y >= min; y--) {
      years.push(y);
    }
    return years;
  }, [startYear, endYear, viewYear]);

  // Navigation
  const handlePrevMonth = () => {
    setIsMonthOpen(false);
    setIsYearOpen(false);
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    setIsMonthOpen(false);
    setIsYearOpen(false);
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  // Build days for the current view month
  const daysInGrid = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 (Sun) to 6 (Sat)
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days: {
      dayNumber: number;
      monthOffset: number; // -1: prev, 0: current, 1: next
      dateString: string;
      isToday: boolean;
      isSelected: boolean;
    }[] = [];

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    // Prev month days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const m = viewMonth === 0 ? 12 : viewMonth;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        dayNumber: d,
        monthOffset: -1,
        dateString: dateStr,
        isToday: dateStr === todayStr,
        isSelected: value === dateStr,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        dayNumber: d,
        monthOffset: 0,
        dateString: dateStr,
        isToday: dateStr === todayStr,
        isSelected: value === dateStr,
      });
    }

    // Next month days to fill 35 or 42 cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const m = viewMonth === 11 ? 1 : viewMonth + 2;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        dayNumber: d,
        monthOffset: 1,
        dateString: dateStr,
        isToday: dateStr === todayStr,
        isSelected: value === dateStr,
      });
    }

    return days;
  }, [viewYear, viewMonth, value]);

  const handleSelectDate = (dateStr: string) => {
    if (onChange) {
      onChange(dateStr);
    }
    setIsOpen(false);
    setIsMonthOpen(false);
    setIsYearOpen(false);
  };

  const handleToday = () => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    if (onChange) {
      onChange(todayStr);
    }
    setIsOpen(false);
    setIsMonthOpen(false);
    setIsYearOpen(false);
  };

  const handleClear = () => {
    if (onChange) {
      onChange("");
    }
    setIsOpen(false);
    setIsMonthOpen(false);
    setIsYearOpen(false);
  };

  // Display text formatted nicely (e.g. "Oct 15, 2026")
  const displayFormattedDate = useMemo(() => {
    if (!parsedValue) return "";
    const m = MONTH_NAMES[parsedValue.getMonth()].slice(0, 3);
    const d = parsedValue.getDate();
    const y = parsedValue.getFullYear();
    return `${m} ${d}, ${y}`;
  }, [parsedValue]);

  const isSm = size === "sm";

  return (
    <div
      className={`relative ${isOpen ? "z-50" : "z-10"} ${className}`}
      ref={containerRef}
      style={{ zIndex: isOpen ? 9999 : undefined }}
    >
      {name && <input type="hidden" name={name} value={value || ""} />}

      {/* Trigger Input Button */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full ${
          isSm ? "h-[32px] px-2.5 text-xs rounded-lg" : "h-[40px] px-3.5 text-sm rounded-xl"
        } border bg-white flex items-center justify-between font-medium transition-all shadow-2xs cursor-pointer ${
          disabled
            ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
            : isOpen
            ? "border-blue-600 ring-2 ring-blue-100 text-slate-800"
            : "border-slate-300 hover:border-slate-400 text-slate-800"
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          {displayFormattedDate ? (
            <span className="font-semibold text-slate-900 truncate">{displayFormattedDate}</span>
          ) : (
            <span className="text-slate-400 truncate">{placeholder}</span>
          )}
        </div>

        <svg
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180 text-blue-600" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Popover Calendar Container */}
      {isOpen && (
        <div
          className={`absolute z-[9999] ${
            resolvedPlacement === "top" ? "bottom-full mb-2" : "top-full mt-2"
          } ${
            resolvedAlign === "right" ? "right-0 left-auto" : "left-0 right-auto"
          } bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 w-[310px] sm:w-[330px] select-none`}
          style={{ boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.16), 0 8px 10px -6px rgba(0, 0, 0, 0.1)" }}
        >
          {/* Header Controls: Prev Button, Custom Month Dropdown, Custom Year Dropdown, Next Button */}
          <div className="flex items-center justify-between gap-1.5 mb-3.5 relative">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-8 h-8 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition active:scale-95 flex items-center justify-center cursor-pointer shadow-2xs shrink-0"
              title="Previous Month"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex items-center gap-1.5 flex-1 justify-center">
              {/* ─── CUSTOM MONTH SELECTOR ─── */}
              <div className="relative" ref={monthDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsMonthOpen(!isMonthOpen);
                    setIsYearOpen(false);
                  }}
                  className={`px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                    isMonthOpen
                      ? "border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-100"
                      : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800"
                  }`}
                >
                  <span className="truncate">{MONTH_NAMES[viewMonth]}</span>
                  <svg
                    className={`w-3 h-3 text-slate-500 transition-transform duration-200 ${
                      isMonthOpen ? "rotate-180 text-blue-600" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isMonthOpen && (
                  <div className="absolute top-full left-0 mt-1.5 w-40 max-h-56 overflow-y-auto bg-white rounded-xl shadow-xl border border-slate-200 p-1 z-[10000] animate-fadeIn">
                    {MONTH_NAMES.map((m, idx) => {
                      const isCurrent = idx === viewMonth;
                      return (
                        <div
                          key={m}
                          onClick={() => {
                            setViewMonth(idx);
                            setIsMonthOpen(false);
                          }}
                          className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold cursor-pointer transition-all flex items-center justify-between ${
                            isCurrent
                              ? "bg-blue-50 text-blue-600 font-bold"
                              : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                          }`}
                        >
                          <span>{m}</span>
                          {isCurrent && <span className="text-blue-600 font-bold">✓</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ─── CUSTOM YEAR SELECTOR ─── */}
              <div className="relative" ref={yearDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsYearOpen(!isYearOpen);
                    setIsMonthOpen(false);
                  }}
                  className={`px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                    isYearOpen
                      ? "border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-100"
                      : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800"
                  }`}
                >
                  <span>{viewYear}</span>
                  <svg
                    className={`w-3 h-3 text-slate-500 transition-transform duration-200 ${
                      isYearOpen ? "rotate-180 text-blue-600" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isYearOpen && (
                  <div className="absolute top-full right-0 mt-1.5 w-28 max-h-56 overflow-y-auto bg-white rounded-xl shadow-xl border border-slate-200 p-1 z-[10000] animate-fadeIn">
                    {yearOptions.map((y) => {
                      const isCurrent = y === viewYear;
                      return (
                        <div
                          key={y}
                          onClick={() => {
                            setViewYear(y);
                            setIsYearOpen(false);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold cursor-pointer transition-all flex items-center justify-between ${
                            isCurrent
                              ? "bg-blue-50 text-blue-600 font-bold"
                              : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                          }`}
                        >
                          <span>{y}</span>
                          {isCurrent && <span className="text-blue-600 font-bold">✓</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="w-8 h-8 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition active:scale-95 flex items-center justify-center cursor-pointer shadow-2xs shrink-0"
              title="Next Month"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {WEEKDAYS.map((wd) => (
              <span key={wd} className="text-xs font-bold text-slate-400 uppercase tracking-wider py-1">
                {wd}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {daysInGrid.map((item, idx) => {
              const isCurrentMonth = item.monthOffset === 0;

              return (
                <button
                  key={`${item.dateString}-${idx}`}
                  type="button"
                  onClick={() => handleSelectDate(item.dateString)}
                  className={`h-9 w-9 mx-auto rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center transition-all cursor-pointer ${
                    item.isSelected
                      ? "bg-blue-600 text-white font-extrabold shadow-sm scale-105"
                      : item.isToday
                      ? "border-2 border-blue-500 text-blue-600 font-bold bg-blue-50/50 hover:bg-blue-100"
                      : isCurrentMonth
                      ? "text-slate-700 hover:bg-slate-100 hover:text-blue-600"
                      : "text-slate-300 hover:bg-slate-50 hover:text-slate-500"
                  }`}
                >
                  {item.dayNumber}
                </button>
              );
            })}
          </div>

          {/* Footer Shortcuts: Today & Clear */}
          <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleToday}
              className="px-3 py-1 rounded-lg text-xs font-bold text-blue-600 hover:bg-blue-50 transition cursor-pointer"
            >
              Today
            </button>

            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-1 rounded-lg text-xs font-bold text-red-500 hover:bg-red-50 transition cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
