import { format } from "date-fns";

interface SlipStudent {
  id: number;
  name: string;
  father_name: string | null;
  roll_number: number | string | null;
  image?: string | null;
  academy_class?: { name: string };
  section?: { name: string };
}
interface SlipPaper { subject: string; date: string; day: string; timing: string; maxMarks: string }
export interface RollSlipOptions {
  students: SlipStudent[];
  papers: SlipPaper[];
  className: string;
  sessionName: string;
  examCenter: string;
  reportingTime: string;
  helpline: string;
  rules: string[];
  controllerSign: string | null;
  principalSign: string | null;
}
const htmlEntities: Record<string, string> = {
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
};
const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, char => htmlEntities[char]);
// Only image URLs are accepted in photo/signature attributes.
const imageUrl = (value: string | null | undefined) => value && /^(https?:\/\/|\/(?!\/)|data:image\/(?:png|jpeg|jpg|webp|gif);base64,|blob:)/i.test(value) ? escapeHtml(value) : "";

export function buildRollNumberSlips(options: RollSlipOptions, preview = false) {
  const midpoint = Math.ceil(options.papers.length / 2);
  const renderTable = (papers: SlipPaper[], offset: number) => `<table><thead><tr><th>#</th><th>PAPER / SUBJECT</th><th>DATE / DAY</th><th>PAPER TIMING</th><th>MARKS</th></tr></thead><tbody>${papers.map((paper, index) => {
    const date = paper.date ? format(new Date(paper.date + "T00:00:00"), "dd MMM yyyy") : "—";
    return `<tr><td>${String(offset + index + 1).padStart(2, "0")}</td><td>${escapeHtml(paper.subject)}</td><td>${escapeHtml(date)} · ${escapeHtml(paper.day)}</td><td>${escapeHtml(paper.timing)}</td><td>${escapeHtml(paper.maxMarks)}</td></tr>`;
  }).join("")}</tbody></table>`;
  const schedule = `<div class="schedule-columns">${renderTable(options.papers.slice(0, midpoint), 0)}${options.papers.length > 1 ? renderTable(options.papers.slice(midpoint), midpoint) : ""}</div>`;
  const venue = `<div class="venue">${options.examCenter ? `<span><span class="label">Examination venue</span><b>${escapeHtml(options.examCenter)}</b></span>` : ""}${options.reportingTime ? `<span style="margin-left:auto"><span class="label">Reporting time</span><b>${escapeHtml(options.reportingTime)}</b></span>` : ""}</div>`;
  const signature = (source: string | null, title: string) => {
    const url = imageUrl(source);
    return `<div class="signature">${url ? `<img src="${url}" alt="${title} signature">` : '<div class="signature-space"></div>'}<div class="signature-title">${title}</div></div>`;
  };
  const renderSlip = (student: SlipStudent) => {
    const rollNumber = student.roll_number != null ? String(student.roll_number).padStart(2, "0") : `ST-${student.id}`;
    const url = imageUrl(student.image);
    const photo = `<div class="photo">${url ? `<img src="${url}" alt="Candidate photo" style="width:100%;height:100%;object-fit:cover">` : "CANDIDATE<br>PHOTO"}</div>`;
    return `<article class="slip">
<header><div class="brand"><img src="/logo.jpg" alt="KIPS logo"><div><strong>KIPS SCHOOL</strong><small>Chunian Campus</small></div></div><div class="document"><strong>ROLL NUMBER SLIP</strong><small>Academic session ${escapeHtml(options.sessionName)}</small></div><div class="header-helpline">Helpline: <b>${escapeHtml(options.helpline)}</b></div></header>

<div class="profile"><div class="details"><div><span class="label">Candidate name</span><span class="value name">${escapeHtml(student.name)}</span></div><div><span class="label">Father’s name</span><span class="value">${escapeHtml(student.father_name || "—")}</span></div><div><span class="label">Class &amp; section</span><span class="value">${escapeHtml(student.academy_class?.name || options.className)} · ${escapeHtml(student.section?.name || "Regular")}</span></div><div><span class="label">Session</span><span class="value">${escapeHtml(options.sessionName)}</span></div></div><div class="roll"><span class="label">Roll number</span><strong>${escapeHtml(rollNumber)}</strong></div>${photo}</div>
${venue}
<div><div class="section-label">EXAMINATION SCHEDULE</div>${schedule}</div>

<div class="rules"><div class="instructions-left"><b>IMPORTANT INSTRUCTIONS</b><div class="instruction-flow">${options.rules.map(rule => `<span>${escapeHtml(rule)}</span>`).join("")}</div></div><div class="urdu" lang="ur" dir="rtl">واجبات کی ادائیگی کے بغیر امتحان میں بیٹھنے کی اجازت نہیں ہے۔</div></div>
<div class="signatures">${signature(options.controllerSign, "Controller of Exams")}${signature(options.principalSign, "Campus Principal")}</div>

</article>`;
  };
  let pages = "";
  for (let index = 0; index < options.students.length; index += 2) {
    pages += `<main class="sheet${preview ? " preview-sheet" : ""}">${renderSlip(options.students[index])}${options.students[index + 1] ? `<div class="cut">CUT ALONG DOTTED LINE</div>${renderSlip(options.students[index + 1])}` : ""}</main>`;
  }
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Roll Number Slips — ${escapeHtml(options.className)}</title><style>${slipStyles}</style></head><body>${pages}</body></html>`;
}

const slipStyles = `
@font-face{font-family:Urdu;src:url('/jameel-noori-nastaleeq.ttf')}
@page{size:A4 portrait;margin:6mm 8mm}
*{box-sizing:border-box;print-color-adjust:exact;-webkit-print-color-adjust:exact}
body{margin:0;background:white;color:#172d42;font-family:Arial,Helvetica,sans-serif}
.sheet{width:194mm;min-height:281mm;margin:0 auto;break-after:page}
.sheet:last-child{break-after:auto}.preview-sheet{min-height:0;break-after:auto}
.slip{position:relative;isolation:isolate;min-height:136mm;padding:6mm 6mm;display:flex;flex-direction:column;gap:8px;background:white;border:1px solid #cbd5e1;break-inside:avoid;overflow-wrap:anywhere}
.slip>*{flex-shrink:0}
.slip:before{content:'';position:absolute;top:0;left:0;right:0;height:12mm;z-index:-1;background-repeat:no-repeat;background-size:100% 100%;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 50' preserveAspectRatio='none'%3E%3Cpath fill='%23bfdbfe' d='M0 0H800V48H530C440 48 418 10 320 10H0Z'/%3E%3Cpath fill='%232563eb' d='M0 0H800V45H550C465 45 443 4 340 4H0Z'/%3E%3Cg fill='none' stroke='%2393c5fd' stroke-width='1.5'%3E%3Cpath d='M630 16l-12 7 12 7zM658 16l-12 7 12 7zM686 16l-12 7 12 7zM714 16l-12 7 12 7zM742 16l-12 7 12 7zM770 16l-12 7 12 7z'/%3E%3C/g%3E%3C/svg%3E")}
header{position:relative;display:flex;align-items:center;justify-content:space-between;min-height:58px;padding-bottom:5px;border-bottom:1px solid #dce4e9}
.brand{display:flex;align-items:center;gap:10px}.brand img{width:52px;height:52px;object-fit:contain}.brand strong{font-size:17px;letter-spacing:.5px;color:#1e3a8a}.brand small{display:block;font-size:9px;margin-top:3px;color:#637585}
.document{position:absolute;left:50%;bottom:5px;transform:translateX(-50%);text-align:center;white-space:nowrap;line-height:1.3}.document strong{font-size:10px;letter-spacing:.6px;color:#1e3a8a}.document small{font-size:9px;color:#637585}.document small:before{content:' · ';padding:0 5px;color:#94a3b8}
.header-helpline{position:absolute;right:0;bottom:5px;font-size:9px;line-height:1.3;color:#526783;white-space:nowrap}.header-helpline b{color:#1e3a8a}
.profile{display:grid;grid-template-columns:minmax(0,1fr) 92px 49px;gap:12px;align-items:center;padding:7px 10px;background:#f5f8ff;border:1px solid #e0e7ec;border-radius:5px}
.details{display:grid;grid-template-columns:1fr 1fr;gap:5px 14px}.label{display:block;font-size:8px;letter-spacing:.8px;text-transform:uppercase;color:#637585;margin-bottom:3px}.value{font-size:11px;font-weight:700}.name{font-size:13px}.roll{border-left:1px solid #d4dfe5;padding-left:12px}.roll strong{display:block;font-size:26px;letter-spacing:1px;line-height:1.1}.photo{height:54px;overflow:hidden;border:1px dashed #b8c7d1;display:flex;align-items:center;justify-content:center;text-align:center;font-size:7px;line-height:1.6;color:#728391;background:white}
.venue{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:2px;font-size:10px}.venue>span{display:flex;align-items:baseline;gap:7px}.venue .label{display:inline;margin:0;font-size:9px;letter-spacing:0;text-transform:none}.venue .label:after{content:':'}.venue b{font-size:10px}
.section-label{font-size:9px;font-weight:700;letter-spacing:1.2px;color:#2563eb;margin-bottom:4px}
.schedule-columns{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;align-items:start}
table{border-collapse:collapse;width:100%;table-layout:fixed}th{text-align:left;background:#2563eb;color:white;font-size:6.5px;letter-spacing:0;padding:7px 3px;overflow-wrap:anywhere}td{font-size:8px;padding:8px 3px;vertical-align:top;border-bottom:1px solid #e1e7eb;overflow-wrap:anywhere}tbody tr:nth-child(even){background:#f6f8fa}tr{break-inside:avoid}td:first-child{color:#7b8995}td:nth-child(2){font-weight:700}td:nth-child(4){font-size:7.5px}th:nth-child(1){width:7%}th:nth-child(2){width:26%}th:nth-child(3){width:25%}th:nth-child(4){width:30%}th:nth-child(5){width:12%}th:last-child,td:last-child{text-align:center}
.rules{display:grid;grid-template-columns:1.65fr 1fr;gap:16px;align-items:center;padding:8px 0;border-top:1px solid #dce6f5;border-bottom:1px solid #dce6f5;font-size:9px;line-height:1.5;color:#4b5d6d}.rules b{font-size:8px;letter-spacing:.6px;color:#1e40af}.instruction-flow{margin-top:5px}.instruction-flow span{display:block;position:relative;padding-left:10px;margin-bottom:3px}.instruction-flow span:before{content:'•';position:absolute;left:0;color:#2563eb;font-weight:bold}.urdu{font-family:Urdu,serif;font-size:17px;line-height:1.9;text-align:right;border-left:1px solid #dce6f5;padding-left:14px;color:#1e3a8a}
.signatures{display:flex;justify-content:space-between;gap:24px;margin-top:auto;padding-top:13px;padding-bottom:2px}.signature{width:160px;padding-top:4px;font-size:9px;font-weight:700;color:#1e3a8a}.signature img{height:24px;max-width:140px;object-fit:contain;display:block;margin:0 auto 4px}.signature-space{height:28px}.signature-title{border-top:1px solid #8698a6;padding-top:5px}
.cut{height:9mm;display:flex;align-items:center;justify-content:center;gap:12px;color:#8a99a4;font-size:8px;letter-spacing:1px}.cut:before,.cut:after{content:'';flex:1;border-top:1px dashed #bdc8d0}
`;
