"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ExcelResultCard from "@/components/ExcelResultCard";
import RnTResultCard from "@/components/RnTResultCard";
import { Printer, ArrowLeft, Download } from "lucide-react";
import PageLoader from "@/components/PageLoader";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function PrintContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentId = searchParams.get("student_id");
  const sessionId = searchParams.get("session");
  const classId = searchParams.get("class");
  const categoryId = searchParams.get("category");
  const paramCategoryName = searchParams.get("category_name");
  const sessionName = searchParams.get("session_name");
  const roundsParam = searchParams.get("rounds");
  const selectedRounds = roundsParam ? roundsParam.split(",").map((r) => r.trim()).filter(Boolean) : undefined;

  const [student, setStudent] = useState<any>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [rounds, setRounds] = useState<any[]>([]);
  const [resolvedCategoryName, setResolvedCategoryName] = useState<string>(
    paramCategoryName && !/^\d+$/.test(paramCategoryName) ? paramCategoryName : ""
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId || !sessionId || !classId || !categoryId) return;

    async function fetchData() {
      try {
        const headers = {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        };

        const roundsQuery = roundsParam ? `&rounds=${encodeURIComponent(roundsParam)}` : "";

        const [detailsRes, seriesRes, categoriesRes] = await Promise.all([
          fetch(
            `${API}/results/series/student/${studentId}?academic_session_id=${sessionId}&academy_class_id=${classId}&test_category_id=${categoryId}${roundsQuery}&_t=${Date.now()}`,
            { headers }
          ),
          fetch(
            `${API}/results/series?academic_session_id=${sessionId}&academy_class_id=${classId}&test_category_id=${categoryId}${roundsQuery}&_t=${Date.now()}`,
            { headers }
          ),
          fetch(`${API}/test-categories`, { headers }).catch(() => null),
        ]);

        if (categoriesRes && categoriesRes.ok) {
          const cats = await categoriesRes.json();
          const matchingCat = cats.find((c: any) => String(c.id) === String(categoryId) || c.type === categoryId);
          if (matchingCat) {
            setResolvedCategoryName(matchingCat.name);
          }
        }

        if (detailsRes.ok && seriesRes.ok) {
          const detailsData = await detailsRes.json();
          const seriesData = await seriesRes.json();

          const std = seriesData.find((s: any) => String(s.student_id) === String(studentId));
          const baseStudent = detailsData.student || std || {};

          setStudent({
            ...std,
            ...baseStudent,
            class_incharge: baseStudent?.class_incharge || std?.class_incharge || "",
            teacher_signature: baseStudent?.teacher_signature || std?.teacher_signature || "",
            rank: std?.rank,
            total_obtained: std?.total_obtained,
            total_max: std?.total_max,
            percentage: std?.percentage,
          });

          setSubjects(detailsData.subjects || (Array.isArray(detailsData) ? detailsData : []));
          setTests(detailsData.tests || []);
          setRounds(detailsData.rounds || []);
        }
      } catch (err) {
        console.error("Failed to fetch print data", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [studentId, sessionId, classId, categoryId, roundsParam]);

  if (loading) {
    return <PageLoader text="Preparing Official Result Card..." />;
  }

  if (!student) {
    return (
      <div className="p-10 text-center font-bold text-red-600">
        Failed to load student result card data.
      </div>
    );
  }

  const isRnT = resolvedCategoryName?.toLowerCase().includes("r n t") || resolvedCategoryName?.toLowerCase().includes("r&t");

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
            .no-print { display: none !important; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
            body { background-color: white !important; margin: 0 !important; padding: 0 !important; }
            @page { margin: 10mm; size: ${isRnT ? 'A4 landscape' : 'A4 portrait'}; }
            header, nav, aside { display: none !important; }
        }
      `,
        }}
      />

      <div className="min-h-screen bg-slate-100/80 text-slate-900 font-sans p-4 sm:p-8 print:p-0 print:bg-white flex flex-col items-center">
        {/* On-screen Action Toolbar (Hidden during print) */}
        <div className="w-full max-w-5xl mb-4 flex items-center justify-between no-print bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Results
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 hidden sm:inline">
              Exact Excel &apos;Individual&apos; Sheet Design
            </span>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 shadow-sm transition-all"
            >
              <Printer className="w-4 h-4" />
              Print Result Card (Ctrl + P)
            </button>
          </div>
        </div>

        {/* The Exact Excel Result Card */}
        {isRnT ? (
          <RnTResultCard
            student={student}
            subjects={subjects}
            tests={tests}
            rounds={rounds}
            categoryTitle={resolvedCategoryName || "R n T"}
            sessionTitle={sessionName || student?.session_name || "Session 2026-27"}
            showChart={false}
            selectedRounds={selectedRounds}
          />
        ) : (
          <ExcelResultCard
            student={student}
            subjects={subjects}
            tests={tests}
            rounds={rounds}
            categoryTitle={resolvedCategoryName || "First Term"}
            sessionTitle={sessionName || student?.session_name || "Session 2026-27"}
            showChart={false}
            selectedRounds={selectedRounds}
          />
        )}
      </div>
    </>
  );
}

export default function PrintPageWrapper() {
  return (
    <Suspense fallback={<PageLoader text="Loading result card tools..." />}>
      <PrintContent />
    </Suspense>
  );
}
