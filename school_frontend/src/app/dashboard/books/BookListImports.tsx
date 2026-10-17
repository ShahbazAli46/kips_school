"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import CustomDropdown from "@/components/CustomDropdown";
import CustomNumberInput from "@/components/CustomNumberInput";
import { Upload, X, FileText, Trash2, Plus, ChevronDown } from "lucide-react";

export type ImportedRow = { serial_number: string | null; subject: string; title: string; publisher: string; quantity_text: string; category: string; price: number | null; stock_quantity: number };
export type StoredList = { id: number; title: string; class_id: number; session_label: string; notes: string[]; source_filename: string };
export type StoredItem = { id: number; book_list_id?: number | null; position?: number; serial_number?: string | null; subject?: string; title: string; publisher?: string; quantity_text?: string; category?: string; price: number; price_missing?: boolean; stock_quantity: number };
type Preview = { token: string; title: string; session_label: string; class_name?: string; notes: string[]; rows: ImportedRow[]; warnings: string[] };
type AcademicSession = { id: number; name: string; is_active: boolean };
const sessionKey = (name: string) => {
  const years = name.match(/(20\d{2})\s*[-–/]\s*((?:20)?\d{2})/);
  return years ? `${years[1]}${years[2].slice(-2)}` : name.toLowerCase().replace(/[^a-z0-9]/g, "");
};
const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8001/api";
const field = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500";
const button = "inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50";
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}`, Accept: "application/json" });
async function result(response: Response) { const d = await response.json().catch(() => ({})); if (!response.ok) throw new Error(d.errors ? Object.values(d.errors).flat().join(" ") : d.message || "Could not import this file."); return d; }

export default function BookListImports({ classes, lists, books, admin, onSaved }: { classes: {id: number;name: string}[]; lists: StoredList[]; books: StoredItem[]; admin: boolean; onSaved: () => Promise<void> }) {
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null), [classId, setClassId] = useState("");
  const [success, setSuccess] = useState("");
  const [sessions, setSessions] = useState<AcademicSession[]>([]), [sessionId, setSessionId] = useState("");
  const [sessionsLoading, setSessionsLoading] = useState(false), [sessionsError, setSessionsError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setSessionsLoading(true); setSessionsError(""); setSessions([]);
    fetch(`${API}/academic-sessions`, { headers: headers() }).then(result).then(data => {
      if (!cancelled) setSessions(Array.isArray(data) ? data : data.data || []);
    }).catch(e => { if (!cancelled) setSessionsError((e as Error).message); })
      .finally(() => { if (!cancelled) setSessionsLoading(false); });
    return () => { cancelled = true; };
  }, [open]);
  const previewToken = preview?.token;
  const detectedSession = preview?.session_label || "";
  useEffect(() => {
    const match = sessions.find(s => sessionKey(s.name) === sessionKey(detectedSession));
    const fallback = !detectedSession ? sessions.find(s => s.is_active) : undefined;
    setSessionId(match ? String(match.id) : fallback ? String(fallback.id) : "");
  }, [previewToken, detectedSession, sessions]);
  async function upload(file: File) {
    setBusy(true); setError(""); setPreview(null);
    try { if (file.size > 10 * 1024 * 1024) throw new Error("Please choose a file smaller than 10 MB."); const body = new FormData(); body.append("file", file); const d: Preview = await result(await fetch(`${API}/books/import/preview`, {method: "POST",headers: headers(),body})); setPreview({...d,rows:d.rows.map(r=>({...r,stock_quantity:r.stock_quantity??0}))}); const match = classes.find(c => c.name.trim().toLowerCase() === d.class_name?.trim().toLowerCase()); setClassId(match ? String(match.id) : ""); }
    catch(e) { setError((e as Error).message); } finally {setBusy(false); if(input.current) input.current.value = "";}
  }
  function edit(index: number, key: keyof ImportedRow, value: string) { if(!preview) return; setPreview({...preview,rows:preview.rows.map((r,i)=>i===index?{...r,[key]:key==="price" ? value===""?null:Number(value):key==="stock_quantity"?Number(value):value}:r)}); }
  async function save(e: FormEvent) {
    e.preventDefault(); if(!preview || !classId) return;
    const selectedSession = sessions.find(s => String(s.id) === sessionId);
    if (!selectedSession) { setError("Select a session from the school sessions list."); return; }
    setBusy(true);setError("");
    try { const data = await result(await fetch(`${API}/books/import/confirm`,{method:"POST",headers:{...headers(),"Content-Type":"application/json"},body:JSON.stringify({...preview,class_id:Number(classId),session_label:selectedSession.name,notes:preview.notes.map(n=>n.trim()).filter(Boolean)})})); setSuccess(data.already_imported ? "This file is already saved for this class and session. Existing records were kept." : `${data.imported_count} records imported with the current stock entered in the preview.`);setOpen(false);setPreview(null);await onSaved(); }
    catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-5"><div><h2 className="flex items-center gap-2 font-semibold text-blue-950"><FileText size={19}/>Class booklists</h2><p className="mt-1 text-sm text-slate-500">Import books, stationery, publishers, required quantities, current stock, prices and notes from a class list.</p></div>{admin&&<button className={button} onClick={()=>{setOpen(true);setPreview(null);setError("");setClassId("");}}><Upload size={17}/>Import PDF / Word / Excel</button>}</div>
    {success&&<p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}
    {lists.map(list=><details key={list.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5"><div><h3 className="font-semibold text-slate-800">{list.title}</h3><p className="mt-1 text-xs text-slate-500">{classes.find(c=>Number(c.id)===Number(list.class_id))?.name} · {list.session_label} · {list.source_filename} · {books.filter(b=>b.book_list_id===list.id).length} records</p></div><ChevronDown size={18} className="shrink-0 text-slate-400 transition group-open:rotate-180"/></summary><div className="overflow-x-auto border-t border-slate-100"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{["Sr.","Subject / group","Title / item","Publisher / specifications","Required quantity","Price (PKR)","Stock"].map(h=><th key={h} className="whitespace-nowrap px-4 py-3">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{books.filter(b=>b.book_list_id===list.id).sort((a,b)=>(a.position || 0)-(b.position || 0)).map(b=><tr key={b.id}><td className="px-4 py-3 text-slate-400">{b.serial_number||"—"}</td><td className="min-w-36 px-4 py-3 text-slate-500">{b.subject||b.category||"—"}</td><td className="min-w-52 px-4 py-3 font-medium text-slate-800">{b.title}</td><td className="min-w-48 px-4 py-3 text-slate-500">{b.publisher||"—"}</td><td className="min-w-32 px-4 py-3 text-slate-500">{b.quantity_text||"—"}</td><td className="whitespace-nowrap px-4 py-3">{b.price_missing?<span className="text-amber-600">Not provided</span>:Number(b.price).toLocaleString("en-PK")}</td><td className="px-4 py-3">{b.stock_quantity}</td></tr>)}</tbody></table></div>{list.notes?.length>0&&<div className="border-t border-slate-100 bg-slate-50 p-5"><h4 className="mb-2 text-sm font-semibold text-slate-700">Notes</h4><div className="space-y-1.5 text-sm text-slate-600">{list.notes.map((n,i)=><p key={i}>{n}</p>)}</div></div>}</details>)}
    {open&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3" onClick={()=>!busy&&setOpen(false)}><div role="dialog" aria-modal="true" aria-labelledby="import-title" className={`max-h-[94vh] w-full overflow-auto rounded-2xl bg-white p-6 shadow-xl ${preview?"max-w-7xl":"max-w-2xl"}`} onClick={e=>e.stopPropagation()}><div className="mb-5 flex justify-between gap-4"><div><h2 id="import-title" className="text-xl font-bold text-slate-900">{preview?"Review class booklist":"Import a class booklist"}</h2><p className="mt-1 text-sm text-slate-500">{preview?"Check the extracted records, select the school class, then save to Store.":"Upload a file with the same columns as your Nursery booklist."}</p></div><button aria-label="Close import" disabled={busy} onClick={()=>setOpen(false)}><X size={20}/></button></div>{error&&<p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {!preview?<div className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center"><Upload size={36} className="mx-auto mb-4 text-blue-500"/><label className={`${button} cursor-pointer`}>{busy?"Reading document…":"Choose file"}<input ref={input} disabled={busy} className="sr-only" type="file" accept=".pdf,.doc,.docx,.xlsx,.xls,.csv" onChange={e=>{const f=e.target.files?.[0];if(f)void upload(f);}}/></label><p className="mt-4 text-sm text-slate-500">PDF, Word (.doc/.docx), Excel (.xls/.xlsx) or CSV · Max 10 MB</p><p className="mt-2 text-xs text-slate-400">Text-based PDF files are supported. Scanned images need OCR before import.</p></div>:<form onSubmit={save} className="space-y-4"><div className="grid gap-4 md:grid-cols-3"><label className="text-sm font-medium text-slate-600">School class<CustomDropdown name="import_class" className="mt-1" value={classId} onChange={(_,value)=>setClassId(String(value))} options={classes.map(c=>({label:c.name,value:c.id}))} placeholder="Select school class" disabled={busy}/></label><label className="text-sm font-medium text-slate-600">List title<input required maxLength={200} className={`${field} mt-1`} value={preview.title} onChange={e=>setPreview({...preview,title:e.target.value})}/></label><label className="text-sm font-medium text-slate-600">Session<CustomDropdown name="import_session" className="mt-1" value={sessionId} onChange={(_,value)=>setSessionId(String(value))} options={sessions.map(s=>({label:`${s.name}${s.is_active ? " (Active)" : ""}`,value:s.id}))} placeholder={sessionsLoading ? "Loading sessions…" : "Select session"} disabled={busy||sessionsLoading}/>{sessionsError&&<span role="alert" className="mt-1 block text-xs text-red-600">{sessionsError}</span>}{!sessionsLoading&&!sessionsError&&!sessions.length&&<span className="mt-1 block text-xs text-amber-700">Create a session in Academic Sessions first.</span>}</label></div>{preview.warnings?.length>0&&<div className="space-y-1 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{preview.warnings.map((w,i)=><p key={i}>{w}</p>)}</div>}<p className="text-xs text-slate-500">{preview.rows.length} records · Blank prices stay “not provided.” Required quantity describes the student’s list. Current Stock is editable and defaults to zero if absent from the file.</p>
        <div className="max-h-[43vh] overflow-auto rounded-xl border border-slate-200"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500"><tr>{["Sr.","Subject / group","Title / item","Publisher / specifications","Required quantity","Category","Price (PKR)","Current Stock",""].map((h,i)=><th key={i} className="whitespace-nowrap p-2">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{preview.rows.map((r,i)=><tr key={i}>{(["serial_number","subject","title","publisher","quantity_text","category","price","stock_quantity"] as const).map(key=><td key={key} className="p-1">{key==="stock_quantity"?<CustomNumberInput name={`import_stock_${i}`} value={r.stock_quantity} onChange={value=>edit(i,"stock_quantity",value)} min={0} max={2147483647} allowDecimal={false} className="min-w-32" disabled={busy}/>:<input aria-label={`${key.replaceAll("_"," ")} row ${i+1}`} required={key==="title"} className={`${field} ${key==="title"||key==="publisher"?"min-w-64":key==="serial_number"?"!w-16":"min-w-32"}`} type={key==="price"?"number":"text"} min={key==="price"?0:undefined} step={key==="price"?"0.01":undefined} value={r[key]??""} placeholder={key==="price"?"Not provided":""} onChange={e=>edit(i,key,e.target.value)}/>}</td>)}<td className="p-2"><button type="button" aria-label={`Remove row ${i+1}`} className="text-slate-400 hover:text-red-600" onClick={()=>setPreview({...preview,rows:preview.rows.filter((_,j)=>j!==i)})}><Trash2 size={16}/></button></td></tr>)}</tbody></table></div>
        <button type="button" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600" onClick={()=>setPreview({...preview,rows:[...preview.rows,{serial_number:null,subject:"",title:"",publisher:"",quantity_text:"1",category:"books",price:null,stock_quantity:0}]})}><Plus size={16}/>Add missing row</button><label className="block text-sm font-medium text-slate-600">Notes (one per line)<textarea rows={5} className={`${field} mt-1`} value={preview.notes.join("\n")} onChange={e=>setPreview({...preview,notes:e.target.value.split("\n")})}/></label><div className="flex flex-wrap justify-between gap-3 border-t border-slate-100 pt-4"><button type="button" disabled={busy} className="text-sm text-slate-500" onClick={()=>setPreview(null)}>Choose a different file</button><button className={button} disabled={busy||!classId||!sessionId||sessionsLoading||!preview.rows.length}>{busy?"Saving records…":`Save ${preview.rows.length} records to Store`}</button></div>
      </form>}
    </div></div>}
  </div>;
}
