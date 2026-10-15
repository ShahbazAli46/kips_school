# Result Summary Sheet & Section Summary — Complete Feature Implementation Specification

> **Target Audience / Purpose:**  
> This document is a complete, 100% comprehensive implementation blueprint. It details the data architecture, calculations, backend endpoints, frontend components, printable stylesheets, and Excel export engines for the **Result Summary Sheet** and **Section Summary** features. Pass this file to another LLM session to replicate the feature identically in another project.

---

## 1. Feature Overview

The system provides two levels of result analytics and institutional reporting:

1. **Multi-Round Result Summary Sheet (Full Spreadsheet)**:
   - A multi-round institutional matrix spreadsheet mirroring the Excel template (`2.xlsx`).
   - Displays all students as rows, with subjects grouped horizontally.
   - Under each subject, it shows columns for each test round (`Round 1`, `Round 2`, ..., `Round 5` or custom rounds), followed by subject totals: **T.M** (Total Obtained), **%** (Obtained Percentage), and **Grade**.
   - Concludes with grand totals on the far right: **T.M** (Grand Total Obtained), **% age** (Overall Percentage), **Grade**, and **Position** (Class Rank).
   - Features conduction dates, max marks header rows, and elective subject handling (e.g., Biology vs. Computer).
   - Exportable to formatted Excel (`.xlsx`) and printable on A4 Landscape with dynamic zoom auto-scaling.

2. **Section Summary (Subject-Wise Performance Analysis)**:
   - A concise institutional report designed for administrators, teachers, and directors.
   - Shows performance aggregated per subject across all selected/conducted rounds.
   - **Metrics per Subject**: `Subject`, `Total Marks`, `Class Avg Score`, `Avg %`, and `Pass Rate (%)` ($\ge 40\%$).
   - Header with Campus Letterhead, Class Incharge, Session, Section, and Total Students.
   - Official 3-signatory sign-off footer (*Class Incharge*, *Examination Controller*, *Principal / Director*).
   - Exportable to Excel (`.xlsx`) and printable on A4 Portrait.

---

## 2. Institutional Grading Scale & Formulas

### 2.1 Grading Thresholds
All calculations (individual test marks, subject totals, student grand totals, and class summaries) follow this standard grading scale:

| Grade | Score Range | Minimum % | Maximum % | Description |
| :---: | :---: | :---: | :---: | :--- |
| **A+** | `90% and Above` | $90.0\%$ | $100.0\%$ | Exceptional |
| **A** | `80% to 89.9%` | $80.0\%$ | $89.99\%$ | Excellent |
| **B** | `70% to 79.9%` | $70.0\%$ | $79.99\%$ | Very Good |
| **C** | `60% to 69.9%` | $60.0\%$ | $69.99\%$ | Good / Satisfactory |
| **D** | `40% to 59.9%` | $40.0\%$ | $59.99\%$ | Passing Grade |
| **Fail** | `Below 40%` | $0.0\%$ | $39.99\%$ | Failed (Threshold is $40\%$) |

```php
function calculateGrade(float $percentage): string {
    if ($percentage >= 90.0) return 'A+';
    if ($percentage >= 80.0) return 'A';
    if ($percentage >= 70.0) return 'B';
    if ($percentage >= 60.0) return 'C';
    if ($percentage >= 40.0) return 'D';
    return 'Fail';
}
```

### 2.2 Subject-Wise Performance Formulas
For each subject:
- **Total Marks**: Sum of maximum marks for that subject across all selected/conducted rounds:
  $$\text{Total Marks} = \sum \text{Test Max Marks}$$
- **Appeared Students**: Students enrolled in the class who take this subject and for whom tests were scheduled ($\text{Total Max Marks} > 0$).
- **Class Avg Score**: Average marks obtained by appeared students:
  $$\text{Class Avg Score} = \frac{\sum \text{Student Obtained Marks in Subject}}{\text{Number of Appeared Students}} \quad (\text{rounded to } 1 \text{ decimal})$$
- **Avg %**: Average percentage achieved in this subject:
  $$\text{Avg \%} = \frac{\text{Class Avg Score}}{\text{Subject Total Marks}} \times 100 \quad (\text{rounded to } 1 \text{ decimal})$$
- **Pass Rate (%)**: Percentage of appeared students achieving a passing grade ($\ge 40\%$):
  $$\text{Pass Rate (\%)} = \frac{\text{Count of Students with Subject Percentage} \ge 40\%}{\text{Number of Appeared Students}} \times 100 \quad (\text{rounded to } 1 \text{ decimal})$$

