import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getToken } from "../../services/api";
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const LEAVE_TYPES = [
  { value: "casual", label: "Casual Leave" },
  { value: "sick", label: "Sick Leave" },
  { value: "annual", label: "Annual Leave" },
  { value: "earned", label: "Earned Leave" },
  { value: "unpaid", label: "Unpaid Leave" },
  { value: "maternity", label: "Maternity Leave" },
  { value: "paternity", label: "Paternity Leave" },
  { value: "other", label: "Other Leave" },
];

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
];

const EMPTY_FORM = {
  employeeId: "",
  leaveType: "casual",
  startDate: "",
  endDate: "",
  reason: "",
};

const getId = (item) =>
  item?._id || item?.id || item?.employeeId?._id || item?.employeeId?.id || "";

const getEmployeeName = (employee) => {
  if (!employee) return "Unknown Employee";

  if (typeof employee === "string") return employee;

  const firstName =
    employee.firstName ||
    employee.userId?.firstName ||
    employee.user?.firstName ||
    "";

  const lastName =
    employee.lastName ||
    employee.userId?.lastName ||
    employee.user?.lastName ||
    "";

  const fullName =
    employee.name ||
    employee.fullName ||
    employee.employeeName ||
    [firstName, lastName].filter(Boolean).join(" ");

  if (fullName) return fullName;

  return employee.email || employee.employeeCode || "Unknown Employee";
};

const getEmployeeCode = (employee) => {
  if (!employee || typeof employee === "string") return "";

  return (
    employee.employeeCode ||
    employee.code ||
    employee.userId?.employeeCode ||
    ""
  );
};

const formatDate = (date) => {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateInput = (date) => {
  if (!date) return "";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "";

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getLeaveTypeLabel = (value) =>
  LEAVE_TYPES.find((item) => item.value === value)?.label ||
  value ||
  "Unknown";

const getStatusConfig = (status) => {
  switch (status) {
    case "approved":
      return {
        label: "Approved",
        className:
          "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
        dot: "bg-emerald-400",
      };

    case "rejected":
      return {
        label: "Rejected",
        className: "border-red-400/20 bg-red-400/10 text-red-300",
        dot: "bg-red-400",
      };

    case "cancelled":
      return {
        label: "Cancelled",
        className: "border-slate-400/20 bg-slate-400/10 text-slate-300",
        dot: "bg-slate-400",
      };

    default:
      return {
        label: "Pending",
        className: "border-amber-400/20 bg-amber-400/10 text-amber-300",
        dot: "bg-amber-400",
      };
  }
};

const getLeaveTypeAccent = (type) => {
  switch (type) {
    case "sick":
      return "bg-rose-500/10 text-rose-300 border-rose-500/20";
    case "annual":
      return "bg-blue-500/10 text-blue-300 border-blue-500/20";
    case "earned":
      return "bg-violet-500/10 text-violet-300 border-violet-500/20";
    case "unpaid":
      return "bg-slate-500/10 text-slate-300 border-slate-500/20";
    case "maternity":
      return "bg-pink-500/10 text-pink-300 border-pink-500/20";
    case "paternity":
      return "bg-cyan-500/10 text-cyan-300 border-cyan-500/20";
    case "other":
      return "bg-orange-500/10 text-orange-300 border-orange-500/20";
    default:
      return "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
  }
};

const calculateDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0;
  }

  const difference = end.getTime() - start.getTime();

  if (difference < 0) return 0;

  return Math.floor(difference / 86400000) + 1;
};

