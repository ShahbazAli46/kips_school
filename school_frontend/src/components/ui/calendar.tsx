"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <div className={cn("p-4 bg-white rounded-2xl", className)}>
      <style dangerouslySetInnerHTML={{__html: `
        .rdp-root {
          --rdp-accent-color: #2563eb;
          --rdp-accent-background-color: #eff6ff;
          --rdp-day-height: 38px;
          --rdp-day-width: 38px;
          --rdp-day_button-height: 36px;
          --rdp-day_button-width: 36px;
          --rdp-day_button-border-radius: 10px;
          --rdp-nav_button-height: 32px;
          --rdp-nav_button-width: 32px;
          --rdp-nav-height: 40px;
          --rdp-dropdown-gap: 8px;
          margin: 0;
          font-family: inherit;
        }
        .rdp-month_caption {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 40px;
          margin-bottom: 8px;
        }
        .rdp-dropdowns {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .rdp-dropdown_root {
          position: relative;
          display: inline-flex;
          align-items: center;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background-color: #f8fafc;
          padding: 4px 8px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .rdp-dropdown_root:hover {
          background-color: #ffffff;
          border-color: #94a3b8;
        }
        .rdp-dropdown_root .rdp-caption_label {
          font-size: 0.8125rem;
          font-weight: 700;
          color: #0f172a;
          margin-right: 4px;
        }
        .rdp-dropdown {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          opacity: 0 !important;
          cursor: pointer;
          z-index: 5;
        }
        .rdp-weekday {
          font-size: 0.75rem;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          padding: 8px 0;
          text-align: center;
        }
        .rdp-month_grid {
          border-collapse: separate;
          border-spacing: 4px;
        }
        .rdp-day {
          text-align: center;
          vertical-align: middle;
        }
        .rdp-day_button {
          font-size: 0.8125rem;
          font-weight: 600;
          color: #1e293b;
          border-radius: 10px;
          transition: all 0.15s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid transparent;
        }
        .rdp-day_button:hover:not([disabled]) {
          background-color: #eff6ff !important;
          color: #2563eb !important;
          border-color: #bfdbfe;
        }
        .rdp-selected .rdp-day_button,
        .rdp-day_selected,
        .rdp-day_selected:focus-visible,
        .rdp-day_selected:hover {
          background-color: #2563eb !important;
          color: #ffffff !important;
          font-weight: 700;
          box-shadow: 0 2px 4px rgba(37, 99, 235, 0.3);
        }
        .rdp-today .rdp-day_button {
          border: 2px solid #93c5fd !important;
          color: #2563eb;
          font-weight: 700;
        }
        .rdp-outside .rdp-day_button {
          opacity: 0.35;
        }
        .rdp-button_next,
        .rdp-button_previous {
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background-color: #ffffff;
          transition: all 0.15s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .rdp-button_next:hover,
        .rdp-button_previous:hover {
          background-color: #f1f5f9;
          border-color: #cbd5e1;
        }
        .rdp-chevron {
          fill: #2563eb;
        }
      `}} />
      <DayPicker
        showOutsideDays={showOutsideDays}
        className="w-full"
        {...props}
      />
    </div>
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
