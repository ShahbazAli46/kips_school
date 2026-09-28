"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import CustomDropdown from "@/components/CustomDropdown";
import * as XLSX from "xlsx";

// ─── Interfaces & Types ───────────────────────────────────────────────────────
interface Subject {
  id: string;
  name: string;
  color: string;
  syllabus: string[];
}

interface Holiday {
  id: string;
  name: string;
  fromDate: string;
  toDate: string;
}

interface ScheduleEntry {
  id: string;
  date: string; // YYYY-MM-DD
  dayName: string;
  type: "test" | "revision" | "holiday";
  subject?: string;
  subjectColor?: string;
  testNo?: string;
  syllabus?: string;
  description?: string; // For holidays/revisions
}

interface SavedScheduleItem {
  id: number | string;
  title: string;
  class_name?: string;
  session_name?: string;
  updated_at?: string;
  settings: any;
  subjects: Subject[];
  holidays: Holiday[];
  schedule: ScheduleEntry[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function ScheduleGeneratorPage() {
  // ─── Main State ─────────────────────────────────────────────────────────────
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [savedSchedules, setSavedSchedules] = useState<SavedScheduleItem[]>([]);
  const [activeScheduleId, setActiveScheduleId] = useState<number | string | null>(null);

  // Settings state
  const [startDate, setStartDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [excludedDays, setExcludedDays] = useState<number[]>([0, 6]); // Sun(0), Sat(6)
  const [chaptersPerTest, setChaptersPerTest] = useState<number>(1);
  const [maxTestsPerDay, setMaxTestsPerDay] = useState<number>(1);
  const [revisionInterval, setRevisionInterval] = useState<number>(0);
  const [rotateMondaySubjects, setRotateMondaySubjects] = useState<boolean>(true);
  const [repeatHeaderOnPrint, setRepeatHeaderOnPrint] = useState<boolean>(true);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState<boolean>(false);

  // Header & Branding Metadata State
  const [scheduleTitle, setScheduleTitle] = useState<string>("KIPS SCHOOL CHUNIAN CAMPUS");
  const [academySubtitle, setAcademySubtitle] = useState<string>("Top's First Choice");
  const [sessionName, setSessionName] = useState<string>("First Term Test Session 2026");
  const [className, setClassName] = useState<string>("Class 10 - Matric");
  const [academyAddress, setAcademyAddress] = useState<string>("Academy Address, Street No 1");
  const [academyMobile, setAcademyMobile] = useState<string>("0300-1234567");
  const [excellenceYears, setExcellenceYears] = useState<string>("13");
  const [excellenceSuffix, setExcellenceSuffix] = useState<string>("th");
  const [logoLeft, setLogoLeft] = useState<string>("");
  const [logoRight, setLogoRight] = useState<string>("");
  const [rightLogoMode, setRightLogoMode] = useState<"emblem" | "custom">("emblem");

  // Form Inputs State
  const [subjectNameInput, setSubjectNameInput] = useState<string>("");
  const [subjectColorInput, setSubjectColorInput] = useState<string>("#2563eb");
  const [subjectSyllabusInput, setSubjectSyllabusInput] = useState<string>("");

  // Modals state
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState<boolean>(false);
  const [holidayName, setHolidayName] = useState<string>("");
  const [holidayFromDate, setHolidayFromDate] = useState<string>("");
  const [holidayToDate, setHolidayToDate] = useState<string>("");

  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editRowIndex, setEditRowIndex] = useState<number | null>(null);
  const [editDate, setEditDate] = useState<string>("");
  const [editType, setEditType] = useState<"test" | "revision" | "holiday">("test");
  const [editSubject, setEditSubject] = useState<string>("");
  const [editTestNo, setEditTestNo] = useState<string>("");
  const [editSyllabus, setEditSyllabus] = useState<string>("");

  const [isSavedModalOpen, setIsSavedModalOpen] = useState<boolean>(false);
  const [apiLoading, setApiLoading] = useState<boolean>(false);

  // Search & filter states for Saved Schedules Library modal
  const [searchSavedTitle, setSearchSavedTitle] = useState<string>("");
  const [searchSavedSession, setSearchSavedSession] = useState<string>("");
  const [searchSavedClass, setSearchSavedClass] = useState<string>("");

  // Custom Delete Confirmation Modal state
  const [deleteTargetSchedule, setDeleteTargetSchedule] = useState<SavedScheduleItem | null>(null);
  const [deleteScheduleLoading, setDeleteScheduleLoading] = useState<boolean>(false);

  // Drag & drop state for row reordering
  const [draggedRowIndex, setDraggedRowIndex] = useState<number | null>(null);

  // File input refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoLeftInputRef = useRef<HTMLInputElement>(null);
  const logoRightInputRef = useRef<HTMLInputElement>(null);

  // ─── Fetch Saved Schedules from Database ─────────────────────────────────────
  const fetchSavedSchedules = useCallback(async () => {
    setApiLoading(true);
    try {
      const res = await fetch(`${API_BASE}/generated-schedules`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setSavedSchedules(data);
      }
    } catch (err) {
      console.error("Failed to fetch saved schedules from API:", err);
      // Fallback to localStorage
      const local = localStorage.getItem("savedSchedules");
      if (local) {
        try { setSavedSchedules(JSON.parse(local)); } catch {}
      }
    } finally {
      setApiLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSavedSchedules();
  }, [fetchSavedSchedules]);

  // ─── Subject Management ──────────────────────────────────────────────────────
  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectNameInput.trim() || !subjectSyllabusInput.trim()) return;

    const chapters = subjectSyllabusInput
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    const newSub: Subject = {
      id: "sub_" + Date.now() + "_" + Math.random().toString(36).substring(2, 5),
      name: subjectNameInput.trim(),
      color: subjectColorInput,
      syllabus: chapters,
    };

    setSubjects((prev) => [...prev, newSub]);
    setSubjectNameInput("");
    setSubjectSyllabusInput("");
  };

  const handleRemoveSubject = (id: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
  };

  // ─── Excel / CSV File Import ─────────────────────────────────────────────────
  const handleImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (!json || json.length < 2) {
          alert("Excel file appears to be empty or missing header row.");
          return;
        }

        // Palette for imported subjects
        const colorPalette = [
          "#2563eb", "#2563eb", "#059669", "#7c3aed",
          "#d97706", "#dc2626", "#0891b2", "#4b5563"
        ];

        const importedSubjects: Subject[] = [];
        const headers = json[0].map((h: any) => String(h || "").trim().toLowerCase());
        
        let subIndex = headers.findIndex((h: string) => h.includes("subject"));
        let sylIndex = headers.findIndex((h: string) => h.includes("syllabus") || h.includes("chapter") || h.includes("unit"));

        if (subIndex === -1) subIndex = 0;
        if (sylIndex === -1) sylIndex = 1;

        const subMap: { [key: string]: string[] } = {};

        for (let i = 1; i < json.length; i++) {
          const row = json[i];
          if (!row || row.length === 0) continue;
          const subName = String(row[subIndex] || "").trim();
          const sylVal = String(row[sylIndex] || "").trim();

          if (subName) {
            if (!subMap[subName]) subMap[subName] = [];
            if (sylVal) subMap[subName].push(sylVal);
          }
        }

        let idx = 0;
        Object.keys(subMap).forEach((name) => {
          importedSubjects.push({
            id: "sub_" + Date.now() + "_" + idx,
            name: name,
            color: colorPalette[idx % colorPalette.length],
            syllabus: subMap[name].length > 0 ? subMap[name] : ["Chapter 1"],
          });
          idx++;
        });

        if (importedSubjects.length > 0) {
          setSubjects((prev) => [...prev, ...importedSubjects]);
          alert(`Successfully imported ${importedSubjects.length} subject(s)!`);
        } else {
          alert("No valid subjects found in file.");
        }
      } catch (err) {
        console.error(err);
        alert("Failed to parse Excel file. Please ensure it is a valid .xlsx or .csv.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // ─── Holiday Management ──────────────────────────────────────────────────────
  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayName.trim() || !holidayFromDate) return;

    const newH: Holiday = {
      id: "hol_" + Date.now(),
      name: holidayName.trim(),
      fromDate: holidayFromDate,
      toDate: holidayToDate || holidayFromDate,
    };

    setHolidays((prev) => [...prev, newH]);
    setHolidayName("");
    setHolidayFromDate("");
    setHolidayToDate("");
    setIsHolidayModalOpen(false);
  };