function Icon({ name, size = 18, strokeWidth = 1.8 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "shrink-0",
  };

  const icons = {
    plus: (
      <svg {...common}>
        <path d="M12 5v14M5 12h14" />
      </svg>
    ),
    search: (
      <svg {...common}>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </svg>
    ),
    filter: (
      <svg {...common}>
        <path d="M4 5h16M7 12h10M10 19h4" />
      </svg>
    ),
    calendar: (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="17" rx="3" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
    users: (
      <svg {...common}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    clock: (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    ),
    check: (
      <svg {...common}>
        <path d="m5 12 4 4L19 6" />
      </svg>
    ),
    x: (
      <svg {...common}>
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
    ),
    eye: (
      <svg {...common}>
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    ),
    edit: (
      <svg {...common}>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
      </svg>
    ),
    trash: (
      <svg {...common}>
        <path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6" />
      </svg>
    ),
    refresh: (
      <svg {...common}>
        <path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 4v5h5" />
        <path d="M4 13a8.1 8.1 0 0 0 15.5 2M20 20v-5h-5" />
      </svg>
    ),
    chevronDown: (
      <svg {...common}>
        <path d="m6 9 6 6 6-6" />
      </svg>
    ),
    chevronLeft: (
      <svg {...common}>
        <path d="m15 18-6-6 6-6" />
      </svg>
    ),
    chevronRight: (
      <svg {...common}>
        <path d="m9 18 6-6-6-6" />
      </svg>
    ),
    close: (
      <svg {...common}>
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
    ),
    briefcase: (
      <svg {...common}>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" />
      </svg>
    ),
    info: (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 8h.01" />
      </svg>
    ),
    alert: (
      <svg {...common}>
        <path d="M10.3 3.7 2.4 17.5A2 2 0 0 0 4.1 20h15.8a2 2 0 0 0 1.7-2.5L13.7 3.7a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4M12 16h.01" />
      </svg>
    ),
  };

  return icons[name] || null;
}

function StatCard({ icon, label, value, helper, iconClass }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#11141a]/90 p-4 shadow-[0_15px_45px_rgba(0,0,0,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:border-white/[0.12]">
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/[0.02] blur-2xl transition-all duration-500 group-hover:bg-white/[0.04]" />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-white">
            {value}
          </p>

          {helper && (
            <p className="mt-1 text-xs text-slate-500">{helper}</p>
          )}
        </div>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl border ${iconClass}`}
        >
          <Icon name={icon} size={19} />
        </div>
      </div>
    </div>
  );
}

function ModalShell({ title, subtitle, onClose, children, width = "max-w-2xl" }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5">
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className={`relative flex max-h-[92vh] w-full ${width} flex-col overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0e1117] shadow-[0_30px_100px_rgba(0,0,0,0.65)]`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.07] px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-white sm:text-lg">
              {title}
            </h2>

            {subtitle && (
              <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="ml-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03] text-slate-400 transition hover:bg-white/[0.07] hover:text-white"
          >
            <Icon name="close" size={17} />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function FieldLabel({ children, required }) {
  return (
    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.11em] text-slate-400">
      {children}
      {required && <span className="ml-1 text-emerald-400">*</span>}
    </label>
  );
}

function Input({ label, required, error, className = "", ...props }) {
  return (
    <div>
      {label && <FieldLabel required={required}>{label}</FieldLabel>}

      <input
        {...props}
        className={`h-11 w-full rounded-xl border bg-white/[0.025] px-3.5 text-sm text-white outline-none transition placeholder:text-slate-600 ${
          error
            ? "border-red-500/50 focus:border-red-500"
            : "border-white/[0.08] focus:border-emerald-400/40 focus:bg-white/[0.035]"
        } ${className}`}
      />

      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  );
}

function Select({
  label,
  required,
  error,
  children,
  className = "",
  ...props
}) {
  return (
    <div>
      {label && <FieldLabel required={required}>{label}</FieldLabel>}

      <div className="relative">
        <select
          {...props}
          className={`h-11 w-full appearance-none rounded-xl border bg-white/[0.025] px-3.5 pr-10 text-sm text-white outline-none transition ${
            error
              ? "border-red-500/50 focus:border-red-500"
              : "border-white/[0.08] focus:border-emerald-400/40"
          } ${className}`}
        >
          {children}
        </select>

        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
          <Icon name="chevronDown" size={15} />
        </div>
      </div>

      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  );
}

function Textarea({ label, required, error, ...props }) {
  return (
    <div>
      {label && <FieldLabel required={required}>{label}</FieldLabel>}

      <textarea
        {...props}
        className={`min-h-[100px] w-full resize-y rounded-xl border bg-white/[0.025] px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 ${
          error
            ? "border-red-500/50 focus:border-red-500"
            : "border-white/[0.08] focus:border-emerald-400/40 focus:bg-white/[0.035]"
        }`}
      />

      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  );
}

function EmployeeAvatar({ employee, size = "md" }) {
  const name = getEmployeeName(employee);

  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  const dimensions = size === "sm" ? "h-8 w-8 text-[10px]" : "h-10 w-10 text-xs";

  return (
    <div
      className={`flex ${dimensions} shrink-0 items-center justify-center rounded-xl border border-emerald-400/15 bg-emerald-400/[0.08] font-bold text-emerald-300`}
    >
      {initials || "?"}
    </div>
  );
}

function StatusBadge({ status }) {
  const config = getStatusConfig(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${config.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

function LeaveTypeBadge({ type }) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-lg border px-2.5 py-1 text-[11px] font-medium ${getLeaveTypeAccent(
        type
      )}`}
    >
      <span className="truncate">{getLeaveTypeLabel(type)}</span>
    </span>
  );
}

