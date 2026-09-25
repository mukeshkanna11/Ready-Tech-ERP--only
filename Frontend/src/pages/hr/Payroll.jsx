import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Banknote,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  DollarSign,
  Edit3,
  Eye,
  FileText,
  Filter,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  TrendingUp,
  UserRound,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { getToken } from "../../services/api";

const API_BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const STATUS_CONFIG = {
  draft: {
    label: "Draft",
    className: "border-slate-500/20 bg-slate-500/10 text-slate-300",
  },
  processed: {
    label: "Processed",
    className: "border-blue-500/20 bg-blue-500/10 text-blue-300",
  },
  approved: {
    label: "Approved",
    className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  },
  paid: {
    label: "Paid",
    className: "border-cyan-500/20 bg-cyan-500/10 text-cyan-300",
  },
  cancelled: {
    label: "Cancelled",
    className: "border-red-500/20 bg-red-500/10 text-red-300",
  },
};

const EMPTY_FORM = {
  employeeId: "",
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
  basicSalary: "",
  allowances: "",
  overtimeAmount: "",
  bonus: "",
  deductions: "",
  tax: "",
  otherDeductions: "",
  notes: "",
};

async function apiRequest(endpoint, options = {}) {
  const token = getToken();

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        `Request failed with status ${response.status}`
    );
  }

  return data;
}

function getArrayResponse(data) {
  if (Array.isArray(data)) return data;

  return (
    data?.data?.payroll ||
    data?.data?.items ||
    data?.data?.rows ||
    data?.data ||
    data?.payroll ||
    data?.items ||
    data?.rows ||
    []
  );
}

function getPagination(data) {
  const pagination =
    data?.pagination ||
    data?.data?.pagination ||
    data?.meta?.pagination ||
    data?.data?.meta ||
    data?.meta ||
    {};

  const page = Number(pagination.page || 1);

  const limit = Number(pagination.limit || 10);

  const total = Number(
    pagination.total ??
      pagination.totalItems ??
      pagination.count ??
      0
  );

  const totalPages = Number(
    pagination.totalPages ??
      pagination.pages ??
      (total > 0 ? Math.ceil(total / limit) : 1)
  );

  return {
    page,
    limit,
    total,
    totalPages: Math.max(totalPages, 1),
  };
}
function employeeName(employee) {
  if (!employee) return "Unknown Employee";

  if (typeof employee === "string") return employee;

  return (
    employee.name ||
    employee.fullName ||
    [employee.firstName, employee.lastName].filter(Boolean).join(" ") ||
    employee.user?.name ||
    employee.user?.fullName ||
    [employee.user?.firstName, employee.user?.lastName]
      .filter(Boolean)
      .join(" ") ||
    employee.employeeCode ||
    "Unknown Employee"
  );
}

function employeeCode(employee) {
  if (!employee || typeof employee === "string") return "";

  return (
    employee.employeeCode ||
    employee.code ||
    employee.user?.employeeCode ||
    ""
  );
}

function getEmployeeId(payroll) {
  if (!payroll) return "";

  if (typeof payroll.employeeId === "string") {
    return payroll.employeeId;
  }

  return payroll.employeeId?._id || payroll.employeeId?.id || "";
}

function formatCurrency(value) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-IN").format(Number(value || 0));
}

function monthName(month) {
  return (
    MONTHS.find((item) => item.value === Number(month))?.label || "Unknown"
  );
}