  const handleRemoveHoliday = (id: string) => {
    setHolidays((prev) => prev.filter((h) => h.id !== id));
  };

  // ─── Schedule Generation Algorithm ─────────────────────────────────────────
  const generateSchedule = () => {
    if (subjects.length === 0) {
      alert("Please add at least one subject first!");
      return;
    }

    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    let currDate = new Date(startDate + "T00:00:00");
    const newSchedule: ScheduleEntry[] = [];

    // Clone subject chapter queues
    const subjectQueues = subjects.map((sub) => ({
      ...sub,
      chapters: [...sub.syllabus],
      testCount: 0,
    }));

    let totalTestsRemaining = subjectQueues.reduce((sum, q) => sum + q.chapters.length, 0);
    let subjectIdx = 0;
    let testsSinceLastRevision = 0;

    // Helper to check holiday
    const isHolidayDate = (d: Date) => {
      const iso = d.toISOString().split("T")[0];
      return holidays.find((h) => {
        return iso >= h.fromDate && iso <= (h.toDate || h.fromDate);
      });
    };

    let safetyCounter = 0;
    while (totalTestsRemaining > 0 && safetyCounter < 1000) {
      safetyCounter++;
      const dayOfWeek = currDate.getDay();
      const isoDate = currDate.toISOString().split("T")[0];

      // Check Excluded Day
      if (excludedDays.includes(dayOfWeek)) {
        currDate.setDate(currDate.getDate() + 1);
        continue;
      }

      // Check Holiday
      const matchedHoliday = isHolidayDate(currDate);
      if (matchedHoliday) {
        newSchedule.push({
          id: "entry_" + Date.now() + "_" + Math.random().toString(36).substring(2, 5),
          date: isoDate,
          dayName: dayNames[dayOfWeek],
          type: "holiday",
          description: matchedHoliday.name,
        });
        currDate.setDate(currDate.getDate() + 1);
        continue;
      }

      // Check Revision Day
      if (revisionInterval > 0 && testsSinceLastRevision >= revisionInterval) {
        newSchedule.push({
          id: "entry_" + Date.now() + "_" + Math.random().toString(36).substring(2, 5),
          date: isoDate,
          dayName: dayNames[dayOfWeek],
          type: "revision",
          description: "Revision Day / Preparation",
        });
        testsSinceLastRevision = 0;
        currDate.setDate(currDate.getDate() + 1);
        continue;
      }

      // Monday Subject Rotation preference
      if (rotateMondaySubjects && dayOfWeek === 1 && subjectQueues.length > 1) {
        // Pick sub with lowest tests done or first eligible
        let minTestSubIdx = subjectIdx;
        let minTests = Infinity;
        for (let i = 0; i < subjectQueues.length; i++) {
          if (subjectQueues[i].chapters.length > 0 && subjectQueues[i].testCount < minTests) {
            minTests = subjectQueues[i].testCount;
            minTestSubIdx = i;
          }
        }
        subjectIdx = minTestSubIdx;
      }

      // Schedule tests for current day
      let testsForToday = 0;
      while (testsForToday < maxTestsPerDay && totalTestsRemaining > 0) {
        // Find next subject with remaining chapters
        let attempts = 0;
        while (subjectQueues[subjectIdx].chapters.length === 0 && attempts < subjectQueues.length) {
          subjectIdx = (subjectIdx + 1) % subjectQueues.length;
          attempts++;
        }

        if (subjectQueues[subjectIdx].chapters.length === 0) break;

        const sub = subjectQueues[subjectIdx];
        sub.testCount += 1;
        const testNoStr = `T${sub.testCount}`;

        // Take chapters per test
        const chaptersTaken: string[] = [];
        for (let c = 0; c < chaptersPerTest && sub.chapters.length > 0; c++) {
          chaptersTaken.push(sub.chapters.shift()!);
          totalTestsRemaining--;
        }

        newSchedule.push({
          id: "entry_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
          date: isoDate,
          dayName: dayNames[dayOfWeek],
          type: "test",
          subject: sub.name,
          subjectColor: sub.color,
          testNo: testNoStr,
          syllabus: chaptersTaken.join(", "),
        });

        testsForToday++;
        testsSinceLastRevision++;
        subjectIdx = (subjectIdx + 1) % subjectQueues.length;
      }

      currDate.setDate(currDate.getDate() + 1);
    }

    setSchedule(newSchedule);
  };

