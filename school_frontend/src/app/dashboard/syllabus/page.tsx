"use client";

/**
 * Syllabus hub.
 *
 * The full syllabus / date-sheet planner is a standalone static page
 * (public/syllabus.html) that carries its own layout, styles and data.
 * We embed it here so it lives inside the dashboard instead of being a
 * separate destination.
 */
export default function SyllabusPage() {
  return (
    <div className="absolute inset-0">
      <iframe
        src="/syllabus/index.html"
        title="KIPS Syllabus"
        className="h-full w-full border-0"
      />
    </div>
  );
}
