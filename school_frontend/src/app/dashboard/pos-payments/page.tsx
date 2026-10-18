"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, ShoppingCart, Search, Wallet } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import CustomDropdown from "@/components/CustomDropdown";

type ClassRow = { id: number; name: string };
type PosRow = {
  id: number;
  category: "books" | "extra";
  month: string;
  amount_paid: number;
  payment_date: string;
  payer_name: string | null;
  payment_method: string;
  description: string | null;
  received_by: number | null;
  student?: { id: number; name: string; roll_number: string | null; father_name: string | null; academy_class?: ClassRow | null; section?: { name: string } | null } | null;
  receiver?: { id: number; name: string } | null;
};
type Summary = { count: number; total: number; books: number; extra: number };
type PageMeta = { current_page: number; per_page: number; total: number; last_page: number };
const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8001/api";
const money = (n: number) => `Rs ${Number(n).toLocaleString("en-PK", { maximumFractionDigits: 2 })}`;
const methodLabel: Record<string, string> = { cash: "Cash", online: "Online", bank: "Bank", voucher: "Voucher", waived: "Waived" };
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const monthLabel = (m: string) => { const [y, mo] = m.split("-").map(Number); return `${monthNames[(mo || 1) - 1]} ${y}`; };
async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API}${path}`, { ...options, headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${localStorage.getItem("token")}`, ...options.headers } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((data.errors && Object.values(data.errors).flat().join(" ")) || data.message || "Request failed. Please try again.");
  return data;
}