  // Recalculate schedule dates if user changes start date or excluded days
  const recalculateDates = () => {
    if (schedule.length === 0) return;
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    let currDate = new Date(startDate + "T00:00:00");

    const updated = schedule.map((entry) => {
      while (excludedDays.includes(currDate.getDay())) {
        currDate.setDate(currDate.getDate() + 1);
      }
      const dayOfWeek = currDate.getDay();
      const isoDate = currDate.toISOString().split("T")[0];
      const res = {
        ...entry,
        date: isoDate,
        dayName: dayNames[dayOfWeek],
      };
      currDate.setDate(currDate.getDate() + 1);
      return res;
    });

    setSchedule(updated);
  };

  // ─── Row Drag & Drop Reordering ──────────────────────────────────────────────
  const handleDragStart = (idx: number) => {
    setDraggedRowIndex(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedRowIndex === null || draggedRowIndex === idx) return;

    const updated = [...schedule];
    const item = updated.splice(draggedRowIndex, 1)[0];
    updated.splice(idx, 0, item);
    setDraggedRowIndex(idx);
    setSchedule(updated);
  };

  const handleDragEnd = () => {
    setDraggedRowIndex(null);
    recalculateDates();
  };

  // ─── Edit Entry Modal ────────────────────────────────────────────────────────
  const openEditModal = (idx: number) => {
    const item = schedule[idx];
    setEditRowIndex(idx);
    setEditDate(item.date);
    setEditType(item.type);
    setEditSubject(item.subject || (subjects[0]?.name || ""));
    setEditTestNo(item.testNo || "T1");
    setEditSyllabus(item.syllabus || item.description || "");
    setIsEditModalOpen(true);
  };

