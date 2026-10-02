"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import CustomDropdown from "@/components/CustomDropdown";
import CustomDatePicker from "@/components/CustomDatePicker";
import NumberInput from "@/components/NumberInput";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders(isFormData = false) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: any = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

export const STANDARD_FEE_HEADS = [
  // Row 1 (8 heads)
  { key: "adm_fee", label: "Adm Fee", defaultActual: 0 },
  { key: "security_fee", label: "Security Fee", defaultActual: 0 },
  { key: "tuition_fee", label: "Tuition Fee", defaultActual: 0 },
  { key: "lms_charges", label: "LMS Charges", defaultActual: 0 },
  { key: "ac_charges", label: "AC Charges", defaultActual: 0 },
  { key: "library_charges", label: "Library Charges", defaultActual: 0 },
  { key: "lim_charges", label: "LIM Charges", defaultActual: 0 },
  { key: "fine", label: "Fine", defaultActual: 0 },
  // Row 2 (7 heads)
  { key: "lab_charges", label: "Lab Charges", defaultActual: 0 },
  { key: "exam_charges", label: "Exam Charges", defaultActual: 0 },
  { key: "id_card_charges", label: "ID Card Charges", defaultActual: 0 },
  { key: "service_charges", label: "Service Charges", defaultActual: 0 },
  { key: "brd_reg_charges", label: "Brd Reg Charges", defaultActual: 0 },
  { key: "brd_adm_charges", label: "Brd Adm Charges", defaultActual: 0 },
  { key: "r_and_t_charges", label: "R & T Charges", defaultActual: 0 },
];

export const STREAM_OPTIONS = [
  { label: "Regular", value: "Regular" },
  { label: "Cambridge / O-Levels", value: "Cambridge" },
  { label: "Matric (Federal)", value: "Matric Federal" },
  { label: "Matric (Punjab)", value: "Matric Punjab" },
  { label: "Foundation / Pre-School", value: "Foundation" },
  { label: "Evening Shift", value: "Evening" },
];

export const GENDER_OPTIONS = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Other", value: "other" },
];

export const TF_MONTHS_OPTIONS = [
  { label: "1-MONTH", value: "1-MONTH" },
  { label: "2-MONTH", value: "2-MONTH" },
  { label: "3-MONTH", value: "3-MONTH" },
  { label: "6-MONTH", value: "6-MONTH" },
  { label: "12-MONTH", value: "12-MONTH" },
];

export const DISCRETIONARY_REASONS = [
  { label: "NONE", value: "NONE" },
  { label: "Sibling Discount (Kinship)", value: "Sibling Discount" },
  { label: "Staff Child Concession", value: "Staff Child" },
  { label: "Need-Based Financial Aid", value: "Need Based" },
  { label: "Principal Discretion", value: "Principal Discretion" },
  { label: "Orphan Student Concession", value: "Orphan" },
];

export const POLICY_DISCOUNT_OPTIONS = [
  { label: "NONE", value: "NONE" },
  { label: "Early Bird Admission (10%)", value: "Early Bird" },
  { label: "High Merit / Position Holder (25%)", value: "Merit Position" },
  { label: "Full Scholarship (100%)", value: "Full Scholarship" },
  { label: "Special Institutional Policy", value: "Special Policy" },
];

/**
 * Auto-formats Pakistani CNIC/B-Form (13 digits -> 5-7-1: XXXXX-XXXXXXX-X)
 */