### 2.3 Student Grand Total & Dense Ranking
- **Grand Total Obtained**: Sum of obtained marks across all applicable subjects. Absent is treated as $0$ with flag `is_absent = true`.
- **Grand Total Max**: Sum of total max marks of all subjects applicable to that specific student.
- **Percentage**:
  $$\text{Percentage} = \frac{\text{Grand Total Obtained}}{\text{Grand Total Max}} \times 100 \quad (\text{rounded to } 2 \text{ decimals})$$
- **Position / Rank**: Dense ranking ordered descending by $\text{Percentage} \times 100,000 + \text{Grand Total Obtained}$. Students with 0 tests or all absent receive `-`.

---

## 3. Backend Architecture (Laravel API)

### 3.1 Route Registration (`routes/api.php`)
```php
Route::get('/results/summary-sheet', [ResultController::class, 'getSummarySheetResults']);
Route::get('/results/rounds', [ResultController::class, 'getAvailableRounds']);
```

### 3.2 Endpoint: `GET /api/results/summary-sheet`
#### Query Parameters:
- `academic_session_id` (required, int)
- `academy_class_id` (required, int)
- `test_category_id` (required, string/int: category ID or type e.g. `class_test`, `school_test`, `rnt`)
- `section_id` (optional, int: section ID or omitted for all sections)
- `rounds` (optional, string: comma-separated round names, or `'none'`)

#### Logic Workflow:
1. **Fetch Class & Section Enrolled Students**:
   Query active students (`status = 1`, `deleted_at IS NULL`) ordered by numeric roll number.
2. **Fetch Tests & Conduction Dates**:
   Query all tests matching session, class, category, and section. Extract distinct rounds (`dbRounds`).
3. **Resolve Rounds**:
   - If `rounds` parameter is passed, filter to those exact rounds.
   - If not passed, use conducted rounds or pad up to standard 5-round template (`Round 1` to `Round 5`).
4. **Identify Class Subjects & Electives**:
   Cross-reference subjects configured for the class (`class_subject`) with subjects having tests. Order core subjects (English, Urdu, Math, Science, Islamiat, etc.).