function formatDate(date) {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function inputNumber(value) {
  if (value === null || value === undefined || value === "") return "";
  return Number(value);
}

function getStatusConfig(status) {
  return (
    STATUS_CONFIG[status] || {
      label: status || "Unknown",
      className: "border-slate-500/20 bg-slate-500/10 text-slate-300",
    }
  );
}

function StatCard({ icon: Icon, label, value, subtext }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#111318] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.18)] transition duration-300 hover:border-white/[0.12]">
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/[0.025] blur-2xl transition group-hover:bg-white/[0.05]" />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
            {label}
          </p>

          <p className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {value}
          </p>

          {subtext && (
            <p className="mt-1 text-xs text-slate-500">{subtext}</p>
          )}
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.035]">
          <Icon size={20} className="text-slate-300" />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const config = getStatusConfig(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${config.className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {config.label}
    </span>
  );
}

function Modal({ title, subtitle, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 p-3 backdrop-blur-md sm:p-6">
      <div
        className={`my-auto w-full ${
          wide ? "max-w-5xl" : "max-w-2xl"
        } overflow-hidden rounded-2xl border border-white/[0.08] bg-[#101217] shadow-[0_30px_100px_rgba(0,0,0,0.6)]`}
      >
        <div className="flex items-start justify-between border-b border-white/[0.07] px-5 py-5 sm:px-6">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-white sm:text-xl">
              {title}
            </h2>

            {subtitle && (
              <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="ml-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03] text-slate-400 transition hover:bg-white/[0.07] hover:text-white"
          >
            <X size={17} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

function EmptyState({ onCreate }) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03]">
        <Banknote size={27} className="text-slate-500" />
      </div>

      <h3 className="mt-5 text-base font-semibold text-white">
        No payroll records found
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        Create your first payroll record to start managing employee salary,
        deductions, processing and payment.
      </p>

      <button
        type="button"
        onClick={onCreate}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-slate-200"
      >
        <Plus size={16} />
        Create Payroll
      </button>
    </div>
  );
}

function DetailRow({ label, value, valueClass = "text-white" }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/[0.05] py-3 last:border-b-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-right text-sm font-medium ${valueClass}`}>
        {value}
      </span>
    </div>
  );
}

export default function Payroll() {
  const [payrolls, setPayrolls] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [loading, setLoading] = useState(true);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [showModal, setShowModal] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState(null);
  const [selectedPayroll, setSelectedPayroll] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionTarget, setActionTarget] = useState(null);
  const [actionType, setActionType] = useState("");

  const [form, setForm] = useState(EMPTY_FORM);

  const showToast = useCallback((type, message) => {
    setToast({ type, message });

    window.setTimeout(() => {
      setToast(null);
    }, 3500);
  }, []);

  const loadEmployees = useCallback(async () => {
    try {
      setEmployeesLoading(true);

      const response = await apiRequest("/employees?limit=1000");
      const list = getArrayResponse(response);

      setEmployees(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Employees load error:", err);
      showToast("error", err.message || "Failed to load employees");
    } finally {
      setEmployeesLoading(false);
    }
  }, [showToast]);

  const loadPayrolls = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      params.set("page", String(page));
      params.set("limit", String(limit));

      if (search.trim()) params.set("search", search.trim());
      if (status) params.set("status", status);
      if (monthFilter) params.set("month", monthFilter);
      if (yearFilter) params.set("year", yearFilter);

      const response = await apiRequest(`/payroll?${params.toString()}`);

      const list = getArrayResponse(response);
      const pageInfo = getPagination(response);

      setPayrolls(Array.isArray(list) ? list : []);
      setPagination({
        ...pageInfo,
        page: pageInfo.page || page,
        limit: pageInfo.limit || limit,
      });
    } catch (err) {
      console.error("Payroll load error:", err);
      setError(err.message || "Failed to load payroll");
      setPayrolls([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, status, monthFilter, yearFilter]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    loadPayrolls();
  }, [loadPayrolls]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [search, status, monthFilter, yearFilter]);

  const selectedEmployee = useMemo(() => {
    return employees.find(
      (employee) =>
        String(employee._id || employee.id) === String(form.employeeId)
    );
  }, [employees, form.employeeId]);

  const stats = useMemo(() => {
    const records = payrolls || [];

    const totalGross = records.reduce(
      (sum, item) => sum + Number(item.grossSalary || 0),
      0
    );

    const totalNet = records.reduce(
      (sum, item) => sum + Number(item.netSalary || 0),
      0
    );

    const paid = records.filter((item) => item.status === "paid").length;
    const pending = records.filter(
      (item) =>
        item.status === "draft" ||
        item.status === "processed" ||
        item.status === "approved"
    ).length;

    return {
      total: pagination.total || records.length,
      gross: totalGross,
      net: totalNet,
      paid,
      pending,
    };
  }, [payrolls, pagination.total]);

  const openCreate = () => {
    setEditingPayroll(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (payroll) => {
    if (payroll.status !== "draft") {
      showToast("error", "Only draft payroll can be edited");
      return;
    }

    setEditingPayroll(payroll);

    setForm({
      employeeId: getEmployeeId(payroll),
      month: Number(payroll.month || new Date().getMonth() + 1),
      year: Number(payroll.year || new Date().getFullYear()),
      basicSalary: inputNumber(payroll.basicSalary),
      allowances: inputNumber(payroll.allowances),
      overtimeAmount: inputNumber(payroll.overtimeAmount),
      bonus: inputNumber(payroll.bonus),
      deductions: inputNumber(payroll.deductions),
      tax: inputNumber(payroll.tax),
      otherDeductions: inputNumber(payroll.otherDeductions),
      notes: payroll.notes || "",
    });

    setShowModal(true);
  };

  const openDetails = (payroll) => {
    setSelectedPayroll(payroll);
    setShowDetails(true);
  };

  const handleFormChange = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.employeeId) {
      showToast("error", "Please select an employee");
      return;
    }

    if (!form.month || !form.year) {
      showToast("error", "Month and year are required");
      return;
    }

    try {
      setActionLoading(true);

      const payload = {
        employeeId: form.employeeId,
        month: Number(form.month),
        year: Number(form.year),
        basicSalary: Number(form.basicSalary || 0),
        allowances: Number(form.allowances || 0),
        overtimeAmount: Number(form.overtimeAmount || 0),
        bonus: Number(form.bonus || 0),
        deductions: Number(form.deductions || 0),
        tax: Number(form.tax || 0),
        otherDeductions: Number(form.otherDeductions || 0),
        notes: form.notes?.trim() || "",
      };

      if (editingPayroll) {
        await apiRequest(`/payroll/${editingPayroll._id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });

        showToast("success", "Payroll updated successfully");
      } else {
        await apiRequest("/payroll", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        showToast("success", "Payroll created successfully");
      }

      setShowModal(false);
      setEditingPayroll(null);
      setForm(EMPTY_FORM);

      await loadPayrolls();
    } catch (err) {
      console.error("Payroll save error:", err);
      showToast("error", err.message || "Failed to save payroll");
    } finally {
      setActionLoading(false);
    }
  };

  const executeWorkflowAction = async () => {
    if (!actionTarget || !actionType) return;

    const endpointMap = {
      process: `/payroll/${actionTarget._id}/process`,
      approve: `/payroll/${actionTarget._id}/approve`,
      pay: `/payroll/${actionTarget._id}/pay`,
      cancel: `/payroll/${actionTarget._id}/cancel`,
    };

    const endpoint = endpointMap[actionType];

    if (!endpoint) return;

    try {
      setActionLoading(true);

      await apiRequest(endpoint, {
        method: "PATCH",
      });

      const messages = {
        process: "Payroll processed successfully",
        approve: "Payroll approved successfully",
        pay: "Payroll marked as paid successfully",
        cancel: "Payroll cancelled successfully",
      };

      showToast("success", messages[actionType]);

      setActionTarget(null);
      setActionType("");

      await loadPayrolls();
    } catch (err) {
      console.error("Payroll workflow error:", err);
      showToast("error", err.message || "Payroll action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;

    try {
      setActionLoading(true);

      await apiRequest(`/payroll/${deleteTarget._id}`, {
        method: "DELETE",
      });

      showToast("success", "Payroll deleted successfully");

      setDeleteTarget(null);
      await loadPayrolls();
    } catch (err) {
      console.error("Payroll delete error:", err);
      showToast("error", err.message || "Failed to delete payroll");
    } finally {
      setActionLoading(false);
    }
  };

  const openWorkflowAction = (payroll, type) => {
    const allowed = {
      process: payroll.status === "draft",
      approve: payroll.status === "processed",
      pay: payroll.status === "approved",
      cancel: ["draft", "processed", "approved"].includes(payroll.status),
    };

    if (!allowed[type]) {
      showToast("error", `Cannot ${type} payroll in current status`);
      return;
    }

    setActionTarget(payroll);
    setActionType(type);
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("");
    setMonthFilter("");
    setYearFilter("");
    setPage(1);
  };

  const totalPages = Math.max(
    1,
    pagination.totalPages ||
      Math.ceil((pagination.total || 0) / (pagination.limit || limit))
  );

  return (
    <div className="min-h-screen w-full bg-[#090a0d] text-white">
      <div className="w-full px-3 py-4 sm:px-5 lg:px-7 xl:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-500">
              <span>HR</span>
              <span>/</span>
              <span className="text-slate-400">Payroll</span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Payroll Management
            </h1>

            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
              Manage employee payroll, salary calculations, approvals and
              payments from one workspace.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <button
              type="button"
              onClick={loadPayrolls}
              disabled={loading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-black shadow-lg shadow-white/[0.05] transition hover:bg-slate-200"
            >
              <Plus size={17} />
              Create Payroll
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={FileText}
            label="Payroll Records"
            value={formatNumber(stats.total)}
            subtext="Current filtered records"
          />

          <StatCard
            icon={TrendingUp}
            label="Gross Payroll"
            value={formatCurrency(stats.gross)}
            subtext="Current page total"
          />

          <StatCard
            icon={DollarSign}
            label="Net Payroll"
            value={formatCurrency(stats.net)}
            subtext="Current page total"
          />

          <StatCard
            icon={Check}
            label="Paid Records"
            value={formatNumber(stats.paid)}
            subtext={`${stats.pending} pending workflow`}
          />
        </div>

        {/* Filters */}
        <div className="mb-5 rounded-2xl border border-white/[0.07] bg-[#111318] p-3 shadow-[0_18px_60px_rgba(0,0,0,0.16)] sm:p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative min-w-0 flex-1">
              <Search
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600"
              />

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search employee, code..."
                className="h-11 w-full rounded-xl border border-white/[0.07] bg-[#0b0d11] pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-600 transition focus:border-white/[0.16]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:flex">
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="h-11 min-w-0 rounded-xl border border-white/[0.07] bg-[#0b0d11] px-3 text-sm text-slate-300 outline-none focus:border-white/[0.16]"
              >
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="processed">Processed</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <select
                value={monthFilter}
                onChange={(event) => setMonthFilter(event.target.value)}
                className="h-11 min-w-0 rounded-xl border border-white/[0.07] bg-[#0b0d11] px-3 text-sm text-slate-300 outline-none focus:border-white/[0.16]"
              >
                <option value="">All Months</option>
                {MONTHS.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>

              <input
                type="number"
                value={yearFilter}
                onChange={(event) => setYearFilter(event.target.value)}
                placeholder="Year"
                className="h-11 min-w-0 rounded-xl border border-white/[0.07] bg-[#0b0d11] px-3 text-sm text-slate-300 outline-none placeholder:text-slate-600 focus:border-white/[0.16]"
              />

              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 text-sm font-medium text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
              >
                <Filter size={15} />
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-4">
            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0 text-red-400"
            />

            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-red-300">
                Failed to load payroll
              </p>
              <p className="mt-1 break-words text-xs leading-5 text-red-400/70">
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={loadPayrolls}
              className="shrink-0 rounded-lg border border-red-500/20 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/10"
            >
              Retry
            </button>
          </div>
        )}

        {/* Main table */}
        <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#111318] shadow-[0_18px_60px_rgba(0,0,0,0.16)]">
          <div className="flex flex-col gap-3 border-b border-white/[0.07] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 className="text-sm font-semibold text-white">
                Payroll Records
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {pagination.total
                  ? `${formatNumber(pagination.total)} total records`
                  : "No records"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden text-xs text-slate-600 sm:inline">
                Rows
              </span>

              <select
                value={limit}
                onChange={(event) => {
                  setLimit(Number(event.target.value));
                  setPage(1);
                }}
                className="h-9 rounded-lg border border-white/[0.07] bg-[#0b0d11] px-2.5 text-xs text-slate-400 outline-none"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[380px] items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 size={28} className="animate-spin text-slate-400" />
                <p className="text-sm text-slate-500">
                  Loading payroll records...
                </p>
              </div>
            </div>
          ) : payrolls.length === 0 ? (
            <EmptyState onCreate={openCreate} />
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1100px]">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-white/[0.015]">
                      <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                        Employee
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                        Period
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                        Gross
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                        Deductions
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                        Net Salary
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                        Status
                      </th>
                      <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {payrolls.map((payroll) => {
                      const employee =
                        typeof payroll.employeeId === "object"
                          ? payroll.employeeId
                          : employees.find(
                              (item) =>
                                String(item._id || item.id) ===
                                String(getEmployeeId(payroll))
                            );

                      const totalDeductions =
                        Number(payroll.deductions || 0) +
                        Number(payroll.tax || 0) +
                        Number(payroll.otherDeductions || 0);

                      return (
                        <tr
                          key={payroll._id}
                          className="group border-b border-white/[0.045] transition hover:bg-white/[0.025]"
                        >
                          <td className="px-5 py-4">
                            <div className="flex min-w-[220px] items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.035] text-xs font-bold text-slate-300">
                                {employeeName(employee)
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-white">
                                  {employeeName(employee)}
                                </p>

                                <p className="mt-0.5 truncate text-xs text-slate-600">
                                  {employeeCode(employee) ||
                                    getEmployeeId(payroll) ||
                                    "—"}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <CalendarDays
                                size={14}
                                className="text-slate-600"
                              />
                              <div>
                                <p className="text-sm font-medium text-slate-300">
                                  {monthName(payroll.month)} {payroll.year}
                                </p>
                                <p className="mt-0.5 text-[11px] text-slate-600">
                                  {formatDate(payroll.payPeriodStart)} —{" "}
                                  {formatDate(payroll.payPeriodEnd)}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4 text-right">
                            <span className="text-sm font-semibold text-slate-200">
                              {formatCurrency(payroll.grossSalary)}
                            </span>
                          </td>

                          <td className="px-4 py-4 text-right">
                            <span className="text-sm text-slate-400">
                              {formatCurrency(totalDeductions)}
                            </span>
                          </td>

                          <td className="px-4 py-4 text-right">
                            <span className="text-sm font-bold text-white">
                              {formatCurrency(payroll.netSalary)}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <StatusBadge status={payroll.status} />
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => openDetails(payroll)}
                                title="View"
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.025] text-slate-500 transition hover:bg-white/[0.07] hover:text-white"
                              >
                                <Eye size={15} />
                              </button>

                              {payroll.status === "draft" && (
                                <button
                                  type="button"
                                  onClick={() => openEdit(payroll)}
                                  title="Edit"
                                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.025] text-slate-500 transition hover:bg-white/[0.07] hover:text-white"
                                >
                                  <Edit3 size={15} />
                                </button>
                              )}

                              {payroll.status === "draft" && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openWorkflowAction(payroll, "process")
                                  }
                                  title="Process"
                                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-500/10 bg-blue-500/[0.05] text-blue-400 transition hover:bg-blue-500/10"
                                >
                                  <Clock3 size={15} />
                                </button>
                              )}

                              {payroll.status === "processed" && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openWorkflowAction(payroll, "approve")
                                  }
                                  title="Approve"
                                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-500/10 bg-emerald-500/[0.05] text-emerald-400 transition hover:bg-emerald-500/10"
                                >
                                  <Check size={15} />
                                </button>
                              )}

                              {payroll.status === "approved" && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openWorkflowAction(payroll, "pay")
                                  }
                                  title="Mark as Paid"
                                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-500/10 bg-cyan-500/[0.05] text-cyan-400 transition hover:bg-cyan-500/10"
                                >
                                  <CreditCard size={15} />
                                </button>
                              )}

                              {["draft", "processed", "approved"].includes(
                                payroll.status
                              ) && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openWorkflowAction(payroll, "cancel")
                                  }
                                  title="Cancel"
                                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-500/10 bg-red-500/[0.04] text-red-400 transition hover:bg-red-500/10"
                                >
                                  <XCircle size={15} />
                                </button>
                              )}

                              {payroll.status === "draft" && (
                                <button
                                  type="button"
                                  onClick={() => setDeleteTarget(payroll)}
                                  title="Delete"
                                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.025] text-slate-600 transition hover:border-red-500/10 hover:bg-red-500/[0.05] hover:text-red-400"
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile / Tablet cards */}
              <div className="grid grid-cols-1 gap-3 p-3 lg:hidden sm:p-4">
                {payrolls.map((payroll) => {
                  const employee =
                    typeof payroll.employeeId === "object"
                      ? payroll.employeeId
                      : employees.find(
                          (item) =>
                            String(item._id || item.id) ===
                            String(getEmployeeId(payroll))
                        );

                  const totalDeductions =
                    Number(payroll.deductions || 0) +
                    Number(payroll.tax || 0) +
                    Number(payroll.otherDeductions || 0);

                  return (
                    <div
                      key={payroll._id}
                      className="rounded-2xl border border-white/[0.07] bg-[#0d0f13] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.035] text-xs font-bold text-slate-300">
                            {employeeName(employee)
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">
                              {employeeName(employee)}
                            </p>

                            <p className="mt-0.5 truncate text-xs text-slate-600">
                              {employeeCode(employee) ||
                                getEmployeeId(payroll) ||
                                "—"}
                            </p>
                          </div>
                        </div>

                        <StatusBadge status={payroll.status} />
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                          <p className="text-[10px] uppercase tracking-wider text-slate-600">
                            Period
                          </p>
                          <p className="mt-1 text-xs font-medium text-slate-300">
                            {monthName(payroll.month)} {payroll.year}
                          </p>
                        </div>

                        <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                          <p className="text-[10px] uppercase tracking-wider text-slate-600">
                            Net Salary
                          </p>
                          <p className="mt-1 text-sm font-bold text-white">
                            {formatCurrency(payroll.netSalary)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-2 border-t border-white/[0.05] pt-3">
                        <div>
                          <p className="text-[10px] text-slate-600">Gross</p>
                          <p className="mt-0.5 text-xs text-slate-300">
                            {formatCurrency(payroll.grossSalary)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] text-slate-600">
                            Deductions
                          </p>
                          <p className="mt-0.5 text-xs text-slate-300">
                            {formatCurrency(totalDeductions)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] text-slate-600">
                            Paid Days
                          </p>
                          <p className="mt-0.5 text-xs text-slate-300">
                            {formatNumber(payroll.paidDays)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] text-slate-600">
                            Overtime
                          </p>
                          <p className="mt-0.5 text-xs text-slate-300">
                            {formatNumber(payroll.overtimeMinutes)} min
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2 border-t border-white/[0.05] pt-3">
                        <button
                          type="button"
                          onClick={() => openDetails(payroll)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 text-xs font-medium text-slate-400 hover:bg-white/[0.07] hover:text-white"
                        >
                          <Eye size={14} />
                          View
                        </button>

                        {payroll.status === "draft" && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEdit(payroll)}
                              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 text-xs font-medium text-slate-400 hover:bg-white/[0.07] hover:text-white"
                            >
                              <Edit3 size={14} />
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                openWorkflowAction(payroll, "process")
                              }
                              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-blue-500/10 bg-blue-500/[0.05] px-3 text-xs font-medium text-blue-400 hover:bg-blue-500/10"
                            >
                              <Clock3 size={14} />
                              Process
                            </button>
                          </>
                        )}

                        {payroll.status === "processed" && (
                          <button
                            type="button"
                            onClick={() =>
                              openWorkflowAction(payroll, "approve")
                            }
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-500/10 bg-emerald-500/[0.05] px-3 text-xs font-medium text-emerald-400 hover:bg-emerald-500/10"
                          >
                            <Check size={14} />
                            Approve
                          </button>
                        )}

                        {payroll.status === "approved" && (
                          <button
                            type="button"
                            onClick={() => openWorkflowAction(payroll, "pay")}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-cyan-500/10 bg-cyan-500/[0.05] px-3 text-xs font-medium text-cyan-400 hover:bg-cyan-500/10"
                          >
                            <CreditCard size={14} />
                            Mark Paid
                          </button>
                        )}

                        {["draft", "processed", "approved"].includes(
                          payroll.status
                        ) && (
                          <button
                            type="button"
                            onClick={() =>
                              openWorkflowAction(payroll, "cancel")
                            }
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-500/10 bg-red-500/[0.04] px-3 text-xs font-medium text-red-400 hover:bg-red-500/10"
                          >
                            <XCircle size={14} />
                            Cancel
                          </button>
                        )}

                        {payroll.status === "draft" && (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(payroll)}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 text-xs font-medium text-slate-500 hover:border-red-500/10 hover:text-red-400"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Pagination */}
          {!loading && payrolls.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-white/[0.07] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-xs text-slate-600">
                Page {pagination.page || page} of {totalPages}
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((previous) => previous - 1)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025] text-slate-500 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronLeft size={16} />
                </button>

                <div className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-white px-3 text-xs font-semibold text-black">
                  {page}
                </div>

                <button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((previous) => previous + 1)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025] text-slate-500 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <Modal
          title={editingPayroll ? "Edit Payroll" : "Create Payroll"}
          subtitle={
            editingPayroll
              ? "Update the draft payroll details."
              : "Create a new employee payroll record."
          }
          onClose={() => {
            if (!actionLoading) {
              setShowModal(false);
              setEditingPayroll(null);
            }
          }}
          wide
        >
          <form onSubmit={handleSubmit}>
            <div className="max-h-[75vh] overflow-y-auto px-5 py-5 sm:px-6">
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {/* Employee */}
                <div className="lg:col-span-2">
                  <label className="mb-2 block text-xs font-medium text-slate-400">
                    Employee <span className="text-red-400">*</span>
                  </label>

                  <select
                    value={form.employeeId}
                    onChange={(event) =>
                      handleFormChange("employeeId", event.target.value)
                    }
                    disabled={employeesLoading || !!editingPayroll}
                    className="h-11 w-full rounded-xl border border-white/[0.07] bg-[#0b0d11] px-3 text-sm text-white outline-none transition focus:border-white/[0.16] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="">
                      {employeesLoading
                        ? "Loading employees..."
                        : "Select employee"}
                    </option>

                    {employees.map((employee) => {
                      const id = employee._id || employee.id;

                      return (
                        <option key={id} value={id}>
                          {employeeName(employee)}
                          {employeeCode(employee)
                            ? ` — ${employeeCode(employee)}`
                            : ""}
                        </option>
                      );
                    })}
                  </select>

                  {selectedEmployee && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                      <UserRound size={13} />
                      {employeeCode(selectedEmployee) || "Employee selected"}
                    </div>
                  )}
                </div>

                {/* Period */}
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-400">
                    Payroll Month <span className="text-red-400">*</span>
                  </label>

                  <select
                    value={form.month}
                    onChange={(event) =>
                      handleFormChange("month", Number(event.target.value))
                    }
                    className="h-11 w-full rounded-xl border border-white/[0.07] bg-[#0b0d11] px-3 text-sm text-white outline-none focus:border-white/[0.16]"
                  >
                    {MONTHS.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-400">
                    Payroll Year <span className="text-red-400">*</span>
                  </label>

                  <input
                    type="number"
                    min="2000"
                    max="2100"
                    value={form.year}
                    onChange={(event) =>
                      handleFormChange("year", Number(event.target.value))
                    }
                    className="h-11 w-full rounded-xl border border-white/[0.07] bg-[#0b0d11] px-3 text-sm text-white outline-none placeholder:text-slate-700 focus:border-white/[0.16]"
                  />
                </div>

                {/* Earnings */}
                <div className="lg:col-span-2">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Earnings
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <MoneyInput
                      label="Basic Salary"
                      value={form.basicSalary}
                      onChange={(value) =>
                        handleFormChange("basicSalary", value)
                      }
                    />

                    <MoneyInput
                      label="Allowances"
                      value={form.allowances}
                      onChange={(value) =>
                        handleFormChange("allowances", value)
                      }
                    />

                    <MoneyInput
                      label="Overtime Amount"
                      value={form.overtimeAmount}
                      onChange={(value) =>
                        handleFormChange("overtimeAmount", value)
                      }
                    />

                    <MoneyInput
                      label="Bonus"
                      value={form.bonus}
                      onChange={(value) => handleFormChange("bonus", value)}
                    />
                  </div>
                </div>

                {/* Deductions */}
                <div className="lg:col-span-2">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-red-400" />
                    <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Deductions
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <MoneyInput
                      label="Deductions"
                      value={form.deductions}
                      onChange={(value) =>
                        handleFormChange("deductions", value)
                      }
                    />

                    <MoneyInput
                      label="Tax"
                      value={form.tax}
                      onChange={(value) => handleFormChange("tax", value)}
                    />

                    <MoneyInput
                      label="Other Deductions"
                      value={form.otherDeductions}
                      onChange={(value) =>
                        handleFormChange("otherDeductions", value)
                      }
                    />

                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                      <p className="text-[10px] uppercase tracking-wider text-slate-600">
                        Preview
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Net salary
                      </p>

                      <p className="mt-1 text-lg font-bold text-white">
                        {formatCurrency(
                          Number(form.basicSalary || 0) +
                            Number(form.allowances || 0) +
                            Number(form.overtimeAmount || 0) +
                            Number(form.bonus || 0) -
                            Number(form.deductions || 0) -
                            Number(form.tax || 0) -
                            Number(form.otherDeductions || 0)
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="lg:col-span-2">
                  <label className="mb-2 block text-xs font-medium text-slate-400">
                    Notes
                  </label>

                  <textarea
                    rows={4}
                    value={form.notes}
                    onChange={(event) =>
                      handleFormChange("notes", event.target.value)
                    }
                    placeholder="Add payroll notes..."
                    className="w-full resize-none rounded-xl border border-white/[0.07] bg-[#0b0d11] px-3 py-3 text-sm text-white outline-none placeholder:text-slate-700 focus:border-white/[0.16]"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-white/[0.07] bg-white/[0.015] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  setShowModal(false);
                  setEditingPayroll(null);
                }}
                className="h-11 rounded-xl border border-white/[0.07] bg-white/[0.025] px-5 text-sm font-medium text-slate-400 hover:bg-white/[0.07] hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={actionLoading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-black transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading && (
                  <Loader2 size={16} className="animate-spin" />
                )}
                {editingPayroll ? "Update Payroll" : "Create Payroll"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Details Modal */}
      {showDetails && selectedPayroll && (
        <Modal
          title="Payroll Details"
          subtitle={`${monthName(selectedPayroll.month)} ${
            selectedPayroll.year
          } payroll`}
          onClose={() => setShowDetails(false)}
          wide
        >
          <div className="max-h-[78vh] overflow-y-auto px-5 py-5 sm:px-6">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.035]">
                    <UserRound size={18} className="text-slate-400" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-slate-600">
                      Employee
                    </p>

                    <p className="mt-1 truncate text-sm font-semibold text-white">
                      {employeeName(
                        typeof selectedPayroll.employeeId === "object"
                          ? selectedPayroll.employeeId
                          : employees.find(
                              (employee) =>
                                String(employee._id || employee.id) ===
                                String(getEmployeeId(selectedPayroll))
                            )
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-600">
                  Pay Period
                </p>

                <p className="mt-2 text-sm font-semibold text-white">
                  {monthName(selectedPayroll.month)} {selectedPayroll.year}
                </p>

                <p className="mt-1 text-xs text-slate-600">
                  {formatDate(selectedPayroll.payPeriodStart)} —{" "}
                  {formatDate(selectedPayroll.payPeriodEnd)}
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-600">
                  Status
                </p>

                <div className="mt-2">
                  <StatusBadge status={selectedPayroll.status} />
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/[0.07] bg-[#0d0f13] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">
                    Earnings
                  </h3>
                  <TrendingUp size={16} className="text-slate-600" />
                </div>

                <DetailRow
                  label="Basic Salary"
                  value={formatCurrency(selectedPayroll.basicSalary)}
                />

                <DetailRow
                  label="Allowances"
                  value={formatCurrency(selectedPayroll.allowances)}
                />

                <DetailRow
                  label="Overtime"
                  value={formatCurrency(selectedPayroll.overtimeAmount)}
                />

                <DetailRow
                  label="Bonus"
                  value={formatCurrency(selectedPayroll.bonus)}
                />

                <DetailRow
                  label="Gross Salary"
                  value={formatCurrency(selectedPayroll.grossSalary)}
                  valueClass="font-bold text-white"
                />
              </div>

              <div className="rounded-2xl border border-white/[0.07] bg-[#0d0f13] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">
                    Deductions
                  </h3>
                  <MoreHorizontal size={16} className="text-slate-600" />
                </div>

                <DetailRow
                  label="Deductions"
                  value={formatCurrency(selectedPayroll.deductions)}
                />

                <DetailRow
                  label="Tax"
                  value={formatCurrency(selectedPayroll.tax)}
                />

                <DetailRow
                  label="Other Deductions"
                  value={formatCurrency(selectedPayroll.otherDeductions)}
                />

                <DetailRow
                  label="Total Deductions"
                  value={formatCurrency(
                    Number(selectedPayroll.deductions || 0) +
                      Number(selectedPayroll.tax || 0) +
                      Number(selectedPayroll.otherDeductions || 0)
                  )}
                />

                <DetailRow
                  label="Net Salary"
                  value={formatCurrency(selectedPayroll.netSalary)}
                  valueClass="font-bold text-white"
                />
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/[0.07] bg-[#0d0f13] p-4">
              <h3 className="mb-3 text-sm font-semibold text-white">
                Attendance & Payroll Metrics
              </h3>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {[
                  ["Working Days", selectedPayroll.workingDays],
                  ["Paid Days", selectedPayroll.paidDays],
                  ["Unpaid Days", selectedPayroll.unpaidDays],
                  ["Leave Days", selectedPayroll.leaveDays],
                  ["Present Days", selectedPayroll.presentDays],
                  ["Absent Days", selectedPayroll.absentDays],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3"
                  >
                    <p className="text-[10px] text-slate-600">{label}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-300">
                      {formatNumber(value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/[0.07] bg-[#0d0f13] p-4">
                <h3 className="mb-3 text-sm font-semibold text-white">
                  Additional Metrics
                </h3>

                <DetailRow
                  label="Half Days"
                  value={formatNumber(selectedPayroll.halfDays)}
                />

                <DetailRow
                  label="Late Days"
                  value={formatNumber(selectedPayroll.lateDays)}
                />

                <DetailRow
                  label="Overtime"
                  value={`${formatNumber(
                    selectedPayroll.overtimeMinutes
                  )} minutes`}
                />
              </div>

              <div className="rounded-2xl border border-white/[0.07] bg-[#0d0f13] p-4">
                <h3 className="mb-3 text-sm font-semibold text-white">
                  Processing Information
                </h3>

                <DetailRow
                  label="Processed At"
                  value={formatDate(selectedPayroll.processedAt)}
                />

                <DetailRow
                  label="Approved At"
                  value={formatDate(selectedPayroll.approvedAt)}
                />

                <DetailRow
                  label="Paid At"
                  value={formatDate(selectedPayroll.paidAt)}
                />
              </div>
            </div>

            {selectedPayroll.notes && (
              <div className="mt-4 rounded-2xl border border-white/[0.07] bg-[#0d0f13] p-4">
                <h3 className="mb-2 text-sm font-semibold text-white">Notes</h3>
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-500">
                  {selectedPayroll.notes}
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end border-t border-white/[0.07] bg-white/[0.015] px-5 py-4 sm:px-6">
            <button
              type="button"
              onClick={() => setShowDetails(false)}
              className="h-10 rounded-xl border border-white/[0.07] bg-white/[0.025] px-5 text-sm font-medium text-slate-400 hover:bg-white/[0.07] hover:text-white"
            >
              Close
            </button>
          </div>
        </Modal>
      )}

      {/* Workflow Confirmation */}
      {actionTarget && actionType && (
        <Modal
          title={`${actionType.charAt(0).toUpperCase()}${actionType.slice(
            1
          )} Payroll`}
          subtitle="Please confirm this payroll workflow action."
          onClose={() => {
            if (!actionLoading) {
              setActionTarget(null);
              setActionType("");
            }
          }}
        >
          <div className="px-5 py-5 sm:px-6">
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.035]">
                  {actionType === "pay" ? (
                    <CreditCard size={18} className="text-cyan-400" />
                  ) : actionType === "approve" ? (
                    <Check size={18} className="text-emerald-400" />
                  ) : actionType === "cancel" ? (
                    <XCircle size={18} className="text-red-400" />
                  ) : (
                    <Clock3 size={18} className="text-blue-400" />
                  )}
                </div>

                <div>
                  <p className="text-sm font-semibold text-white">
                    {employeeName(
                      typeof actionTarget.employeeId === "object"
                        ? actionTarget.employeeId
                        : employees.find(
                            (employee) =>
                              String(employee._id || employee.id) ===
                              String(getEmployeeId(actionTarget))
                          )
                    )}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {monthName(actionTarget.month)} {actionTarget.year} ·{" "}
                    {formatCurrency(actionTarget.netSalary)}
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-500">
              {actionType === "process" &&
                "Processing will calculate and lock the payroll for the next workflow stage."}

              {actionType === "approve" &&
                "Approval will move this processed payroll into the approved stage."}

              {actionType === "pay" &&
                "Marking as paid will complete the payroll payment workflow."}

              {actionType === "cancel" &&
                "Cancelling will move this payroll to the cancelled state."}
            </p>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-white/[0.07] bg-white/[0.015] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => {
                setActionTarget(null);
                setActionType("");
              }}
              className="h-11 rounded-xl border border-white/[0.07] bg-white/[0.025] px-5 text-sm font-medium text-slate-400 hover:bg-white/[0.07] hover:text-white disabled:opacity-50"
            >
              Keep
            </button>

            <button
              type="button"
              disabled={actionLoading}
              onClick={executeWorkflowAction}
              className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${
                actionType === "cancel"
                  ? "bg-red-500/90 hover:bg-red-500"
                  : "bg-white text-black hover:bg-slate-200"
              }`}
            >
              {actionLoading && (
                <Loader2 size={16} className="animate-spin" />
              )}
              Confirm {actionType}
            </button>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <Modal
          title="Delete Payroll"
          subtitle="This action cannot be undone."
          onClose={() => {
            if (!actionLoading) setDeleteTarget(null);
          }}
        >
          <div className="px-5 py-5 sm:px-6">
            <div className="rounded-2xl border border-red-500/15 bg-red-500/[0.04] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-500/15 bg-red-500/[0.06]">
                  <Trash2 size={18} className="text-red-400" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-white">
                    Delete this payroll record?
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {monthName(deleteTarget.month)} {deleteTarget.year} ·{" "}
                    {formatCurrency(deleteTarget.netSalary)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-white/[0.07] bg-white/[0.015] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => setDeleteTarget(null)}
              className="h-11 rounded-xl border border-white/[0.07] bg-white/[0.025] px-5 text-sm font-medium text-slate-400 hover:bg-white/[0.07] hover:text-white disabled:opacity-50"
            >
              Keep Payroll
            </button>

            <button
              type="button"
              disabled={actionLoading}
              onClick={executeDelete}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-500/90 px-5 text-sm font-semibold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionLoading && (
                <Loader2 size={16} className="animate-spin" />
              )}
              Delete Payroll
            </button>
          </div>
        </Modal>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-[200] w-[calc(100%-2rem)] max-w-sm sm:bottom-6 sm:right-6">
          <div
            className={`flex items-start gap-3 rounded-2xl border p-4 shadow-[0_20px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl ${
              toast.type === "success"
                ? "border-emerald-500/20 bg-[#101613]/95"
                : "border-red-500/20 bg-[#171011]/95"
            }`}
          >
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                toast.type === "success"
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-red-500/10 text-red-400"
              }`}
            >
              {toast.type === "success" ? (
                <Check size={16} />
              ) : (
                <AlertCircle size={16} />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">
                {toast.type === "success" ? "Success" : "Error"}
              </p>
              <p className="mt-0.5 break-words text-xs leading-5 text-slate-500">
                {toast.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-slate-600 hover:text-white"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MoneyInput({ label, value, onChange }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-medium text-slate-400">
        {label}
      </label>

      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-600">
          ₹
        </span>

        <input
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="0"
          className="h-11 w-full rounded-xl border border-white/[0.07] bg-[#0b0d11] pl-8 pr-3 text-sm text-white outline-none placeholder:text-slate-700 focus:border-white/[0.16]"
        />
      </div>
    </div>
  );
}