export default function Leave() {
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [loading, setLoading] = useState(true);
  const [employeesLoading, setEmployeesLoading] = useState(true);

  const [error, setError] = useState("");
  const [employeesError, setEmployeesError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [leaveTypeFilter, setLeaveTypeFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [showFilters, setShowFilters] = useState(false);

  const [modal, setModal] = useState(null);
  const [selectedLeave, setSelectedLeave] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [actionLoading, setActionLoading] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const [toast, setToast] = useState(null);

  const showToast = useCallback((type, message) => {
    setToast({ type, message });

    window.setTimeout(() => {
      setToast(null);
    }, 3500);
  }, []);

  const apiRequest = useCallback(async (endpoint, options = {}) => {
    const token = getToken();

    const headers = {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
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
  }, []);

  const normalizeList = (data) => {
    if (Array.isArray(data)) return data;

    return (
      data?.data?.items ||
      data?.data?.leaves ||
      data?.items ||
      data?.leaves ||
      data?.data ||
      []
    );
  };

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      if (search.trim()) params.set("search", search.trim());
      if (statusFilter) params.set("status", statusFilter);
      if (leaveTypeFilter) params.set("leaveType", leaveTypeFilter);
      if (employeeFilter) params.set("employeeId", employeeFilter);
      if (yearFilter) params.set("year", yearFilter);

      params.set("page", String(page));
      params.set("limit", String(limit));

      const data = await apiRequest(`/leaves?${params.toString()}`);

      const items = normalizeList(data);

      setLeaves(items);

      const pagination =
        data?.pagination ||
        data?.data?.pagination ||
        data?.meta ||
        data?.data?.meta;

      const returnedTotal =
        pagination?.total ??
        data?.total ??
        data?.data?.total ??
        items.length;

      const returnedPages =
        pagination?.totalPages ??
        pagination?.pages ??
        data?.totalPages ??
        data?.data?.totalPages ??
        Math.max(1, Math.ceil(returnedTotal / limit));

      setTotalItems(Number(returnedTotal) || 0);
      setTotalPages(Math.max(1, Number(returnedPages) || 1));
    } catch (err) {
      setError(err.message || "Failed to load leave records.");
      setLeaves([]);
    } finally {
      setLoading(false);
    }
  }, [
    apiRequest,
    employeeFilter,
    leaveTypeFilter,
    limit,
    page,
    search,
    statusFilter,
    yearFilter,
  ]);

  const fetchEmployees = useCallback(async () => {
    setEmployeesLoading(true);
    setEmployeesError("");

    try {
      const data = await apiRequest("/employees");

      const items =
        data?.data?.items ||
        data?.data?.employees ||
        data?.items ||
        data?.employees ||
        data?.data ||
        (Array.isArray(data) ? data : []);

      setEmployees(Array.isArray(items) ? items : []);
    } catch (err) {
      setEmployees([]);
      setEmployeesError(err.message || "Failed to load employees.");
    } finally {
      setEmployeesLoading(false);
    }
  }, [apiRequest]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchLeaves();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [fetchLeaves]);

  useEffect(() => {
    setPage(1);
  }, [
    search,
    statusFilter,
    leaveTypeFilter,
    employeeFilter,
    yearFilter,
  ]);

  const stats = useMemo(() => {
    const pending = leaves.filter((item) => item.status === "pending").length;
    const approved = leaves.filter((item) => item.status === "approved").length;
    const rejected = leaves.filter((item) => item.status === "rejected").length;

    const totalDays = leaves.reduce(
      (sum, item) => sum + Number(item.totalDays || 0),
      0
    );

    return {
      visible: leaves.length,
      pending,
      approved,
      rejected,
      totalDays,
    };
  }, [leaves]);

  const openCreateModal = () => {
    setForm(EMPTY_FORM);
    setFormErrors({});
    setSelectedLeave(null);
    setModal("create");
  };

  const openEditModal = (leave) => {
    if (leave.status !== "pending") {
      showToast("error", "Only pending leaves can be edited.");
      return;
    }

    const employeeId =
      typeof leave.employeeId === "object"
        ? leave.employeeId?._id || leave.employeeId?.id
        : leave.employeeId;

    setForm({
      employeeId: employeeId || "",
      leaveType: leave.leaveType || "casual",
      startDate: formatDateInput(leave.startDate),
      endDate: formatDateInput(leave.endDate),
      reason: leave.reason || "",
    });

    setFormErrors({});
    setSelectedLeave(leave);
    setModal("edit");
  };

  const openViewModal = async (leave) => {
    setSelectedLeave(leave);
    setModal("view");

    try {
      const id = getId(leave);

      if (!id) return;

      const data = await apiRequest(`/leaves/${id}`);

      const details =
        data?.data?.leave ||
        data?.data ||
        data?.leave ||
        data;

      if (details && typeof details === "object") {
        setSelectedLeave(details);
      }
    } catch {
      // Keep list data if detail request fails.
    }
  };

  const closeModal = () => {
    if (saving || actionLoading) return;

    setModal(null);
    setSelectedLeave(null);
    setFormErrors({});
    setRejectReason("");
  };

  const updateForm = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setFormErrors((current) => ({
      ...current,
      [field]: "",
    }));
  };

  const validateForm = () => {
    const errors = {};

    if (!form.employeeId) {
      errors.employeeId = "Employee is required.";
    }

    if (!form.leaveType) {
      errors.leaveType = "Leave type is required.";
    }

    if (!form.startDate) {
      errors.startDate = "Start date is required.";
    }

    if (!form.endDate) {
      errors.endDate = "End date is required.";
    }

    if (
      form.startDate &&
      form.endDate &&
      new Date(`${form.endDate}T00:00:00`) <
        new Date(`${form.startDate}T00:00:00`)
    ) {
      errors.endDate = "End date cannot be before start date.";
    }

    if (!form.reason.trim()) {
      errors.reason = "Reason is required.";
    }

    setFormErrors(errors);

    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) return;

    setSaving(true);

    try {
      const payload = {
        employeeId: form.employeeId,
        leaveType: form.leaveType,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason.trim(),
      };

      if (modal === "edit") {
        const id = getId(selectedLeave);

        await apiRequest(`/leaves/${id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });

        showToast("success", "Leave request updated successfully.");
      } else {
        await apiRequest("/leaves", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        showToast("success", "Leave request created successfully.");
      }

      closeModal();
      await fetchLeaves();
    } catch (err) {
      showToast("error", err.message || "Unable to save leave request.");
    } finally {
      setSaving(false);
    }
  };

  const performAction = async (action, leave, body = null) => {
    const id = getId(leave);

    if (!id) {
      showToast("error", "Leave ID is missing.");
      return;
    }

    setActionLoading(`${action}-${id}`);

    try {
      let endpoint = `/leaves/${id}`;
      let method = "PATCH";

      if (action === "approve") {
        endpoint = `/leaves/${id}/approve`;
      }

      if (action === "reject") {
        endpoint = `/leaves/${id}/reject`;
      }

      if (action === "cancel") {
        endpoint = `/leaves/${id}/cancel`;
      }

      if (action === "delete") {
        endpoint = `/leaves/${id}`;
        method = "DELETE";
      }

      await apiRequest(endpoint, {
        method,
        ...(body ? { body: JSON.stringify(body) } : {}),
      });

      const messages = {
        approve: "Leave approved successfully.",
        reject: "Leave rejected successfully.",
        cancel: "Leave cancelled successfully.",
        delete: "Leave deleted successfully.",
      };

      showToast("success", messages[action]);

      closeModal();
      await fetchLeaves();
    } catch (err) {
      showToast("error", err.message || "Action failed.");
    } finally {
      setActionLoading("");
    }
  };

  const handleApprove = async (leave) => {
    if (leave.status !== "pending") {
      showToast("error", "Only pending leaves can be approved.");
      return;
    }

    const confirmed = window.confirm(
      `Approve ${getEmployeeName(
        leave.employeeId
      )}'s ${getLeaveTypeLabel(leave.leaveType)} request?`
    );

    if (!confirmed) return;

    await performAction("approve", leave);
  };

  const handleCancel = async (leave) => {
    if (!["pending", "approved"].includes(leave.status)) {
      showToast("error", "This leave cannot be cancelled.");
      return;
    }

    const confirmed = window.confirm(
      `Cancel this leave request for ${getEmployeeName(leave.employeeId)}?`
    );

    if (!confirmed) return;

    await performAction("cancel", leave);
  };

  const handleDelete = async (leave) => {
    if (leave.status !== "pending") {
      showToast("error", "Only pending leaves can be deleted.");
      return;
    }

    const confirmed = window.confirm(
      "Delete this pending leave request permanently?"
    );

    if (!confirmed) return;

    await performAction("delete", leave);
  };

  const openRejectModal = (leave) => {
    if (leave.status !== "pending") {
      showToast("error", "Only pending leaves can be rejected.");
      return;
    }

    setSelectedLeave(leave);
    setRejectReason("");
    setModal("reject");
  };

  const handleReject = async (event) => {
    event.preventDefault();

    if (!rejectReason.trim()) {
      showToast("error", "Please enter a rejection reason.");
      return;
    }

    await performAction("reject", selectedLeave, {
      rejectionReason: rejectReason.trim(),
    });
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setLeaveTypeFilter("");
    setEmployeeFilter("");
    setYearFilter("");
    setPage(1);
  };

  const hasFilters =
    search ||
    statusFilter ||
    leaveTypeFilter ||
    employeeFilter ||
    yearFilter;

  const currentYear = new Date().getFullYear();

  const years = Array.from({ length: 5 }, (_, index) =>
    String(currentYear - 2 + index)
  );

  return (
    <div className="min-h-screen w-full bg-[#080a0e] text-slate-200">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[10%] top-[-12%] h-[420px] w-[420px] rounded-full bg-emerald-500/[0.035] blur-[120px]" />
        <div className="absolute right-[-5%] top-[20%] h-[360px] w-[360px] rounded-full bg-cyan-500/[0.025] blur-[110px]" />
      </div>

      <div className="relative w-full px-3 py-4 sm:px-5 lg:px-7 xl:px-8">
        {/* Header */}
        <header className="mb-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-400/80">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.55)]" />
                Human Resources
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Leave Management
              </h1>

              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                Manage employee leave requests, approvals, rejections and
                leave history from one place.
              </p>
            </div>

            <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto">
              <button
                type="button"
                onClick={() => fetchLeaves()}
                disabled={loading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 text-sm font-semibold text-slate-300 transition hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon name="refresh" size={17} />
                Refresh
              </button>

              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400 px-5 text-sm font-bold text-[#07110c] shadow-[0_10px_30px_rgba(52,211,153,0.12)] transition hover:bg-emerald-300"
              >
                <Icon name="plus" size={17} strokeWidth={2.2} />
                New Leave
              </button>
            </div>
          </div>
        </header>

        {/* Stats */}
        <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon="calendar"
            label="Visible Requests"
            value={loading ? "—" : totalItems}
            helper="Current filtered records"
            iconClass="border-blue-400/15 bg-blue-400/[0.07] text-blue-300"
          />

          <StatCard
            icon="clock"
            label="Pending"
            value={loading ? "—" : stats.pending}
            helper="Awaiting action"
            iconClass="border-amber-400/15 bg-amber-400/[0.07] text-amber-300"
          />

          <StatCard
            icon="check"
            label="Approved"
            value={loading ? "—" : stats.approved}
            helper="Approved requests"
            iconClass="border-emerald-400/15 bg-emerald-400/[0.07] text-emerald-300"
          />

          <StatCard
            icon="calendar"
            label="Leave Days"
            value={loading ? "—" : stats.totalDays}
            helper="Visible page total"
            iconClass="border-violet-400/15 bg-violet-400/[0.07] text-violet-300"
          />
        </section>

        {/* Main Card */}
        <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0e1117]/95 shadow-[0_20px_70px_rgba(0,0,0,0.25)]">
          {/* Toolbar */}
          <div className="border-b border-white/[0.07] p-3 sm:p-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <div className="relative min-w-0 flex-1">
                <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600">
                  <Icon name="search" size={17} />
                </div>

                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search employee, reason..."
                  className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.025] pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400/40 focus:bg-white/[0.035]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:flex xl:w-auto">
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="h-11 min-w-0 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 text-xs font-medium text-slate-300 outline-none focus:border-emerald-400/40 sm:min-w-[130px]"
                >
                  <option value="" className="bg-[#11141a]">
                    All Status
                  </option>

                  {STATUS_OPTIONS.map((status) => (
                    <option
                      key={status.value}
                      value={status.value}
                      className="bg-[#11141a]"
                    >
                      {status.label}
                    </option>
                  ))}
                </select>

                <select
                  value={leaveTypeFilter}
                  onChange={(event) => setLeaveTypeFilter(event.target.value)}
                  className="h-11 min-w-0 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 text-xs font-medium text-slate-300 outline-none focus:border-emerald-400/40 sm:min-w-[150px]"
                >
                  <option value="" className="bg-[#11141a]">
                    All Leave Types
                  </option>

                  {LEAVE_TYPES.map((type) => (
                    <option
                      key={type.value}
                      value={type.value}
                      className="bg-[#11141a]"
                    >
                      {type.label}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setShowFilters((current) => !current)}
                  className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-semibold transition ${
                    showFilters
                      ? "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-300"
                      : "border-white/[0.08] bg-white/[0.025] text-slate-400 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  <Icon name="filter" size={15} />
                  More Filters
                </button>

                {hasFilters ? (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 text-xs font-semibold text-slate-500 transition hover:text-white"
                  >
                    Clear
                  </button>
                ) : (
                  <div className="hidden sm:block" />
                )}
              </div>
            </div>

            {/* More Filters */}
            {showFilters && (
              <div className="mt-3 grid grid-cols-1 gap-3 border-t border-white/[0.06] pt-3 sm:grid-cols-2 lg:grid-cols-3">
                <select
                  value={employeeFilter}
                  onChange={(event) => setEmployeeFilter(event.target.value)}
                  className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 text-sm text-slate-300 outline-none focus:border-emerald-400/40"
                >
                  <option value="" className="bg-[#11141a]">
                    All Employees
                  </option>

                  {employees.map((employee) => {
                    const id = getId(employee);

                    return (
                      <option
                        key={id}
                        value={id}
                        className="bg-[#11141a]"
                      >
                        {getEmployeeName(employee)}
                        {getEmployeeCode(employee)
                          ? ` • ${getEmployeeCode(employee)}`
                          : ""}
                      </option>
                    );
                  })}
                </select>

                <select
                  value={yearFilter}
                  onChange={(event) => setYearFilter(event.target.value)}
                  className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 text-sm text-slate-300 outline-none focus:border-emerald-400/40"
                >
                  <option value="" className="bg-[#11141a]">
                    All Years
                  </option>

                  {years.map((year) => (
                    <option
                      key={year}
                      value={year}
                      className="bg-[#11141a]"
                    >
                      {year}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 text-xs text-slate-500">
                  <Icon name="info" size={15} />
                  Filters are applied to the leave API.
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="m-4 flex items-start gap-3 rounded-xl border border-red-400/15 bg-red-400/[0.06] p-3.5">
              <div className="mt-0.5 text-red-300">
                <Icon name="alert" size={17} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-red-200">
                  Unable to load leave records
                </p>

                <p className="mt-0.5 break-words text-xs text-red-300/70">
                  {error}
                </p>
              </div>

              <button
                type="button"
                onClick={fetchLeaves}
                className="shrink-0 rounded-lg border border-red-400/15 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-400/10"
              >
                Retry
              </button>
            </div>
          )}

          {/* Desktop Table */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[1050px]">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.012]">
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.13em] text-slate-600">
                    Employee
                  </th>

                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.13em] text-slate-600">
                    Leave Type
                  </th>

                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.13em] text-slate-600">
                    Period
                  </th>

                  <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-[0.13em] text-slate-600">
                    Days
                  </th>

                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.13em] text-slate-600">
                    Status
                  </th>

                  <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-[0.13em] text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/[0.045]">
                {loading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <tr key={index}>
                      {Array.from({ length: 6 }).map((__, cellIndex) => (
                        <td key={cellIndex} className="px-4 py-4">
                          <div className="h-10 animate-pulse rounded-lg bg-white/[0.035]" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : leaves.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="flex min-h-[330px] flex-col items-center justify-center px-5 text-center">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.025] text-slate-600">
                          <Icon name="calendar" size={25} />
                        </div>

                        <h3 className="text-sm font-semibold text-slate-300">
                          No leave requests found
                        </h3>

                        <p className="mt-1 max-w-sm text-xs leading-5 text-slate-600">
                          {hasFilters
                            ? "Try changing your filters or create a new leave request."
                            : "There are no leave requests in this workspace yet."}
                        </p>

                        <button
                          type="button"
                          onClick={
                            hasFilters ? clearFilters : openCreateModal
                          }
                          className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.08] px-4 py-2.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-400/[0.13]"
                        >
                          {hasFilters ? "Clear Filters" : "Create Leave"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  leaves.map((leave) => {
                    const employee =
                      typeof leave.employeeId === "object"
                        ? leave.employeeId
                        : employees.find(
                            (item) => getId(item) === leave.employeeId
                          );

                    const id = getId(leave);

                    return (
                      <tr
                        key={id}
                        className="group transition hover:bg-white/[0.018]"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <EmployeeAvatar employee={employee} size="sm" />

                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-200">
                                {getEmployeeName(employee)}
                              </p>

                              <p className="mt-0.5 truncate text-[11px] text-slate-600">
                                {getEmployeeCode(employee) ||
                                  (typeof leave.employeeId === "object"
                                    ? leave.employeeId?.email
                                    : "Employee")}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <LeaveTypeBadge type={leave.leaveType} />
                        </td>

                        <td className="px-4 py-4">
                          <div>
                            <p className="text-xs font-medium text-slate-300">
                              {formatDate(leave.startDate)}
                            </p>

                            <p className="mt-0.5 text-[11px] text-slate-600">
                              to {formatDate(leave.endDate)}
                            </p>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <span className="text-sm font-bold text-white">
                            {leave.totalDays ||
                              calculateDays(
                                formatDateInput(leave.startDate),
                                formatDateInput(leave.endDate)
                              )}
                          </span>

                          <span className="ml-1 text-[10px] text-slate-600">
                            days
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <StatusBadge status={leave.status} />
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              title="View"
                              onClick={() => openViewModal(leave)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-slate-500 transition hover:bg-white/[0.07] hover:text-white"
                            >
                              <Icon name="eye" size={15} />
                            </button>

                            {leave.status === "pending" && (
                              <>
                                <button
                                  type="button"
                                  title="Approve"
                                  onClick={() => handleApprove(leave)}
                                  disabled={Boolean(actionLoading)}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-400/10 bg-emerald-400/[0.04] text-emerald-400 transition hover:bg-emerald-400/[0.1] disabled:opacity-40"
                                >
                                  <Icon name="check" size={15} />
                                </button>

                                <button
                                  type="button"
                                  title="Reject"
                                  onClick={() => openRejectModal(leave)}
                                  disabled={Boolean(actionLoading)}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-400/10 bg-red-400/[0.04] text-red-400 transition hover:bg-red-400/[0.1] disabled:opacity-40"
                                >
                                  <Icon name="x" size={15} />
                                </button>

                                <button
                                  type="button"
                                  title="Edit"
                                  onClick={() => openEditModal(leave)}
                                  disabled={Boolean(actionLoading)}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-slate-500 transition hover:bg-white/[0.07] hover:text-white disabled:opacity-40"
                                >
                                  <Icon name="edit" size={14} />
                                </button>

                                <button
                                  type="button"
                                  title="Delete"
                                  onClick={() => handleDelete(leave)}
                                  disabled={Boolean(actionLoading)}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-400/[0.08] bg-red-400/[0.025] text-red-400/70 transition hover:bg-red-400/[0.08] hover:text-red-300 disabled:opacity-40"
                                >
                                  <Icon name="trash" size={14} />
                                </button>
                              </>
                            )}

                            {["pending", "approved"].includes(
                              leave.status
                            ) && (
                              <button
                                type="button"
                                title="Cancel"
                                onClick={() => handleCancel(leave)}
                                disabled={Boolean(actionLoading)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-400/10 bg-amber-400/[0.03] text-amber-400/80 transition hover:bg-amber-400/[0.09] hover:text-amber-300 disabled:opacity-40"
                              >
                                <Icon name="close" size={14} />
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

          {/* Mobile / Tablet Cards */}
          <div className="grid gap-3 p-3 lg:hidden">
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
                >
                  <div className="h-12 rounded-xl bg-white/[0.04]" />
                  <div className="mt-4 h-16 rounded-xl bg-white/[0.03]" />
                  <div className="mt-3 h-10 rounded-xl bg-white/[0.03]" />
                </div>
              ))
            ) : leaves.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center px-5 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.025] text-slate-600">
                  <Icon name="calendar" size={25} />
                </div>

                <h3 className="text-sm font-semibold text-slate-300">
                  No leave requests found
                </h3>

                <p className="mt-1 max-w-sm text-xs leading-5 text-slate-600">
                  {hasFilters
                    ? "Try changing your filters or create a new leave request."
                    : "There are no leave requests in this workspace yet."}
                </p>
              </div>
            ) : (
              leaves.map((leave) => {
                const employee =
                  typeof leave.employeeId === "object"
                    ? leave.employeeId
                    : employees.find(
                        (item) => getId(item) === leave.employeeId
                      );

                const id = getId(leave);

                return (
                  <div
                    key={id}
                    className="rounded-2xl border border-white/[0.07] bg-white/[0.018] p-4 transition hover:border-white/[0.11]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <EmployeeAvatar employee={employee} />

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">
                            {getEmployeeName(employee)}
                          </p>

                          <p className="mt-0.5 truncate text-[11px] text-slate-600">
                            {getEmployeeCode(employee) ||
                              "Employee leave request"}
                          </p>
                        </div>
                      </div>

                      <StatusBadge status={leave.status} />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-white/[0.05] bg-black/10 p-3">
                        <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-600">
                          Leave Type
                        </p>

                        <div className="mt-2">
                          <LeaveTypeBadge type={leave.leaveType} />
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/[0.05] bg-black/10 p-3">
                        <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-600">
                          Duration
                        </p>

                        <p className="mt-2 text-sm font-bold text-white">
                          {leave.totalDays ||
                            calculateDays(
                              formatDateInput(leave.startDate),
                              formatDateInput(leave.endDate)
                            )}{" "}
                          <span className="text-[10px] font-medium text-slate-600">
                            days
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="mt-2 rounded-xl border border-white/[0.05] bg-black/10 p-3">
                      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-600">
                        Leave Period
                      </p>

                      <p className="mt-1 text-xs font-medium text-slate-300">
                        {formatDate(leave.startDate)}
                        <span className="mx-2 text-slate-700">→</span>
                        {formatDate(leave.endDate)}
                      </p>
                    </div>

                    {leave.reason && (
                      <div className="mt-2 rounded-xl border border-white/[0.05] bg-black/10 p-3">
                        <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-600">
                          Reason
                        </p>

                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">
                          {leave.reason}
                        </p>
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openViewModal(leave)}
                        className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 text-xs font-semibold text-slate-400 transition hover:bg-white/[0.07] hover:text-white"
                      >
                        <Icon name="eye" size={14} />
                        View
                      </button>

                      {leave.status === "pending" && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleApprove(leave)}
                            disabled={Boolean(actionLoading)}
                            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.06] px-3 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-400/[0.12] disabled:opacity-40"
                          >
                            <Icon name="check" size={14} />
                            Approve
                          </button>

                          <button
                            type="button"
                            onClick={() => openRejectModal(leave)}
                            disabled={Boolean(actionLoading)}
                            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-400/15 bg-red-400/[0.05] px-3 text-xs font-semibold text-red-300 transition hover:bg-red-400/[0.11] disabled:opacity-40"
                          >
                            <Icon name="x" size={14} />
                            Reject
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditModal(leave)}
                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 text-xs font-semibold text-slate-400 transition hover:bg-white/[0.07] hover:text-white"
                          >
                            <Icon name="edit" size={14} />
                          </button>
                        </>
                      )}

                      {["pending", "approved"].includes(leave.status) && (
                        <button
                          type="button"
                          onClick={() => handleCancel(leave)}
                          disabled={Boolean(actionLoading)}
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-amber-400/10 bg-amber-400/[0.03] px-3 text-xs font-semibold text-amber-300/80 transition hover:bg-amber-400/[0.08] disabled:opacity-40"
                        >
                          <Icon name="close" size={14} />
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {!loading && leaves.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-white/[0.06] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-xs text-slate-600">
                Showing{" "}
                <span className="font-semibold text-slate-400">
                  {(page - 1) * limit + 1}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-slate-400">
                  {Math.min(page * limit, totalItems)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-400">
                  {totalItems}
                </span>{" "}
                requests
              </p>

              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.02] text-slate-500 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Icon name="chevronLeft" size={16} />
                </button>

                <span className="min-w-[70px] text-center text-xs font-medium text-slate-500">
                  Page{" "}
                  <span className="text-slate-300">{page}</span>{" "}
                  / {totalPages}
                </span>

                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() =>
                    setPage((current) =>
                      Math.min(totalPages, current + 1)
                    )
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.02] text-slate-500 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Icon name="chevronRight" size={16} />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Create / Edit Modal */}
      {(modal === "create" || modal === "edit") && (
        <ModalShell
          title={modal === "edit" ? "Edit Leave Request" : "Create Leave Request"}
          subtitle={
            modal === "edit"
              ? "Update the pending leave request details."
              : "Create a new employee leave request."
          }
          onClose={closeModal}
        >
          <form onSubmit={handleSubmit} className="p-5 sm:p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Select
                  label="Employee"
                  required
                  value={form.employeeId}
                  onChange={(event) =>
                    updateForm("employeeId", event.target.value)
                  }
                  error={formErrors.employeeId}
                  disabled={employeesLoading}
                >
                  <option value="" className="bg-[#11141a]">
                    {employeesLoading
                      ? "Loading employees..."
                      : "Select employee"}
                  </option>

                  {employees.map((employee) => {
                    const id = getId(employee);

                    return (
                      <option
                        key={id}
                        value={id}
                        className="bg-[#11141a]"
                      >
                        {getEmployeeName(employee)}
                        {getEmployeeCode(employee)
                          ? ` • ${getEmployeeCode(employee)}`
                          : ""}
                      </option>
                    );
                  })}
                </Select>

                {employeesError && (
                  <p className="mt-1.5 text-xs text-red-400">
                    {employeesError}
                  </p>
                )}
              </div>

              <Select
                label="Leave Type"
                required
                value={form.leaveType}
                onChange={(event) =>
                  updateForm("leaveType", event.target.value)
                }
                error={formErrors.leaveType}
              >
                {LEAVE_TYPES.map((type) => (
                  <option
                    key={type.value}
                    value={type.value}
                    className="bg-[#11141a]"
                  >
                    {type.label}
                  </option>
                ))}
              </Select>

              <div />

              <Input
                label="Start Date"
                required
                type="date"
                value={form.startDate}
                onChange={(event) =>
                  updateForm("startDate", event.target.value)
                }
                error={formErrors.startDate}
              />

              <Input
                label="End Date"
                required
                type="date"
                value={form.endDate}
                min={form.startDate || undefined}
                onChange={(event) =>
                  updateForm("endDate", event.target.value)
                }
                error={formErrors.endDate}
              />

              <div className="sm:col-span-2">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">
                        Calculated Duration
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-200">
                        {calculateDays(form.startDate, form.endDate)}{" "}
                        <span className="text-xs font-normal text-slate-600">
                          calendar day
                          {calculateDays(form.startDate, form.endDate) !== 1
                            ? "s"
                            : ""}
                        </span>
                      </p>
                    </div>

                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400/[0.08] text-emerald-300">
                      <Icon name="calendar" size={16} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="sm:col-span-2">
                <Textarea
                  label="Reason"
                  required
                  value={form.reason}
                  maxLength={1000}
                  placeholder="Enter the reason for this leave request..."
                  onChange={(event) =>
                    updateForm("reason", event.target.value)
                  }
                  error={formErrors.reason}
                />

                <div className="mt-1 text-right text-[10px] text-slate-600">
                  {form.reason.length}/1000
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 border-t border-white/[0.06] pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="h-11 rounded-xl border border-white/[0.08] bg-white/[0.025] px-5 text-sm font-semibold text-slate-400 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving || employeesLoading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-6 text-sm font-bold text-[#07110c] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#07110c]/30 border-t-[#07110c]" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Icon name="check" size={16} strokeWidth={2.2} />
                    {modal === "edit" ? "Update Leave" : "Create Leave"}
                  </>
                )}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* View Modal */}
      {modal === "view" && selectedLeave && (
        <ModalShell
          title="Leave Request Details"
          subtitle="Complete information for this leave request."
          onClose={closeModal}
          width="max-w-xl"
        >
          <div className="p-5 sm:p-6">
            <div className="flex flex-col gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.018] p-4 sm:flex-row sm:items-center">
              <EmployeeAvatar employee={selectedLeave.employeeId} />

              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-white">
                  {getEmployeeName(selectedLeave.employeeId)}
                </p>

                <p className="mt-1 truncate text-xs text-slate-600">
                  {getEmployeeCode(selectedLeave.employeeId) ||
                    "Employee leave request"}
                </p>
              </div>

              <StatusBadge status={selectedLeave.status} />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">
                  Leave Type
                </p>

                <div className="mt-2">
                  <LeaveTypeBadge type={selectedLeave.leaveType} />
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">
                  Total Days
                </p>

                <p className="mt-2 text-lg font-bold text-white">
                  {selectedLeave.totalDays ||
                    calculateDays(
                      formatDateInput(selectedLeave.startDate),
                      formatDateInput(selectedLeave.endDate)
                    )}{" "}
                  <span className="text-xs font-normal text-slate-600">
                    days
                  </span>
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">
                  Start Date
                </p>

                <p className="mt-2 text-sm font-semibold text-slate-200">
                  {formatDate(selectedLeave.startDate)}
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">
                  End Date
                </p>

                <p className="mt-2 text-sm font-semibold text-slate-200">
                  {formatDate(selectedLeave.endDate)}
                </p>
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">
                Reason
              </p>

              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-400">
                {selectedLeave.reason || "No reason provided."}
              </p>
            </div>

            {selectedLeave.rejectionReason && (
              <div className="mt-3 rounded-xl border border-red-400/10 bg-red-400/[0.04] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-red-400/70">
                  Rejection Reason
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-red-300/80">
                  {selectedLeave.rejectionReason}
                </p>
              </div>
            )}

            <div className="mt-5 flex flex-col gap-2 border-t border-white/[0.06] pt-4 sm:flex-row sm:justify-end">
              {selectedLeave.status === "pending" && (
                <>
                  <button
                    type="button"
                    onClick={() => openEditModal(selectedLeave)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    <Icon name="edit" size={14} />
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApprove(selectedLeave)}
                    disabled={Boolean(actionLoading)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 text-xs font-bold text-[#07110c] transition hover:bg-emerald-300 disabled:opacity-50"
                  >
                    <Icon name="check" size={14} strokeWidth={2.2} />
                    Approve
                  </button>
                </>
              )}

              {["pending", "approved"].includes(selectedLeave.status) && (
                <button
                  type="button"
                  onClick={() => handleCancel(selectedLeave)}
                  disabled={Boolean(actionLoading)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-amber-400/15 bg-amber-400/[0.05] px-4 text-xs font-semibold text-amber-300 transition hover:bg-amber-400/[0.1] disabled:opacity-50"
                >
                  <Icon name="close" size={14} />
                  Cancel Leave
                </button>
              )}

              <button
                type="button"
                onClick={closeModal}
                className="h-10 rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 text-xs font-semibold text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* Reject Modal */}
      {modal === "reject" && selectedLeave && (
        <ModalShell
          title="Reject Leave Request"
          subtitle="Provide a reason before rejecting this request."
          onClose={closeModal}
          width="max-w-lg"
        >
          <form onSubmit={handleReject} className="p-5 sm:p-6">
            <div className="rounded-xl border border-red-400/10 bg-red-400/[0.04] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-400/[0.08] text-red-300">
                  <Icon name="alert" size={17} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-red-200">
                    Rejecting leave request
                  </p>

                  <p className="mt-1 text-xs leading-5 text-red-300/60">
                    {getEmployeeName(selectedLeave.employeeId)} •{" "}
                    {getLeaveTypeLabel(selectedLeave.leaveType)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <Textarea
                label="Rejection Reason"
                required
                value={rejectReason}
                maxLength={1000}
                placeholder="Explain why this leave request is being rejected..."
                onChange={(event) => setRejectReason(event.target.value)}
              />

              <div className="mt-1 text-right text-[10px] text-slate-600">
                {rejectReason.length}/1000
              </div>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 border-t border-white/[0.06] pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
                disabled={Boolean(actionLoading)}
                className="h-11 rounded-xl border border-white/[0.08] bg-white/[0.025] px-5 text-sm font-semibold text-slate-400 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={Boolean(actionLoading)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-500 px-5 text-sm font-bold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Rejecting...
                  </>
                ) : (
                  <>
                    <Icon name="x" size={16} strokeWidth={2.2} />
                    Reject Leave
                  </>
                )}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-[200] w-[calc(100%-2rem)] max-w-sm sm:bottom-6 sm:right-6">
          <div
            className={`flex items-start gap-3 rounded-2xl border p-4 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl ${
              toast.type === "success"
                ? "border-emerald-400/15 bg-[#101813]/95"
                : "border-red-400/15 bg-[#171012]/95"
            }`}
          >
            <div
              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                toast.type === "success"
                  ? "bg-emerald-400/[0.1] text-emerald-300"
                  : "bg-red-400/[0.1] text-red-300"
              }`}
            >
              <Icon
                name={toast.type === "success" ? "check" : "alert"}
                size={16}
              />
            </div>

            <div className="min-w-0 flex-1">
              <p
                className={`text-xs font-semibold ${
                  toast.type === "success"
                    ? "text-emerald-200"
                    : "text-red-200"
                }`}
              >
                {toast.type === "success" ? "Success" : "Action Failed"}
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-400">
                {toast.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-slate-600 transition hover:text-white"
            >
              <Icon name="close" size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}