5. **Collate Student Marks**:
   Build matrix of marks per student per subject per round. Account for elective subject group exclusions (e.g. Bio student doesn't take Computer).
6. **Calculate Class Ranks**:
   Sort students by score descending and assign dense ranks (1, 2, 3...).
7. **Compute Section Summary Analytics**:
   Precompute `subject_performance` (Subject, Total Marks, Class Avg Score, Avg %, Pass Rate) and `grade_breakdown` (A+, A, B, C, D, Fail counts and %).
8. **Resolve Class Incharge**:
   Look up `teacher_assignments` where `is_class_incharge = 1` for the specified class & section.

#### Sample JSON Response:
```json
{
  "session": { "id": 1, "name": "Session 2026-2027" },
  "class": { "id": 17, "name": "Grade 10" },
  "section": { "id": 2, "name": "Achievers" },
  "category_type": "school_test",
  "category_name": "School Test",
  "class_incharge": "Naila Areej",
  "rounds": ["Round 1", "Round 2"],
  "subjects": [
    {
      "id": 1,
      "name": "English",
      "total_max_marks": 100,
      "rounds": [
        { "round_title": "Round 1", "max_marks": 50, "date": "15/10" },
        { "round_title": "Round 2", "max_marks": 50, "date": "22/10" }
      ]
    }
  ],
  "grand_total_max": 500,
  "students": [
    {
      "student_id": 101,
      "student_name": "Mahnoor Aslam",
      "father_name": "Aslam Khan",
      "roll_number": "1",
      "section_name": "Achievers",
      "subjects": {
        "1": {
          "rounds": [
            { "round_title": "Round 1", "obtained_marks": 42, "is_absent": false },
            { "round_title": "Round 2", "obtained_marks": 45, "is_absent": false }
          ],
          "total_obtained": 87,
          "total_max": 100,
          "percentage": 87.0,
          "grade": "A"
        }
      },
      "grand_total_obtained": 435,
      "grand_total_max": 500,
      "percentage": 87.0,
      "grade": "A",
      "position": 1
    }
  ],
  "analytics": {
    "total_appeared": 31,
    "subject_performance": [
      {
        "subject_id": 1,
        "subject_name": "English",
        "total_marks": 100,
        "class_avg_score": 66.7,
        "avg_percentage": 66.7,
        "pass_rate": 100.0,
        "appeared_count": 31,
        "passed_count": 31
      }
    ]
  }
}
```

---

## 4. Frontend Architecture (Next.js & React)

### 4.1 Page Routes
| Route | Purpose | View Type |
| :--- | :--- | :--- |
| `/dashboard/results/summary` | Main interactive summary page with filters, KPI cards, and view toggle | Interactive Web View |
| `/dashboard/results/summary/print` | Full multi-round spreadsheet print page with auto-fit zoom scaling | Printable A4 Landscape |
| `/dashboard/results/summary/section-summary/print` | Section Summary print page (Subject-wise performance table) | Printable A4 Portrait |

### 4.2 State & RTK Query Hooks (`store/apiSlice.ts`)
```ts
getSummarySheetResults: builder.query<any, {
  session: string;
  classId: string;
  category: string;
  type?: string;
  section?: string;
  rounds?: string;
}>({
  query: (params) => {
    let url = `/results/summary-sheet?academic_session_id=${params.session}&academy_class_id=${params.classId}&test_category_id=${params.category}`;
    if (params.section && params.section !== 'all') url += `&section_id=${params.section}`;
    if (params.rounds && params.rounds !== 'none') url += `&rounds=${encodeURIComponent(params.rounds)}`;
    return url;
  },
  providesTags: ['Results'],
}),
```

---

## 5. UI & Component Design

### 5.1 Main Page (`/dashboard/results/summary`)
1. **Top Header**:
   - Back button pointing to `/dashboard/results` preserving active query parameters.
   - Title: `Result Summary Sheet` with description.
   - Action Buttons:
     - `Section Summary` (toggles between Full Sheet and Section Summary).
     - `Export Excel (.xlsx)` (downloads appropriate formatted workbook).
     - `Print Summary Sheet` / `Print Section Summary` (opens dedicated printable window).
2. **Filter Bar**:
   - Dropdowns for `Session`, `Class`, `Type` (`class_test`, `school_test`, `rnt`), and `Section`.
   - Category selection pills (All Categories or individual category tabs).
   - Test rounds selector with buttons: `Select All`, `Conducted Only`, and `Clear`.
3. **KPI Summary Cards**:
   - Total Students (`Users` icon)
   - Passed Students (`CheckCircle2` icon)
   - Overall Class Average % (`TrendingUp` icon)
   - Position #1 Student Name & Percentage (`Award` icon)
4. **Segmented View Tabs**:
   - `Detailed Multi-Round Summary Sheet` (active by default).
   - `Section Summary (Analytics & Grades)` (concise subject performance view).

---

## 6. Printable Sheets Design & CSS Engines

### 6.1 Section Summary Print Page (`/dashboard/results/summary/section-summary/print`)
- **Print Dimensions & Margins**:
  ```css
  @media print {
    @page {
      size: A4 portrait;
      margin: 10mm 12mm;
    }
    body {
      background: white !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .no-print {
      display: none !important;
    }
  }
  ```
- **Campus Letterhead**:
  - Left: Logo / monogram badge with Institution Name: `KIPS SCHOOL CHUNIAN CAMPUS` and subtext `Opposite Shell Pump Manga Road, Chunian | 0300 39 39 581`.
  - Right: `Class Incharge: [Teacher Name]` and `Total Students: [Count]`.
- **Title Banner**:
  - `RESULT ANALYTICS & SUBJECT-WISE PERFORMANCE` (Serif/Sans bold uppercase).
  - Info bar: `CLASS: [Name] | SECTION: [Name] | SESSION: [Name]`.
- **Subject-Wise Performance Analysis Table**:
  - Table Header: Dark Navy (`#1b4d89`), text white, bold uppercase.
  - Columns:
    1. `Subject` (Left-aligned, bold text)
    2. `Total Marks` (Centered)
    3. `Class Avg Score` (Centered, bold)
    4. `Avg %` (Centered, bold blue-900)
    5. `Pass Rate (%)` (Centered, bold: green if $\ge 90\%$, blue if $\ge 75\%$, red if $< 75\%$)
- **Signatory Footer**:
  - 3 signature blocks aligned horizontally:
    1. `Class Incharge`
    2. `Examination Controller`
    3. `Principal / Director`

### 6.2 Full Multi-Round Summary Print Page (`/dashboard/results/summary/print`)
- **Landscape Margins & Trimming**:
  ```css
  @page {
    size: A4 landscape;
    margin: 4mm 4mm 4mm 4mm;
  }
  ```
- **Dynamic Auto-Fit Zoom Engine**:
  To guarantee that classes with 8+ subjects and multiple rounds never cut off or split horizontally:
  ```ts
  const targetPrintWidth = 1090; // A4 landscape width at 96 DPI minus margins
  const actualTableWidth = tableRef.current.scrollWidth;

  if (actualTableWidth > targetPrintWidth) {
    const factor = Math.max(0.4, Number((targetPrintWidth / actualTableWidth).toFixed(3)));
    setCalculatedZoom(factor);
  }
  ```
  Applied to the printable container as:
  ```tsx
  <div style={{ zoom: effectiveZoom, width: "100%", margin: "0 auto" }}>
  ```
- **Interactive Print Toolbar (Hidden on print)**:
  - Toggle: `Conducted Tests Only` vs `Full Template (5 Rounds)`
  - Scale Selector: `Auto Fit Width`, `100%`, `90%`, `80%`, `70%`, `60%`, `50%`
  - `Print Now` and `Close` buttons.

---

## 7. Excel Export (`xlsx`) Engine

Using SheetJS (`xlsx`), data is compiled into an Array-of-Arrays (AOA) with precise merge ranges:

### 7.1 Multi-Round Spreadsheet Merges
```ts
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet(rows);

ws["!merges"] = [
  { s: { r: 1, c: 0 }, e: { r: 1, c: 22 } },                     // Title A2:W2
  { s: { r: 1, c: 23 }, e: { r: 1, c: 23 + subjects.length * 9 } }, // Session X2:...
  { s: { r: 2, c: 0 }, e: { r: 6, c: 0 } },                     // Roll No A3:A7
  { s: { r: 2, c: 1 }, e: { r: 6, c: 1 } },                     // Student Name B3:B7
  // Dynamic merges per subject group header across rounds + TM + % + Grade
];

XLSX.utils.book_append_sheet(wb, ws, "Summary Sheet");
XLSX.writeFile(wb, `Summary_Sheet_${className}_${sessionName}.xlsx`);
```

### 7.2 Section Summary Excel Export
```ts
const rows: any[][] = [];
rows.push(["RESULT ANALYTICS & SUBJECT-WISE PERFORMANCE"]);
rows.push([`Class: ${className}`, `Session: ${sessionName}`, `Section: ${sectionName}`, `Total Students: ${totalAppeared}`]);
rows.push([]);
rows.push(["Subject-Wise Performance Analysis"]);
rows.push(["Subject", "Total Marks", "Class Avg Score", "Avg %", "Pass Rate (%)"]);

subjectPerformance.forEach((s) => {
  rows.push([s.subject_name, s.total_marks, s.class_avg_score, s.avg_percentage, s.pass_rate]);
});

const ws = XLSX.utils.aoa_to_sheet(rows);
XLSX.utils.book_append_sheet(wb, ws, "Section Summary");
XLSX.writeFile(wb, `Section_Summary_${className}_${sessionName}.xlsx`);
```

---

## 8. Checklist for Replicating in Other Projects

1. [ ] **Backend Route**: Register `GET /api/results/summary-sheet` in API routing.
2. [ ] **Backend Controller**: Implement `getSummarySheetResults()` with student loop, subject grouping, rank mapping, and analytics computation.
3. [ ] **Grading Scale**: Ensure $\ge 90\%$ is `A+`, $80-89.9\%$ is `A`, $70-79.9\%$ is `B`, $60-69.9\%$ is `C`, $40-59.9\%$ is `D`, and $< 40\%$ is `Fail`.
4. [ ] **RTK Query / API Client**: Add `getSummarySheetResults` query hook.
5. [ ] **Navigation & Sidebar**: Add "Result Summary" link under the Results sidebar menu.
6. [ ] **Results Index Page**: Add quick-action button in header of main results series page linking to `/dashboard/results/summary`.
7. [ ] **Summary Page**: Build `/dashboard/results/summary/page.tsx` with filter bar, KPI cards, segmented tabs, and multi-round table.
8. [ ] **Print Page (Spreadsheet)**: Build `/dashboard/results/summary/print/page.tsx` with A4 landscape auto-fit zoom scaling.
9. [ ] **Print Page (Section Summary)**: Build `/dashboard/results/summary/section-summary/print/page.tsx` with A4 portrait styling, campus letterhead, subject performance table, and 3-signatory footer.
10. [ ] **Excel Export**: Verify `.xlsx` download works with SheetJS (`xlsx`) without layout distortion.
