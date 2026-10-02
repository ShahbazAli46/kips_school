"use client";

import React, { useEffect, useRef } from "react";
import "quill/dist/quill.snow.css";

interface QuillEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export default function QuillEditor({
  value,
  onChange,
  placeholder = "Write voucher instructions and guidelines here...",
  minHeight = "160px",
}: QuillEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const quillInstanceRef = useRef<any>(null);
  const isUpdatingRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    let isMounted = true;

    async function initQuill() {
      const QuillModule = await import("quill");
      const Quill = QuillModule.default;

      if (!isMounted || !containerRef.current) return;

      // Clean up existing container children if re-initializing
      containerRef.current.innerHTML = "";
      const editorElement = document.createElement("div");
      containerRef.current.appendChild(editorElement);

      const toolbarOptions = [
        [{ header: [1, 2, 3, false] }],
        ["bold", "italic", "underline", "strike"],
        [{ color: [] }, { background: [] }],
        [{ list: "ordered" }, { list: "bullet" }],
        [{ align: [] }],
        ["link", "clean"],
      ];

      const quill = new Quill(editorElement, {
        theme: "snow",
        placeholder,
        modules: {
          toolbar: toolbarOptions,
        },
      });

      quillInstanceRef.current = quill;

      // Initial value
      if (value) {
        quill.clipboard.dangerouslyPasteHTML(value);
      }

      // Text change listener
      quill.on("text-change", () => {
        if (isUpdatingRef.current) return;
        const html = quill.root.innerHTML;
        // If empty quill root produces `<p><br></p>`, treat as empty string
        const cleanHtml = html === "<p><br></p>" ? "" : html;
        onChange(cleanHtml);
      });
    }

    initQuill();

    return () => {
      isMounted = false;
      quillInstanceRef.current = null;
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, []); // Run once on mount

  // Sync external value updates without infinite loops
  useEffect(() => {
    if (!quillInstanceRef.current) return;
    const currentHtml = quillInstanceRef.current.root.innerHTML;
    const normalizedProp = value || "";
    const normalizedCurrent = currentHtml === "<p><br></p>" ? "" : currentHtml;

    if (normalizedProp !== normalizedCurrent) {
      isUpdatingRef.current = true;
      const selection = quillInstanceRef.current.getSelection();
      quillInstanceRef.current.clipboard.dangerouslyPasteHTML(normalizedProp);
      if (selection) {
        quillInstanceRef.current.setSelection(selection);
      }
      isUpdatingRef.current = false;
    }
  }, [value]);

  const insertVariable = (tag: string) => {
    if (!quillInstanceRef.current) return;
    const quill = quillInstanceRef.current;
    const range = quill.getSelection(true);
    const index = range ? range.index : quill.getLength();
    quill.insertText(index, tag, "bold", true);
    quill.setSelection(index + tag.length, 0);
    const html = quill.root.innerHTML;
    onChange(html === "<p><br></p>" ? "" : html);
  };

  return (
    <div className="flex flex-col space-y-2">
      {/* Variable Tags Quick Insert Bar */}
      <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs">
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
          <span>⚡</span> Insert Tag:
        </span>
        <button
          type="button"
          onClick={() => insertVariable("{consumer_no}")}
          className="px-2 py-0.5 rounded bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 font-mono text-[11px] font-semibold transition cursor-pointer"
          title="Inserts student's 1Bill Consumer Number"
        >
          {`{consumer_no}`}
        </button>
        <button
          type="button"
          onClick={() => insertVariable("{challan_no}")}
          className="px-2 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200 font-mono text-[11px] font-semibold transition cursor-pointer"
          title="Inserts official Challan/Voucher Number"
        >
          {`{challan_no}`}
        </button>
        <button
          type="button"
          onClick={() => insertVariable("{due_date}")}
          className="px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 font-mono text-[11px] font-semibold transition cursor-pointer"
          title="Inserts voucher Due Date"
        >
          {`{due_date}`}
        </button>
        <button
          type="button"
          onClick={() => insertVariable("{month_name}")}
          className="px-2 py-0.5 rounded bg-purple-100 hover:bg-purple-200 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200 font-mono text-[11px] font-semibold transition cursor-pointer"
          title="Inserts billing month name"
        >
          {`{month_name}`}
        </button>
      </div>

      {/* Quill Editor Container */}
      <div
        ref={containerRef}
        className="quill-editor-wrapper bg-white dark:bg-slate-900 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 shadow-xs text-slate-800 dark:text-slate-100"
        style={{ minHeight }}
      />

      <style jsx global>{`
        .quill-editor-wrapper .ql-toolbar {
          border: none !important;
          border-bottom: 1px solid #e2e8f0 !important;
          background: #f8fafc;
          border-top-left-radius: 0.5rem;
          border-top-right-radius: 0.5rem;
        }
        .dark .quill-editor-wrapper .ql-toolbar {
          background: #1e293b;
          border-bottom-color: #334155 !important;
        }
        .quill-editor-wrapper .ql-container {
          border: none !important;
          font-family: inherit;
          font-size: 0.875rem;
          min-height: ${minHeight};
        }
        .quill-editor-wrapper .ql-editor {
          min-height: ${minHeight};
          padding: 0.75rem 1rem;
        }
        .quill-editor-wrapper .ql-editor p {
          margin-bottom: 0.35rem;
        }
        .quill-editor-wrapper .ql-editor ul,
        .quill-editor-wrapper .ql-editor ol {
          padding-left: 1.25rem;
          margin-bottom: 0.35rem;
        }
        .dark .quill-editor-wrapper .ql-stroke {
          stroke: #94a3b8 !important;
        }
        .dark .quill-editor-wrapper .ql-fill {
          fill: #94a3b8 !important;
        }
        .dark .quill-editor-wrapper .ql-picker {
          color: #94a3b8 !important;
        }
        .dark .quill-editor-wrapper .ql-picker-options {
          background-color: #1e293b !important;
          border-color: #334155 !important;
        }
      `}</style>
    </div>
  );
}
