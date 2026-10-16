"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ExcelResultCard from "@/components/ExcelResultCard";
import RnTResultCard from "@/components/RnTResultCard";
import PageLoader from "@/components/PageLoader";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function resolveCategoryTypeName(
  typeParam: string | null,
  categoryId: string | null,
  paramCategoryName: string | null
) {
  let resolvedType = typeParam || "";
  let resolvedName = "";
  if (paramCategoryName && !/^\d+$/.test(paramCategoryName)) {
    resolvedName = paramCategoryName;
  }
  return { resolvedType, resolvedName };
}

function isRnTCategory(
  resolvedType: string,
  categoryId: string | null,
  resolvedName: string
): boolean {
  return (
    resolvedType === "rnt" ||
    categoryId === "rnt" ||
    resolvedName?.toLowerCase().includes("r n t") ||
    resolvedName?.toLowerCase().includes("r&t") ||
    resolvedName?.toLowerCase().includes("rnt") ||
    resolvedName?.toLowerCase().includes("revision")
  );
}

function ResultsPrintCardsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sessionId = searchParams.get("session");
  const classId = searchParams.get("class");
  const categoryId = searchParams.get("category");
  const typeParam = searchParams.get("type");
  const sectionId = searchParams.get("section");
  const sessionName = searchParams.get("session_name") || "";
  const className = searchParams.get("class_name") || "";
  const roundsParam = searchParams.get("rounds");
  const paramCategoryName = searchParams.get("category_name");

  const { resolvedType, resolvedName } = resolveCategoryTypeName(
    typeParam,
    categoryId,
    paramCategoryName
  );

  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvedCategoryType, setResolvedCategoryType] = useState<string>(
    resolvedType
  );
  const [resolvedCategoryName, setResolvedCategoryName] = useState<string>(
    resolvedName
  );

  // Derive selected rounds from roundsParam
  const selectedRounds: string[] = React.useMemo(() => {
    if (!roundsParam || roundsParam === "none") return [];
    return roundsParam.split(",").map((r) => r.trim()).filter(Boolean);
  }, [roundsParam]);

  useEffect(() => {
    if (!sessionId || !classId || !categoryId) return;

    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        let url = `${API}/results/series?academic_session_id=${sessionId}&academy_class_id=${classId}&test_category_id=${categoryId}`;
        if (sectionId && sectionId !== "all") {
          url += `&section_id=${sectionId}`;
        }
        if (roundsParam) {
          url += `&rounds=${encodeURIComponent(roundsParam)}`;
        }

        // Resolve category type/name from test-categories endpoint
        try {
          const catsRes = await fetch(`${API}/test-categories`, {
            headers: getAuthHeaders(),
          });
          if (catsRes.ok) {
            const cats = await catsRes.json();
            const matchingCat = cats.find(
              (c: any) =>
                String(c.id) === String(categoryId) || c.type === categoryId
            );
            if (matchingCat) {
              setResolvedCategoryName(matchingCat.name);
              setResolvedCategoryType(matchingCat.type);
            }
          }
        } catch (err) {
          console.warn("Could not resolve category", err);
        }

        const res = await fetch(url, { headers: getAuthHeaders() });
        if (!res.ok) {
          throw new Error(`Failed to fetch results: ${res.status}`);
        }
        const seriesData: any[] = await res.json();

        if (cancelled) return;

        // Fetch detailed data (subjects, tests, rounds) for each student
        const detailedStudents = await Promise.allSettled(
          seriesData.map(async (std: any) => {
            const roundsQuery = roundsParam
              ? `&rounds=${encodeURIComponent(roundsParam)}`
              : "";
            const detailsRes = await fetch(
              `${API}/results/series/student/${std.student_id}?academic_session_id=${sessionId}&academy_class_id=${classId}&test_category_id=${categoryId}${roundsQuery}&_t=${Date.now()}`,
              { headers: getAuthHeaders() }
            );
            if (detailsRes.ok) {
              const detailsData = await detailsRes.json();
              const baseStudent = detailsData.student || std;
              return {
                ...std,
                ...baseStudent,
                class_incharge:
                  baseStudent?.class_incharge ||
                  std?.class_incharge ||
                  "",
                teacher_signature:
                  baseStudent?.teacher_signature || std?.teacher_signature || "",
                rank: std?.rank,
                total_obtained: std?.total_obtained,
                total_max: std?.total_max,
                percentage: std?.percentage,
                subjects: detailsData.subjects || [],
                tests: detailsData.tests || [],
                rounds: detailsData.rounds || [],
              };
            }
            return std;
          })
        );

        if (cancelled) return;

        const merged = detailedStudents.map((result, idx) =>
          result.status === "fulfilled"
            ? result.value
            : seriesData[idx] // fallback to series data without detailed subjects/tests
        );

        setStudents(merged);
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || "Failed to load result cards.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          // Auto-open print dialog so user can Save as PDF
          setTimeout(() => window.print(), 800);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [
    sessionId,
    classId,
    categoryId,
    typeParam,
    sectionId,
    sessionName,
    className,
    roundsParam,
    paramCategoryName,
  ]);

  if (loading) {
    return (
      <div className="p-10 text-center font-medium">
        <PageLoader text="Preparing class result cards..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 text-center text-red-600 font-bold">
        {error}
        <br />
        <br />
        <button
          onClick={() => router.back()}
          className="mt-4 px-4 py-2 bg-[#2563eb] text-white rounded-lg hover:bg-[#1e40af]"
        >
          Back to Results
        </button>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="p-10 text-center text-gray-500 font-bold">
        No students found for this class.
        <br />
        <br />
        <button
          onClick={() => router.back()}
          className="mt-4 px-4 py-2 bg-[#2563eb] text-white rounded-lg hover:bg-[#1e40af]"
        >
          Back to Results
        </button>
      </div>
    );
  }

  const isRnT = isRnTCategory(
    resolvedCategoryType,
    categoryId,
    resolvedCategoryName
  );

  const effectiveSelectedRounds =
    selectedRounds.length > 0
      ? selectedRounds
      : undefined;

  const effectiveRoundsParam =
    roundsParam && roundsParam !== "none" ? roundsParam : undefined;

  return (
    <div className="min-h-screen bg-white print:p-0 p-8 font-sans">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page { size: A4 landscape; margin: 18mm 14mm 18mm 14mm; }
              body { background-color: white !important; margin: 0 !important; padding: 0 !important; }
              .no-print { display: none !important; }
              .student-card-page { break-after: page; }
              .student-card-page:last-child { break-after: auto; }
              * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; print-color-adjust: exact !important; }
              html, body { width: 100%; height: 100%; overflow: visible; }
            }
            @page { size: A4 landscape; margin: 18mm 14mm 18mm 14mm; }
          `,
        }}
      />

      {/* On-screen toolbar (hidden during print) */}
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {students.length} Student Card{students.length !== 1 ? "s" : ""} ready •{" "}
          </span>
          <span className="text-xs font-bold text-[#2563eb]">{className}</span>{" "}
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            • {sessionName}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
          >
            Back to Results
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-[#2563eb] hover:bg-[#1e40af] rounded-lg shadow-sm transition-colors active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Download as PDF (Ctrl + P)
          </button>
        </div>
      </div>

      {students.map((student, idx) => (
        <div
          key={student.student_id}
          className="student-card-page max-w-5xl mx-auto mb-8 print:mb-0"
        >
          {isRnT ? (
            <RnTResultCard
              student={student}
              subjects={student.subjects || []}
              tests={student.tests || []}
              rounds={student.rounds || []}
              categoryTitle={
                resolvedCategoryName ||
                (typeParam === "rnt" ? "R n T" : "Revision & Test")
              }
              sessionTitle={
                sessionName ||
                student.session_name ||
                "Session 2026-27"
              }
              showChart={false}
              selectedRounds={effectiveSelectedRounds}
            />
          ) : (
            <ExcelResultCard
              student={student}
              subjects={student.subjects || []}
              tests={student.tests || []}
              rounds={student.rounds || []}
              categoryTitle={
                resolvedCategoryName ||
                (typeParam === "rnt" ? "R n T" : "First Term")
              }
              sessionTitle={
                sessionName ||
                student.session_name ||
                "Session 2026-27"
              }
              showChart={false}
              selectedRounds={effectiveSelectedRounds}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function ResultsPrintCardsPage() {
  return (
    <Suspense fallback={<PageLoader text="Loading class cards..." />}>
      <ResultsPrintCardsContent />
    </Suspense>
  );
}