export default function PosPaymentsPage() {
  const [tab, setTab] = useState<"books" | "extra">("books");
  const [rows, setRows] = useState<PosRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classId, setClassId] = useState(""), [month, setMonth] = useState("");
  const [chargeTitle, setChargeTitle] = useState(""), [chargeTitles, setChargeTitles] = useState<string[]>([]);
  const [months, setMonths] = useState<string[]>([]);
  const [page, setPage] = useState(1), [meta, setMeta] = useState<PageMeta | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true), [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ category: tab, page: String(page) });
      if (classId) params.set("class_id", classId);
      if (month) params.set("month", month);
      if (tab === "extra" && chargeTitle) params.set("charge_title", chargeTitle);
      if (search.trim()) params.set("search", search.trim());
      const d = await request(`/pos-payments?${params.toString()}`);
      setRows(d.data || []); setSummary(d.summary || null); setClasses(d.classes || []); setMeta(d.meta || null);
      if (Array.isArray(d.charge_titles)) setChargeTitles(d.charge_titles);
      if (Array.isArray(d.months)) setMonths(d.months as string[]);
      setError("");
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [tab, classId, month, search, page, chargeTitle]);
  useEffect(() => {
    const timer = setTimeout(() => { void load(); }, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);
  const dateText = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const classNameOf = (s: PosRow["student"]) => s?.academy_class?.name || "—";

  return <DashboardLayout><div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-8">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blue-600">Shop counters</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">POS Received Ledger</h1>
        <p className="mt-2 text-sm text-slate-500">Money received at the Book Store and Extra Charges counter — kept separate from the academic fee received ledgers.</p>
      </div>
      {summary && <div className="flex flex-wrap gap-3">
        {[["Records", String(summary.count), "border-blue-100 bg-blue-50 text-blue-800"], ["Books Received", money(summary.books), "border-emerald-100 bg-emerald-50 text-emerald-800"], ["Extras Received", money(summary.extra), "border-amber-100 bg-amber-50 text-amber-800"], ["Total Received", money(summary.total), "border-slate-200 bg-white text-slate-800"]].map(([k, v, tone]) => <div key={k} className={`rounded-xl border px-4 py-3 text-sm ${tone}`}><strong>{v}</strong><span className="mx-2 text-slate-300">·</span>{k}</div>)}
      </div>}
    </header>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

    <div role="tablist" aria-label="POS ledger" className="flex gap-2 border-b border-slate-200">
      {([["books", "Books Received", BookOpen], ["extra", "Extra Charges Received", ShoppingCart]] as const).map(([id, lbl, Icon]) => <button key={id} role="tab" aria-selected={tab === id} onClick={() => { setPage(1); setTab(id); setChargeTitle(""); }} className={`flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-semibold transition ${tab === id ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}><Icon size={18}/>{lbl}</button>)}
    </div>

    <div className="flex flex-wrap items-center gap-3">
      {tab === "extra" && <CustomDropdown name="pos_charge_filter" className="w-full sm:w-52" value={chargeTitle} onChange={(_, value) => { setPage(1); setChargeTitle(String(value)); }} options={[{ label: "All Extra Charges", value: "" }, ...chargeTitles.map(t => ({ label: t, value: t }))]}/>}
      <CustomDropdown name="pos_month_filter" className="w-full sm:w-44" value={month} onChange={(_, value) => { setPage(1); setMonth(String(value)); }} options={[{ label: "All months", value: "" }, ...months.map(m => ({ label: monthLabel(m), value: m }))]}/>
      <CustomDropdown name="pos_class_filter" className="w-full sm:w-48" value={classId} onChange={(_, value) => { setPage(1); setClassId(String(value)); }} options={[{ label: "All classes", value: "" }, ...classes.map(c => ({ label: c.name, value: c.id }))]}/>
      <div className="relative min-w-56 flex-1"><Search size={17} className="absolute left-3 top-3 text-slate-400"/><input className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Search student, roll number, description…" value={search} onChange={e => { setPage(1); setSearch(e.target.value); }}/></div>
    </div>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="flex items-center gap-2 font-semibold text-slate-800"><Wallet size={18}/>{tab === "books" ? "Books" : "Extra Charges"} received <span className="ml-2 text-sm font-normal text-slate-400">{loading ? "loading…" : meta ? `${meta.total.toLocaleString()} records` : `${rows.length} records`}</span></h2>
      </div>
      {loading ? <p className="p-12 text-center text-sm text-slate-500">Loading {tab === "books" ? "books" : "extra charges"} ledger…</p>
        : !rows.length ? <div className="px-6 py-16 text-center"><Wallet size={42} className="mx-auto mb-4 text-slate-300"/><h3 className="font-semibold text-slate-800">No payments found</h3><p className="mt-2 text-sm text-slate-500">{classId || month || search ? "Try different filters." : `Cash received for ${tab === "books" ? "book sales" : "extra charges"} will appear here.`}</p></div>
        : <div className="overflow-x-auto"><table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{["Sr.", "Date", "Student Name", "Class", "Description", "Method", "Amount", "Received By"].map(h => <th key={h} className="whitespace-nowrap px-4 py-3">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((p, i) => <tr key={p.id} className="hover:bg-blue-50/40">
              <td className="px-4 py-3 text-slate-400">{meta ? (meta.current_page - 1) * meta.per_page + i + 1 : i + 1}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-500">{dateText(p.payment_date)}</td>
              <td className="min-w-44 px-4 py-3"><span className="block font-medium text-slate-800">{p.student?.name || p.payer_name || "—"}</span>{p.student?.roll_number && <span className="mt-0.5 block text-xs text-slate-400">{p.student.roll_number}</span>}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-500">{classNameOf(p.student)}</td>
              <td className="min-w-52 px-4 py-3 text-slate-500">{p.description || "—"}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-500">{methodLabel[p.payment_method] || p.payment_method}</td>
              <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-900">{money(Number(p.amount_paid))}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-500">{p.receiver?.name || "—"}</td>
            </tr>)}
          </tbody>
        </table></div>}
      {meta && meta.total > 0 && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-sm">
        <p className="text-xs text-slate-400">{meta.total.toLocaleString()} records · Page {meta.current_page} of {meta.last_page}</p>
        <div className="flex gap-2">
          <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40" disabled={meta.current_page <= 1 || loading} onClick={() => setPage(p => p - 1)}>← Previous</button>
          <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40" disabled={meta.current_page >= meta.last_page || loading} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      </div>}
    </section>
  </div></DashboardLayout>;
}