  const handleEditRowSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editRowIndex === null) return;

    const updated = [...schedule];
    const subObj = subjects.find((s) => s.name === editSubject);

    if (editType === "test") {
      updated[editRowIndex] = {
        ...updated[editRowIndex],
        type: "test",
        subject: editSubject,
        subjectColor: subObj?.color || "#2563eb",
        testNo: editTestNo,
        syllabus: editSyllabus,
        description: undefined,
      };
    } else if (editType === "revision") {
      updated[editRowIndex] = {
        ...updated[editRowIndex],
        type: "revision",
        subject: undefined,
        testNo: undefined,
        syllabus: undefined,
        description: editSyllabus || "Revision Day",
      };
    } else {
      updated[editRowIndex] = {
        ...updated[editRowIndex],
        type: "holiday",
        subject: undefined,
        testNo: undefined,
        syllabus: undefined,
        description: editSyllabus || "Custom Holiday",
      };
    }

    setSchedule(updated);
    setIsEditModalOpen(false);
  };

  const handleRemoveRow = (idx: number) => {
    const updated = schedule.filter((_, i) => i !== idx);
    setSchedule(updated);
  };

  const handleAddManualRow = () => {
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const lastDateStr = schedule.length > 0 ? schedule[schedule.length - 1].date : startDate;
    let nextDate = new Date(lastDateStr + "T00:00:00");
    nextDate.setDate(nextDate.getDate() + 1);

    while (excludedDays.includes(nextDate.getDay())) {
      nextDate.setDate(nextDate.getDate() + 1);
    }

    const sub = subjects[0] || { name: "Custom Subject", color: "#2563eb" };
    const newEntry: ScheduleEntry = {
      id: "entry_" + Date.now(),
      date: nextDate.toISOString().split("T")[0],
      dayName: dayNames[nextDate.getDay()],
      type: "test",
      subject: sub.name,
      subjectColor: sub.color,
      testNo: "T" + (schedule.length + 1),
      syllabus: "Custom Syllabus Topic",
    };

    setSchedule((prev) => [...prev, newEntry]);
  };

  // ─── Save & Load Project (API + LocalStorage) ────────────────────────────────
  const handleSaveScheduleToDB = async () => {
    if (schedule.length === 0) {
      alert("No schedule generated yet to save!");
      return;
    }

    const payload = {
      title: scheduleTitle,
      class_name: className,
      session_name: sessionName,
      settings: {
        startDate,
        excludedDays,
        chaptersPerTest,
        maxTestsPerDay,
        revisionInterval,
        rotateMondaySubjects,
        repeatHeaderOnPrint,
        scheduleTitle,
        academySubtitle,
        sessionName,
        className,
        academyAddress,
        academyMobile,
        excellenceYears,
        excellenceSuffix,
        logoLeft,
        logoRight,
        rightLogoMode,
      },
      subjects,
      holidays,
      schedule,
    };

    setApiLoading(true);
    try {
      let res;
      if (activeScheduleId) {
        res = await fetch(`${API_BASE}/generated-schedules/${activeScheduleId}`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${API_BASE}/generated-schedules`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        const savedItem = await res.json();
        setActiveScheduleId(savedItem.id);
        alert(`Schedule "${scheduleTitle} - ${sessionName}" saved successfully to database!`);
        fetchSavedSchedules();
      } else {
        throw new Error("API Save Error");
      }
    } catch (err) {
      console.error("Save error:", err);
      // LocalStorage Fallback
      const localItem: SavedScheduleItem = {
        id: activeScheduleId || "local_" + Date.now(),
        ...payload,
        updated_at: new Date().toISOString(),
      };
      const updatedList = [...savedSchedules.filter((s) => s.id !== localItem.id), localItem];
      setSavedSchedules(updatedList);
      localStorage.setItem("savedSchedules", JSON.stringify(updatedList));
      alert(`Schedule saved locally!`);
    } finally {
      setApiLoading(false);
    }
  };

  const handleLoadSchedule = (item: SavedScheduleItem) => {
    setActiveScheduleId(item.id);
    if (item.title) setScheduleTitle(item.title);
    if (item.class_name) setClassName(item.class_name);
    if (item.session_name) setSessionName(item.session_name);

    if (item.settings) {
      if (item.settings.startDate) setStartDate(item.settings.startDate);
      if (item.settings.excludedDays) setExcludedDays(item.settings.excludedDays);
      if (item.settings.chaptersPerTest) setChaptersPerTest(item.settings.chaptersPerTest);
      if (item.settings.maxTestsPerDay) setMaxTestsPerDay(item.settings.maxTestsPerDay);
      if (item.settings.revisionInterval) setRevisionInterval(item.settings.revisionInterval);
      if (item.settings.rotateMondaySubjects !== undefined) setRotateMondaySubjects(item.settings.rotateMondaySubjects);
      if (item.settings.repeatHeaderOnPrint !== undefined) setRepeatHeaderOnPrint(item.settings.repeatHeaderOnPrint);
      if (item.settings.academySubtitle) setAcademySubtitle(item.settings.academySubtitle);
      if (item.settings.academyAddress) setAcademyAddress(item.settings.academyAddress);
      if (item.settings.academyMobile) setAcademyMobile(item.settings.academyMobile);
      if (item.settings.excellenceYears) setExcellenceYears(item.settings.excellenceYears);
      if (item.settings.excellenceSuffix) setExcellenceSuffix(item.settings.excellenceSuffix);
      if (item.settings.logoLeft) setLogoLeft(item.settings.logoLeft);
      if (item.settings.logoRight) setLogoRight(item.settings.logoRight);
      if (item.settings.rightLogoMode) setRightLogoMode(item.settings.rightLogoMode);
    }

    if (item.subjects) setSubjects(item.subjects);
    if (item.holidays) setHolidays(item.holidays);
    if (item.schedule) setSchedule(item.schedule);

    setIsSavedModalOpen(false);
  };

  const confirmDeleteSavedSchedule = async () => {
    if (!deleteTargetSchedule) return;
    setDeleteScheduleLoading(true);
    const id = deleteTargetSchedule.id;

    try {
      await fetch(`${API_BASE}/generated-schedules/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteScheduleLoading(false);
    }

    const updated = savedSchedules.filter((s) => s.id !== id);
    setSavedSchedules(updated);
    localStorage.setItem("savedSchedules", JSON.stringify(updated));
    if (activeScheduleId === id) setActiveScheduleId(null);
    setDeleteTargetSchedule(null);
  };

  const handleCreateNewSchedule = () => {
    setActiveScheduleId(null);
    setSchedule([]);
    setSubjects([]);
    setHolidays([]);
  };

  // ─── Export to Excel ─────────────────────────────────────────────────────────
  const handleExportExcel = () => {
    if (schedule.length === 0) return;

    const data: any[][] = [];
    // Header block
    data.push([scheduleTitle.toUpperCase()]);
    data.push([academySubtitle]);
    data.push([`Address: ${academyAddress} | Mobile: ${academyMobile}`]);
    data.push([`${className} - ${sessionName}`]);
    data.push([]); // blank row

    // Table Header
    data.push(["Date", "Day", "Subject", "Test No", "Test Syllabus"]);

    // Table Data
    schedule.forEach((row) => {
      if (row.type === "test") {
        data.push([row.date, row.dayName, row.subject || "", row.testNo || "", row.syllabus || ""]);
      } else if (row.type === "revision") {
        data.push([row.date, row.dayName, "REVISION DAY", "-", row.description || "Preparation"]);
      } else {
        data.push([row.date, row.dayName, "HOLIDAY", "-", row.description || "Custom Off-Day"]);
      }
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Schedule");
    XLSX.writeFile(wb, `${scheduleTitle.replace(/\s+/g, "_")}_Schedule.xlsx`);
  };

  // ─── Print / PDF Trigger ─────────────────────────────────────────────────────
  const handlePrint = () => {
    window.print();
  };

  // Image Upload Handlers
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, target: "left" | "right") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const url = evt.target?.result as string;
      if (target === "left") setLogoLeft(url);
      else {
        setLogoRight(url);
        setRightLogoMode("custom");
      }
    };
    reader.readAsDataURL(file);
  };

  // Excluded Weekdays Checkbox Toggle
  const toggleExcludedDay = (dayNum: number) => {
    setExcludedDays((prev) =>
      prev.includes(dayNum) ? prev.filter((d) => d !== dayNum) : [...prev, dayNum]
    );
  };

  return (
    <DashboardLayout>
      <div className="schedule-generator-wrapper min-h-screen text-[#0f224a]">
        
        {/* Page Top Action Bar (No-Print) */}
        <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-[#bfdbfe] shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2563eb]/10 flex items-center justify-center text-[#2563eb]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#0f224a]">Test Schedule Generator</h1>
              <p className="text-xs text-[#1e40af]">Automated round-robin exam & revision timetable creator</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsSavedModalOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-700 border border-amber-500/20 hover:bg-amber-500/20 transition flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 19a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2v11a2 2 0 01-2 2H5z" />
              </svg>
              Saved Library ({savedSchedules.length})
            </button>

            <button
              onClick={handleCreateNewSchedule}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600/10 text-emerald-700 border border-emerald-600/20 hover:bg-emerald-600/20 transition flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Project
            </button>

            <button
              onClick={handleSaveScheduleToDB}
              disabled={apiLoading || schedule.length === 0}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-[#2563eb] hover:bg-[#1e3a8a] disabled:opacity-50 transition flex items-center gap-1.5 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              {apiLoading ? "Saving..." : "Save to Database"}
            </button>
          </div>
        </div>

        {/* Main Grid: Sidebar Controls & Table Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Sidebar Controls Pane (No-Print) */}
          <aside className="lg:col-span-4 no-print space-y-5">
            
            {/* Subject Management Card */}
            <div className="p-5 rounded-2xl bg-white border border-[#bfdbfe] shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-2 border-b border-[#bfdbfe]/50 text-[#2563eb] font-bold">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <h2>Subjects & Syllabus</h2>
              </div>

              <form onSubmit={handleAddSubject} className="space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-[#1e40af] mb-1">Subject Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Mathematics"
                      value={subjectNameInput}
                      onChange={(e) => setSubjectNameInput(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-sm rounded-xl border border-[#bfdbfe] focus:outline-none focus:border-[#2563eb]"
                    />
                  </div>
                  <div className="w-16">
                    <label className="block text-xs font-semibold text-[#1e40af] mb-1">Color</label>
                    <input
                      type="color"
                      value={subjectColorInput}
                      onChange={(e) => setSubjectColorInput(e.target.value)}
                      className="w-full h-9 p-0.5 rounded-xl border border-[#bfdbfe] cursor-pointer bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1e40af] mb-1">
                    Syllabus Chapters <span className="text-[10px] font-normal text-gray-500">(one per line or comma separated)</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder={`Chapter 1\nChapter 2\nChapter 3`}
                    value={subjectSyllabusInput}
                    onChange={(e) => setSubjectSyllabusInput(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm rounded-xl border border-[#bfdbfe] focus:outline-none focus:border-[#2563eb]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-[#2563eb] hover:bg-[#1e3a8a] transition shadow-sm flex items-center justify-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Add Subject
                </button>
              </form>

              {/* Added Subjects List */}
              <div className="pt-2">
                <h3 className="text-xs font-bold text-[#1e40af] mb-2">Added Subjects ({subjects.length})</h3>
                {subjects.length === 0 ? (
                  <p className="text-xs italic text-gray-400">No subjects added yet.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {subjects.map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between p-2.5 rounded-xl bg-[#fdf8f5] border border-[#bfdbfe]/60">
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: sub.color }} />
                          <span className="text-xs font-bold text-[#0f224a] truncate">{sub.name}</span>
                          <span className="text-[10px] text-gray-500 shrink-0">({sub.syllabus.length} chapters)</span>
                        </div>
                        <button
                          onClick={() => handleRemoveSubject(sub.id)}
                          className="text-red-500 hover:text-red-700 text-xs font-bold px-1.5 py-0.5 rounded hover:bg-red-50"
                          title="Remove subject"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Excel Drag & Drop Import Card */}
            <div className="p-5 rounded-2xl bg-white border border-[#bfdbfe] shadow-sm space-y-3">
              <div className="flex items-center gap-2.5 text-[#2563eb] font-bold">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <h2>Import from Excel / CSV</h2>
              </div>
              
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-6 rounded-xl border-2 border-dashed border-[#bfdbfe] bg-[#fdf8f5] hover:bg-[#bfdbfe]/20 transition cursor-pointer text-center space-y-2"
              >
                <svg className="w-8 h-8 mx-auto text-[#2563eb]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-xs font-semibold text-[#1e3a8a]">
                  Drag & drop Excel sheet or <span className="text-[#2563eb] underline">browse file</span>
                </p>
                <p className="text-[10px] text-gray-500">Supports .xlsx, .xls, and .csv formats</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleImportFile(e.target.files[0]);
                  }}
                />
              </div>
            </div>

            {/* Scheduler Rules & Configuration Card */}
            <div className="p-5 rounded-2xl bg-white border border-[#bfdbfe] shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-2 border-b border-[#bfdbfe]/50 text-[#2563eb] font-bold">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <h2>Schedule Configuration</h2>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1e40af] mb-1">Test Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      recalculateDates();
                    }}
                    required
                    className="w-full px-3 py-2 text-sm rounded-xl border border-[#bfdbfe] focus:outline-none focus:border-[#2563eb]"
                  />
                </div>

                {/* Exclude Weekdays Selector */}
                <div>
                  <label className="block text-xs font-semibold text-[#1e40af] mb-1">Exclude Weekdays</label>
                  <div className="grid grid-cols-7 gap-1">
                    {[
                      { num: 1, label: "M" },
                      { num: 2, label: "T" },
                      { num: 3, label: "W" },
                      { num: 4, label: "T" },
                      { num: 5, label: "F" },
                      { num: 6, label: "S" },
                      { num: 0, label: "S" },
                    ].map((d) => {
                      const isExcluded = excludedDays.includes(d.num);
                      return (
                        <button
                          key={d.num}
                          type="button"
                          onClick={() => toggleExcludedDay(d.num)}
                          className={`h-9 rounded-lg text-xs font-bold transition border ${
                            isExcluded
                              ? "bg-[#2563eb] text-white border-[#2563eb]"
                              : "bg-[#fdf8f5] text-[#1e40af] border-[#bfdbfe] hover:bg-[#bfdbfe]/40"
                          }`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Holidays List & Trigger */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-[#1e40af]">Holidays & Off-Days</label>
                    <button
                      type="button"
                      onClick={() => setIsHolidayModalOpen(true)}
                      className="text-xs font-semibold text-[#2563eb] hover:underline"
                    >
                      + Add Holiday
                    </button>
                  </div>
                  {holidays.length === 0 ? (
                    <p className="text-xs italic text-gray-400">No holidays set.</p>
                  ) : (
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {holidays.map((h) => (
                        <div key={h.id} className="flex items-center justify-between text-xs p-1.5 rounded bg-amber-50 border border-amber-200">
                          <span className="font-medium text-amber-900 truncate">{h.name} ({h.fromDate})</span>
                          <button onClick={() => handleRemoveHoliday(h.id)} className="text-red-500 font-bold px-1">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Toggle Advanced Options */}
                <button
                  type="button"
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  className="w-full text-xs font-semibold text-[#2563eb] hover:underline flex items-center justify-between pt-1"
                >
                  <span>{showAdvancedOptions ? "Hide Advanced Options" : "Show Advanced Options"}</span>
                  <svg className={`w-4 h-4 transform transition-transform ${showAdvancedOptions ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showAdvancedOptions && (
                  <div className="p-3 rounded-xl bg-[#fdf8f5] border border-[#bfdbfe] space-y-3 text-xs">
                    <div>
                      <label className="block font-semibold text-[#1e40af] mb-1">Chapters per Test</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={chaptersPerTest}
                        onChange={(e) => setChaptersPerTest(parseInt(e.target.value) || 1)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#bfdbfe]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#1e40af] mb-1">Max Tests per Day</label>
                      <input
                        type="number"
                        min={1}
                        max={5}
                        value={maxTestsPerDay}
                        onChange={(e) => setMaxTestsPerDay(parseInt(e.target.value) || 1)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#bfdbfe]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#1e40af] mb-1">Revision Day Interval</label>
                      <input
                        type="number"
                        min={0}
                        max={30}
                        value={revisionInterval}
                        onChange={(e) => setRevisionInterval(parseInt(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#bfdbfe]"
                      />
                      <span className="text-[10px] text-gray-500">Insert revision day every N test days (0 = disabled)</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="rot-mon"
                        checked={rotateMondaySubjects}
                        onChange={(e) => setRotateMondaySubjects(e.target.checked)}
                        className="rounded accent-[#2563eb]"
                      />
                      <label htmlFor="rot-mon" className="font-semibold text-[#1e40af]">Rotate Monday Subjects</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="rep-hdr"
                        checked={repeatHeaderOnPrint}
                        onChange={(e) => setRepeatHeaderOnPrint(e.target.checked)}
                        className="rounded accent-[#2563eb]"
                      />
                      <label htmlFor="rep-hdr" className="font-semibold text-[#1e40af]">Repeat Header Card on Print/PDF</label>
                    </div>
                  </div>
                )}

                {/* Generate Button */}
                <button
                  type="button"
                  onClick={generateSchedule}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#2563eb] to-[#1e3a8a] hover:opacity-95 shadow-md flex items-center justify-center gap-2 mt-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L5.6 15.12a2 2 0 01-1.022-.547l-2.387-.477M12 4.5v15m0-15l3 3m-3-3L9 7.5" />
                  </svg>
                  Generate Schedule
                </button>
              </div>
            </div>
          </aside>

          {/* Main Table & Printable Workspace */}
          <main className="lg:col-span-8 bg-white p-6 rounded-2xl border border-[#bfdbfe] shadow-sm space-y-6">
            
            {/* Toolbar Actions (No-Print) */}
            <div className="no-print flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#bfdbfe]/60">
              <div>
                <h2 className="text-lg font-bold text-[#0f224a]">Generated Test Schedule</h2>
                <p className="text-xs text-gray-500">Drag rows to reorder sequence. Changes auto-update dates.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddManualRow}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                >
                  + Add Day
                </button>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  disabled={schedule.length === 0}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50 transition flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export Excel
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={schedule.length === 0}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#2563eb] text-white hover:bg-[#1e3a8a] disabled:opacity-50 transition flex items-center gap-1 shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print / Save PDF
                </button>
              </div>
            </div>

            {/* High-Fidelity Printable Header Card */}
            <div className="academy-header-card relative p-6 rounded-2xl border-2 border-[#2563eb] bg-gradient-to-br from-[#fffdfa] to-[#fdf4ee] text-center space-y-3">
              
              {/* Left Logo / Emblem */}
              <div className="absolute left-6 top-6 cursor-pointer" onClick={() => logoLeftInputRef.current?.click()} title="Click to upload or change left logo">
                <img
                  src={logoLeft || "/logo.png"}
                  alt="Academy Logo"
                  className="w-16 h-16 object-contain rounded-full border border-[#2563eb]/20 bg-white/80 p-0.5 shadow-sm"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/logo.png";
                  }}
                />
                <input type="file" ref={logoLeftInputRef} accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e, "left")} />
              </div>

              {/* Right Logo / Emblem */}
              <div className="absolute right-6 top-6 cursor-pointer" onClick={() => logoRightInputRef.current?.click()} title="Click to upload right logo">
                {rightLogoMode === "custom" && logoRight ? (
                  <img src={logoRight} alt="Custom Emblem" className="w-16 h-16 object-contain" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-[#2563eb] text-amber-200 flex flex-col items-center justify-center font-serif leading-none shadow-md border-2 border-amber-300">
                    <div className="text-lg font-extrabold flex items-baseline">
                      <span contentEditable suppressContentEditableWarning onBlur={(e) => setExcellenceYears(e.currentTarget.innerText)}>
                        {excellenceYears}
                      </span>
                      <span contentEditable suppressContentEditableWarning className="text-[10px]" onBlur={(e) => setExcellenceSuffix(e.currentTarget.innerText)}>
                        {excellenceSuffix}
                      </span>
                    </div>
                    <span className="text-[7px] tracking-tighter uppercase font-sans mt-0.5">YEARS</span>
                  </div>
                )}
                <input type="file" ref={logoRightInputRef} accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e, "right")} />
              </div>

              {/* Center Content */}
              <div className="px-20 space-y-1">
                <h1
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => setScheduleTitle(e.currentTarget.innerText)}
                  className="text-2xl sm:text-3xl font-extrabold font-serif tracking-tight text-[#0f224a] outline-none"
                >
                  {scheduleTitle}
                </h1>
                <p
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => setAcademySubtitle(e.currentTarget.innerText)}
                  className="text-xs font-semibold tracking-wider text-[#2563eb] uppercase outline-none"
                >
                  {academySubtitle}
                </p>

                <div className="text-[11px] text-[#1e40af] font-medium pt-1 flex items-center justify-center gap-2 flex-wrap">
                  <span>Address:</span>
                  <span contentEditable suppressContentEditableWarning onBlur={(e) => setAcademyAddress(e.currentTarget.innerText)} className="font-semibold outline-none">
                    {academyAddress}
                  </span>
                  <span>|</span>
                  <span>Mobile:</span>
                  <span contentEditable suppressContentEditableWarning onBlur={(e) => setAcademyMobile(e.currentTarget.innerText)} className="font-semibold outline-none">
                    {academyMobile}
                  </span>
                </div>

                <div className="pt-2 flex items-center justify-center gap-3">
                  <span
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => setClassName(e.currentTarget.innerText)}
                    className="px-3 py-1 rounded-full bg-[#2563eb] text-white text-xs font-bold shadow-sm outline-none"
                  >
                    {className}
                  </span>
                  <span className="text-gray-400">•</span>
                  <span
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => setSessionName(e.currentTarget.innerText)}
                    className="px-3 py-1 rounded-full bg-amber-100 text-[#1e3a8a] text-xs font-bold border border-amber-300 outline-none"
                  >
                    {sessionName}
                  </span>
                </div>
              </div>
            </div>

            {/* Schedule Table */}
            {schedule.length === 0 ? (
              <div className="p-12 text-center text-gray-400 border-2 border-dashed border-[#bfdbfe] rounded-2xl">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm font-semibold text-[#1e3a8a]">No Schedule Generated</p>
                <p className="text-xs">Add subjects on the left and click "Generate Schedule" to build your timetable.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[#bfdbfe]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#2563eb] text-white font-bold">
                      <th className="p-3 w-8 no-print"></th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Day</th>
                      <th className="p-3">Subject</th>
                      <th className="p-3 text-center">Test No</th>
                      <th className="p-3">Test Syllabus</th>
                      <th className="p-3 text-right no-print">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#bfdbfe]/60 font-medium text-[#0f224a]">
                    {schedule.map((row, idx) => (
                      <tr
                        key={row.id || idx}
                        draggable
                        onDragStart={() => handleDragStart(idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDragEnd={handleDragEnd}
                        className={`hover:bg-[#fdf8f5] transition ${
                          row.type === "revision" ? "bg-amber-50/70" : row.type === "holiday" ? "bg-red-50/70" : ""
                        }`}
                      >
                        <td className="p-3 cursor-grab text-gray-400 no-print" title="Drag to reorder">
                          :::
                        </td>
                        <td className="p-3 whitespace-nowrap font-semibold">{row.date}</td>
                        <td className="p-3 whitespace-nowrap">{row.dayName}</td>
                        <td className="p-3 whitespace-nowrap font-bold">
                          {row.type === "test" ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: row.subjectColor || "#2563eb" }} />
                              {row.subject}
                            </span>
                          ) : row.type === "revision" ? (
                            <span className="text-amber-800 font-bold">REVISION DAY</span>
                          ) : (
                            <span className="text-red-700 font-bold">HOLIDAY</span>
                          )}
                        </td>
                        <td className="p-3 text-center font-bold">
                          {row.type === "test" ? (
                            <span className="px-2 py-0.5 rounded bg-gray-100 border text-gray-800">{row.testNo}</span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="p-3">
                          {row.type === "test" ? row.syllabus : row.description}
                        </td>
                        <td className="p-3 text-right no-print whitespace-nowrap">
                          <button
                            onClick={() => openEditModal(idx)}
                            className="text-indigo-600 hover:text-indigo-900 font-bold px-2 py-1"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleRemoveRow(idx)}
                            className="text-red-600 hover:text-red-900 font-bold px-2 py-1 ml-1"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </main>
        </div>

        {/* ─── MODALS ───────────────────────────────────────────────────────────── */}

        {/* Holiday Modal */}
        {isHolidayModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm no-print">
            <div className="w-full max-w-md p-6 bg-white rounded-2xl border border-[#bfdbfe] shadow-2xl space-y-4">
              <h2 className="text-lg font-bold text-[#0f224a]">Add Custom Holiday</h2>
              <form onSubmit={handleAddHoliday} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1e40af] mb-1">Holiday Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Winter Break"
                    value={holidayName}
                    onChange={(e) => setHolidayName(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm rounded-xl border border-[#bfdbfe]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#1e40af] mb-1">From Date</label>
                    <input
                      type="date"
                      value={holidayFromDate}
                      onChange={(e) => setHolidayFromDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-sm rounded-xl border border-[#bfdbfe]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1e40af] mb-1">To Date (Optional)</label>
                    <input
                      type="date"
                      value={holidayToDate}
                      onChange={(e) => setHolidayToDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-[#bfdbfe]"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsHolidayModalOpen(false)}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold border border-gray-300 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-[#2563eb] hover:bg-[#1e3a8a]"
                  >
                    Add Holiday
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Entry Modal */}
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm no-print">
            <div className="w-full max-w-md p-6 bg-white rounded-2xl border border-[#bfdbfe] shadow-2xl space-y-4">
              <h2 className="text-lg font-bold text-[#0f224a]">Edit Schedule Entry</h2>
              <form onSubmit={handleEditRowSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1e40af] mb-1">Date</label>
                  <input type="text" value={editDate} readOnly className="w-full px-3 py-2 text-sm rounded-xl bg-gray-100 border text-gray-600" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1e40af] mb-1">Entry Type</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-[#bfdbfe]"
                  >
                    <option value="test">Test Day</option>
                    <option value="revision">Revision Day</option>
                    <option value="holiday">Custom Holiday</option>
                  </select>
                </div>

                {editType === "test" && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-[#1e40af] mb-1">Subject</label>
                      <select
                        value={editSubject}
                        onChange={(e) => setEditSubject(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-xl border border-[#bfdbfe]"
                      >
                        {subjects.map((s) => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#1e40af] mb-1">Test No</label>
                      <input
                        type="text"
                        value={editTestNo}
                        onChange={(e) => setEditTestNo(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-xl border border-[#bfdbfe]"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[#1e40af] mb-1">Syllabus / Details</label>
                  <input
                    type="text"
                    value={editSyllabus}
                    onChange={(e) => setEditSyllabus(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-[#bfdbfe]"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold border border-gray-300 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-[#2563eb] hover:bg-[#1e3a8a]"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Saved Schedules Library Modal */}
        {isSavedModalOpen && (() => {
          const uniqueSessions = Array.from(new Set(savedSchedules.map((s) => s.session_name).filter((x): x is string => Boolean(x))));
          const uniqueClasses = Array.from(new Set(savedSchedules.map((s) => s.class_name).filter((x): x is string => Boolean(x))));

          const filteredSavedSchedules = savedSchedules.filter((item) => {
            const matchesTitle = !searchSavedTitle || (item.title && item.title.toLowerCase().includes(searchSavedTitle.toLowerCase()));
            const matchesSession = !searchSavedSession || item.session_name === searchSavedSession;
            const matchesClass = !searchSavedClass || item.class_name === searchSavedClass;
            return matchesTitle && matchesSession && matchesClass;
          });

          const hasActiveFilters = searchSavedTitle || searchSavedSession || searchSavedClass;

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm no-print">
              <div className="w-full max-w-3xl p-6 bg-white rounded-2xl border border-[#bfdbfe] shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <h2 className="text-lg font-bold text-[#0f224a]">Saved Schedules Library</h2>
                    <p className="text-xs text-gray-500">Manage, search, load, or delete saved schedules stored in database</p>
                  </div>
                  <button onClick={() => setIsSavedModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold text-lg">✕</button>
                </div>

                {/* Filter Controls: Session, Class, and Name */}
                <div className="bg-[#fdf8f5] p-3.5 rounded-xl border border-[#bfdbfe] space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-[#1e40af] mb-1">Session</label>
                      <CustomDropdown
                        name="searchSavedSession"
                        value={searchSavedSession}
                        onChange={(_, val) => setSearchSavedSession(String(val))}
                        placeholder={`All Sessions (${uniqueSessions.length})`}
                        options={[
                          { label: `All Sessions (${uniqueSessions.length})`, value: "" },
                          ...uniqueSessions.map((session) => ({ label: String(session), value: String(session) })),
                        ]}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#1e40af] mb-1">Class</label>
                      <CustomDropdown
                        name="searchSavedClass"
                        value={searchSavedClass}
                        onChange={(_, val) => setSearchSavedClass(String(val))}
                        placeholder={`All Classes (${uniqueClasses.length})`}
                        options={[
                          { label: `All Classes (${uniqueClasses.length})`, value: "" },
                          ...uniqueClasses.map((cls) => ({ label: String(cls), value: String(cls) })),
                        ]}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#1e40af] mb-1">Search by Name</label>
                      <input
                        type="text"
                        value={searchSavedTitle}
                        onChange={(e) => setSearchSavedTitle(e.target.value)}
                        placeholder="Search schedule name..."
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#bfdbfe] bg-white text-gray-800 outline-none focus:border-[#2563eb]"
                      />
                    </div>
                  </div>

                  {hasActiveFilters && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-[#2563eb] font-semibold">
                        Showing {filteredSavedSchedules.length} of {savedSchedules.length} saved schedules
                      </span>
                      <button
                        onClick={() => {
                          setSearchSavedTitle("");
                          setSearchSavedSession("");
                          setSearchSavedClass("");
                        }}
                        className="text-[11px] text-red-600 font-bold hover:underline"
                      >
                        Clear Filters
                      </button>
                    </div>
                  )}
                </div>

                <div className="overflow-y-auto flex-1 space-y-3 pr-1">
                  {filteredSavedSchedules.length === 0 ? (
                    <p className="text-xs italic text-gray-400 text-center py-8">
                      {hasActiveFilters ? "No saved schedules match your search filters." : "No saved schedules found in database."}
                    </p>
                  ) : (
                    filteredSavedSchedules.map((item) => (
                      <div key={item.id} className="p-4 rounded-xl border border-[#bfdbfe] bg-[#fdf8f5] flex items-center justify-between gap-4 hover:border-[#2563eb] transition">
                        <div>
                          <h3 className="text-sm font-bold text-[#0f224a]">{item.title}</h3>
                          <p className="text-xs text-gray-600">
                            {item.class_name} • {item.session_name}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            Last Updated: {item.updated_at ? new Date(item.updated_at).toLocaleString() : "Recently"}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleLoadSchedule(item)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#2563eb] hover:bg-[#1e3a8a] transition"
                          >
                            Load
                          </button>
                          <button
                            onClick={() => setDeleteTargetSchedule(item)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 hover:bg-red-100 transition"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Custom Delete Confirmation Modal */}
        {deleteTargetSchedule && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm no-print">
            <div className="relative w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center bg-white border border-red-200 space-y-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto bg-red-50 text-red-600 border border-red-100 shadow-sm">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>

              <div>
                <h3 className="text-base font-bold text-gray-900">Delete Saved Schedule?</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Are you sure you want to delete <span className="font-semibold text-gray-800">&quot;{deleteTargetSchedule.title}&quot;</span> ({deleteTargetSchedule.class_name})? This action cannot be undone.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteTargetSchedule(null)}
                  disabled={deleteScheduleLoading}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteSavedSchedule}
                  disabled={deleteScheduleLoading}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition active:scale-95 disabled:opacity-50"
                >
                  {deleteScheduleLoading ? "Deleting..." : "Delete Schedule"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── PRINT ONLY STYLESHEET ─────────────────────────────────────────── */}
        <style jsx global>{`
          @media print {
            @page {
              margin: 15mm;
              size: auto;
            }
            html, body, main, section, div, .schedule-generator-wrapper, .academy-schedule-container {
              background: #ffffff !important;
              background-color: #ffffff !important;
              box-shadow: none !important;
              color: #000 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .no-print,
            aside,
            header,
            footer,
            nav,
            button,
            .fixed,
            [class*="fixed"],
            [class*="floating"],
            div[style*="position: fixed"] {
              display: none !important;
            }
            .academy-header-card {
              border: 2px solid #2563eb !important;
              background: #ffffff !important;
              margin-bottom: 16px !important;
              padding: 16px !important;
              border-radius: 16px !important;
              page-break-inside: avoid;
            }
            table {
              border: 1px solid #2563eb !important;
              width: 100% !important;
              margin: 0 !important;
            }
            th, td {
              border: 1px solid #bfdbfe !important;
              color: #000 !important;
              padding: 8px 12px !important;
            }
            th {
              background: #fdf8f5 !important;
              color: #0f224a !important;
              font-weight: 700 !important;
            }
          }
        `}</style>
      </div>
    </DashboardLayout>
  );
}