export const formatCNIC = (value: string): string => {
  const digits = (value || "").replace(/\D/g, "").slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12, 13)}`;
};

/**
 * Auto-formats Pakistani Phone/Cell (11 digits -> 4-7: 03XX-XXXXXXX)
 */
export const formatPhone = (value: string): string => {
  const digits = (value || "").replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 4) return digits;
  return `${digits.slice(0, 4)}-${digits.slice(4, 11)}`;
};

/**
 * Blocks non-numeric keystrokes while allowing editing & navigation
 */
export const handleNumericOnlyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  const allowedKeys = [
    "Backspace",
    "Delete",
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Tab",
    "Enter",
    "Home",
    "End",
    "Escape",
  ];
  if (
    allowedKeys.includes(e.key) ||
    ((e.ctrlKey || e.metaKey) && ["a", "c", "v", "x", "z"].includes(e.key.toLowerCase()))
  ) {
    return;
  }
  if (!/^\d$/.test(e.key)) {
    e.preventDefault();
  }
};

const STEPS = [
  { number: 1, title: "Personal Data", subtitle: "Basic Student Profile" },
  { number: 2, title: "Admission Stream", subtitle: "Class, Section & Marks" },
  { number: 3, title: "Fee Structure", subtitle: "15 Fee Heads Matrix" },
  { number: 4, title: "Discounts & Payables", subtitle: "Calculation & Admission Fee" },
];

interface StudentAdmissionFormProps {
  initialData?: any | null;
  onSuccess: (student: any) => void;
  onCancel?: () => void;
}

export default function StudentAdmissionForm({ initialData, onSuccess, onCancel }: StudentAdmissionFormProps) {
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Dropdown Metadata
  const [classes, setClasses] = useState<any[]>([]);
  const [majors, setMajors] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(false);

  // Section 1: Personal Data
  const [personalData, setPersonalData] = useState({
    student_cnic: "",
    erp_reg: "",
    name: "",
    dob: "",
    father_cnic: "",
    father_name: "",
    current_address: "",
    contact_number: "", // Student Cell
    gender: "",
    father_cell: "",
    remarks: "",
  });

  // Section 2: Admission Stream
  const [streamData, setStreamData] = useState({
    stream_type: "Regular",
    class_id: "",
    section_id: "",
    major_id: "",
    academic_session_id: "",
    test_marks: "100",
    obtained_marks: "0",
    admission_month: new Date().toISOString().slice(0, 7), // YYYY-MM
  });

  // Section 3: Fee Structure Matrix (15 heads)
  const initialFeeMatrix = useMemo(() => {
    const matrix: Record<string, { actual: number; discount: number }> = {};
    STANDARD_FEE_HEADS.forEach((h) => {
      matrix[h.key] = { actual: h.defaultActual, discount: 0 };
    });
    return matrix;
  }, []);

  const [feeMatrix, setFeeMatrix] = useState<Record<string, { actual: number; discount: number }>>(initialFeeMatrix);

  // Section 4: Discounts & Payables Settings
  const [discountSettings, setDiscountSettings] = useState({
    is_prospectus_sold: false,
    is_marks_based_discount: false,
    is_discretionary_discount: false,
    is_policy_discount: false,
    selected_months_tf: "1-MONTH",
    tuition_fee_per_policy: "0",
    discretionary_discount_reason: "NONE",
    discretionary_discount_amount: "0",
    policy_discount_type: "NONE",
    policy_discount_amount: "0",
    amt_rec_at_admission: "0",
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [stepErrors, setStepErrors] = useState<Record<number, boolean>>({});
  const [createdStudent, setCreatedStudent] = useState<any | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);

  // Load Metadata (Classes, Majors, Sections, Sessions)
  const fetchMetadata = useCallback(async () => {
    setLoadingMeta(true);
    try {
      const [resCls, resMaj, resSec, resSes] = await Promise.all([
        fetch(`${API}/classes`, { headers: getAuthHeaders() }),
        fetch(`${API}/majors`, { headers: getAuthHeaders() }),
        fetch(`${API}/sections`, { headers: getAuthHeaders() }),
        fetch(`${API}/academic-sessions`, { headers: getAuthHeaders() }),
      ]);
      const [clsJson, majJson, secJson, sesJson] = await Promise.all([
        resCls.json(),
        resMaj.json(),
        resSec.json(),
        resSes.json(),
      ]);
      if (resCls.ok) setClasses(clsJson);
      if (resMaj.ok) setMajors(majJson);
      if (resSec.ok) setSections(secJson);
      const sessionList = sesJson.data || sesJson;
      if (resSes.ok) setSessions(Array.isArray(sessionList) ? sessionList : []);
    } catch (err) {
      console.error("Failed to load admission metadata", err);
    } finally {
      setLoadingMeta(false);
    }
  }, []);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  // Set default active session
  useEffect(() => {
    if (sessions.length > 0 && !streamData.academic_session_id) {
      const active = sessions.find((s) => s.is_active == 1) || sessions[0];
      if (active) {
        setStreamData((prev) => ({ ...prev, academic_session_id: String(active.id) }));
      }
    }
  }, [sessions, streamData.academic_session_id]);

  // Populate initialData if editing
  useEffect(() => {
    if (initialData) {
      setPersonalData({
        student_cnic: initialData.student_cnic ? formatCNIC(initialData.student_cnic) : "",
        erp_reg: initialData.erp_reg || "",
        name: initialData.name || "",
        dob: initialData.dob ? String(initialData.dob).slice(0, 10) : "",
        father_cnic: initialData.father_cnic ? formatCNIC(initialData.father_cnic) : "",
        father_name: initialData.father_name || "",
        current_address: initialData.current_address || "",
        contact_number: initialData.contact_number ? formatPhone(initialData.contact_number) : "",
        gender: initialData.gender || "",
        father_cell: initialData.father_cell ? formatPhone(initialData.father_cell) : "",
        remarks: initialData.remarks || "",
      });

      setStreamData({
        stream_type: initialData.stream_type || "Regular",
        class_id: initialData.class_id ? String(initialData.class_id) : "",
        section_id: initialData.section_id ? String(initialData.section_id) : "",
        major_id: initialData.major_id ? String(initialData.major_id) : "",
        academic_session_id: initialData.academic_session_id ? String(initialData.academic_session_id) : "",
        test_marks: initialData.test_marks != null ? String(initialData.test_marks) : "100",
        obtained_marks: initialData.obtained_marks != null ? String(initialData.obtained_marks) : "0",
        admission_month: initialData.admission_month || new Date().toISOString().slice(0, 7),
      });

      if (Array.isArray(initialData.fee_items)) {
        const matrix: Record<string, { actual: number; discount: number }> = { ...initialFeeMatrix };
        initialData.fee_items.forEach((fi: any) => {
          if (matrix[fi.head_key]) {
            matrix[fi.head_key] = {
              actual: Number(fi.actual_amount || 0),
              discount: Number(fi.discount_amount || 0),
            };
          }
        });
        setFeeMatrix(matrix);
      } else if (initialData.monthly_fee) {
        setFeeMatrix((prev) => ({
          ...prev,
          tuition_fee: { actual: Number(initialData.monthly_fee), discount: 0 },
        }));
      }

      setDiscountSettings({
        is_prospectus_sold: Boolean(initialData.is_prospectus_sold),
        is_marks_based_discount: Boolean(initialData.is_marks_based_discount),
        is_discretionary_discount: Boolean(initialData.is_discretionary_discount),
        is_policy_discount: Boolean(initialData.is_policy_discount),
        selected_months_tf: initialData.selected_months_tf || "1-MONTH",
        tuition_fee_per_policy: String(initialData.tuition_fee_per_policy || 0),
        discretionary_discount_reason: initialData.discretionary_discount_reason || "NONE",
        discretionary_discount_amount: String(initialData.discretionary_discount_amount || 0),
        policy_discount_type: initialData.policy_discount_type || "NONE",
        policy_discount_amount: String(initialData.policy_discount_amount || 0),
        amt_rec_at_admission: String(initialData.amount_received_at_admission || 0),
      });
    }
  }, [initialData, initialFeeMatrix]);

  // Dependent Filter: Sections for selected class
  const availableSections = useMemo(() => {
    if (!streamData.class_id) return [];
    const cls = classes.find((c) => String(c.id) === String(streamData.class_id));
    return cls?.sections || sections || [];
  }, [streamData.class_id, classes, sections]);

  // Fee Calculations
  const tfMultiplier = useMemo(() => {
    const val = discountSettings.selected_months_tf;
    if (val === "2-MONTH") return 2;
    if (val === "3-MONTH") return 3;
    if (val === "6-MONTH") return 6;
    if (val === "12-MONTH") return 12;
    return 1;
  }, [discountSettings.selected_months_tf]);

  const computedFeeSummary = useMemo(() => {
    let fullFeeAmount = 0;
    let headDiscountSum = 0;

    STANDARD_FEE_HEADS.forEach((h) => {
      const head = feeMatrix[h.key] || { actual: 0, discount: 0 };
      const actual = Number(head.actual) || 0;
      const discount = Number(head.discount) || 0;

      const scaledActual = h.key === "tuition_fee" ? actual * tfMultiplier : actual;
      const scaledDiscount = h.key === "tuition_fee" ? discount * tfMultiplier : discount;

      fullFeeAmount += scaledActual;
      headDiscountSum += scaledDiscount;
    });

    const discretionaryDisc = Number(discountSettings.discretionary_discount_amount) || 0;
    const policyDisc = Number(discountSettings.policy_discount_amount) || 0;

    const totalDiscountAmount = headDiscountSum + discretionaryDisc + policyDisc;
    const payableFee = Math.max(0, fullFeeAmount - totalDiscountAmount);

    const amtReceived = Number(discountSettings.amt_rec_at_admission) || 0;
    const balanceAmount = Math.max(0, payableFee - amtReceived);

    return {
      fullFeeAmount,
      totalDiscountAmount,
      payableFee,
      amtReceived,
      balanceAmount,
    };
  }, [feeMatrix, tfMultiplier, discountSettings]);

  // Validation per step
  const validateStep1 = () => {
    return Boolean(
      personalData.name.trim() &&
      personalData.dob &&
      personalData.father_name.trim() &&
      (personalData.father_cell.trim() || personalData.contact_number.trim()) &&
      personalData.gender
    );
  };

  const validateStep2 = () => {
    return Boolean(
      streamData.class_id &&
      streamData.section_id &&
      streamData.academic_session_id &&
      streamData.admission_month
    );
  };

  const handleNextStep = () => {
    setServerError("");
    if (currentStep === 1) {
      if (!validateStep1()) {
        setStepErrors((prev) => ({ ...prev, 1: true }));
        return;
      }
      setStepErrors((prev) => ({ ...prev, 1: false }));
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!validateStep2()) {
        setStepErrors((prev) => ({ ...prev, 2: true }));
        return;
      }
      setStepErrors((prev) => ({ ...prev, 2: false }));
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);
    }
  };

  const handlePrevStep = () => {
    setServerError("");
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFeeMatrixChange = (key: string, field: "actual" | "discount", value: string) => {
    const num = Math.max(0, parseFloat(value) || 0);
    setFeeMatrix((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: num,
      },
    }));
  };

  const handleResetForm = () => {
    if (confirm("Clear all entered data and start a new admission entry?")) {
      setPersonalData({
        student_cnic: "",
        erp_reg: "",
        name: "",
        dob: "",
        father_cnic: "",
        father_name: "",
        current_address: "",
        contact_number: "",
        gender: "",
        father_cell: "",
        remarks: "",
      });
      setStreamData({
        stream_type: "Regular",
        class_id: "",
        section_id: "",
        major_id: "",
        academic_session_id: sessions[0]?.id ? String(sessions[0].id) : "",
        test_marks: "100",
        obtained_marks: "0",
        admission_month: new Date().toISOString().slice(0, 7),
      });
      setFeeMatrix(initialFeeMatrix);
      setDiscountSettings({
        is_prospectus_sold: false,
        is_marks_based_discount: false,
        is_discretionary_discount: false,
        is_policy_discount: false,
        selected_months_tf: "1-MONTH",
        tuition_fee_per_policy: "0",
        discretionary_discount_reason: "NONE",
        discretionary_discount_amount: "0",
        policy_discount_type: "NONE",
        policy_discount_amount: "0",
        amt_rec_at_admission: "0",
      });
      setImageFile(null);
      setServerError("");
      setStepErrors({});
      setCurrentStep(1);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!validateStep1()) {
      setStepErrors((prev) => ({ ...prev, 1: true }));
      setCurrentStep(1);
      return;
    }

    if (!validateStep2()) {
      setStepErrors((prev) => ({ ...prev, 2: true }));
      setCurrentStep(2);
      return;
    }

    setSubmitting(true);
    setServerError("");

    const formData = new FormData();

    // Personal Data
    Object.entries(personalData).forEach(([k, v]) => {
      if (v !== null && v !== "") formData.append(k, v);
    });

    // Stream Data
    Object.entries(streamData).forEach(([k, v]) => {
      if (v !== null && v !== "") formData.append(k, v);
    });

    // Discount & Payables
    formData.append("is_prospectus_sold", discountSettings.is_prospectus_sold ? "1" : "0");
    formData.append("is_marks_based_discount", discountSettings.is_marks_based_discount ? "1" : "0");
    formData.append("is_discretionary_discount", discountSettings.is_discretionary_discount ? "1" : "0");
    formData.append("is_policy_discount", discountSettings.is_policy_discount ? "1" : "0");
    formData.append("selected_months_tf", discountSettings.selected_months_tf);
    formData.append("tuition_fee_per_policy", discountSettings.tuition_fee_per_policy || "0");
    formData.append("discretionary_discount_reason", discountSettings.discretionary_discount_reason || "NONE");
    formData.append("discretionary_discount_amount", discountSettings.discretionary_discount_amount || "0");
    formData.append("policy_discount_type", discountSettings.policy_discount_type || "NONE");
    formData.append("policy_discount_amount", discountSettings.policy_discount_amount || "0");

    // Summaries
    formData.append("total_admission_payable", String(computedFeeSummary.payableFee));
    formData.append("amount_received_at_admission", String(computedFeeSummary.amtReceived));
    formData.append("admission_balance", String(computedFeeSummary.balanceAmount));
    formData.append("monthly_fee", String((feeMatrix.tuition_fee?.actual || 0) - (feeMatrix.tuition_fee?.discount || 0)));
    formData.append("pending_amount", String(computedFeeSummary.balanceAmount));

    // Fee Structure Matrix JSON
    const structuredHeads: Record<string, any> = {};
    STANDARD_FEE_HEADS.forEach((h) => {
      const actual = feeMatrix[h.key]?.actual || 0;
      const discount = feeMatrix[h.key]?.discount || 0;
      structuredHeads[h.key] = {
        actual,
        discount,
        payable: Math.max(0, actual - discount),
      };
    });
    formData.append("fee_structure", JSON.stringify(structuredHeads));

    if (imageFile) {
      formData.append("image", imageFile);
    }

    try {
      const url = initialData ? `${API}/students/${initialData.id}` : `${API}/students`;
      const res = await fetch(url, {
        method: "POST",
        headers: getAuthHeaders(true),
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Failed to submit student admission");
      }

      setCreatedStudent(json);
      setShowSuccessModal(true);
    } catch (err: any) {
      setServerError(err.message || "Server error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (isError = false) =>
    `w-full h-[40px] px-3.5 py-2 rounded-xl border text-sm font-medium outline-none transition-all duration-150 shadow-2xs ${
      isError
        ? "border-red-500 bg-red-50 focus:border-red-600 focus:ring-2 focus:ring-red-100"
        : "border-slate-300 bg-white text-slate-800 hover:border-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
    }`;

  const progressPercentage = (currentStep / 4) * 100;

  // Split heads into 2 balanced rows (8 and 7) for step 3
  const group1Heads = STANDARD_FEE_HEADS.slice(0, 8);
  const group2Heads = STANDARD_FEE_HEADS.slice(8, 15);

  const group1ActualTotal = group1Heads.reduce((acc, h) => acc + (feeMatrix[h.key]?.actual || 0), 0);
  const group1DiscountTotal = group1Heads.reduce((acc, h) => acc + (feeMatrix[h.key]?.discount || 0), 0);
  const group1PayableTotal = Math.max(0, group1ActualTotal - group1DiscountTotal);

  const group2ActualTotal = group2Heads.reduce((acc, h) => acc + (feeMatrix[h.key]?.actual || 0), 0);
  const group2DiscountTotal = group2Heads.reduce((acc, h) => acc + (feeMatrix[h.key]?.discount || 0), 0);
  const group2PayableTotal = Math.max(0, group2ActualTotal - group2DiscountTotal);

  return (
    <div className="space-y-4">
      {/* ─── STEPPER & PROGRESS HEADER ───────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 shadow-2xs">
        {/* Step Badges Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 relative">
          {STEPS.map((step) => {
            const isCompleted = currentStep > step.number;
            const isCurrent = currentStep === step.number;

            return (
              <button
                key={step.number}
                type="button"
                onClick={() => {
                  if (
                    isCompleted ||
                    (step.number === 2 && validateStep1()) ||
                    (step.number === 3 && validateStep1() && validateStep2())
                  ) {
                    setCurrentStep(step.number);
                  }
                }}
                className={`flex items-center gap-3 p-2.5 sm:p-3 rounded-xl border text-left transition-all ${
                  isCurrent
                    ? "border-blue-600 bg-blue-50/90 shadow-2xs"
                    : isCompleted
                    ? "border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 text-slate-700"
                    : "border-slate-200 bg-slate-50/40 text-slate-400 opacity-80"
                }`}
              >
                <div
                  className={`w-7 h-7 sm:w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-xs sm:text-sm shrink-0 transition-transform ${
                    isCurrent
                      ? "bg-blue-600 text-white shadow-xs scale-105"
                      : isCompleted
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {isCompleted ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step.number
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <span
                    className={`block text-xs sm:text-sm font-bold truncate leading-tight ${
                      isCurrent ? "text-blue-900" : isCompleted ? "text-slate-800" : "text-slate-500"
                    }`}
                  >
                    {step.title}
                  </span>
                  <span className="block text-[11px] sm:text-xs text-slate-500 truncate leading-none mt-1 hidden sm:block">
                    {step.subtitle}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Dynamic Slim Progress Bar */}
        <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-600 to-indigo-600 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {serverError && (
        <div className="p-3 rounded-xl text-sm font-semibold bg-red-50 border border-red-200 text-red-700 flex items-center gap-2 shadow-2xs">
          <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {serverError}
        </div>
      )}

      {/* ─── STEP 1: PERSONAL DATA ───────────────────────────────────────────── */}
      {currentStep === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs relative z-20">
          <div className="bg-slate-50 px-5 sm:px-6 py-3 border-b border-slate-200 rounded-t-2xl flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-800">
              Step 1: Personal Data
            </h3>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
              1 of 4
            </span>
          </div>

          <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Column 1 */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Student CNIC / B-Form
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={15}
                  placeholder="00000-0000000-0"
                  value={personalData.student_cnic}
                  onKeyDown={handleNumericOnlyKeyDown}
                  onChange={(e) =>
                    setPersonalData({ ...personalData, student_cnic: formatCNIC(e.target.value) })
                  }
                  className={inputClass()}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  ERP Reg#
                </label>
                <input
                  type="text"
                  placeholder="24-3-539-67-000..."
                  value={personalData.erp_reg}
                  onChange={(e) =>
                    setPersonalData({ ...personalData, erp_reg: e.target.value })
                  }
                  className={inputClass()}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Student Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Student Full Name"
                  value={personalData.name}
                  onChange={(e) => setPersonalData({ ...personalData, name: e.target.value })}
                  className={inputClass(stepErrors[1] && !personalData.name.trim())}
                />
                {stepErrors[1] && !personalData.name.trim() && (
                  <p className="text-xs text-red-600 mt-1 font-semibold">Student name is required</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <CustomDatePicker
                  size="md"
                  placement="top"
                  value={personalData.dob}
                  onChange={(val) => setPersonalData({ ...personalData, dob: val })}
                  placeholder="Select Date of Birth"
                  startYear={1995}
                  endYear={new Date().getFullYear()}
                  className={stepErrors[1] && !personalData.dob ? "ring-2 ring-red-500 rounded-xl" : ""}
                />
                {stepErrors[1] && !personalData.dob && (
                  <p className="text-xs text-red-600 mt-1 font-semibold">Date of birth is required</p>
                )}
              </div>
            </div>

            {/* Column 2 */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Father CNIC <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={15}
                  placeholder="00000-0000000-0"
                  value={personalData.father_cnic}
                  onKeyDown={handleNumericOnlyKeyDown}
                  onChange={(e) =>
                    setPersonalData({ ...personalData, father_cnic: formatCNIC(e.target.value) })
                  }
                  className={inputClass()}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Father Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Father Full Name"
                  value={personalData.father_name}
                  onChange={(e) => setPersonalData({ ...personalData, father_name: e.target.value })}
                  className={inputClass(stepErrors[1] && !personalData.father_name.trim())}
                />
                {stepErrors[1] && !personalData.father_name.trim() && (
                  <p className="text-xs text-red-600 mt-1 font-semibold">Father name is required</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Current Address
                </label>
                <input
                  type="text"
                  placeholder="Residential Address"
                  value={personalData.current_address}
                  onChange={(e) => setPersonalData({ ...personalData, current_address: e.target.value })}
                  className={inputClass()}
                />
              </div>
            </div>

            {/* Column 3 */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Student Cell#
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={12}
                    placeholder="0300-0000000"
                    value={personalData.contact_number}
                    onKeyDown={handleNumericOnlyKeyDown}
                    onChange={(e) =>
                      setPersonalData({ ...personalData, contact_number: formatPhone(e.target.value) })
                    }
                    className={inputClass()}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <CustomDropdown
                    size="md"
                    options={GENDER_OPTIONS}
                    value={personalData.gender}
                    onChange={(_, val) => setPersonalData({ ...personalData, gender: String(val) })}
                    placeholder="Choose"
                    name="gender"
                    className="w-full"
                  />
                  {stepErrors[1] && !personalData.gender && (
                    <p className="text-xs text-red-600 mt-1 font-semibold">Select gender</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Father Cell# <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={12}
                  placeholder="0300-0000000"
                  value={personalData.father_cell}
                  onKeyDown={handleNumericOnlyKeyDown}
                  onChange={(e) =>
                    setPersonalData({ ...personalData, father_cell: formatPhone(e.target.value) })
                  }
                  className={inputClass(
                    stepErrors[1] &&
                      !personalData.father_cell.trim() &&
                      !personalData.contact_number.trim()
                  )}
                />
                {stepErrors[1] &&
                  !personalData.father_cell.trim() &&
                  !personalData.contact_number.trim() && (
                    <p className="text-xs text-red-600 mt-1 font-semibold">Father cell# is required</p>
                  )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Remarks
                </label>
                <input
                  type="text"
                  placeholder="Remarks (Optional)"
                  value={personalData.remarks}
                  onChange={(e) => setPersonalData({ ...personalData, remarks: e.target.value })}
                  className={inputClass()}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── STEP 2: ADMISSION STREAM ────────────────────────────────────────── */}
      {currentStep === 2 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs relative z-20">
          <div className="bg-blue-50/70 px-5 sm:px-6 py-3 border-b border-slate-200 rounded-t-2xl flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-blue-900">
              Step 2: Admission Stream
            </h3>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-200 text-blue-900">
              2 of 4
            </span>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            {/* Row 1: Stream, Class, Section, Class Group */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 relative z-20">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Stream Type <span className="text-red-500">*</span>
                </label>
                <CustomDropdown
                  size="md"
                  options={STREAM_OPTIONS}
                  value={streamData.stream_type}
                  onChange={(_, val) => setStreamData({ ...streamData, stream_type: String(val) })}
                  placeholder="Choose..."
                  name="stream_type"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Class <span className="text-red-500">*</span>
                </label>
                <CustomDropdown
                  size="md"
                  options={classes.map((c) => ({ label: c.name, value: c.id }))}
                  value={streamData.class_id}
                  onChange={(_, val) => setStreamData({ ...streamData, class_id: String(val) })}
                  placeholder="Choose..."
                  name="class_id"
                />
                {stepErrors[2] && !streamData.class_id && (
                  <p className="text-xs text-red-600 mt-1 font-semibold">Please select class</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Section <span className="text-red-500">*</span>
                </label>
                <CustomDropdown
                  size="md"
                  options={availableSections.map((s: any) => ({ label: s.name, value: s.id }))}
                  value={streamData.section_id}
                  onChange={(_, val) => setStreamData({ ...streamData, section_id: String(val) })}
                  placeholder="Choose..."
                  name="section_id"
                />
                {stepErrors[2] && !streamData.section_id && (
                  <p className="text-xs text-red-600 mt-1 font-semibold">Please select section</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Class Group / Major
                </label>
                <CustomDropdown
                  size="md"
                  options={majors.map((m) => ({ label: m.name, value: m.id }))}
                  value={streamData.major_id}
                  onChange={(_, val) => setStreamData({ ...streamData, major_id: String(val) })}
                  placeholder="Choose..."
                  name="major_id"
                />
              </div>
            </div>

            {/* Row 2: Session, Test Marks, Obtained Marks, Admission Month */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 items-end relative z-10">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Academic Session <span className="text-red-500">*</span>
                </label>
                <CustomDropdown
                  size="md"
                  options={sessions.map((s) => ({ label: s.name, value: s.id }))}
                  value={streamData.academic_session_id}
                  onChange={(_, val) =>
                    setStreamData({ ...streamData, academic_session_id: String(val) })
                  }
                  placeholder="Select Session"
                  name="academic_session_id"
                />
                {stepErrors[2] && !streamData.academic_session_id && (
                  <p className="text-xs text-red-600 mt-1 font-semibold">Please select academic session</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Test Marks
                </label>
                <NumberInput
                  size="md"
                  value={streamData.test_marks}
                  onChange={(val) => setStreamData({ ...streamData, test_marks: val })}
                  placeholder="100"
                  min={0}
                  allowDecimal={true}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Obtained Marks <span className="text-red-500">*</span>
                </label>
                <NumberInput
                  size="md"
                  value={streamData.obtained_marks}
                  onChange={(val) => setStreamData({ ...streamData, obtained_marks: val })}
                  placeholder="0"
                  min={0}
                  allowDecimal={true}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Admission Month <span className="text-red-500">*</span>
                </label>
                <input
                  type="month"
                  value={streamData.admission_month}
                  onChange={(e) => setStreamData({ ...streamData, admission_month: e.target.value })}
                  className={inputClass(stepErrors[2] && !streamData.admission_month)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── STEP 3: FEE STRUCTURE (15 FEE HEADS MATRIX) ────────────────────── */}
      {currentStep === 3 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="bg-slate-50 px-4 sm:px-6 py-2.5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-800">
                Step 3: Fee Structure (15 Heads Matrix)
              </h3>
            </div>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
              3 of 4
            </span>
          </div>

          <div className="p-2.5 sm:p-3.5 space-y-3">
            {/* Box 1: Heads 1 - 8 (8 Columns) */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50 shadow-2xs">
              <table className="w-full border-collapse table-fixed text-xs">
                <colgroup>
                  <col style={{ width: "68px" }} />
                  {group1Heads.map((h) => (
                    <col key={h.key} style={{ width: "calc((100% - 68px) / 8)" }} />
                  ))}
                </colgroup>
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                    <th className="py-1.5 px-1 text-center font-bold text-[10px] sm:text-[11px] uppercase text-slate-600 bg-slate-200/70 truncate">
                      Type
                    </th>
                    {group1Heads.map((h) => (
                      <th
                        key={h.key}
                        className="py-1.5 px-0.5 font-bold text-slate-800 text-[10px] sm:text-[11px] text-center truncate"
                      >
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {/* Actual Row */}
                  <tr>
                    <td className="py-1 px-1 font-bold text-[10px] sm:text-[11px] uppercase text-slate-600 bg-slate-50 text-center truncate">
                      Actual
                    </td>
                    {group1Heads.map((h) => (
                      <td key={h.key} className="p-0.5 sm:p-1">
                        <NumberInput
                          size="xs"
                          align="center"
                          min={0}
                          value={feeMatrix[h.key]?.actual ?? 0}
                          onChange={(val) => handleFeeMatrixChange(h.key, "actual", val)}
                        />
                      </td>
                    ))}
                  </tr>

                  {/* Discount Row */}
                  <tr>
                    <td className="py-1 px-1 font-bold text-[10px] sm:text-[11px] uppercase text-slate-600 bg-slate-50 text-center truncate">
                      Discount
                    </td>
                    {group1Heads.map((h) => (
                      <td key={h.key} className="p-0.5 sm:p-1">
                        <NumberInput
                          size="xs"
                          align="center"
                          min={0}
                          value={feeMatrix[h.key]?.discount ?? 0}
                          onChange={(val) => handleFeeMatrixChange(h.key, "discount", val)}
                        />
                      </td>
                    ))}
                  </tr>

                  {/* Payable Row */}
                  <tr className="bg-blue-50/40">
                    <td className="py-1 px-1 font-bold text-[10px] sm:text-[11px] uppercase text-blue-900 bg-blue-100/60 text-center truncate">
                      Payable
                    </td>
                    {group1Heads.map((h) => {
                      const payable = Math.max(
                        0,
                        (feeMatrix[h.key]?.actual || 0) - (feeMatrix[h.key]?.discount || 0)
                      );
                      return (
                        <td key={h.key} className="p-0.5 sm:p-1">
                          <div className="h-[28px] px-0.5 rounded-md bg-white border border-blue-200 font-bold text-xs text-blue-800 flex items-center justify-center text-center shadow-2xs truncate">
                            {payable}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Box 2: Heads 9 - 15 (7 Columns + 1 Summary Column = 8 Columns matching Box 1) */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50 shadow-2xs">
              <table className="w-full border-collapse table-fixed text-xs">
                <colgroup>
                  <col style={{ width: "68px" }} />
                  {group2Heads.map((h) => (
                    <col key={h.key} style={{ width: "calc((100% - 68px) / 8)" }} />
                  ))}
                  <col style={{ width: "calc((100% - 68px) / 8)" }} />
                </colgroup>
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                    <th className="py-1.5 px-1 text-center font-bold text-[10px] sm:text-[11px] uppercase text-slate-600 bg-slate-200/70 truncate">
                      Type
                    </th>
                    {group2Heads.map((h) => (
                      <th
                        key={h.key}
                        className="py-1.5 px-0.5 font-bold text-slate-800 text-[10px] sm:text-[11px] text-center truncate"
                      >
                        {h.label}
                      </th>
                    ))}
                    <th className="py-1.5 px-0.5 font-bold text-blue-900 text-[10px] sm:text-[11px] text-center truncate bg-blue-100/60">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {/* Actual Row */}
                  <tr>
                    <td className="py-1 px-1 font-bold text-[10px] sm:text-[11px] uppercase text-slate-600 bg-slate-50 text-center truncate">
                      Actual
                    </td>
                    {group2Heads.map((h) => (
                      <td key={h.key} className="p-0.5 sm:p-1">
                        <NumberInput
                          size="xs"
                          align="center"
                          min={0}
                          value={feeMatrix[h.key]?.actual ?? 0}
                          onChange={(val) => handleFeeMatrixChange(h.key, "actual", val)}
                        />
                      </td>
                    ))}
                    <td className="p-0.5 sm:p-1">
                      <div className="h-[28px] px-0.5 rounded-md bg-slate-100 border border-slate-300 font-bold text-xs text-slate-700 flex items-center justify-center text-center truncate">
                        {group1ActualTotal + group2ActualTotal}
                      </div>
                    </td>
                  </tr>

                  {/* Discount Row */}
                  <tr>
                    <td className="py-1 px-1 font-bold text-[10px] sm:text-[11px] uppercase text-slate-600 bg-slate-50 text-center truncate">
                      Discount
                    </td>
                    {group2Heads.map((h) => (
                      <td key={h.key} className="p-0.5 sm:p-1">
                        <NumberInput
                          size="xs"
                          align="center"
                          min={0}
                          value={feeMatrix[h.key]?.discount ?? 0}
                          onChange={(val) => handleFeeMatrixChange(h.key, "discount", val)}
                        />
                      </td>
                    ))}
                    <td className="p-0.5 sm:p-1">
                      <div className="h-[28px] px-0.5 rounded-md bg-amber-50 border border-amber-200 font-bold text-xs text-amber-700 flex items-center justify-center text-center truncate">
                        {group1DiscountTotal + group2DiscountTotal}
                      </div>
                    </td>
                  </tr>

                  {/* Payable Row */}
                  <tr className="bg-blue-50/40">
                    <td className="py-1 px-1 font-bold text-[10px] sm:text-[11px] uppercase text-blue-900 bg-blue-100/60 text-center truncate">
                      Payable
                    </td>
                    {group2Heads.map((h) => {
                      const payable = Math.max(
                        0,
                        (feeMatrix[h.key]?.actual || 0) - (feeMatrix[h.key]?.discount || 0)
                      );
                      return (
                        <td key={h.key} className="p-0.5 sm:p-1">
                          <div className="h-[28px] px-0.5 rounded-md bg-white border border-blue-200 font-bold text-xs text-blue-800 flex items-center justify-center text-center shadow-2xs truncate">
                            {payable}
                          </div>
                        </td>
                      );
                    })}
                    <td className="p-0.5 sm:p-1">
                      <div className="h-[28px] px-0.5 rounded-md bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center text-center shadow-xs truncate">
                        {group1PayableTotal + group2PayableTotal}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── STEP 4: DISCOUNTS & PAYABLES ───────────────────────────────────── */}
      {currentStep === 4 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs relative z-20">
          <div className="bg-blue-50/70 px-5 sm:px-6 py-3 border-b border-slate-200 rounded-t-2xl flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-blue-900">
              Step 4: Discounts &amp; Payables
            </h3>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-200 text-blue-900">
              4 of 4
            </span>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            {/* Top Checkboxes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={discountSettings.is_prospectus_sold}
                  onChange={(e) =>
                    setDiscountSettings({ ...discountSettings, is_prospectus_sold: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                Prospectus Sold
              </label>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={discountSettings.is_marks_based_discount}
                  onChange={(e) =>
                    setDiscountSettings({
                      ...discountSettings,
                      is_marks_based_discount: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                Marks based Discount
              </label>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={discountSettings.is_discretionary_discount}
                  onChange={(e) =>
                    setDiscountSettings({
                      ...discountSettings,
                      is_discretionary_discount: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                Discretionary Discount
              </label>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={discountSettings.is_policy_discount}
                  onChange={(e) =>
                    setDiscountSettings({
                      ...discountSettings,
                      is_policy_discount: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                Policy Discount
              </label>
            </div>

            {/* Middle Row Controls (3 Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-20">
              {/* TF Block */}
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-3 shadow-2xs">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    TF Months Multiplier
                  </label>
                  <CustomDropdown
                    size="md"
                    options={TF_MONTHS_OPTIONS}
                    value={discountSettings.selected_months_tf}
                    onChange={(_, val) =>
                      setDiscountSettings({ ...discountSettings, selected_months_tf: String(val) })
                    }
                    name="selected_months_tf"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Tuition Fee per Policy
                  </label>
                  <NumberInput
                    size="md"
                    value={discountSettings.tuition_fee_per_policy}
                    onChange={(val) =>
                      setDiscountSettings({ ...discountSettings, tuition_fee_per_policy: val })
                    }
                    placeholder="0.0"
                    min={0}
                  />
                </div>
              </div>

              {/* Discretionary Discount Block */}
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-3 shadow-2xs">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Discretionary Reason
                  </label>
                  <CustomDropdown
                    size="md"
                    options={DISCRETIONARY_REASONS}
                    value={discountSettings.discretionary_discount_reason}
                    onChange={(_, val) =>
                      setDiscountSettings({
                        ...discountSettings,
                        discretionary_discount_reason: String(val),
                      })
                    }
                    name="discretionary_discount_reason"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Discretionary Amount
                  </label>
                  <NumberInput
                    size="md"
                    value={discountSettings.discretionary_discount_amount}
                    onChange={(val) =>
                      setDiscountSettings({
                        ...discountSettings,
                        discretionary_discount_amount: val,
                      })
                    }
                    placeholder="0.0"
                    min={0}
                  />
                </div>
              </div>

              {/* Policy Discount Block */}
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-3 shadow-2xs">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Policy Discount Type
                  </label>
                  <CustomDropdown
                    size="md"
                    options={POLICY_DISCOUNT_OPTIONS}
                    value={discountSettings.policy_discount_type}
                    onChange={(_, val) =>
                      setDiscountSettings({ ...discountSettings, policy_discount_type: String(val) })
                    }
                    name="policy_discount_type"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Policy Discount Amount
                  </label>
                  <NumberInput
                    size="md"
                    value={discountSettings.policy_discount_amount}
                    onChange={(val) =>
                      setDiscountSettings({
                        ...discountSettings,
                        policy_discount_amount: val,
                      })
                    }
                    placeholder="0.0"
                    min={0}
                  />
                </div>
              </div>
            </div>

            {/* Highlighted Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="p-3.5 sm:p-4 rounded-xl bg-blue-50/80 border border-blue-200 text-center shadow-2xs">
                <span className="block text-xs font-bold text-blue-900 uppercase tracking-wider">
                  Full Fee
                </span>
                <span className="text-xl sm:text-2xl font-black text-blue-950 mt-1 block">
                  Rs. {computedFeeSummary.fullFeeAmount.toLocaleString()}
                </span>
              </div>

              <div className="p-3.5 sm:p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-center shadow-2xs">
                <span className="block text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Total Discount
                </span>
                <span className="text-xl sm:text-2xl font-black text-amber-800 mt-1 block">
                  Rs. {computedFeeSummary.totalDiscountAmount.toLocaleString()}
                </span>
              </div>

              <div className="p-3.5 sm:p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 text-center shadow-2xs">
                <span className="block text-xs font-bold text-emerald-900 uppercase tracking-wider">
                  Payable Fee
                </span>
                <span className="text-xl sm:text-2xl font-black text-emerald-800 mt-1 block">
                  Rs. {computedFeeSummary.payableFee.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Bottom Payment / Receiving Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-200">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Amt. Rec. at Admission <span className="text-red-500">*</span>
                </label>
                <NumberInput
                  size="md"
                  value={discountSettings.amt_rec_at_admission}
                  onChange={(val) =>
                    setDiscountSettings({ ...discountSettings, amt_rec_at_admission: val })
                  }
                  placeholder="0.0"
                  min={0}
                  prefix="Rs."
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Total Amount Received
                </label>
                <div className="w-full px-3.5 rounded-xl border border-slate-300 font-bold text-sm text-slate-700 bg-slate-100 flex items-center h-[40px]">
                  Rs. {computedFeeSummary.amtReceived.toLocaleString()}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Balance Amount
                </label>
                <div className="w-full px-3.5 rounded-xl border border-slate-300 font-bold text-sm text-red-600 bg-red-50/50 flex items-center h-[40px]">
                  Rs. {computedFeeSummary.balanceAmount.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── STEPPER CONTROLS & ACTION BUTTONS ─────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 px-5 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2 sm:gap-3">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={handlePrevStep}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 transition active:scale-95 shadow-2xs cursor-pointer"
            >
              &larr; Back
            </button>
          )}

          <button
            type="button"
            onClick={handleResetForm}
            className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
          >
            New Entry
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {currentStep < 4 ? (
            <button
              type="button"
              onClick={handleNextStep}
              disabled={
                currentStep === 1
                  ? !validateStep1()
                  : currentStep === 2
                  ? !validateStep2()
                  : false
              }
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
            >
              Next Step &rarr;
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setDiscountSettings((prev) => ({ ...prev }))}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 transition active:scale-95 cursor-pointer"
              >
                Re-Calculate
              </button>

              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 shadow-xs transition active:scale-95 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  "Save Student"
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ─── CUSTOM SUCCESS ALERT MODAL WITH PRINT VOUCHER ─────────────────── */}
      {showSuccessModal && createdStudent && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 text-center relative overflow-hidden animate-scaleUp">
            {/* Top decorative accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500" />

            {/* Success Icon */}
            <div className="w-12 h-12 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center shadow-xs mb-3">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h3 className="text-base font-black text-slate-900 mb-0.5">
              {initialData ? "Admission Updated Successfully!" : "Student Admitted Successfully!"}
            </h3>
            <p className="text-[11px] text-slate-500 mb-4">
              Admission records, stream mapping &amp; fee structure registered.
            </p>

            {/* Student Info Card */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 mb-4 text-left space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500">Student Name:</span>
                <span className="text-xs font-bold text-slate-900 truncate max-w-[180px]">
                  {createdStudent.name}
                </span>
              </div>
              {createdStudent.roll_number && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500">Roll Number:</span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    {createdStudent.roll_number}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500">Class &amp; Section:</span>
                <span className="text-xs font-bold text-slate-800">
                  {createdStudent.academy_class?.name || "Class"} — {createdStudent.section?.name || "Section"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500">Admission Month:</span>
                <span className="text-xs font-bold text-slate-800">
                  {createdStudent.admission_month || streamData.admission_month}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
                  const voucherPrintUrl = `/dashboard/fees/vouchers/print?month=${encodeURIComponent(
                    currentMonth
                  )}&selected_keys=${createdStudent.id}`;
                  window.open(voucherPrintUrl, "_blank");
                  setShowSuccessModal(false);
                  onSuccess(createdStudent);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg font-bold text-xs text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-xs transition active:scale-98 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  />
                </svg>
                Print Voucher (OK)
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  onSuccess(createdStudent);
                }}
                className="py-2 px-3 rounded-lg font-bold text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 transition active:scale-98 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
