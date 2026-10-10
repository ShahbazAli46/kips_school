"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const STORAGE_URL = process.env.NEXT_PUBLIC_STORAGE_URL || "http://localhost:8000/storage";

function getAuthHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  try {
    const datePart = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
    const [year, month, day] = datePart.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${day} ${months[parseInt(month, 10) - 1]} ${year}`;
  } catch {
    return dateStr ?? "—";
  }
}

function PrintContent() {
  const searchParams = useSearchParams();
  const staffId = searchParams.get("id");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [staffInfo, setStaffInfo] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [bfLedger, setBfLedger] = useState<any[]>([]);
  const [adjustments, setAdjustments] = useState<any[]>([]);

  useEffect(() => {
    if (!staffId) {
      setError("No staff ID provided.");
      setLoading(false);
      return;
    }
    fetch(`${API}/staff/${staffId}/ledger`, { headers: getAuthHeaders() })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch ledger");
        return res.json();
      })
      .then((data) => {
        setStaffInfo(data.staff);
        setSummary(data.summary);
        setLedger(data.ledger || []);
        setBfLedger(data.bf_ledger || []);
        setAdjustments(data.adjustments || []);
        setLoading(false);
      })
      .catch((err: any) => {
        setError(err.message);
        setLoading(false);
      });
  }, [staffId]);

  useEffect(() => {
    if (!loading && staffInfo) {
      setTimeout(() => window.print(), 600);
    }
  }, [loading, staffInfo]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500 font-medium">Preparing official statement…</p>
        </div>
      </div>
    );
  }

  if (error || !staffInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-red-600 font-semibold">{error || "Staff record not found."}</p>
      </div>
    );
  }

  const statementDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  const photoUrl = staffInfo.image
    ? staffInfo.image.startsWith("http")
      ? staffInfo.image
      : `${STORAGE_URL}/${staffInfo.image}`
    : null;

  return (
    <div className="bg-white text-black font-sans min-h-screen">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 8mm 10mm; }
          body { background: white !important; margin: 0 !important; }
          .no-print { display: none !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
        body { font-family: 'Segoe UI', Arial, sans-serif; }
        .stripe-odd { background-color: #f8fafc; }
        .stripe-even { background-color: #ffffff; }
      `}</style>

      {/* ── Print / Close Controls (hidden on print) ── */}
      <div className="no-print fixed top-4 right-4 flex gap-2 z-50 shadow-xl">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-700 transition"
        >
          🖨️ Print Statement
        </button>
        <button
          onClick={() => window.close()}
          className="px-4 py-2 bg-white text-slate-700 border border-slate-300 text-xs font-bold rounded-lg hover:bg-slate-50 transition"
        >
          ✕ Close
        </button>
      </div>

      {/* ═══════════════════ PRINT CANVAS ═══════════════════ */}
      <main className="max-w-4xl mx-auto p-8 print:p-0">

        {/* ── Header ── */}
        <header style={{ borderBottom: "4px solid #000", paddingBottom: "14px", marginBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <img src="/logo.jpg" alt="KIPS School" style={{ width: "60px", height: "60px", objectFit: "contain", border: "1px solid #ccc", borderRadius: "4px" }} />
              <div>
                <p style={{ fontSize: "9px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "2px", color: "#64748b", marginBottom: "2px" }}>
                  Official Staff Financial Statement
                </p>
                <h1 style={{ fontSize: "24px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "-0.5px", color: "#000", lineHeight: 1, margin: 0 }}>
                  KIPS SCHOOL
                </h1>
                <p style={{ fontSize: "11px", fontWeight: "600", color: "#475569", marginTop: "3px" }}>
                  Chunian Campus &nbsp;·&nbsp; Helpline: 0300 39 39 581
                </p>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: "9px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1.5px", color: "#94a3b8", marginBottom: "4px" }}>
                Staff Salary Ledger
              </p>
              <p style={{ fontSize: "11px", fontWeight: "600", color: "#334155" }}>
                Statement Date: <strong style={{ color: "#000" }}>{statementDate}</strong>
              </p>
              <p style={{ fontSize: "11px", fontWeight: "600", color: "#334155", marginTop: "2px" }}>
                Staff ID: <strong style={{ fontFamily: "monospace", color: "#000" }}>#{staffInfo.id}</strong>
              </p>
              <span style={{ display: "inline-block", marginTop: "6px", padding: "2px 8px", border: "1.5px solid #000", fontSize: "9px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "1px" }}>
                {staffInfo.is_active ? "● Active" : "○ Resigned"}
              </span>
            </div>
          </div>
        </header>

        {/* ── Staff Particulars ── */}
        <section style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", border: "1px solid #94a3b8", background: "#f1f5f9" }}>
            {/* Photo column */}
            <div style={{ width: "80px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "10px", borderRight: "1px solid #94a3b8" }}>
              {photoUrl ? (
                <img src={photoUrl} alt={staffInfo.name} style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "4px", border: "1px solid #ccc", filter: "grayscale(100%)" }} />
              ) : (
                <div style={{ width: "60px", height: "60px", display: "flex", alignItems: "center", justifyContent: "center", background: "#e2e8f0", borderRadius: "4px", border: "1px solid #cbd5e1" }}>
                  <span style={{ fontSize: "24px", fontWeight: "900", color: "#64748b" }}>{staffInfo.name?.charAt(0)?.toUpperCase()}</span>
                </div>
              )}
            </div>
            {/* Info columns */}
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
              {[
                { label: "Staff Name", main: staffInfo.name, sub: staffInfo.designation },
                { label: "Contact", main: staffInfo.contact_number || "—", sub: staffInfo.email || "—", mono: true },
                { label: "Joining Date", main: formatDate(staffInfo.joining_date), sub: staffInfo.qualification || "—" },
                { label: "Monthly Base Salary", main: `Rs ${(summary?.monthly_salary || 0).toLocaleString()}`, sub: (staffInfo.bf_percentage || 0) > 0 ? `BF: ${staffInfo.bf_percentage}% / month` : "No BF deduction" },
              ].map((item, i) => (
                <div key={i} style={{ padding: "10px 12px", borderRight: i < 3 ? "1px solid #94a3b8" : undefined }}>
                  <span style={{ display: "block", fontSize: "8px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1.5px", color: "#94a3b8", marginBottom: "3px" }}>
                    {item.label}
                  </span>
                  <p style={{ fontWeight: "900", fontSize: i === 3 ? "16px" : "12px", color: "#000", fontFamily: item.mono ? "monospace" : undefined, margin: 0 }}>
                    {item.main}
                  </p>
                  <p style={{ fontSize: "9px", color: "#64748b", marginTop: "2px" }}>{item.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Summary Strip ── */}
        {summary && (
          <section style={{ marginBottom: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", border: "1px solid #94a3b8" }}>
              {[
                { label: "BF Pool Accumulated", value: `Rs ${summary.total_bf_accumulated.toLocaleString()}`, note: `Net pool available: Rs ${summary.net_bf_balance.toLocaleString()}` },
                { label: summary.salary_balance > 0 ? "Dues Pending" : "Salary Status", value: summary.salary_balance > 0 ? `Rs ${summary.salary_balance.toLocaleString()}` : "Cleared", note: summary.salary_balance > 0 ? "Payable to staff" : "No outstanding dues" },
              ].map((item, i) => (
                <div key={i} style={{ padding: "10px", textAlign: "center", borderRight: i < 1 ? "1px solid #94a3b8" : undefined }}>
                  <p style={{ fontSize: "8px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1.5px", color: "#94a3b8", marginBottom: "4px" }}>{item.label}</p>
                  <p style={{ fontSize: "15px", fontWeight: "900", color: "#000", margin: 0 }}>{item.value}</p>
                  <p style={{ fontSize: "8px", color: "#94a3b8", marginTop: "2px" }}>{item.note}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Main Ledger Table ── */}
        <section style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
            <h2 style={{ fontSize: "10px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "2px", color: "#000", margin: 0 }}>
              Account Ledger Statement
            </h2>
            <p style={{ fontSize: "9px", color: "#94a3b8", fontWeight: "600" }}>Chronological — oldest to latest</p>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9px", border: "1px solid #64748b" }}>
            <thead>
              <tr style={{ background: "#0f172a", color: "#fff" }}>
                {["Date", "Type", "Description / Reference", "Credit (Rs)", "Debit (Rs)", "BF Pool (Rs)", "Balance (Rs)"].map((h, i) => (
                  <th key={i} style={{ padding: "7px 6px", textAlign: i > 2 ? "right" : "left", border: "1px solid #334155", fontWeight: "700", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ledger.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: "14px", textAlign: "center", color: "#94a3b8", border: "1px solid #cbd5e1" }}>No ledger transactions found.</td></tr>
              ) : (
                ledger.map((tx: any, idx: number) => (
                  <tr key={tx.id} style={{ background: idx % 2 === 0 ? "#fff" : "#f8fafc" }}>
                    <td style={{ padding: "5px 6px", border: "1px solid #cbd5e1", fontFamily: "monospace", whiteSpace: "nowrap" }}>{tx.date}</td>
                    <td style={{ padding: "5px 6px", border: "1px solid #cbd5e1", fontWeight: "700", textTransform: "uppercase", fontSize: "8px", letterSpacing: "0.5px", color: tx.category === "salary" ? "#000" : "#64748b" }}>{tx.type}</td>
                    <td style={{ padding: "5px 6px", border: "1px solid #cbd5e1" }}>
                      <p style={{ margin: 0, color: "#334155", lineHeight: 1.4 }}>{tx.description}</p>
                      <p style={{ margin: "2px 0 0", fontFamily: "monospace", fontSize: "8px", color: "#94a3b8" }}>{tx.reference}</p>
                    </td>
                    <td style={{ padding: "5px 6px", border: "1px solid #cbd5e1", textAlign: "right", fontFamily: "monospace", fontWeight: "700" }}>{tx.credit > 0 ? tx.credit.toLocaleString() : "—"}</td>
                    <td style={{ padding: "5px 6px", border: "1px solid #cbd5e1", textAlign: "right", fontFamily: "monospace" }}>{tx.debit > 0 ? tx.debit.toLocaleString() : "—"}</td>
                    <td style={{ padding: "5px 6px", border: "1px solid #cbd5e1", textAlign: "right", fontFamily: "monospace", color: "#64748b" }}>{tx.running_bf_balance > 0 ? tx.running_bf_balance.toLocaleString() : "—"}</td>
                    <td style={{ padding: "5px 6px", border: "1px solid #cbd5e1", textAlign: "right", fontFamily: "monospace", fontWeight: "900", color: tx.running_salary_balance > 0.01 ? "#000" : "#94a3b8" }}>
                      {tx.running_salary_balance > 0.01 ? tx.running_salary_balance.toLocaleString() : "Cleared"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {summary && (
              <tfoot>
                <tr style={{ background: "#e2e8f0", borderTop: "2px solid #475569" }}>
                  <td colSpan={3} style={{ padding: "6px", border: "1px solid #64748b", fontSize: "8px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "1.5px" }}>Grand Totals</td>
                  <td style={{ padding: "6px", border: "1px solid #64748b", textAlign: "right", fontFamily: "monospace", fontWeight: "900", fontSize: "11px" }}>{summary.total_salary_earned.toLocaleString()}</td>
                  <td style={{ padding: "6px", border: "1px solid #64748b", textAlign: "right", fontFamily: "monospace", fontWeight: "900", fontSize: "11px" }}>{summary.total_salary_paid.toLocaleString()}</td>
                  <td style={{ padding: "6px", border: "1px solid #64748b", textAlign: "right", fontFamily: "monospace", fontWeight: "900", fontSize: "11px" }}>{summary.net_bf_balance.toLocaleString()}</td>
                  <td style={{ padding: "6px", border: "1px solid #64748b", textAlign: "right", fontFamily: "monospace", fontWeight: "900", fontSize: "11px", textDecoration: summary.salary_balance > 0 ? "underline double" : undefined }}>
                    {summary.salary_balance > 0 ? summary.salary_balance.toLocaleString() : "0.00"}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </section>

        {/* ── Benevolent Fund Pool Audit ── */}
        {bfLedger.length > 0 && (
          <section style={{ marginBottom: "20px" }}>
            <h2 style={{ fontSize: "10px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "2px", color: "#000", margin: "0 0 6px" }}>
              Benevolent Fund (BF) Pool — Accumulation Audit
            </h2>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9px", border: "1px solid #64748b" }}>
              <thead>
                <tr style={{ background: "#1e293b", color: "#fff" }}>
                  {["Month", "Type", "Base Salary (Rs)", "Rate (%)", "Deducted (Rs)", "BF Pool Balance (Rs)"].map((h, i) => (
                    <th key={i} style={{ padding: "6px", textAlign: i > 1 ? "right" : "left", border: "1px solid #334155", fontWeight: "700" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bfLedger.map((bf: any, idx: number) => (
                  <tr key={bf.id} style={{ background: idx % 2 === 0 ? "#fff" : "#f8fafc" }}>
                    <td style={{ padding: "5px 6px", border: "1px solid #cbd5e1", fontFamily: "monospace" }}>{bf.date}</td>
                    <td style={{ padding: "5px 6px", border: "1px solid #cbd5e1", fontWeight: "700", textTransform: "uppercase", fontSize: "8px", color: "#64748b" }}>{bf.type}</td>
                    <td style={{ padding: "5px 6px", border: "1px solid #cbd5e1", textAlign: "right", fontFamily: "monospace" }}>{bf.base_salary > 0 ? bf.base_salary.toLocaleString() : "—"}</td>
                    <td style={{ padding: "5px 6px", border: "1px solid #cbd5e1", textAlign: "right", fontFamily: "monospace" }}>{bf.percentage > 0 ? `${bf.percentage}%` : "—"}</td>
                    <td style={{ padding: "5px 6px", border: "1px solid #cbd5e1", textAlign: "right", fontFamily: "monospace", fontWeight: "700" }}>{bf.deduction_amount > 0 ? bf.deduction_amount.toLocaleString() : "—"}</td>
                    <td style={{ padding: "5px 6px", border: "1px solid #cbd5e1", textAlign: "right", fontFamily: "monospace", fontWeight: "900" }}>{bf.running_bf_balance.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: "#e2e8f0", borderTop: "2px solid #475569" }}>
                  <td colSpan={4} style={{ padding: "6px", border: "1px solid #64748b", fontSize: "8px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "1.5px" }}>Total BF Accumulated</td>
                  <td style={{ padding: "6px", border: "1px solid #64748b", textAlign: "right", fontFamily: "monospace", fontWeight: "900", fontSize: "11px" }}>{summary?.total_bf_accumulated?.toLocaleString()}</td>
                  <td style={{ padding: "6px", border: "1px solid #64748b", textAlign: "right", fontFamily: "monospace", fontWeight: "900", fontSize: "11px", textDecoration: "underline double" }}>{summary?.net_bf_balance?.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </section>
        )}

        {/* ── Salary Revision History ── */}
        {adjustments.length > 0 && (
          <section style={{ marginBottom: "20px" }}>
            <h2 style={{ fontSize: "10px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "2px", color: "#000", margin: "0 0 6px" }}>
              Salary Revision History
            </h2>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9px", border: "1px solid #64748b" }}>
              <thead>
                <tr style={{ background: "#334155", color: "#fff" }}>
                  {["Effective Date", "Type", "Previous (Rs)", "Adjustment (Rs)", "New Salary (Rs)", "Reason"].map((h, i) => (
                    <th key={i} style={{ padding: "6px", textAlign: i >= 2 && i <= 4 ? "right" : "left", border: "1px solid #475569", fontWeight: "700" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {adjustments.map((adj: any, idx: number) => (
                  <tr key={adj.id} style={{ background: idx % 2 === 0 ? "#fff" : "#f8fafc" }}>
                    <td style={{ padding: "5px 6px", border: "1px solid #cbd5e1", fontFamily: "monospace" }}>{formatDate(adj.effective_date)}</td>
                    <td style={{ padding: "5px 6px", border: "1px solid #cbd5e1", fontWeight: "900", fontSize: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      {adj.type === "increment" ? "▲ Increment" : "▼ Decrement"}
                    </td>
                    <td style={{ padding: "5px 6px", border: "1px solid #cbd5e1", textAlign: "right", fontFamily: "monospace" }}>{parseFloat(adj.previous_salary).toLocaleString()}</td>
                    <td style={{ padding: "5px 6px", border: "1px solid #cbd5e1", textAlign: "right", fontFamily: "monospace", fontWeight: "900" }}>
                      {adj.type === "increment" ? "+" : "−"}{parseFloat(adj.amount).toLocaleString()}
                    </td>
                    <td style={{ padding: "5px 6px", border: "1px solid #cbd5e1", textAlign: "right", fontFamily: "monospace", fontWeight: "900" }}>{parseFloat(adj.new_salary).toLocaleString()}</td>
                    <td style={{ padding: "5px 6px", border: "1px solid #cbd5e1", color: "#475569" }}>{adj.reason || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* ── Footer with Signature Lines ── */}
        <footer style={{ borderTop: "3px solid #000", paddingTop: "16px", marginTop: "8px" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: "8px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1.5px", color: "#94a3b8", marginBottom: "24px" }}>Authorised Signatory</p>
              <div style={{ borderBottom: "1px solid #64748b", width: "180px", marginBottom: "4px" }} />
              <p style={{ fontSize: "9px", color: "#64748b" }}>Principal / Administrator</p>
              <p style={{ fontSize: "9px", fontWeight: "700", color: "#000" }}>KIPS School, Chunian</p>
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "8px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1.5px", color: "#94a3b8", marginBottom: "24px" }}>Staff Acknowledgement</p>
              <div style={{ borderBottom: "1px solid #64748b", width: "180px", marginBottom: "4px" }} />
              <p style={{ fontSize: "9px", color: "#64748b" }}>{staffInfo.name}</p>
              <p style={{ fontSize: "9px", fontWeight: "700", color: "#000" }}>{staffInfo.designation}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: "9px", color: "#94a3b8", fontWeight: "600" }}>Printed: {statementDate}</p>
              <p style={{ fontSize: "8px", color: "#cbd5e1", marginTop: "4px" }}>* Official computer-generated statement.</p>
              <p style={{ fontSize: "8px", color: "#cbd5e1" }}>E&amp;OE — Errors and Omissions Excepted.</p>
            </div>
          </div>
        </footer>

      </main>
    </div>
  );
}

import PageLoader from "@/components/PageLoader";

export default function StaffLedgerPrintPage() {
  return (
    <Suspense fallback={<PageLoader text="Preparing staff ledger statement..." />}>
      <PrintContent />
    </Suspense>
  );
}
