"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import NumberInput from "@/components/NumberInput";
import {
  Package,
  ShoppingCart,
  Receipt,
  Layers,
  Plus,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  Clock,
  DollarSign,
  User,
  Trash2,
  Edit,
  ArrowUpDown,
  Printer,
  ChevronRight,
  Sparkles,
  AlertCircle,
  FileText,
  X,
  CreditCard,
  Building,
  RefreshCw,
  Download,
} from "lucide-react";
import { format } from "date-fns";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };
}

export default function ExtraChargesPage() {
  const [activeTab, setActiveTab] = useState<"pos" | "inventory" | "logs">("pos");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total_stock_items: 0,
    low_stock_items: 0,
    billed_this_month: 0,
    paid_this_month: 0,
    pending_balance: 0,
  });

  // Catalog items
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [salesLogs, setSalesLogs] = useState<any[]>([]);
  const [salesPagination, setSalesPagination] = useState({ current_page: 1, last_page: 1, total: 0 });

  // User Role & Permissions
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    setUserRole(localStorage.getItem("userRole"));
  }, []);

  const isSuperAdmin = userRole === "1" || userRole === "admin";

  // Notifications
  const [alertMsg, setAlertMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // POS State
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [isCustomCharge, setIsCustomCharge] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [unitPrice, setUnitPrice] = useState<number | "">("");
  const [quantity, setQuantity] = useState(1);
  const [paymentOption, setPaymentOption] = useState<"pay_now" | "bill_to_voucher">("pay_now");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "online" | "bank">("cash");
  const [notes, setNotes] = useState("");
  const [submittingPOS, setSubmittingPOS] = useState(false);

  // Modals
  const [showNewItemModal, setShowNewItemModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [targetItem, setTargetItem] = useState<any | null>(null);
  const [targetCharge, setTargetCharge] = useState<any | null>(null);
  const [receiptData, setReceiptData] = useState<any | null>(null);

  // New & Edit Item Form
  const [itemForm, setItemForm] = useState({
    name: "",
    code: "",
    category: "stationery",
    item_type: "stock_based",
    unit_price: "",
    stock_quantity: "",
    low_stock_threshold: "5",
    description: "",
  });

  // Restock Form
  const [restockQty, setRestockQty] = useState<number | "">("");

  // Collect Payment Form
  const [collectAmount, setCollectAmount] = useState<number | "">("");
  const [collectMethod, setCollectMethod] = useState("cash");

  // Bulk Charge State
  const [bulkClassId, setBulkClassId] = useState("");
  const [bulkSectionId, setBulkSectionId] = useState("");
  const [bulkTitle, setBulkTitle] = useState("");
  const [bulkCategory, setBulkCategory] = useState("trip");
  const [bulkAmount, setBulkAmount] = useState<number | "">("");
  const [bulkPaymentOption, setBulkPaymentOption] = useState<"bill_to_voucher" | "pay_now">("bill_to_voucher");
  const [bulkNotes, setBulkNotes] = useState("");
  const [submittingBulk, setSubmittingBulk] = useState(false);

  // Sales Log Filters
  const [logSearch, setLogSearch] = useState("");
  const [logStatus, setLogStatus] = useState("all");
  const [logItemId, setLogItemId] = useState("all");
  const [logDateFrom, setLogDateFrom] = useState("");
  const [logDateTo, setLogDateTo] = useState("");

  const showAlert = (text: string, type: "success" | "error" = "success") => {
    setAlertMsg({ type, text });
    setTimeout(() => setAlertMsg(null), 5000);
  };

  // Sorted Catalog Items: Items that hit or are below low stock threshold appear at the TOP
  const sortedCatalogItems = useMemo(() => {
    return [...catalogItems].sort((a, b) => {
      const aIsStock = a.item_type === "stock_based";
      const bIsStock = b.item_type === "stock_based";
      const aThreshold = Number(a.low_stock_threshold ?? 5);
      const bThreshold = Number(b.low_stock_threshold ?? 5);
      const aIsAlert = aIsStock && Number(a.stock_quantity ?? 0) <= aThreshold;
      const bIsAlert = bIsStock && Number(b.stock_quantity ?? 0) <= bThreshold;

      // 1. Stock alert items first (Critical alert items at the top)
      if (aIsAlert && !bIsAlert) return -1;
      if (!aIsAlert && bIsAlert) return 1;

      // If both are in alert, sort lowest stock first (out of stock 0 first)
      if (aIsAlert && bIsAlert) {
        if (Number(a.stock_quantity ?? 0) !== Number(b.stock_quantity ?? 0)) {
          return Number(a.stock_quantity ?? 0) - Number(b.stock_quantity ?? 0);
        }
      }

      // 2. Stock based items next, non-stock after
      if (aIsStock && !bIsStock) return -1;
      if (!aIsStock && bIsStock) return 1;

      // 3. Alphabetical
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [catalogItems]);

  // Fetch Stats
  const fetchStats = async () => {
    try {
      const res = await fetch(`${API}/extra-charges/stats`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {}
  };

  // Fetch Items
  const fetchCatalogItems = async () => {
    try {
      const res = await fetch(`${API}/extra-charges/items`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setCatalogItems(Array.isArray(data) ? data : []);
      }
    } catch {}
  };

  // Fetch Classes
  const fetchClasses = async () => {
    try {
      const res = await fetch(`${API}/classes`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setClasses(Array.isArray(data) ? data : []);
      }
    } catch {}
  };

  // Fetch Students for POS Autocomplete
  const fetchStudents = async () => {
    try {
      const res = await fetch(`${API}/attendance-students`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setStudents(Array.isArray(data) ? data : []);
      }
    } catch {}
  };

  // Fetch Sales Log
  const fetchSalesLogs = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        search: logSearch,
        payment_status: logStatus,
        item_id: logItemId,
      });
      if (logDateFrom) params.append("date_from", logDateFrom);
      if (logDateTo) params.append("date_to", logDateTo);

      const res = await fetch(`${API}/extra-charges/sales?${params.toString()}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSalesLogs(data.data || []);
        setSalesPagination({
          current_page: data.current_page || 1,
          last_page: data.last_page || 1,
          total: data.total || 0,
        });
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchCatalogItems();
    fetchClasses();
    fetchStudents();
  }, []);

  useEffect(() => {
    fetchStats();
    fetchCatalogItems();
    if (activeTab === "logs") {
      fetchSalesLogs(1);
    }
  }, [activeTab, logSearch, logStatus, logItemId, logDateFrom, logDateTo]);

  // Filtered Students in POS
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return [];
    const q = studentSearch.toLowerCase();
    return students
      .filter(
        (s) =>
          String(s.name || "").toLowerCase().includes(q) ||
          String(s.roll_number || "").toLowerCase().includes(q) ||
          String(s.father_name || "").toLowerCase().includes(q) ||
          String(s.id || "").includes(q)
      )
      .slice(0, 8);
  }, [studentSearch, students]);

  // Select Item in POS
  const handleSelectItem = (item: any) => {
    setIsCustomCharge(false);
    setSelectedItem(item);
    setUnitPrice(item.unit_price);
    setQuantity(1);
  };

  const handleSelectCustom = () => {
    setSelectedItem(null);
    setIsCustomCharge(true);
    setUnitPrice("");
    setQuantity(1);
  };

  const calculatedTotal = useMemo(() => {
    const p = parseFloat(String(unitPrice || 0));
    return p * (quantity || 1);
  }, [unitPrice, quantity]);

  // Submit POS Charge
  const handlePOSSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      showAlert("Please search and select a student first.", "error");
      return;
    }
    if (!isCustomCharge && !selectedItem) {
      showAlert("Please select a catalog item or custom charge.", "error");
      return;
    }
    if (isCustomCharge && !customTitle.trim()) {
      showAlert("Please enter a title for the custom charge.", "error");
      return;
    }
    if (!unitPrice || parseFloat(String(unitPrice)) <= 0) {
      showAlert("Please enter a valid price.", "error");
      return;
    }

    if (selectedItem?.item_type === "stock_based" && selectedItem.stock_quantity < quantity) {
      showAlert(`Insufficient stock! Only ${selectedItem.stock_quantity} available.`, "error");
      return;
    }

    setSubmittingPOS(true);
    try {
      const payload = {
        student_ids: [selectedStudent.id],
        extra_charge_item_id: selectedItem?.id || null,
        title: isCustomCharge ? customTitle.trim() : selectedItem.name,
        category: selectedItem?.category || "general",
        charge_type: isCustomCharge ? "ad_hoc" : selectedItem.item_type,
        unit_price: parseFloat(String(unitPrice)),
        quantity: parseInt(String(quantity)),
        payment_option: paymentOption,
        payment_method: paymentOption === "pay_now" ? paymentMethod : "voucher",
        notes: notes.trim(),
      };

      const res = await fetch(`${API}/extra-charges/issue`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to process charge");
      }

      showAlert(
        paymentOption === "pay_now"
          ? "Payment received and item issued successfully!"
          : "Charge billed to student's ledger & voucher successfully!"
      );

      // Open receipt if paid now
      if (paymentOption === "pay_now" && data.records?.[0]) {
        setReceiptData({
          ...data.records[0],
          student: selectedStudent,
          date: new Date().toISOString(),
        });
        setShowReceiptModal(true);
      }

      // Reset form
      setSelectedItem(null);
      setIsCustomCharge(false);
      setCustomTitle("");
      setUnitPrice("");
      setQuantity(1);
      setNotes("");
      setSelectedStudent(null);
      setStudentSearch("");

      fetchStats();
      fetchCatalogItems();
    } catch (err: any) {
      showAlert(err.message, "error");
    } finally {
      setSubmittingPOS(false);
    }
  };

  // Add Item to Catalog
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.name.trim() || !itemForm.unit_price) {
      showAlert("Please enter item name and unit price.", "error");
      return;
    }

    try {
      const res = await fetch(`${API}/extra-charges/items`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: itemForm.name.trim(),
          code: itemForm.code.trim() || null,
          category: itemForm.category,
          item_type: itemForm.item_type,
          unit_price: parseFloat(itemForm.unit_price),
          stock_quantity: itemForm.item_type === "stock_based" ? parseInt(itemForm.stock_quantity || "0") : 0,
          low_stock_threshold: parseInt(itemForm.low_stock_threshold || "5"),
          description: itemForm.description.trim() || null,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Failed to add item");
      }

      showAlert("Catalog item added successfully!");
      setShowNewItemModal(false);
      setItemForm({
        name: "",
        code: "",
        category: "stationery",
        item_type: "stock_based",
        unit_price: "",
        stock_quantity: "",
        low_stock_threshold: "5",
        description: "",
      });
      fetchStats();
      fetchCatalogItems();
    } catch (err: any) {
      showAlert(err.message, "error");
    }
  };

  // Update Existing Catalog Item
  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetItem) return;
    if (!itemForm.name.trim() || !itemForm.unit_price) {
      showAlert("Please enter item name and unit price.", "error");
      return;
    }

    try {
      const res = await fetch(`${API}/extra-charges/items/${targetItem.id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: itemForm.name.trim(),
          code: itemForm.code.trim() || null,
          category: itemForm.category,
          item_type: itemForm.item_type,
          unit_price: parseFloat(itemForm.unit_price),
          stock_quantity: itemForm.item_type === "stock_based" ? parseInt(itemForm.stock_quantity || "0") : 0,
          low_stock_threshold: parseInt(itemForm.low_stock_threshold || "5"),
          description: itemForm.description.trim() || null,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Failed to update item");
      }

      showAlert("Catalog item updated successfully!");
      setShowEditItemModal(false);
      setTargetItem(null);
      fetchStats();
      fetchCatalogItems();
    } catch (err: any) {
      showAlert(err.message, "error");
    }
  };

  // Delete / Deactivate Catalog Item
  const handleDeleteItem = async (id: number) => {
    if (!confirm("Are you sure you want to delete or deactivate this catalog item?")) {
      return;
    }

    try {
      const res = await fetch(`${API}/extra-charges/items/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      const d = await res.json();
      if (!res.ok) {
        throw new Error(d.message || "Failed to delete item");
      }

      showAlert(d.message || "Catalog item removed successfully!");
      fetchStats();
      fetchCatalogItems();
    } catch (err: any) {
      showAlert(err.message, "error");
    }
  };

  // Adjust / Restock Stock
  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetItem || !restockQty || parseInt(String(restockQty)) === 0) {
      showAlert("Please enter a valid stock quantity adjustment.", "error");
      return;
    }

    try {
      const res = await fetch(`${API}/extra-charges/items/${targetItem.id}/adjust-stock`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          adjustment_qty: parseInt(String(restockQty)),
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Failed to adjust stock");
      }

      showAlert("Inventory stock updated successfully!");
      setShowRestockModal(false);
      setTargetItem(null);
      setRestockQty("");
      fetchStats();
      fetchCatalogItems();
    } catch (err: any) {
      showAlert(err.message, "error");
    }
  };

  // Collect Payment for Billed Charge
  const handleCollectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCharge || !collectAmount || parseFloat(String(collectAmount)) <= 0) {
      showAlert("Please enter a valid payment amount.", "error");
      return;
    }

    try {
      const res = await fetch(`${API}/extra-charges/${targetCharge.id}/collect`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          amount: parseFloat(String(collectAmount)),
          payment_method: collectMethod,
        }),
      });

      const d = await res.json();
      if (!res.ok) {
        throw new Error(d.message || "Failed to collect payment");
      }

      showAlert("Payment collected and student ledger updated!");
      setShowCollectModal(false);
      setTargetCharge(null);
      setCollectAmount("");

      if (activeTab === "logs") fetchSalesLogs(salesPagination.current_page);
      fetchStats();
    } catch (err: any) {
      showAlert(err.message, "error");
    }
  };

  // Void Charge
  const handleVoidCharge = async (id: number) => {
    if (!confirm("Are you sure you want to void this charge? If it was an inventory item, stock will be restored.")) {
      return;
    }

    try {
      const res = await fetch(`${API}/extra-charges/${id}/void`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      const d = await res.json();
      if (!res.ok) {
        throw new Error(d.message || "Failed to void charge");
      }

      showAlert(d.message || "Charge voided successfully!");
      fetchSalesLogs(salesPagination.current_page);
      fetchStats();
      fetchCatalogItems();
    } catch (err: any) {
      showAlert(err.message, "error");
    }
  };

  // Download / Print Official Catalog PDF (Clean Black & White Printable Design)
  const handleDownloadCatalogPDF = () => {
    const formattedDate = format(new Date(), "dd MMM yyyy, hh:mm a");
    const totalItems = sortedCatalogItems.length;
    const lowStockCount = sortedCatalogItems.filter(
      (it) => it.item_type === "stock_based" && Number(it.stock_quantity) <= Number(it.low_stock_threshold ?? 5)
    ).length;
    const totalUnits = sortedCatalogItems.reduce(
      (acc, it) => acc + (it.item_type === "stock_based" ? Number(it.stock_quantity || 0) : 0),
      0
    );
    const totalValuation = sortedCatalogItems.reduce(
      (acc, it) =>
        acc +
        (it.item_type === "stock_based"
          ? Number(it.stock_quantity || 0) * Number(it.unit_price || 0)
          : 0),
      0
    );

    const rowsHtml = sortedCatalogItems
      .map((it, idx) => {
        const isStock = it.item_type === "stock_based";
        const threshold = Number(it.low_stock_threshold ?? 5);
        const stockQty = Number(it.stock_quantity ?? 0);
        const isOutOfStock = isStock && stockQty <= 0;
        const isLowStock = isStock && stockQty <= threshold;
        const unitPrice = parseFloat(it.unit_price || 0);
        const valuation = isStock ? stockQty * unitPrice : 0;

        let statusBadge = `<span class="badge badge-neutral">One-Time</span>`;
        if (isOutOfStock) {
          statusBadge = `<span class="badge badge-danger">Out of Stock (0)</span>`;
        } else if (isLowStock) {
          statusBadge = `<span class="badge badge-warning">Low Stock (${stockQty})</span>`;
        } else if (isStock) {
          statusBadge = `<span class="badge badge-success">In Stock (${stockQty})</span>`;
        }

        const rowClass = isOutOfStock || isLowStock ? "row-alert" : idx % 2 === 0 ? "row-even" : "row-odd";

        return `
          <tr class="${rowClass}">
            <td class="col-num">${idx + 1}</td>
            <td class="col-desc">
              <div class="item-name">${it.name}</div>
              <div class="item-sub">
                ${it.code ? `<span class="sku-tag">SKU: ${it.code}</span>` : ""}
                ${it.description ? `<span class="item-note">${it.description}</span>` : ""}
              </div>
            </td>
            <td class="col-cat">
              <span class="category-chip">${it.category || "General"}</span>
            </td>
            <td class="col-type">
              <span class="type-chip">${it.item_type === "stock_based" ? "Stock Item" : "Service / Charge"}</span>
            </td>
            <td class="col-price">
              Rs. ${unitPrice.toLocaleString()}
            </td>
            <td class="col-stock ${isLowStock ? "stock-highlight" : ""}">
              ${isStock ? stockQty.toLocaleString() : "—"}
            </td>
            <td class="col-alert">
              ${isStock ? `≤ ${threshold}` : "—"}
            </td>
            <td class="col-status">
              ${statusBadge}
            </td>
            <td class="col-val">
              ${isStock ? `Rs. ${valuation.toLocaleString()}` : "—"}
            </td>
          </tr>
        `;
      })
      .join("");

    const catalogPdfHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Inventory Master Catalog - KIPS School Chunian</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm 12mm 12mm 12mm;
            }
            @media print {
              html, body {
                width: 100%;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                color: #0f172a !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .no-print { display: none !important; }
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              background: #ffffff;
              color: #0f172a;
              font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 10px;
              line-height: 1.35;
              padding: 4px;
            }

            /* Document Top Bar */
            .top-bar {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 4px;
              margin-bottom: 12px;
              font-size: 8px;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              color: #64748b;
              font-weight: 700;
            }

            /* Executive Header Block */
            .header-block {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 16px;
              padding-bottom: 12px;
              border-bottom: 2px solid #0f172a;
              margin-bottom: 14px;
            }
            .header-brand {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .logo-frame {
              width: 54px;
              height: 54px;
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              padding: 4px;
              background: #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
            }
            .logo-frame img {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }
            .brand-title {
              font-size: 21px;
              font-weight: 800;
              letter-spacing: -0.02em;
              color: #0f172a;
              line-height: 1.1;
            }
            .brand-subtitle {
              font-size: 12px;
              font-weight: 700;
              color: #334155;
              margin-top: 1px;
            }
            .doc-title-pill {
              display: inline-block;
              font-size: 9.5px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.04em;
              color: #0f172a;
              background: #f1f5f9;
              padding: 2px 7px;
              border-radius: 4px;
              margin-top: 4px;
              border: 1px solid #e2e8f0;
            }
            .brand-helpline {
              font-size: 9px;
              color: #475569;
              margin-top: 3px;
            }
            .brand-helpline strong {
              color: #0f172a;
              font-family: 'JetBrains Mono', monospace;
              font-size: 9.5px;
            }

            /* Meta Card */
            .meta-card {
              min-width: 200px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 8px 12px;
              font-size: 9px;
            }
            .meta-row {
              display: flex;
              justify-content: space-between;
              padding: 2px 0;
              border-bottom: 1px dashed #e2e8f0;
            }
            .meta-row:last-child {
              border-bottom: none;
            }
            .meta-label {
              color: #64748b;
              text-transform: uppercase;
              font-weight: 700;
              font-size: 8px;
              letter-spacing: 0.04em;
            }
            .meta-val {
              font-weight: 700;
              color: #0f172a;
              font-family: 'JetBrains Mono', monospace;
            }

            /* Main Table */
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 14px;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              overflow: hidden;
            }
            thead th {
              background: #0f172a !important;
              color: #ffffff !important;
              font-size: 8.5px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              padding: 8px 6px;
              border: none;
              text-align: center;
            }
            thead th.th-left { text-align: left; padding-left: 8px; }
            thead th.th-right { text-align: right; padding-right: 8px; }

            tbody tr {
              border-bottom: 1px solid #e2e8f0;
            }
            .row-even { background: #ffffff; }
            .row-odd { background: #f8fafc; }
            .row-alert {
              background: #fff1f2 !important;
              border-left: 3px solid #e11d48;
            }

            td {
              padding: 6px;
              font-size: 9.5px;
              vertical-align: middle;
              border-right: 1px solid #f1f5f9;
            }
            td:last-child { border-right: none; }

            .col-num {
              text-align: center;
              font-family: 'JetBrains Mono', monospace;
              font-size: 9px;
              color: #64748b;
              font-weight: 600;
              width: 24px;
            }
            .col-desc {
              text-align: left;
              padding-left: 8px;
            }
            .item-name {
              font-size: 10.5px;
              font-weight: 700;
              color: #0f172a;
            }
            .item-sub {
              display: flex;
              align-items: center;
              gap: 6px;
              margin-top: 1px;
            }
            .sku-tag {
              font-family: 'JetBrains Mono', monospace;
              font-size: 8px;
              font-weight: 600;
              color: #475569;
              background: #e2e8f0;
              padding: 1px 4px;
              border-radius: 3px;
            }
            .item-note {
              font-size: 8px;
              color: #64748b;
            }
            .col-cat {
              text-align: center;
              width: 80px;
            }
            .category-chip {
              font-size: 8.5px;
              font-weight: 700;
              text-transform: uppercase;
              color: #334155;
              background: #f1f5f9;
              border: 1px solid #e2e8f0;
              padding: 2px 6px;
              border-radius: 4px;
            }
            .col-type {
              text-align: center;
              width: 75px;
            }
            .type-chip {
              font-size: 8px;
              color: #475569;
              font-weight: 600;
            }
            .col-price {
              text-align: right;
              font-family: 'JetBrains Mono', monospace;
              font-weight: 700;
              font-size: 10px;
              color: #0f172a;
              width: 85px;
              padding-right: 8px;
            }
            .col-stock {
              text-align: center;
              font-family: 'JetBrains Mono', monospace;
              font-weight: 700;
              font-size: 10px;
              width: 55px;
            }
            .stock-highlight {
              color: #b91c1c;
              font-weight: 800;
            }
            .col-alert {
              text-align: center;
              font-family: 'JetBrains Mono', monospace;
              font-size: 8.5px;
              color: #64748b;
              width: 50px;
            }
            .col-status {
              text-align: center;
              width: 105px;
            }
            .col-val {
              text-align: right;
              font-family: 'JetBrains Mono', monospace;
              font-weight: 700;
              font-size: 10px;
              color: #0f172a;
              width: 95px;
              padding-right: 8px;
            }

            /* Modern Badges */
            .badge {
              display: inline-block;
              font-size: 8px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.03em;
              padding: 2px 6px;
              border-radius: 9999px;
            }
            .badge-neutral {
              background: #f1f5f9;
              color: #475569;
              border: 1px solid #e2e8f0;
            }
            .badge-success {
              background: #f0fdf4;
              color: #166534;
              border: 1px solid #bbf7d0;
            }
            .badge-warning {
              background: #fffbeb;
              color: #92400e;
              border: 1px solid #fde68a;
              font-weight: 800;
            }
            .badge-danger {
              background: #fef2f2;
              color: #991b1b;
              border: 1px solid #fecaca;
              font-weight: 800;
            }

            /* Grand Total Summary Box */
            .summary-box {
              background: #f8fafc;
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              padding: 10px 14px;
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 12px;
              margin-bottom: 24px;
            }
            .summary-cell {
              border-right: 1px solid #e2e8f0;
              padding-right: 10px;
            }
            .summary-cell:last-child {
              border-right: none;
              padding-right: 0;
              text-align: right;
            }
            .summary-label {
              font-size: 8px;
              text-transform: uppercase;
              letter-spacing: 0.06em;
              color: #64748b;
              font-weight: 700;
              margin-bottom: 2px;
            }
            .summary-val {
              font-size: 13px;
              font-weight: 800;
              font-family: 'JetBrains Mono', monospace;
              color: #0f172a;
            }

            /* Signature Blocks */
            .signatures-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
              margin-top: 30px;
              padding-top: 10px;
            }
            .sign-box {
              text-align: center;
            }
            .sign-line-bar {
              border-top: 1px solid #0f172a;
              margin-top: 36px;
              margin-bottom: 4px;
            }
            .sign-name {
              font-size: 9.5px;
              font-weight: 800;
              text-transform: uppercase;
              color: #0f172a;
            }
            .sign-role {
              font-size: 8px;
              color: #64748b;
              font-weight: 600;
            }

            /* Document Footer */
            .doc-bottom {
              margin-top: 20px;
              padding-top: 8px;
              border-top: 1px dashed #cbd5e1;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 8px;
              color: #64748b;
            }
            .doc-bottom strong {
              color: #0f172a;
              font-family: 'JetBrains Mono', monospace;
            }
          </style>
        </head>
        <body>
          
          <!-- Top Classification Bar -->
          <div class="top-bar">
            <span>Official Inventory Ledger • Confidential</span>
            <span>Document Ref: KIPS-CHN-CAT-${new Date().getFullYear()}</span>
          </div>

          <!-- Executive Header -->
          <div class="header-block">
            <div class="header-brand">
              <div class="logo-frame">
                <img src="/logo.jpg" onerror="this.onerror=null; this.src='/logo.png';" alt="KIPS Logo" />
              </div>
              <div>
                <h1 class="brand-title">KIPS SCHOOL</h1>
                <div class="brand-subtitle">Chunian Campus</div>
                <div class="doc-title-pill">Inventory &amp; Extra Charges Master Catalog</div>
                <div class="brand-helpline">Official Helpline: <strong>0300 39 39 581</strong></div>
              </div>
            </div>

            <div class="meta-card">
              <div class="meta-row">
                <span class="meta-label">Audit Date</span>
                <span class="meta-val">${formattedDate}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">Catalog Heads</span>
                <span class="meta-val">${totalItems} Items</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">Alert Status</span>
                <span class="meta-val" style="color: ${lowStockCount > 0 ? '#b91c1c' : '#15803d'}; font-weight: 800;">
                  ${lowStockCount > 0 ? `${lowStockCount} Low Alert` : "Optimal Stock"}
                </span>
              </div>
            </div>
          </div>

          <!-- Main Table -->
          <table>
            <thead>
              <tr>
                <th style="width: 24px;">#</th>
                <th class="th-left">Item Description &amp; Code</th>
                <th style="width: 80px;">Category</th>
                <th style="width: 75px;">Type</th>
                <th class="th-right" style="width: 85px;">Unit Price</th>
                <th style="width: 55px;">Stock</th>
                <th style="width: 50px;">Alert Qty</th>
                <th style="width: 105px;">Status</th>
                <th class="th-right" style="width: 95px;">Valuation</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <!-- Grand Total Summary Box -->
          <div class="summary-box">
            <div class="summary-cell">
              <div class="summary-label">Total Catalog Heads</div>
              <div class="summary-val">${totalItems} Registered Items</div>
            </div>
            <div class="summary-cell">
              <div class="summary-label">In-Stock Physical Units</div>
              <div class="summary-val">${totalUnits.toLocaleString()} Units</div>
            </div>
            <div class="summary-cell">
              <div class="summary-label">Total Asset Valuation (PKR)</div>
              <div class="summary-val" style="color: #0f172a;">Rs. ${totalValuation.toLocaleString()}</div>
            </div>
          </div>

          <!-- Verification Signatures -->
          <div class="signatures-grid">
            <div class="sign-box">
              <div class="sign-line-bar"></div>
              <div class="sign-name">Store In-Charge</div>
              <div class="sign-role">Physical Inventory Verification</div>
            </div>
            <div class="sign-box">
              <div class="sign-line-bar"></div>
              <div class="sign-name">Accounts Officer / Cashier</div>
              <div class="sign-role">Valuation &amp; Ledger Audit</div>
            </div>
            <div class="sign-box">
              <div class="sign-line-bar"></div>
              <div class="sign-name">Campus Principal</div>
              <div class="sign-role">Administrative Approval</div>
            </div>
          </div>

          <!-- Security Footer -->
          <div class="doc-bottom">
            <span>KIPS SCHOOL CHUNIAN CAMPUS • OFFICIAL AUDITED INVENTORY CATALOG</span>
            <span>Helpline: <strong>0300 39 39 581</strong></span>
          </div>

        </body>
      </html>
    `;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(catalogPdfHtml);
    doc.close();

    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }, 300);
  };

  // Print Isolated Slip Function
  const handlePrintSlip = () => {
    if (!receiptData) return;

    const formattedDate = format(new Date(receiptData.date || new Date()), "dd MMM yyyy, hh:mm a");
    const paymentMethod = (receiptData.payment_method || "Cash").toUpperCase();
    const studentName = receiptData.student?.name || "Student";
    const rollNo = receiptData.student?.roll_number || `#${receiptData.student?.id || ""}`;
    const title = receiptData.title || "Extra Item / Charge";
    const qty = receiptData.quantity || 1;
    const unitPrice = parseFloat(receiptData.unit_price || 0).toLocaleString();
    const totalAmount = parseFloat(receiptData.total_amount || 0).toLocaleString();

    const slipHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>POS Receipt - ${title}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 3mm;
            }
            @media print {
              html, body {
                width: 100%;
                margin: 0 !important;
                padding: 0 !important;
                background: #fff !important;
              }
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            }
            body {
              background: #fff;
              color: #0f172a;
              padding: 6px;
              display: flex;
              justify-content: center;
            }
            .slip-card {
              width: 100%;
              max-width: 320px;
              border: 1px dashed #94a3b8;
              border-radius: 8px;
              padding: 14px;
              background: #fff;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .school-name {
              font-size: 15px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #0f172a;
            }
            .campus {
              font-size: 11px;
              font-weight: 700;
              color: #334155;
              margin-top: 1px;
            }
            .sub-text {
              font-size: 9px;
              color: #64748b;
              margin-top: 2px;
            }
            .dashed-line {
              border-bottom: 1px dashed #cbd5e1;
              margin: 10px 0;
            }
            .solid-line {
              border-top: 1px solid #e2e8f0;
              border-bottom: 1px solid #e2e8f0;
              margin: 10px 0;
              padding: 8px 0;
            }
            .grid-2 {
              display: grid;
              grid-template-columns: 1fr 1fr;
              row-gap: 6px;
              column-gap: 8px;
              font-size: 11px;
            }
            .field-label {
              font-size: 9px;
              text-transform: uppercase;
              font-weight: 700;
              color: #64748b;
              display: block;
              margin-bottom: 1px;
            }
            .field-val {
              font-weight: 700;
              color: #0f172a;
            }
            .roll-no {
              font-family: monospace;
              color: #1d4ed8;
              font-weight: 700;
            }
            .status-paid {
              font-weight: 800;
              color: #047857;
              text-transform: uppercase;
            }
            .item-title-row {
              display: flex;
              justify-content: space-between;
              font-size: 12px;
              font-weight: 700;
              font-family: monospace;
            }
            .item-qty-row {
              display: flex;
              justify-content: space-between;
              font-size: 10px;
              color: #64748b;
              font-family: monospace;
              margin-top: 2px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 13px;
              font-weight: 900;
              padding-top: 2px;
            }
            .total-amt {
              font-family: monospace;
              color: #047857;
              font-size: 15px;
              font-weight: 900;
            }
            .footer {
              display: flex;
              justify-content: space-between;
              font-size: 9px;
              color: #94a3b8;
              margin-top: 14px;
              padding-top: 8px;
              border-top: 1px dashed #e2e8f0;
            }
          </style>
        </head>
        <body>
          <div class="slip-card">
            <div class="center">
              <h2 class="school-name">KIPS SCHOOL</h2>
              <p class="campus">Chunian Campus</p>
              <p class="sub-text">Auxiliary Counter Receipt • Helpline: 0300 39 39 581</p>
            </div>

            <div class="dashed-line"></div>

            <div class="grid-2">
              <div>
                <span class="field-label">Student Name</span>
                <span class="field-val">${studentName}</span>
              </div>
              <div class="right">
                <span class="field-label">Roll / Reg #</span>
                <span class="roll-no">${rollNo}</span>
              </div>
              <div>
                <span class="field-label">Issue Date</span>
                <span class="field-val">${formattedDate}</span>
              </div>
              <div class="right">
                <span class="field-label">Payment Status</span>
                <span class="status-paid">PAID (${paymentMethod})</span>
              </div>
            </div>

            <div class="solid-line">
              <div class="item-title-row">
                <span>${title}</span>
                <span>Rs. ${totalAmount}</span>
              </div>
              <div class="item-qty-row">
                <span>Quantity: ${qty} @ Rs. ${unitPrice}</span>
              </div>
            </div>

            <div class="total-row">
              <span>Total Amount Paid:</span>
              <span class="total-amt">Rs. ${totalAmount}</span>
            </div>

            <div class="footer">
              <span>Authorized Cashier</span>
              <span>Computer Generated Slip</span>
            </div>
          </div>
        </body>
      </html>
    `;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(slipHtml);
    doc.close();

    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }, 250);
  };

  // Bulk Apply Charge
  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkClassId) {
      showAlert("Please select a target class.", "error");
      return;
    }
    if (!bulkTitle.trim() || !bulkAmount || parseFloat(String(bulkAmount)) <= 0) {
      showAlert("Please enter a valid title and amount per student.", "error");
      return;
    }

    // Filter students in selected class & section
    const targetStudents = students.filter((s) => {
      if (s.class_id != bulkClassId) return false;
      if (bulkSectionId && s.section_id != bulkSectionId) return false;
      return true;
    });

    if (targetStudents.length === 0) {
      showAlert("No students found in the selected class/section.", "error");
      return;
    }

    if (!confirm(`Apply charge "${bulkTitle}" of Rs. ${bulkAmount} to all ${targetStudents.length} students in this class?`)) {
      return;
    }

    setSubmittingBulk(true);
    try {
      const payload = {
        student_ids: targetStudents.map((s) => s.id),
        extra_charge_item_id: null,
        title: bulkTitle.trim(),
        category: bulkCategory,
        charge_type: "ad_hoc",
        unit_price: parseFloat(String(bulkAmount)),
        quantity: 1,
        payment_option: bulkPaymentOption,
        payment_method: bulkPaymentOption === "pay_now" ? "cash" : "voucher",
        notes: bulkNotes.trim(),
      };

      const res = await fetch(`${API}/extra-charges/issue`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const d = await res.json();
      if (!res.ok) {
        throw new Error(d.message || "Bulk issue failed");
      }

      showAlert(`Successfully applied "${bulkTitle}" to ${targetStudents.length} students!`);
      setBulkTitle("");
      setBulkAmount("");
      setBulkNotes("");
      fetchStats();
    } catch (err: any) {
      showAlert(err.message, "error");
    } finally {
      setSubmittingBulk(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        
        {/* Clean Standard Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "#0f224a" }}>
              Extra Charges
            </h1>
            <p className="mt-1 text-sm font-medium" style={{ color: "#38bdf8" }}>
              Manage stationery items, fines, trips, and point-of-sale student charges.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isSuperAdmin && (
              <button
                onClick={() => setShowNewItemModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow transition active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Add Item</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Notifications Alert */}
        {alertMsg && (
          <div
            className={`p-4 rounded-xl flex items-center justify-between gap-3 text-sm font-bold shadow-md transition-all animate-fadeIn ${
              alertMsg.type === "success"
                ? "bg-emerald-50 text-emerald-900 border border-emerald-300"
                : "bg-red-50 text-red-900 border border-red-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {alertMsg.type === "success" ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
              <span>{alertMsg.text}</span>
            </div>
            <button onClick={() => setAlertMsg(null)} className="text-slate-400 hover:text-slate-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Top KPI Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5">
            <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] uppercase font-bold text-slate-400 block tracking-wider">Catalog Items</span>
              <p className="text-lg font-black text-slate-900">{stats.total_stock_items} <span className="text-xs font-medium text-slate-500">Items</span></p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5">
            <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] uppercase font-bold text-slate-400 block tracking-wider">Billed (This Month)</span>
              <p className="text-base font-black text-slate-900 font-mono">Rs. {stats.billed_this_month?.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5">
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] uppercase font-bold text-slate-400 block tracking-wider">Cash Collected</span>
              <p className="text-base font-black text-emerald-700 font-mono">Rs. {stats.paid_this_month?.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5">
            <div className="p-3 bg-red-50 text-red-700 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] uppercase font-bold text-slate-400 block tracking-wider">Pending Arrears</span>
              <p className="text-base font-black text-red-700 font-mono">Rs. {stats.pending_balance?.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Sleek Modern Navigation Tabs */}
        <div className="flex border-b border-slate-200 gap-2 sm:gap-6 overflow-x-auto text-xs sm:text-sm">
          <button
            onClick={() => setActiveTab("pos")}
            className={`flex items-center gap-2 pb-3.5 pt-1 px-1 font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "pos"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Point of Sale / Quick Issue</span>
          </button>

          <button
            onClick={() => setActiveTab("inventory")}
            className={`flex items-center gap-2 pb-3.5 pt-1 px-1 font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "inventory"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Inventory &amp; Catalog</span>
          </button>

          <button
            onClick={() => setActiveTab("logs")}
            className={`flex items-center gap-2 pb-3.5 pt-1 px-1 font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "logs"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Sales &amp; Charges Log</span>
          </button>
        </div>

        {/* ══════════════════════ TAB 1: POINT OF SALE / QUICK ISSUE ══════════════════════ */}
        {activeTab === "pos" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Student Search & Catalog Selection */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Step 1: Select Student Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">1</span>
                    Select Student
                  </h2>
                  {selectedStudent && (
                    <button
                      onClick={() => {
                        setSelectedStudent(null);
                        setStudentSearch("");
                      }}
                      className="text-xs font-bold text-red-600 hover:underline"
                    >
                      Change Student
                    </button>
                  )}
                </div>

                {!selectedStudent ? (
                  <div className="relative">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search student by Name, Roll No, or Father Name..."
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50"
                      />
                    </div>

                    {filteredStudents.length > 0 && (
                      <div className="absolute z-20 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl divide-y divide-slate-100 max-h-64 overflow-y-auto">
                        {filteredStudents.map((st) => (
                          <div
                            key={st.id}
                            onClick={() => {
                              setSelectedStudent(st);
                              setStudentSearch("");
                            }}
                            className="p-3 hover:bg-blue-50/70 cursor-pointer flex items-center justify-between transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                                {st.name?.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 text-xs sm:text-sm">{st.name}</p>
                                <p className="text-[11px] text-slate-500">S/O {st.father_name || "—"}</p>
                              </div>
                            </div>
                            <div className="text-right font-mono text-xs">
                              <span className="font-bold text-blue-700">{st.roll_number || `#${st.id}`}</span>
                              <span className="text-slate-400 block text-[10px]">{st.section?.name || "Section A"}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                        {selectedStudent.name?.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 text-sm">{selectedStudent.name}</h3>
                        <p className="text-xs text-slate-600">S/O {selectedStudent.father_name || "—"} • Contact: {selectedStudent.contact_number || "—"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-2.5 py-1 rounded bg-blue-600 text-white font-mono font-bold text-xs">
                        {selectedStudent.roll_number || `#${selectedStudent.id}`}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2: Select Items or Custom Charge */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">2</span>
                    Select Item or Charge
                  </h2>
                </div>

                {/* Catalog Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                  {/* Custom Ad-hoc Charge Card */}
                  <div
                    onClick={handleSelectCustom}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                      isCustomCharge
                        ? "border-blue-600 bg-blue-50/60 shadow-sm"
                        : "border-dashed border-slate-300 hover:border-slate-400 bg-slate-50/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span className="font-bold text-xs text-slate-900">Custom / Ad-hoc Charge</span>
                    </div>
                    <p className="text-[11px] text-slate-500">Enter a custom fine, picnic, lab fee, or any ad-hoc charge.</p>
                  </div>

                  {sortedCatalogItems.map((item) => {
                    const isSelected = selectedItem?.id === item.id;
                    const isStock = item.item_type === "stock_based";
                    const threshold = Number(item.low_stock_threshold ?? 5);
                    const stockQty = Number(item.stock_quantity ?? 0);
                    const isOutOfStock = isStock && stockQty <= 0;
                    const isLowStock = isStock && stockQty <= threshold;

                    return (
                      <div
                        key={item.id}
                        onClick={() => !isOutOfStock && handleSelectItem(item)}
                        className={`p-3.5 rounded-xl border-2 transition-all flex flex-col justify-between ${
                          isOutOfStock
                            ? "opacity-60 cursor-not-allowed bg-red-50/30 border-red-200"
                            : isSelected
                            ? "border-blue-600 bg-blue-50/60 shadow-sm cursor-pointer"
                            : isLowStock
                            ? "border-red-400 bg-red-50/50 shadow-sm ring-1 ring-red-400 cursor-pointer"
                            : "border-slate-200 hover:border-slate-300 bg-white cursor-pointer"
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-1">
                            <span className="font-bold text-xs text-slate-900 leading-snug block">{item.name}</span>
                            {isLowStock && (
                              <span className="text-[9px] font-black uppercase text-red-600 bg-red-100 border border-red-200 px-1.5 py-0.5 rounded shrink-0">
                                {isOutOfStock ? "Out of Stock" : "Stock Alert"}
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{item.description}</p>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                          <span className="font-mono font-black text-slate-900 text-xs">
                            Rs. {parseFloat(item.unit_price).toLocaleString()}
                          </span>

                          {isStock ? (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isOutOfStock
                                  ? "bg-red-600 text-white font-black"
                                  : isLowStock
                                  ? "bg-red-600 text-white font-black"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {isOutOfStock
                                ? "🚨 0 in stock"
                                : isLowStock
                                ? `⚠️ ${stockQty} left (Alert ≤ ${threshold})`
                                : `${stockQty} in stock`}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                              One-Time
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {sortedCatalogItems.length === 0 && (
                    <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center col-span-1 sm:col-span-2 text-slate-400 text-xs">
                      No catalog items added yet. You can use <strong>Custom Charge</strong> above, or click <strong>&quot;+ Add Item&quot;</strong> in the top header to add stationery items.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Checkout & Billing Configuration */}
            <div className="lg:col-span-5">
              <form onSubmit={handlePOSSubmit} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md space-y-4 sticky top-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">3</span>
                    Order Summary &amp; Payment
                  </h2>
                  <span className="text-[11px] font-bold text-slate-500">POS Checkout</span>
                </div>

                {/* Custom Charge Fields */}
                {isCustomCharge && (
                  <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-3">
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">Charge Title / Reason *</label>
                      <input
                        type="text"
                        placeholder="e.g. Murree Tour 2026, Discipline Fine..."
                        value={customTitle}
                        onChange={(e) => setCustomTitle(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">Unit Price (Rs) *</label>
                      <NumberInput
                        value={unitPrice}
                        onChange={(val) => setUnitPrice(val === "" ? "" : parseFloat(val))}
                        placeholder="0.00"
                        min={1}
                        allowDecimal={true}
                      />
                    </div>
                  </div>
                )}

                {/* Selected Item Summary */}
                {selectedItem && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="font-bold text-xs text-slate-900">{selectedItem.name}</p>
                      <p className="text-[11px] text-slate-500">Unit Price: Rs. {parseFloat(selectedItem.unit_price).toLocaleString()}</p>
                    </div>
                    <span className="font-bold font-mono text-sm text-blue-700">
                      Rs. {parseFloat(selectedItem.unit_price).toLocaleString()}
                    </span>
                  </div>
                )}

                {/* Quantity Selector */}
                {(selectedItem || isCustomCharge) && (
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-700">Quantity</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-7 h-7 rounded-lg bg-white border border-slate-300 font-bold text-sm flex items-center justify-center hover:bg-slate-100"
                      >
                        -
                      </button>
                      <span className="font-mono font-bold text-sm px-2">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity(quantity + 1)}
                        className="w-7 h-7 rounded-lg bg-white border border-slate-300 font-bold text-sm flex items-center justify-center hover:bg-slate-100"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}

                {/* Total Billing Amount Box */}
                <div className="p-4 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-xl shadow-inner flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-bold">Total Bill Payable</span>
                    <span className="text-xs text-blue-300 font-semibold">{quantity} item(s) selected</span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black font-mono text-amber-400">
                      Rs. {calculatedTotal.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* ══════════════════════ OPTION TO PAY NOW OR BILL TO VOUCHER ══════════════════════ */}
                <div className="space-y-2 pt-2">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 block">
                    Payment Billing Mode *
                  </label>

                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Option 1: Pay Now */}
                    <div
                      onClick={() => setPaymentOption("pay_now")}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                        paymentOption === "pay_now"
                          ? "border-emerald-600 bg-emerald-50/70 text-emerald-950 shadow-sm"
                          : "border-slate-200 hover:border-slate-300 bg-white text-slate-600"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className={`w-4 h-4 ${paymentOption === "pay_now" ? "text-emerald-600" : "text-slate-400"}`} />
                        <span className="font-black text-xs">Pay Now (Cash)</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">Instant counter collection &amp; POS receipt</p>
                    </div>

                    {/* Option 2: Bill to Voucher */}
                    <div
                      onClick={() => setPaymentOption("bill_to_voucher")}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                        paymentOption === "bill_to_voucher"
                          ? "border-blue-600 bg-blue-50/70 text-blue-950 shadow-sm"
                          : "border-slate-200 hover:border-slate-300 bg-white text-slate-600"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <FileText className={`w-4 h-4 ${paymentOption === "bill_to_voucher" ? "text-blue-600" : "text-slate-400"}`} />
                        <span className="font-black text-xs">Bill to Voucher</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">Add to student ledger &amp; fee arrears</p>
                    </div>
                  </div>
                </div>

                {/* If Pay Now, payment method dropdown */}
                {paymentOption === "pay_now" && (
                  <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900">Received By Method:</span>
                    <select
                      value={paymentMethod}
                      onChange={(e: any) => setPaymentMethod(e.target.value)}
                      className="px-3 py-1.5 text-xs font-bold border border-emerald-300 rounded-lg bg-white text-slate-900"
                    >
                      <option value="cash">Cash (Counter)</option>
                      <option value="online">Online Transfer</option>
                      <option value="bank">Bank Deposit</option>
                    </select>
                  </div>
                )}

                {/* Notes Input */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Transaction Remarks (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Received by Cashier, 10th grade lab requirements"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  />
                </div>

                {/* Submit Checkout Button */}
                <button
                  type="submit"
                  disabled={submittingPOS || (!selectedItem && !isCustomCharge) || !selectedStudent}
                  className={`w-full py-3 rounded-xl font-black text-sm uppercase tracking-wider text-white shadow-lg transition active:scale-98 flex items-center justify-center gap-2 ${
                    paymentOption === "pay_now"
                      ? "bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50"
                      : "bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 disabled:opacity-50"
                  }`}
                >
                  {submittingPOS ? (
                    <span>Processing Order...</span>
                  ) : paymentOption === "pay_now" ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Collect Rs. {calculatedTotal.toLocaleString()} &amp; Issue</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      <span>Bill Rs. {calculatedTotal.toLocaleString()} to Voucher</span>
                    </>
                  )}
                </button>
              </form>
            </div>

          </div>
        )}

        {/* ══════════════════════ TAB 2: INVENTORY & CATALOG ══════════════════════ */}
        {activeTab === "inventory" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
            {/* Header with Title & Action Buttons (Add Item & PDF Download) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-600" />
                  Stationery &amp; Extra Charges Catalog {!isSuperAdmin && <span className="text-xs text-slate-400 font-normal">(View Only)</span>}
                </h2>
                <p className="text-xs text-slate-500">Track current inventory stock, unit prices, low-stock alerts, and one-time fee heads.</p>
              </div>

              <div className="flex items-center gap-2">
                {/* PDF Download Button */}
                <button
                  onClick={handleDownloadCatalogPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow transition active:scale-95"
                  title="Download / Print Official Catalog PDF"
                >
                  <Download className="w-4 h-4 text-sky-400" />
                  <span>Download Catalog PDF</span>
                </button>

                {isSuperAdmin && (
                  <button
                    onClick={() => setShowNewItemModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 shadow transition active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Item</span>
                  </button>
                )}
              </div>
            </div>

            {/* Visual Stock Alert Banner */}
            {stats.low_stock_items > 0 && (
              <div className="p-3.5 bg-red-50 border border-red-300 rounded-xl flex items-center justify-between gap-3 text-xs text-red-900">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                  <span>
                    <strong>Stock Alert Warning:</strong> {stats.low_stock_items} item(s) have reached or fallen below their stock alert quantity and are prioritized in <strong>RED</strong> at the top of this list.
                  </span>
                </div>
                <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-black rounded-md uppercase shrink-0">
                  Critical
                </span>
              </div>
            )}

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="p-3">Item Details</th>
                    <th className="p-3">Category / Type</th>
                    <th className="p-3 text-right">Unit Price (Rs)</th>
                    <th className="p-3 text-center">Stock In-Hand</th>
                    <th className="p-3 text-center">Alert Threshold</th>
                    <th className="p-3 text-center">Status</th>
                    {isSuperAdmin && <th className="p-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedCatalogItems.length === 0 ? (
                    <tr>
                      <td colSpan={isSuperAdmin ? 7 : 6} className="p-8 text-center text-slate-400">
                        {isSuperAdmin
                          ? 'No catalog items found. Click "Add Item" to create stationery or charge templates.'
                          : 'No catalog items available in the system.'}
                      </td>
                    </tr>
                  ) : (
                    sortedCatalogItems.map((it) => {
                      const isStock = it.item_type === "stock_based";
                      const threshold = Number(it.low_stock_threshold ?? 5);
                      const stockQty = Number(it.stock_quantity ?? 0);
                      const isOutOfStock = isStock && stockQty <= 0;
                      const isLowStock = isStock && stockQty <= threshold;

                      return (
                        <tr
                          key={it.id}
                          className={`transition-colors ${
                            isOutOfStock
                              ? "bg-red-100/60 border-l-4 border-l-red-600 hover:bg-red-100/80"
                              : isLowStock
                              ? "bg-red-50/50 border-l-4 border-l-red-500 hover:bg-red-100/40"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {isLowStock && <span className="text-red-600 font-black text-sm">⚠️</span>}
                              <div>
                                <p className="font-bold text-slate-900 text-xs">{it.name}</p>
                                {it.code && <p className="font-mono text-[10px] text-blue-700 font-bold">{it.code}</p>}
                                {it.description && <p className="text-[10px] text-slate-400">{it.description}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-slate-800 capitalize text-xs block">{it.category || "General"}</span>
                            <span className="capitalize text-slate-400 text-[10px]">
                              {it.item_type?.replace("_", " ")}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">
                            Rs. {parseFloat(it.unit_price).toLocaleString()}
                          </td>
                          <td className="p-3 text-center">
                            {isStock ? (
                              <div className="inline-flex flex-col items-center">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full font-black font-mono text-xs ${
                                    isOutOfStock
                                      ? "bg-red-600 text-white"
                                      : isLowStock
                                      ? "bg-red-600 text-white animate-pulse"
                                      : "bg-emerald-100 text-emerald-800"
                                  }`}
                                >
                                  {stockQty} units
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-mono">—</span>
                            )}
                          </td>
                          <td className="p-3 text-center font-mono">
                            {isStock ? (
                              <span className={`text-xs font-bold ${isLowStock ? "text-red-700 font-black" : "text-slate-600"}`}>
                                ≤ {threshold} units
                              </span>
                            ) : (
                              <span className="text-slate-400 font-mono">—</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {isOutOfStock ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-red-600 text-white shadow-xs">
                                🚨 OUT OF STOCK
                              </span>
                            ) : isLowStock ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-red-600 text-white shadow-xs">
                                ⚠️ LOW STOCK ALERT
                              </span>
                            ) : (
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  it.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {it.is_active ? "Active" : "Inactive"}
                              </span>
                            )}
                          </td>
                          {isSuperAdmin && (
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {isStock && (
                                  <button
                                    onClick={() => {
                                      setTargetItem(it);
                                      setRestockQty("");
                                      setShowRestockModal(true);
                                    }}
                                    className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-[11px] font-bold transition"
                                    title="Adjust or Add Stock"
                                  >
                                    + Restock
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setTargetItem(it);
                                    setItemForm({
                                      name: it.name,
                                      code: it.code || "",
                                      category: it.category || "stationery",
                                      item_type: it.item_type || "stock_based",
                                      unit_price: String(it.unit_price),
                                      stock_quantity: String(it.stock_quantity ?? "0"),
                                      low_stock_threshold: String(it.low_stock_threshold ?? "5"),
                                      description: it.description || "",
                                    });
                                    setShowEditItemModal(true);
                                  }}
                                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                                  title="Edit Item"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteItem(it.id)}
                                  className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
                                  title="Delete / Deactivate Item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══════════════════════ TAB 3: SALES & CHARGES HISTORY LOG ══════════════════════ */}
        {activeTab === "logs" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-600" />
                  Extra Charges &amp; Stationery Sales Ledger Log
                </h2>
                <p className="text-xs text-slate-500">Audit trail of all issued items, fines, picnics, and payment collections.</p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search student or charge..."
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:outline-none"
                  />
                </div>

                <select
                  value={logStatus}
                  onChange={(e) => setLogStatus(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="all">All Statuses</option>
                  <option value="paid">Paid</option>
                  <option value="billed_to_voucher">Billed to Voucher</option>
                  <option value="partial">Partial</option>
                </select>

                <select
                  value={logItemId}
                  onChange={(e) => setLogItemId(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium text-slate-700 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Items</option>
                  {catalogItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => fetchSalesLogs(1)}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs"
                  title="Refresh"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Student</th>
                    <th className="p-3">Charge / Item Particulars</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-right">Debit (Rs)</th>
                    <th className="p-3 text-right">Credit (Rs)</th>
                    <th className="p-3 text-right">Balance (Rs)</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">Loading records...</td>
                    </tr>
                  ) : salesLogs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">No transactions found matching your filter criteria.</td>
                    </tr>
                  ) : (
                    salesLogs.map((log) => {
                      const isPaid = log.payment_status === "paid";
                      const isBilled = log.payment_status === "billed_to_voucher";

                      return (
                        <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-mono text-[11px] text-slate-500">
                            {format(new Date(log.created_at), "dd MMM yyyy")}
                          </td>
                          <td className="p-3">
                            <p className="font-bold text-slate-900">{log.student?.name}</p>
                            <p className="text-[10px] text-slate-500 font-mono">
                              {log.student?.roll_number || `#${log.student?.id}`} • {log.student?.academy_class?.name || "Class"}
                            </p>
                          </td>
                          <td className="p-3">
                            <p className="font-bold text-slate-900 text-xs">{log.title}</p>
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-slate-700">{log.quantity}</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">
                            Rs. {parseFloat(log.total_amount).toLocaleString()}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-700">
                            Rs. {parseFloat(log.paid_amount).toLocaleString()}
                          </td>
                          <td className="p-3 text-right font-mono font-bold">
                            {parseFloat(log.balance_amount) > 0 ? (
                              <span className="text-red-700">Rs. {parseFloat(log.balance_amount).toLocaleString()}</span>
                            ) : (
                              <span className="text-slate-400">0.00</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                isPaid
                                  ? "bg-emerald-100 text-emerald-800"
                                  : isBilled
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {isPaid ? "Paid" : isBilled ? "Billed" : "Partial"}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* If Unpaid/Billed, allow collecting cash */}
                              {!isPaid && (
                                <button
                                  onClick={() => {
                                    setTargetCharge(log);
                                    setCollectAmount(log.balance_amount);
                                    setShowCollectModal(true);
                                  }}
                                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded text-[11px]"
                                >
                                  Collect
                                </button>
                              )}

                              {/* Print Slip */}
                              <button
                                onClick={() => {
                                  setReceiptData({
                                    ...log,
                                    date: log.created_at,
                                  });
                                  setShowReceiptModal(true);
                                }}
                                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded"
                                title="Print Receipt"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              {/* Void if unpaid (Super Admin only) */}
                              {!isPaid && isSuperAdmin && (
                                <button
                                  onClick={() => handleVoidCharge(log.id)}
                                  className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                                  title="Void / Cancel Charge"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {salesPagination.last_page > 1 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500">
                  Page {salesPagination.current_page} of {salesPagination.last_page} ({salesPagination.total} records)
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={salesPagination.current_page <= 1}
                    onClick={() => fetchSalesLogs(salesPagination.current_page - 1)}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded text-xs disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    disabled={salesPagination.current_page >= salesPagination.last_page}
                    onClick={() => fetchSalesLogs(salesPagination.current_page + 1)}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded text-xs disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ══════════════════════ MODAL: ADD CATALOG ITEM ══════════════════════ */}
      {showNewItemModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                Add Item to Catalog
              </h3>
              <button onClick={() => setShowNewItemModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Item Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Notebook, Uniform, Badge, Fine, etc."
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Category *</label>
                  <select
                    value={itemForm.category}
                    onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-bold"
                  >
                    <option value="stationery">Stationery</option>
                    <option value="uniform">Uniform</option>
                    <option value="books">Books</option>
                    <option value="fine">Fine / Penalty</option>
                    <option value="trip">Trip / Picnic</option>
                    <option value="event">Event / Activity</option>
                    <option value="id_card">ID Card / Badge</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Item Type *</label>
                  <select
                    value={itemForm.item_type}
                    onChange={(e) => setItemForm({ ...itemForm, item_type: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-bold"
                  >
                    <option value="stock_based">Stock Inventory Item</option>
                    <option value="ad_hoc">One-Time Fee / Ad-hoc</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Unit Price (Rs) *</label>
                  <NumberInput
                    value={itemForm.unit_price}
                    onChange={(val) => setItemForm({ ...itemForm, unit_price: val })}
                    placeholder="0.00"
                    min={0}
                    allowDecimal={true}
                  />
                </div>

                {itemForm.item_type === "stock_based" ? (
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Current Stock (Qty)</label>
                    <NumberInput
                      value={itemForm.stock_quantity}
                      onChange={(val) => setItemForm({ ...itemForm, stock_quantity: val })}
                      placeholder="0"
                      min={0}
                      allowDecimal={false}
                    />
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Code / SKU (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. FIN-01"
                      value={itemForm.code}
                      onChange={(e) => setItemForm({ ...itemForm, code: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                )}
              </div>

              {/* Stock Alert Threshold */}
              {itemForm.item_type === "stock_based" && (
                <div className="p-3 bg-red-50/60 border border-red-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                      Stock Alert Quantity *
                    </label>
                    <span className="text-[10px] text-red-600 font-bold uppercase">Red Alert Level</span>
                  </div>
                  <NumberInput
                    value={itemForm.low_stock_threshold}
                    onChange={(val) => setItemForm({ ...itemForm, low_stock_threshold: val })}
                    placeholder="5"
                    min={0}
                    allowDecimal={false}
                  />
                  <p className="text-[10px] text-red-700 leading-tight pt-1">
                    When stock reaches or drops below this quantity, it will be labeled in <strong>RED</strong> and placed at the <strong>TOP</strong> of the list.
                  </p>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Optional details..."
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowNewItemModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════ MODAL: EDIT CATALOG ITEM ══════════════════════ */}
      {showEditItemModal && targetItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <Edit className="w-5 h-5 text-blue-600" />
                Edit Catalog Item
              </h3>
              <button onClick={() => setShowEditItemModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateItem} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Item Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Notebook, Uniform, Badge, Fine, etc."
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Category *</label>
                  <select
                    value={itemForm.category}
                    onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-bold"
                  >
                    <option value="stationery">Stationery</option>
                    <option value="uniform">Uniform</option>
                    <option value="books">Books</option>
                    <option value="fine">Fine / Penalty</option>
                    <option value="trip">Trip / Picnic</option>
                    <option value="event">Event / Activity</option>
                    <option value="id_card">ID Card / Badge</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Item Type *</label>
                  <select
                    value={itemForm.item_type}
                    onChange={(e) => setItemForm({ ...itemForm, item_type: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-bold"
                  >
                    <option value="stock_based">Stock Inventory Item</option>
                    <option value="ad_hoc">One-Time Fee / Ad-hoc</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Unit Price (Rs) *</label>
                  <NumberInput
                    value={itemForm.unit_price}
                    onChange={(val) => setItemForm({ ...itemForm, unit_price: val })}
                    placeholder="0.00"
                    min={0}
                    allowDecimal={true}
                  />
                </div>

                {itemForm.item_type === "stock_based" ? (
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Current Stock (Qty)</label>
                    <NumberInput
                      value={itemForm.stock_quantity}
                      onChange={(val) => setItemForm({ ...itemForm, stock_quantity: val })}
                      placeholder="0"
                      min={0}
                      allowDecimal={false}
                    />
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Code / SKU (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. FIN-01"
                      value={itemForm.code}
                      onChange={(e) => setItemForm({ ...itemForm, code: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                )}
              </div>

              {/* Stock Alert Threshold */}
              {itemForm.item_type === "stock_based" && (
                <div className="p-3 bg-red-50/60 border border-red-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                      Stock Alert Quantity *
                    </label>
                    <span className="text-[10px] text-red-600 font-bold uppercase">Red Alert Level</span>
                  </div>
                  <NumberInput
                    value={itemForm.low_stock_threshold}
                    onChange={(val) => setItemForm({ ...itemForm, low_stock_threshold: val })}
                    placeholder="5"
                    min={0}
                    allowDecimal={false}
                  />
                  <p className="text-[10px] text-red-700 leading-tight pt-1">
                    When stock reaches or drops below this quantity, it will be labeled in <strong>RED</strong> and placed at the <strong>TOP</strong> of the list.
                  </p>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Optional details..."
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowEditItemModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow"
                >
                  Update Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════ MODAL: RESTOCK INVENTORY ══════════════════════ */}
      {showRestockModal && targetItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-600" />
                Restock Inventory
              </h3>
              <button onClick={() => setShowRestockModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <p className="font-bold text-xs text-slate-900">{targetItem.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Current Stock: <strong className="text-emerald-700 font-mono">{targetItem.stock_quantity} units</strong>
              </p>
            </div>

            <form onSubmit={handleRestockSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Add Stock (+ units) *</label>
                <NumberInput
                  value={restockQty}
                  onChange={(val) => setRestockQty(val === "" ? "" : parseInt(val))}
                  placeholder="e.g. 50"
                  min={1}
                  allowDecimal={false}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRestockModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow"
                >
                  Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════ MODAL: COLLECT CASH PAYMENT ══════════════════════ */}
      {showCollectModal && targetCharge && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Collect Counter Payment
              </h3>
              <button onClick={() => setShowCollectModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-xs">
              <p className="font-bold text-slate-900">{targetCharge.title}</p>
              <p className="text-slate-500">Student: {targetCharge.student?.name}</p>
              <p className="text-red-700 font-bold font-mono">
                Outstanding Balance: Rs. {parseFloat(targetCharge.balance_amount).toLocaleString()}
              </p>
            </div>

            <form onSubmit={handleCollectSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Amount Receiving (Rs) *</label>
                <NumberInput
                  value={collectAmount}
                  onChange={(val) => setCollectAmount(val === "" ? "" : parseFloat(val))}
                  placeholder="0.00"
                  min={1}
                  max={targetCharge ? parseFloat(targetCharge.balance_amount) : undefined}
                  allowDecimal={true}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Method</label>
                <select
                  value={collectMethod}
                  onChange={(e) => setCollectMethod(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-bold"
                >
                  <option value="cash">Cash (Counter)</option>
                  <option value="online">Online Bank Transfer</option>
                  <option value="bank">Bank Deposit</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCollectModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════ MODAL: INSTANT POS PRINTABLE RECEIPT ══════════════════════ */}
      {showReceiptModal && receiptData && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 print:hidden">
              <span className="text-xs font-black uppercase text-slate-500">Official POS Cash Slip</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintSlip}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition active:scale-95 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Slip</span>
                </button>
                <button onClick={() => setShowReceiptModal(false)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Receipt Body */}
            <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-4 font-sans text-xs">
              <div className="text-center pb-3 border-b border-dashed border-slate-300">
                <h3 className="font-black text-base uppercase text-slate-900">KIPS SCHOOL</h3>
                <p className="text-[11px] font-bold text-slate-600">Chunian Campus</p>
                <p className="text-[10px] text-slate-400">Auxiliary Counter Receipt • Helpline: 0300 39 39 581</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Student Name</span>
                  <strong className="text-slate-900">{receiptData.student?.name || "Student"}</strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Roll / Reg #</span>
                  <strong className="font-mono text-blue-700">{receiptData.student?.roll_number || `#${receiptData.student?.id}`}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Issue Date</span>
                  <span>{format(new Date(receiptData.date || new Date()), "dd MMM yyyy, hh:mm a")}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Payment Status</span>
                  <span className="font-bold text-emerald-700 uppercase">Paid (Cash)</span>
                </div>
              </div>

              <div className="border-t border-b border-slate-200 py-2 space-y-1 font-mono">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>{receiptData.title}</span>
                  <span>Rs. {parseFloat(receiptData.total_amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Quantity: {receiptData.quantity} @ Rs. {parseFloat(receiptData.unit_price).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-sm font-black pt-1">
                <span>Total Amount Paid:</span>
                <span className="font-mono text-emerald-700">Rs. {parseFloat(receiptData.total_amount).toLocaleString()}</span>
              </div>

              <div className="pt-6 border-t border-dashed border-slate-200 flex justify-between text-[10px] text-slate-400">
                <span>Authorized Cashier</span>
                <span>Computer Generated Slip</span>
              </div>
            </div>

            <div className="text-center print:hidden">
              <button
                onClick={() => setShowReceiptModal(false)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs"
              >
                Close Slip
              </button>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
