import React, { useRef } from "react";

interface NumberInputProps {
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  name?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  allowDecimal?: boolean;
  prefix?: string;
  suffix?: string;
  className?: string;
  inputClassName?: string;
  size?: "xs" | "sm" | "md";
  align?: "left" | "center" | "right";
}

export default function NumberInput({
  value,
  onChange,
  placeholder = "0",
  label,
  name,
  disabled = false,
  min,
  max,
  allowDecimal = true,
  prefix,
  suffix,
  className = "",
  inputClassName = "",
  size = "md",
  align = "left",
}: NumberInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowed = [
      "Backspace", "Delete", "Tab", "Escape", "Enter",
      "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
      "Home", "End",
    ];
    if ((e.ctrlKey || e.metaKey) && ["a", "c", "v", "x", "z"].includes(e.key.toLowerCase())) return;
    if (allowed.includes(e.key)) return;
    if (allowDecimal && e.key === ".") {
      if (String(value).includes(".")) e.preventDefault();
      return;
    }
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;
    if (allowDecimal) {
      raw = raw.replace(/[^0-9.]/g, "");
      const parts = raw.split(".");
      if (parts.length > 2) raw = parts[0] + "." + parts.slice(1).join("");
    } else {
      raw = raw.replace(/[^0-9]/g, "");
    }
    if (raw !== "" && raw !== ".") {
      const num = parseFloat(raw);
      if (min !== undefined && num < min) raw = String(min);
      if (max !== undefined && num > max) raw = String(max);
    }
    onChange(raw);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text");
    const cleaned = allowDecimal
      ? pasted.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1")
      : pasted.replace(/[^0-9]/g, "");
    if (cleaned) onChange(String(value) + cleaned);
  };

  const isXs = size === "xs";
  const isSm = size === "sm";

  const paddingClass = isXs
    ? "px-1 py-0.5 text-xs font-bold"
    : isSm
    ? "px-2 py-1 text-xs font-medium"
    : "px-3.5 py-2 text-sm font-medium";

  const heightClass = isXs ? "h-[28px]" : isSm ? "h-[32px]" : "h-[40px]";
  const roundedClass = isXs ? "rounded-md" : isSm ? "rounded-lg" : "rounded-xl";
  const alignClass = align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label
          className="block text-[11px] font-semibold text-slate-700 mb-0.5"
          htmlFor={name}
        >
          {label}
        </label>
      )}
      <div
        className={`flex items-center w-full ${heightClass} ${roundedClass} border transition-all shadow-2xs hover:border-slate-400 focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-100`}
        style={{
          borderColor: disabled ? "#e2e8f0" : "#cbd5e1",
          background: disabled ? "#f8fafc" : "#fff",
        }}
        onClick={() => inputRef.current?.focus()}
      >
        {prefix && (
          <span className="pl-2 pr-0.5 font-bold text-[11px] shrink-0 select-none text-blue-600">
            {prefix}
          </span>
        )}
        <input
          ref={inputRef}
          id={name}
          name={name}
          type="text"
          inputMode="decimal"
          value={value ?? ""}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className={`flex-1 bg-transparent outline-none disabled:cursor-not-allowed ${paddingClass} ${alignClass} ${inputClassName}`}
          style={{
            color: disabled ? "#94a3b8" : "#0f172a",
            caretColor: "#2563eb",
            paddingLeft: prefix ? "2px" : undefined,
            paddingRight: suffix ? "2px" : undefined,
          }}
        />
        {suffix && (
          <span className="pr-2 pl-0.5 font-semibold text-[11px] shrink-0 select-none text-slate-400">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

