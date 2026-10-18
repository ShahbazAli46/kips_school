"use client";
import { useCallback, useEffect, useState } from "react";
import { BookOpen, BookMarked } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import CustomDropdown from "@/components/CustomDropdown";

type ClassRow = { id: number; name: string };
type LedgerRow = {
  id: number;
  student_name: string;
  roll_number: string | null;
  class_id: number | null;
  class_name: string | null;
  date: string;
  item: string;
  amount: number;
  paid_amount: number;
  balance_amount: number;
  status: "paid" | "unpaid" | "partial";
};
type Totals = { count: number; amount: number; paid: number; unpaid: number };
const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8001/api";
const money = (n: number) => `Rs ${Number(n).toLocaleString("en-PK", { maximumFractionDigits: 2 })}`;
const badge = {
  paid: "bg-emerald-50 text-emerald-700",
  unpaid: "bg-red-50 text-red-600",
  partial: "bg-amber-50 text-amber-700",
};
const label = { paid: "Paid", unpaid: "Not paid", partial: "Partial" };
async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API}${path}`, { ...options, headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${localStorage.getItem("token")}`, ...options.headers } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((data.errors && Object.values(data.errors).flat().join(" ")) || data.message || "Request failed. Please try again.");
  return data;
}

export default function BooksLedgerPage() {
  const [rows, setRows] = useState<LedgerRow[]>(([] as LedgerRow[])), [totals, setTotals] = useState<Totals | null>(null), [classes, setClasses] = useState<ClassRow[]>([]);
  const [classId, setClassId] = useState(""), [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true), [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (classId) params.set("class_id", classId);
      if (status) params.set("status", status);
      const d = await request(`/books/ledger?${params.toString()}`);
      setRows(d.data || []); setClasses(d.classes || []); setTotals(d.totals || null);
      setError("");
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [classId, status]);
  useEffect(() => { void load(); }, [load]);
  const dateText = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  return <DashboardLayout><div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-8">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blue-600">School bookshop</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Books Ledger</h1>
        <p className="mt-2 text-sm text-slate-500">All book transactions for every student — paid, partial and not paid.</p>
      </div>
      {totals && <div className="flex flex-wrap gap-3">
        {[["Transactions", String(totals.count), "border-blue-100 bg-blue-50 text-blue-800"], ["Billed", money(totals.amount), "border-slate-200 bg-white text-slate-800"], ["Paid", money(totals.paid), "border-emerald-100 bg-emerald-50 text-emerald-800"], ["Outstanding", money(totals.unpaid), "border-red-100 bg-red-50 text-red-700"]].map(([k, v, tone]) => <div key={k} className={`rounded-xl border px-4 py-3 text-sm ${tone}`}><strong>{v}</strong><span className="mx-2 text-slate-300">·</span>{k}</div>)}
      </div>}
    </header>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

    <div className="flex flex-wrap items-center gap-3">
      <CustomDropdown name="books_ledger_class" className="w-full sm:w-48" value={classId} onChange={(_, value) => setClassId(String(value))} options={[{ label: "All classes", value: "" }, ...Array.isArray(classes) ? classes.map(c => ({ label: c.name, value: c.id })) : []]}/>
      <CustomDropdown name="books_ledger_status" className="w-full sm:w-44" value={status} onChange={(_, value) => setStatus(String(value))} options={[{ label: "All statuses", value: "" }, { label: "Paid", value: "paid" }, { label: "Not paid", value: "unpaid" }, { label: "Partial", value: "partial" }]}/>
    </div>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="flex items-center gap-2 font-semibold text-slate-800"><BookOpen size={18}/>Transactions <span className="ml-2 text-sm font-normal text-slate-400">{loading ? "loading…" : `${rows.length} records`}</span></h2>
      </div>
      {loading ? <p className="p-12 text-center text-sm text-slate-500">Loading books ledger…</p>
        : !rows.length ? <div className="px-6 py-16 text-center"><BookMarked size={42} className="mx-auto mb-4 text-slate-300"/><h3 className="font-semibold text-slate-800">No book transactions found</h3><p className="mt-2 text-sm text-slate-500">{classId || status ? "Try a different class or status filter." : "Book sales recorded at the bookshop will appear here."}</p></div>
        : <div className="overflow-x-auto"><table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{["Sr.", "Student Name", "Class", "Date", "Amount", "Status"].map(h => <th key={h} className="whitespace-nowrap px-4 py-3">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r, i) => <tr key={r.id} className="hover:bg-blue-50/40">
              <td className="px-4 py-3 text-slate-400">{i + 1}</td>
              <td className="min-w-48 px-4 py-3"><span className="block font-medium text-slate-800">{r.student_name}</span>{r.roll_number && <span className="mt-0.5 block text-xs text-slate-400">{r.roll_number}</span>}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-500">{r.class_name || "—"}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-500">{dateText(r.date)}</td>
              <td className="whitespace-nowrap px-4 py-3">{money(r.amount)}{r.balance_amount > 0 && r.paid_amount > 0 && <span className="mt-0.5 block text-xs text-slate-400">{money(r.paid_amount)} paid</span>}</td>
              <td className="whitespace-nowrap px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${badge[r.status]}`}>{label[r.status]}</span></td>
            </tr>)}
          </tbody>
        </table></div>}
    </section>
  </div></DashboardLayout>;
}
