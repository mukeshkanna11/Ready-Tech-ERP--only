import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  BriefcaseBusiness,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Edit3,
  Eye,
  FileText,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Trash2,
  TrendingUp,
  Users,
  X,
  Wallet,
  CalendarDays,
  ShieldCheck,
  Power,
} from "lucide-react";
import api, { getToken } from "../../services/api";
const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const PAGE_SIZE = 10;

const EMPTY_COMPONENT = {
  name: "",
  code: "",
  type: "fixed",
  value: "",
  percentageOf: "none",
  isTaxable: true,
  isActive: true,
};

const EMPTY_DEDUCTION = {
  name: "",
  code: "",
  type: "fixed",
  value: "",
  percentageOf: "none",
  isActive: true,
};

const EMPTY_CONTRIBUTION = {
  name: "",
  code: "",
  type: "fixed",
  value: "",
  percentageOf: "none",
};

const EMPTY_FORM = {
  name: "",
  code: "",
  description: "",
  payFrequency: "monthly",
  currency: "INR",
  basicSalary: "",
  basicSalaryType: "fixed",
  basicSalaryPercentageOf: "none",
  earnings: [],
  deductions: [],
  employerContributions: [],
  effectiveFrom: "",
  effectiveTo: "",
  isActive: true,
  notes: "",
};

const normalizeResponse = (payload) => {
  if (Array.isArray(payload)) return payload;

  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data?.salaryStructures))
    return payload.data.salaryStructures;
  if (Array.isArray(payload?.salaryStructures))
    return payload.salaryStructures;
  if (Array.isArray(payload?.items)) return payload.items;

  return [];
};

const getSingleResponse = (payload) =>
  payload?.data?.salaryStructure ||
  payload?.data ||
  payload?.salaryStructure ||
  payload;

const getId = (item) => item?._id || item?.id;

const formatCurrency = (value, currency = "INR") => {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
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

const toDateInput = (date) => {
  if (!date) return "";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toISOString().slice(0, 10);
};

const normalizeComponent = (item) => ({
  ...item,
  value:
    item?.value === undefined || item?.value === null
      ? ""
      : item.value,
  percentageOf: item?.percentageOf || "none",
  isActive: item?.isActive !== false,
});

const normalizeForm = (item) => ({
  name: item?.name || "",
  code: item?.code || "",
  description: item?.description || "",
  payFrequency: item?.payFrequency || "monthly",
  currency: item?.currency || "INR",
  basicSalary:
    item?.basicSalary === undefined || item?.basicSalary === null
      ? ""
      : item.basicSalary,
  basicSalaryType: item?.basicSalaryType || "fixed",
  basicSalaryPercentageOf:
    item?.basicSalaryPercentageOf || "none",
  earnings: Array.isArray(item?.earnings)
    ? item.earnings.map(normalizeComponent)
    : [],
  deductions: Array.isArray(item?.deductions)
    ? item.deductions.map((item) => ({
        ...normalizeComponent(item),
        isTaxable: undefined,
      }))
    : [],
  employerContributions: Array.isArray(item?.employerContributions)
    ? item.employerContributions.map(normalizeComponent)
    : [],
  effectiveFrom: toDateInput(item?.effectiveFrom),
  effectiveTo: toDateInput(item?.effectiveTo),
  isActive: item?.isActive !== false,
  notes: item?.notes || "",
});

const calculateComponent = (component, basicSalary, grossSalary) => {
  if (!component) return 0;

  const value = Number(component.value || 0);

  if (component.type === "fixed") {
    return value;
  }

  const base =
    component.percentageOf === "gross"
      ? grossSalary
      : component.percentageOf === "basic"
      ? basicSalary
      : 0;

  return (base * value) / 100;
};

const calculatePreview = (form) => {
  const basic = Number(form.basicSalary || 0);

  const fixedOrBasicEarnings = (form.earnings || []).reduce(
    (total, item) => {
      if (
        item.type === "fixed" ||
        item.percentageOf === "basic"
      ) {
        return total + calculateComponent(item, basic, basic);
      }

      return total;
    },
    0
  );

  const preliminaryGross = basic + fixedOrBasicEarnings;

  const earnings = (form.earnings || []).reduce(
    (total, item) =>
      total +
      calculateComponent(item, basic, preliminaryGross),
    0
  );

  const gross = basic + earnings;

  const deductions = (form.deductions || []).reduce(
    (total, item) =>
      total + calculateComponent(item, basic, gross),
    0
  );

  const employerContributions = (
    form.employerContributions || []
  ).reduce(
    (total, item) =>
      total + calculateComponent(item, basic, gross),
    0
  );

  return {
    basic,
    earnings,
    gross,
    deductions,
    employerContributions,
    net: Math.max(gross - deductions, 0),
    employerCost: gross + employerContributions,
  };
};

const getErrorMessage = (error, fallback) => {
  if (!error) return fallback;

  if (typeof error === "string") return error;

  return (
    error?.response?.data?.message ||
    error?.data?.message ||
    error?.message ||
    fallback
  );
};

const apiRequest = async (endpoint, options = {}) => {
  const token = getToken();

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(
      payload?.message ||
        payload?.error ||
        `Request failed with status ${response.status}`
    );
  }

  return payload;
};

const GlassCard = ({ children, className = "" }) => (
  <div
    className={`rounded-2xl border border-white/[0.07] bg-[#101318]/90 shadow-[0_20px_70px_-30px_rgba(0,0,0,0.8)] ${className}`}
  >
    {children}
  </div>
);

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
}) => (
  <GlassCard className="relative overflow-hidden p-5">
    <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/[0.025] blur-2xl" />

    <div className="relative flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
          {title}
        </p>

        <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
          {value}
        </p>

        {subtitle && (
          <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>
        )}

        {trend && (
          <div className="mt-3 inline-flex items-center gap-1 rounded-full border border-emerald-400/10 bg-emerald-400/[0.06] px-2 py-1 text-[11px] text-emerald-300">
            <TrendingUp size={12} />
            {trend}
          </div>
        )}
      </div>

      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.035]">
        <Icon size={19} className="text-zinc-300" />
      </div>
    </div>
  </GlassCard>
);

const Modal = ({ open, title, subtitle, onClose, children, size = "xl" }) => {
  if (!open) return null;

  const sizeClass =
    size === "lg"
      ? "max-w-3xl"
      : size === "2xl"
      ? "max-w-5xl"
      : "max-w-4xl";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3 backdrop-blur-md sm:p-5">
      <div
        className={`flex max-h-[94vh] w-full ${sizeClass} flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b0d10] shadow-2xl`}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/[0.07] px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-base font-semibold text-white sm:text-lg">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-500 transition hover:bg-white/[0.05] hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

const Input = ({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  disabled = false,
}) => (
  <label className="block">
    <span className="mb-2 block text-xs font-medium text-zinc-400">
      {label} {required && <span className="text-red-400">*</span>}
    </span>

    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className="h-11 w-full rounded-xl border border-white/[0.08] bg-[#15181d] px-3.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-white/20 focus:bg-[#181b20] disabled:cursor-not-allowed disabled:opacity-50"
    />
  </label>
);

const Select = ({
  label,
  value,
  onChange,
  children,
  disabled = false,
}) => (
  <label className="block">
    <span className="mb-2 block text-xs font-medium text-zinc-400">
      {label}
    </span>

    <select
      value={value}
      onChange={onChange}
      disabled={disabled}
      className="h-11 w-full rounded-xl border border-white/[0.08] bg-[#15181d] px-3.5 text-sm text-white outline-none transition focus:border-white/20 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </select>
  </label>
);

const TextArea = ({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}) => (
  <label className="block">
    <span className="mb-2 block text-xs font-medium text-zinc-400">
      {label}
    </span>

    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className="w-full resize-none rounded-xl border border-white/[0.08] bg-[#15181d] px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-white/20"
    />
  </label>
);

const SectionTitle = ({ icon: Icon, title, subtitle }) => (
  <div className="mb-5 flex items-start gap-3">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.035]">
      <Icon size={16} className="text-zinc-300" />
    </div>

    <div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {subtitle && (
        <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>
      )}
    </div>
  </div>
);

const ComponentRow = ({
  item,
  index,
  onChange,
  onRemove,
  type,
}) => {
  const isEarning = type === "earnings";
  const isContribution = type === "employerContributions";

  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#12151a] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.05] text-xs text-zinc-400">
            {index + 1}
          </div>

          <span className="text-xs font-medium text-zinc-400">
            {isEarning
              ? "Earning"
              : isContribution
              ? "Employer Contribution"
              : "Deduction"}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onRemove(index)}
          className="rounded-lg p-2 text-zinc-600 transition hover:bg-red-500/10 hover:text-red-400"
        >
          <Trash2 size={15} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <Input
            label="Name"
            value={item.name}
            placeholder="HRA"
            onChange={(e) =>
              onChange(index, "name", e.target.value)
            }
            required
          />
        </div>

        <div>
          <Input
            label="Code"
            value={item.code}
            placeholder="HRA"
            onChange={(e) =>
              onChange(index, "code", e.target.value.toUpperCase())
            }
            required
          />
        </div>

        <Select
          label="Type"
          value={item.type}
          onChange={(e) =>
            onChange(index, "type", e.target.value)
          }
        >
          <option value="fixed">Fixed</option>
          <option value="percentage">Percentage</option>
        </Select>

        <Input
          label="Value"
          type="number"
          value={item.value}
          placeholder="0"
          onChange={(e) =>
            onChange(index, "value", e.target.value)
          }
          required
        />

        <Select
          label="Percentage Of"
          value={item.percentageOf || "none"}
          onChange={(e) =>
            onChange(index, "percentageOf", e.target.value)
          }
          disabled={item.type === "fixed"}
        >
          <option value="none">None</option>
          <option value="basic">Basic</option>
          <option value="gross">Gross</option>
        </Select>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        {!isContribution && isEarning && (
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-zinc-400">
            <input
              type="checkbox"
              checked={item.isTaxable !== false}
              onChange={(e) =>
                onChange(index, "isTaxable", e.target.checked)
              }
              className="h-4 w-4 rounded border-white/10 bg-[#15181d]"
            />
            Taxable
          </label>
        )}

        <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-zinc-400">
          <input
            type="checkbox"
            checked={item.isActive !== false}
            onChange={(e) =>
              onChange(index, "isActive", e.target.checked)
            }
            className="h-4 w-4 rounded border-white/10 bg-[#15181d]"
          />
          Active
        </label>
      </div>
    </div>
  );
};

const StatusBadge = ({ active }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
      active
        ? "border-emerald-400/15 bg-emerald-400/[0.07] text-emerald-300"
        : "border-zinc-500/15 bg-zinc-500/[0.07] text-zinc-400"
    }`}
  >
    <span
      className={`h-1.5 w-1.5 rounded-full ${
        active ? "bg-emerald-400" : "bg-zinc-500"
      }`}
    />
    {active ? "Active" : "Inactive"}
  </span>
);

const FrequencyBadge = ({ frequency }) => (
  <span className="inline-flex rounded-lg border border-white/[0.07] bg-white/[0.035] px-2.5 py-1 text-[11px] capitalize text-zinc-400">
    {(frequency || "monthly").replace("_", " ")}
  </span>
);

export default function SalaryStructure() {
  const [salaryStructures, setSalaryStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [frequencyFilter, setFrequencyFilter] = useState("all");

  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [selectedStructure, setSelectedStructure] =
    useState(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  const [toast, setToast] = useState(null);

  const [showActions, setShowActions] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });

    window.clearTimeout(window.__salaryToastTimer);

    window.__salaryToastTimer = window.setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const fetchSalaryStructures = async (silent = false) => {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);

      const response = await apiRequest("/salary-structures");

      const list = normalizeResponse(response);

      setSalaryStructures(list);
    } catch (error) {
      showToast(
        "error",
        getErrorMessage(
          error,
          "Unable to load salary structures"
        )
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSalaryStructures();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, frequencyFilter]);

  const filteredStructures = useMemo(() => {
    const query = search.trim().toLowerCase();

    return salaryStructures.filter((item) => {
      const matchesSearch =
        !query ||
        item.name?.toLowerCase().includes(query) ||
        item.code?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && item.isActive !== false) ||
        (statusFilter === "inactive" && item.isActive === false);

      const matchesFrequency =
        frequencyFilter === "all" ||
        item.payFrequency === frequencyFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesFrequency
      );
    });
  }, [
    salaryStructures,
    search,
    statusFilter,
    frequencyFilter,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredStructures.length / PAGE_SIZE)
  );

  const paginatedStructures = filteredStructures.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const stats = useMemo(() => {
    const active = salaryStructures.filter(
      (item) => item.isActive !== false
    ).length;

    const inactive = salaryStructures.length - active;

    const monthly = salaryStructures.filter(
      (item) => item.payFrequency === "monthly"
    ).length;

    return {
      total: salaryStructures.length,
      active,
      inactive,
      monthly,
    };
  }, [salaryStructures]);

  const openCreate = () => {
    setEditingId(null);
    setSelectedStructure(null);

    setForm({
      ...EMPTY_FORM,
      effectiveFrom: new Date()
        .toISOString()
        .slice(0, 10),
    });

    setFormOpen(true);
  };

  const openEdit = async (structure) => {
    try {
      setSaving(true);

      const id = getId(structure);

      const response = await apiRequest(
        `/salary-structures/${id}`
      );

      const data = getSingleResponse(response);

      setEditingId(id);
      setSelectedStructure(data);
      setForm(normalizeForm(data));
      setFormOpen(true);
    } catch (error) {
      showToast(
        "error",
        getErrorMessage(
          error,
          "Unable to load salary structure"
        )
      );
    } finally {
      setSaving(false);
      setShowActions(null);
    }
  };

  const openView = async (structure) => {
    try {
      setSaving(true);

      const id = getId(structure);

      const response = await apiRequest(
        `/salary-structures/${id}`
      );

      const data = getSingleResponse(response);

      setSelectedStructure(data);
      setViewOpen(true);
    } catch (error) {
      showToast(
        "error",
        getErrorMessage(
          error,
          "Unable to load salary structure"
        )
      );
    } finally {
      setSaving(false);
      setShowActions(null);
    }
  };

  const openDelete = (structure) => {
    setSelectedStructure(structure);
    setDeleteOpen(true);
    setShowActions(null);
  };

  const updateForm = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const addComponent = (type) => {
    setForm((current) => ({
      ...current,
      [type]: [
        ...(current[type] || []),
        type === "earnings"
          ? { ...EMPTY_COMPONENT }
          : type === "deductions"
          ? { ...EMPTY_DEDUCTION }
          : { ...EMPTY_CONTRIBUTION },
      ],
    }));
  };

  const updateComponent = (
    type,
    index,
    field,
    value
  ) => {
    setForm((current) => {
      const updated = [...(current[type] || [])];

      updated[index] = {
        ...updated[index],
        [field]: value,
      };

      if (field === "type" && value === "fixed") {
        updated[index].percentageOf = "none";
      }

      return {
        ...current,
        [type]: updated,
      };
    });
  };

  const removeComponent = (type, index) => {
    setForm((current) => ({
      ...current,
      [type]: current[type].filter(
        (_, itemIndex) => itemIndex !== index
      ),
    }));
  };

  const buildPayload = () => {
    const cleanComponent = (item, isEarning = false) => {
      const payload = {
        name: String(item.name || "").trim(),
        code: String(item.code || "")
          .trim()
          .toUpperCase(),
        type: item.type || "fixed",
        value: Number(item.value || 0),
        percentageOf:
          item.type === "percentage"
            ? item.percentageOf || "none"
            : "none",
        isActive: item.isActive !== false,
      };

      if (isEarning) {
        payload.isTaxable = item.isTaxable !== false;
      }

      return payload;
    };

    return {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      description: form.description.trim(),
      payFrequency: form.payFrequency,
      currency: form.currency,
      basicSalary: Number(form.basicSalary || 0),
      basicSalaryType: form.basicSalaryType,
      basicSalaryPercentageOf:
        form.basicSalaryType === "percentage"
          ? form.basicSalaryPercentageOf
          : "none",
      earnings: form.earnings.map((item) =>
        cleanComponent(item, true)
      ),
      deductions: form.deductions.map((item) =>
        cleanComponent(item, false)
      ),
      employerContributions:
        form.employerContributions.map((item) =>
          cleanComponent(item, false)
        ),
      effectiveFrom: form.effectiveFrom || null,
      effectiveTo: form.effectiveTo || null,
      isActive: form.isActive,
      notes: form.notes.trim(),
    };
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      return "Salary structure name is required";
    }

    if (!form.code.trim()) {
      return "Salary structure code is required";
    }

    if (Number(form.basicSalary || 0) < 0) {
      return "Basic salary cannot be negative";
    }

    if (!form.effectiveFrom) {
      return "Effective from date is required";
    }

    const allComponents = [
      ...form.earnings,
      ...form.deductions,
      ...form.employerContributions,
    ];

    for (const item of allComponents) {
      if (!String(item.name || "").trim()) {
        return "Every salary component needs a name";
      }

      if (!String(item.code || "").trim()) {
        return "Every salary component needs a code";
      }

      if (Number(item.value || 0) < 0) {
        return "Component values cannot be negative";
      }

      if (
        item.type === "percentage" &&
        Number(item.value || 0) > 100
      ) {
        return "Percentage values cannot exceed 100";
      }
    }

    if (
      form.effectiveTo &&
      new Date(form.effectiveTo) <
        new Date(form.effectiveFrom)
    ) {
      return "Effective to date cannot be before effective from date";
    }

    return null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      showToast("error", validationError);
      return;
    }

    try {
      setSaving(true);

      const payload = buildPayload();

      if (editingId) {
        await apiRequest(
          `/salary-structures/${editingId}`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          }
        );

        showToast(
          "success",
          "Salary structure updated successfully"
        );
      } else {
        await apiRequest("/salary-structures", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        showToast(
          "success",
          "Salary structure created successfully"
        );
      }

      setFormOpen(false);
      setEditingId(null);
      setSelectedStructure(null);

      await fetchSalaryStructures(true);
    } catch (error) {
      showToast(
        "error",
        getErrorMessage(
          error,
          editingId
            ? "Unable to update salary structure"
            : "Unable to create salary structure"
        )
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (structure) => {
    const id = getId(structure);

    try {
      setStatusUpdatingId(id);

      await apiRequest(
        `/salary-structures/${id}/toggle-status`,
        {
          method: "PATCH",
          body: JSON.stringify({}),
        }
      );

      showToast(
        "success",
        `Salary structure ${
          structure.isActive !== false
            ? "deactivated"
            : "activated"
        } successfully`
      );

      await fetchSalaryStructures(true);
    } catch (error) {
      showToast(
        "error",
        getErrorMessage(
          error,
          "Unable to change salary structure status"
        )
      );
    } finally {
      setStatusUpdatingId(null);
      setShowActions(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedStructure) return;

    const id = getId(selectedStructure);

    try {
      setDeleting(true);

      await apiRequest(`/salary-structures/${id}`, {
        method: "DELETE",
      });

      showToast(
        "success",
        "Salary structure deleted successfully"
      );

      setDeleteOpen(false);
      setSelectedStructure(null);

      await fetchSalaryStructures(true);
    } catch (error) {
      showToast(
        "error",
        getErrorMessage(
          error,
          "Unable to delete salary structure"
        )
      );
    } finally {
      setDeleting(false);
    }
  };

  const duplicateStructure = (structure) => {
    const data = normalizeForm(structure);

    data.name = `${data.name} Copy`;
    data.code = `${data.code}-COPY`;
    data.isActive = false;
    data.effectiveFrom = new Date()
      .toISOString()
      .slice(0, 10);
    data.effectiveTo = "";

    setEditingId(null);
    setSelectedStructure(null);
    setForm(data);
    setFormOpen(true);
    setShowActions(null);
  };

  const preview = useMemo(
    () => calculatePreview(form),
    [form]
  );

  const viewPreview = selectedStructure
    ? calculatePreview(normalizeForm(selectedStructure))
    : null;

  return (
    <div className="min-h-screen w-full bg-[#080a0d] text-white">
      <div className="w-full px-3 py-4 sm:px-5 lg:px-7 xl:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-600">
              <Settings2 size={13} />
              HR / Compensation
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Salary Structures
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-zinc-500">
              Define reusable salary templates with earnings,
              deductions, employer contributions and effective
              dates.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fetchSalaryStructures(true)}
              disabled={refreshing}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3.5 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.07] hover:text-white disabled:opacity-50"
            >
              <RefreshCw
                size={15}
                className={
                  refreshing ? "animate-spin" : ""
                }
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 text-xs font-semibold text-black transition hover:bg-zinc-200"
            >
              <Plus size={16} />
              New Salary Structure
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Structures"
            value={stats.total}
            subtitle="Configured salary templates"
            icon={FileText}
          />

          <StatCard
            title="Active"
            value={stats.active}
            subtitle="Available for assignment"
            icon={ShieldCheck}
            trend={
              stats.total
                ? `${Math.round(
                    (stats.active / stats.total) * 100
                  )}% active`
                : undefined
            }
          />

          <StatCard
            title="Inactive"
            value={stats.inactive}
            subtitle="Archived / disabled"
            icon={Power}
          />

          <StatCard
            title="Monthly"
            value={stats.monthly}
            subtitle="Monthly pay frequency"
            icon={CalendarDays}
          />
        </div>

        {/* Main */}
        <GlassCard className="overflow-hidden">
          {/* Toolbar */}
          <div className="border-b border-white/[0.07] p-4 sm:p-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="relative min-w-0 flex-1 xl:max-w-xl">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600"
                />

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, code or description..."
                  className="h-11 w-full rounded-xl border border-white/[0.08] bg-[#0d1014] pl-10 pr-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex">
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value)
                  }
                  className="h-11 rounded-xl border border-white/[0.08] bg-[#0d1014] px-3 text-xs text-zinc-300 outline-none focus:border-white/20"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>

                <select
                  value={frequencyFilter}
                  onChange={(e) =>
                    setFrequencyFilter(e.target.value)
                  }
                  className="h-11 rounded-xl border border-white/[0.08] bg-[#0d1014] px-3 text-xs text-zinc-300 outline-none focus:border-white/20"
                >
                  <option value="all">All Frequency</option>
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="bi_weekly">
                    Bi-Weekly
                  </option>
                  <option value="daily">Daily</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-zinc-600">
              <span>
                Showing {filteredStructures.length} structure
                {filteredStructures.length !== 1 ? "s" : ""}
              </span>

              {(search ||
                statusFilter !== "all" ||
                frequencyFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setFrequencyFilter("all");
                  }}
                  className="text-zinc-400 transition hover:text-white"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {/* Loading */}
          {loading ? (
            <div className="flex min-h-[420px] items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-zinc-500">
                <Loader2
                  size={24}
                  className="animate-spin"
                />
                <span className="text-xs">
                  Loading salary structures...
                </span>
              </div>
            </div>
          ) : paginatedStructures.length === 0 ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center px-5 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.035]">
                <Wallet
                  size={22}
                  className="text-zinc-500"
                />
              </div>

              <h3 className="text-sm font-semibold text-white">
                No salary structures found
              </h3>

              <p className="mt-1 max-w-sm text-xs leading-5 text-zinc-600">
                Create your first salary structure to define
                employee compensation templates.
              </p>

              <button
                type="button"
                onClick={openCreate}
                className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-xs font-semibold text-black"
              >
                <Plus size={15} />
                Create Structure
              </button>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1000px]">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-left">
                      <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
                        Structure
                      </th>

                      <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
                        Frequency
                      </th>

                      <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
                        Basic Salary
                      </th>

                      <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
                        Components
                      </th>

                      <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
                        Effective
                      </th>

                      <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
                        Status
                      </th>

                      <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedStructures.map((structure) => {
                      const id = getId(structure);

                      const componentCount =
                        (structure.earnings?.length || 0) +
                        (structure.deductions?.length || 0) +
                        (structure.employerContributions
                          ?.length || 0);

                      return (
                        <tr
                          key={id}
                          className="border-b border-white/[0.045] transition hover:bg-white/[0.018]"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.035]">
                                <Banknote
                                  size={17}
                                  className="text-zinc-400"
                                />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-white">
                                  {structure.name ||
                                    "Untitled Structure"}
                                </p>

                                <p className="mt-1 text-[11px] text-zinc-600">
                                  {structure.code || "NO-CODE"}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <FrequencyBadge
                              frequency={
                                structure.payFrequency
                              }
                            />
                          </td>

                          <td className="px-4 py-4">
                            <span className="text-sm font-medium text-zinc-200">
                              {formatCurrency(
                                structure.basicSalary,
                                structure.currency
                              )}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-zinc-300">
                                {componentCount}
                              </span>

                              <span className="text-xs text-zinc-600">
                                components
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <div>
                              <p className="text-xs text-zinc-300">
                                {formatDate(
                                  structure.effectiveFrom
                                )}
                              </p>

                              {structure.effectiveTo && (
                                <p className="mt-1 text-[10px] text-zinc-600">
                                  Until{" "}
                                  {formatDate(
                                    structure.effectiveTo
                                  )}
                                </p>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <StatusBadge
                              active={
                                structure.isActive !== false
                              }
                            />
                          </td>

                          <td className="px-5 py-4">
                            <div className="relative flex justify-end">
                              <button
                                type="button"
                                onClick={() =>
                                  setShowActions(
                                    showActions === id
                                      ? null
                                      : id
                                  )
                                }
                                className="rounded-lg p-2 text-zinc-500 transition hover:bg-white/[0.06] hover:text-white"
                              >
                                <MoreHorizontal
                                  size={17}
                                />
                              </button>

                              {showActions === id && (
                                <div className="absolute right-0 top-10 z-30 w-48 overflow-hidden rounded-xl border border-white/[0.08] bg-[#15181d] p-1.5 shadow-2xl">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openView(structure)
                                    }
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs text-zinc-300 hover:bg-white/[0.05] hover:text-white"
                                  >
                                    <Eye size={14} />
                                    View Details
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      openEdit(structure)
                                    }
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs text-zinc-300 hover:bg-white/[0.05] hover:text-white"
                                  >
                                    <Edit3 size={14} />
                                    Edit
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      duplicateStructure(
                                        structure
                                      )
                                    }
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs text-zinc-300 hover:bg-white/[0.05] hover:text-white"
                                  >
                                    <Copy size={14} />
                                    Duplicate
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      toggleStatus(
                                        structure
                                      )
                                    }
                                    disabled={
                                      statusUpdatingId ===
                                      id
                                    }
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs text-zinc-300 hover:bg-white/[0.05] hover:text-white disabled:opacity-50"
                                  >
                                    {statusUpdatingId ===
                                    id ? (
                                      <Loader2
                                        size={14}
                                        className="animate-spin"
                                      />
                                    ) : (
                                      <Power size={14} />
                                    )}
                                    {structure.isActive !==
                                    false
                                      ? "Deactivate"
                                      : "Activate"}
                                  </button>

                                  <div className="my-1 border-t border-white/[0.06]" />

                                  <button
                                    type="button"
                                    onClick={() =>
                                      openDelete(structure)
                                    }
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs text-red-400 hover:bg-red-500/[0.07]"
                                  >
                                    <Trash2 size={14} />
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile / tablet cards */}
              <div className="grid grid-cols-1 gap-3 p-3 lg:hidden sm:p-4">
                {paginatedStructures.map((structure) => {
                  const id = getId(structure);

                  const componentCount =
                    (structure.earnings?.length || 0) +
                    (structure.deductions?.length || 0) +
                    (structure.employerContributions
                      ?.length || 0);

                  return (
                    <div
                      key={id}
                      className="rounded-xl border border-white/[0.07] bg-[#12151a] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.035]">
                            <Banknote
                              size={17}
                              className="text-zinc-400"
                            />
                          </div>

                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-semibold text-white">
                              {structure.name}
                            </h3>

                            <p className="mt-1 text-[11px] text-zinc-600">
                              {structure.code}
                            </p>
                          </div>
                        </div>

                        <StatusBadge
                          active={
                            structure.isActive !== false
                          }
                        />
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <div className="rounded-lg bg-white/[0.025] p-3">
                          <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                            Basic
                          </p>
                          <p className="mt-1 text-xs font-medium text-zinc-200">
                            {formatCurrency(
                              structure.basicSalary,
                              structure.currency
                            )}
                          </p>
                        </div>

                        <div className="rounded-lg bg-white/[0.025] p-3">
                          <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                            Frequency
                          </p>
                          <p className="mt-1 text-xs font-medium capitalize text-zinc-200">
                            {(
                              structure.payFrequency ||
                              "monthly"
                            ).replace("_", " ")}
                          </p>
                        </div>

                        <div className="rounded-lg bg-white/[0.025] p-3">
                          <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                            Components
                          </p>
                          <p className="mt-1 text-xs font-medium text-zinc-200">
                            {componentCount}
                          </p>
                        </div>

                        <div className="rounded-lg bg-white/[0.025] p-3">
                          <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                            Effective
                          </p>
                          <p className="mt-1 text-xs font-medium text-zinc-200">
                            {formatDate(
                              structure.effectiveFrom
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2 border-t border-white/[0.06] pt-3">
                        <button
                          type="button"
                          onClick={() =>
                            openView(structure)
                          }
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 text-xs text-zinc-300"
                        >
                          <Eye size={14} />
                          View
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openEdit(structure)
                          }
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 text-xs text-zinc-300"
                        >
                          <Edit3 size={14} />
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            toggleStatus(structure)
                          }
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 text-xs text-zinc-300"
                        >
                          <Power size={14} />
                          {structure.isActive !== false
                            ? "Disable"
                            : "Enable"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openDelete(structure)
                          }
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-400/10 bg-red-400/[0.04] px-3 text-xs text-red-400"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              <div className="flex flex-col gap-3 border-t border-white/[0.07] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <p className="text-xs text-zinc-600">
                  Page {page} of {totalPages}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() =>
                      setPage((current) =>
                        Math.max(current - 1, 1)
                      )
                    }
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 text-xs text-zinc-400 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronLeft size={14} />
                    Previous
                  </button>

                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() =>
                      setPage((current) =>
                        Math.min(
                          current + 1,
                          totalPages
                        )
                      )
                    }
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 text-xs text-zinc-400 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    Next
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </>
          )}
        </GlassCard>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        open={formOpen}
        onClose={() => !saving && setFormOpen(false)}
        title={
          editingId
            ? "Edit Salary Structure"
            : "Create Salary Structure"
        }
        subtitle={
          editingId
            ? "Update the selected compensation template."
            : "Create a reusable compensation template for your organization."
        }
        size="2xl"
      >
        <form onSubmit={handleSubmit}>
          <div className="space-y-7 p-5 sm:p-6">
            {/* Basic */}
            <section>
              <SectionTitle
                icon={BriefcaseBusiness}
                title="Structure Information"
                subtitle="Basic configuration and salary policy details."
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="lg:col-span-2">
                  <Input
                    label="Structure Name"
                    value={form.name}
                    placeholder="Standard Monthly Salary"
                    required
                    onChange={(e) =>
                      updateForm("name", e.target.value)
                    }
                  />
                </div>

                <Input
                  label="Structure Code"
                  value={form.code}
                  placeholder="STD-MONTHLY"
                  required
                  onChange={(e) =>
                    updateForm(
                      "code",
                      e.target.value.toUpperCase()
                    )
                  }
                />

                <Select
                  label="Pay Frequency"
                  value={form.payFrequency}
                  onChange={(e) =>
                    updateForm(
                      "payFrequency",
                      e.target.value
                    )
                  }
                >
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="bi_weekly">
                    Bi-Weekly
                  </option>
                  <option value="daily">Daily</option>
                  <option value="yearly">Yearly</option>
                </Select>

                <Select
                  label="Currency"
                  value={form.currency}
                  onChange={(e) =>
                    updateForm("currency", e.target.value)
                  }
                >
                  <option value="INR">INR — Indian Rupee</option>
                  <option value="USD">USD — US Dollar</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="GBP">GBP — Pound</option>
                </Select>

                <Input
                  label="Basic Salary"
                  type="number"
                  value={form.basicSalary}
                  placeholder="25000"
                  required
                  onChange={(e) =>
                    updateForm(
                      "basicSalary",
                      e.target.value
                    )
                  }
                />

                <Select
                  label="Basic Salary Type"
                  value={form.basicSalaryType}
                  onChange={(e) =>
                    updateForm(
                      "basicSalaryType",
                      e.target.value
                    )
                  }
                >
                  <option value="fixed">Fixed</option>
                  <option value="percentage">
                    Percentage
                  </option>
                </Select>

                {form.basicSalaryType ===
                  "percentage" && (
                  <Select
                    label="Basic Percentage Of"
                    value={
                      form.basicSalaryPercentageOf
                    }
                    onChange={(e) =>
                      updateForm(
                        "basicSalaryPercentageOf",
                        e.target.value
                      )
                    }
                  >
                    <option value="none">None</option>
                    <option value="ctc">CTC</option>
                    <option value="gross">Gross</option>
                  </Select>
                )}

                <Input
                  label="Effective From"
                  type="date"
                  value={form.effectiveFrom}
                  required
                  onChange={(e) =>
                    updateForm(
                      "effectiveFrom",
                      e.target.value
                    )
                  }
                />

                <Input
                  label="Effective To"
                  type="date"
                  value={form.effectiveTo}
                  onChange={(e) =>
                    updateForm(
                      "effectiveTo",
                      e.target.value
                    )
                  }
                />

                <div className="flex items-end">
                  <label className="flex h-11 w-full cursor-pointer items-center justify-between rounded-xl border border-white/[0.08] bg-[#15181d] px-3.5">
                    <span className="text-xs text-zinc-400">
                      Structure Active
                    </span>

                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) =>
                        updateForm(
                          "isActive",
                          e.target.checked
                        )
                      }
                      className="h-4 w-4"
                    />
                  </label>
                </div>
              </div>

              <div className="mt-4">
                <TextArea
                  label="Description"
                  value={form.description}
                  placeholder="Describe when this salary structure should be used..."
                  rows={3}
                  onChange={(e) =>
                    updateForm(
                      "description",
                      e.target.value
                    )
                  }
                />
              </div>
            </section>

            {/* Earnings */}
            <section>
              <div className="mb-5 flex items-center justify-between gap-3">
                <SectionTitle
                  icon={ArrowUpRight}
                  title="Earnings"
                  subtitle="Allowances and other employee earnings."
                />

                <button
                  type="button"
                  onClick={() =>
                    addComponent("earnings")
                  }
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.035] px-3 text-xs font-medium text-zinc-300 hover:bg-white/[0.07] hover:text-white"
                >
                  <Plus size={14} />
                  Add Earning
                </button>
              </div>

              <div className="space-y-3">
                {form.earnings.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.015] px-4 py-8 text-center">
                    <ArrowUpRight
                      size={18}
                      className="mx-auto text-zinc-600"
                    />
                    <p className="mt-2 text-xs text-zinc-600">
                      No earnings added yet
                    </p>
                  </div>
                ) : (
                  form.earnings.map((item, index) => (
                    <ComponentRow
                      key={index}
                      item={item}
                      index={index}
                      type="earnings"
                      onChange={(i, field, value) =>
                        updateComponent(
                          "earnings",
                          i,
                          field,
                          value
                        )
                      }
                      onRemove={(i) =>
                        removeComponent(
                          "earnings",
                          i
                        )
                      }
                    />
                  ))
                )}
              </div>
            </section>

            {/* Deductions */}
            <section>
              <div className="mb-5 flex items-center justify-between gap-3">
                <SectionTitle
                  icon={ArrowDownRight}
                  title="Deductions"
                  subtitle="Employee-side deductions from gross salary."
                />

                <button
                  type="button"
                  onClick={() =>
                    addComponent("deductions")
                  }
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.035] px-3 text-xs font-medium text-zinc-300 hover:bg-white/[0.07] hover:text-white"
                >
                  <Plus size={14} />
                  Add Deduction
                </button>
              </div>

              <div className="space-y-3">
                {form.deductions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.015] px-4 py-8 text-center">
                    <ArrowDownRight
                      size={18}
                      className="mx-auto text-zinc-600"
                    />
                    <p className="mt-2 text-xs text-zinc-600">
                      No deductions added yet
                    </p>
                  </div>
                ) : (
                  form.deductions.map((item, index) => (
                    <ComponentRow
                      key={index}
                      item={item}
                      index={index}
                      type="deductions"
                      onChange={(i, field, value) =>
                        updateComponent(
                          "deductions",
                          i,
                          field,
                          value
                        )
                      }
                      onRemove={(i) =>
                        removeComponent(
                          "deductions",
                          i
                        )
                      }
                    />
                  ))
                )}
              </div>
            </section>

            {/* Employer Contributions */}
            <section>
              <div className="mb-5 flex items-center justify-between gap-3">
                <SectionTitle
                  icon={Users}
                  title="Employer Contributions"
                  subtitle="Company-side contribution components."
                />

                <button
                  type="button"
                  onClick={() =>
                    addComponent(
                      "employerContributions"
                    )
                  }
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.035] px-3 text-xs font-medium text-zinc-300 hover:bg-white/[0.07] hover:text-white"
                >
                  <Plus size={14} />
                  Add Contribution
                </button>
              </div>

              <div className="space-y-3">
                {form.employerContributions.length ===
                0 ? (
                  <div className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.015] px-4 py-8 text-center">
                    <Users
                      size={18}
                      className="mx-auto text-zinc-600"
                    />
                    <p className="mt-2 text-xs text-zinc-600">
                      No employer contributions added yet
                    </p>
                  </div>
                ) : (
                  form.employerContributions.map(
                    (item, index) => (
                      <ComponentRow
                        key={index}
                        item={item}
                        index={index}
                        type="employerContributions"
                        onChange={(
                          i,
                          field,
                          value
                        ) =>
                          updateComponent(
                            "employerContributions",
                            i,
                            field,
                            value
                          )
                        }
                        onRemove={(i) =>
                          removeComponent(
                            "employerContributions",
                            i
                          )
                        }
                      />
                    )
                  )
                )}
              </div>
            </section>

            {/* Preview */}
            <section>
              <SectionTitle
                icon={Wallet}
                title="Salary Preview"
                subtitle="Indicative calculation based on the configured components."
              />

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                    Basic
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {formatCurrency(
                      preview.basic,
                      form.currency
                    )}
                  </p>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                    Earnings
                  </p>
                  <p className="mt-1 text-sm font-semibold text-emerald-300">
                    {formatCurrency(
                      preview.earnings,
                      form.currency
                    )}
                  </p>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                    Gross
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {formatCurrency(
                      preview.gross,
                      form.currency
                    )}
                  </p>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                    Deductions
                  </p>
                  <p className="mt-1 text-sm font-semibold text-red-300">
                    {formatCurrency(
                      preview.deductions,
                      form.currency
                    )}
                  </p>
                </div>

                <div className="col-span-2 rounded-xl border border-white/[0.08] bg-white/[0.045] p-3 sm:col-span-1">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                    Net
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {formatCurrency(
                      preview.net,
                      form.currency
                    )}
                  </p>
                </div>
              </div>
            </section>

            {/* Notes */}
            <section>
              <TextArea
                label="Notes"
                value={form.notes}
                placeholder="Internal notes about this salary structure..."
                rows={3}
                onChange={(e) =>
                  updateForm("notes", e.target.value)
                }
              />
            </section>
          </div>

          <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-white/[0.07] bg-[#0b0d10]/95 p-4 backdrop-blur-xl sm:flex-row sm:justify-end sm:px-6">
            <button
              type="button"
              disabled={saving}
              onClick={() => setFormOpen(false)}
              className="h-11 rounded-xl border border-white/[0.08] bg-white/[0.025] px-5 text-xs font-medium text-zinc-300 hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-6 text-xs font-semibold text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2
                    size={15}
                    className="animate-spin"
                  />
                  Saving...
                </>
              ) : (
                <>
                  <Check size={15} />
                  {editingId
                    ? "Update Structure"
                    : "Create Structure"}
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        title={
          selectedStructure?.name ||
          "Salary Structure Details"
        }
        subtitle={
          selectedStructure?.code ||
          "Compensation template"
        }
        size="xl"
      >
        {selectedStructure && (
          <div className="space-y-6 p-5 sm:p-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
                <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                  Status
                </p>
                <div className="mt-2">
                  <StatusBadge
                    active={
                      selectedStructure.isActive !== false
                    }
                  />
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
                <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                  Frequency
                </p>
                <p className="mt-2 text-sm font-medium capitalize text-white">
                  {(
                    selectedStructure.payFrequency ||
                    "monthly"
                  ).replace("_", " ")}
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
                <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                  Basic
                </p>
                <p className="mt-2 text-sm font-medium text-white">
                  {formatCurrency(
                    selectedStructure.basicSalary,
                    selectedStructure.currency
                  )}
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
                <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                  Effective
                </p>
                <p className="mt-2 text-sm font-medium text-white">
                  {formatDate(
                    selectedStructure.effectiveFrom
                  )}
                </p>
              </div>
            </div>

            {selectedStructure.description && (
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                  Description
                </p>

                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  {selectedStructure.description}
                </p>
              </div>
            )}

            {/* Earnings */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">
                  Earnings
                </h3>

                <span className="text-xs text-zinc-600">
                  {selectedStructure.earnings?.length ||
                    0}{" "}
                  items
                </span>
              </div>

              <div className="space-y-2">
                {selectedStructure.earnings?.length ? (
                  selectedStructure.earnings.map(
                    (item, index) => (
                      <div
                        key={index}
                        className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="text-xs font-medium text-white">
                            {item.name}
                          </p>
                          <p className="mt-1 text-[10px] text-zinc-600">
                            {item.code} •{" "}
                            {item.type}
                            {item.type === "percentage" &&
                              ` of ${item.percentageOf}`}
                          </p>
                        </div>

                        <span className="text-sm font-semibold text-emerald-300">
                          {item.type === "percentage"
                            ? `${item.value}%`
                            : formatCurrency(
                                item.value,
                                selectedStructure.currency
                              )}
                        </span>
                      </div>
                    )
                  )
                ) : (
                  <p className="rounded-xl border border-dashed border-white/[0.07] p-4 text-xs text-zinc-600">
                    No earnings configured.
                  </p>
                )}
              </div>
            </section>

            {/* Deductions */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">
                  Deductions
                </h3>

                <span className="text-xs text-zinc-600">
                  {selectedStructure.deductions?.length ||
                    0}{" "}
                  items
                </span>
              </div>

              <div className="space-y-2">
                {selectedStructure.deductions?.length ? (
                  selectedStructure.deductions.map(
                    (item, index) => (
                      <div
                        key={index}
                        className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="text-xs font-medium text-white">
                            {item.name}
                          </p>
                          <p className="mt-1 text-[10px] text-zinc-600">
                            {item.code} •{" "}
                            {item.type}
                            {item.type === "percentage" &&
                              ` of ${item.percentageOf}`}
                          </p>
                        </div>

                        <span className="text-sm font-semibold text-red-300">
                          {item.type === "percentage"
                            ? `${item.value}%`
                            : formatCurrency(
                                item.value,
                                selectedStructure.currency
                              )}
                        </span>
                      </div>
                    )
                  )
                ) : (
                  <p className="rounded-xl border border-dashed border-white/[0.07] p-4 text-xs text-zinc-600">
                    No deductions configured.
                  </p>
                )}
              </div>
            </section>

            {/* Employer */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">
                  Employer Contributions
                </h3>

                <span className="text-xs text-zinc-600">
                  {selectedStructure
                    .employerContributions?.length ||
                    0}{" "}
                  items
                </span>
              </div>

              <div className="space-y-2">
                {selectedStructure
                  .employerContributions?.length ? (
                  selectedStructure.employerContributions.map(
                    (item, index) => (
                      <div
                        key={index}
                        className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="text-xs font-medium text-white">
                            {item.name}
                          </p>
                          <p className="mt-1 text-[10px] text-zinc-600">
                            {item.code} •{" "}
                            {item.type}
                            {item.type === "percentage" &&
                              ` of ${item.percentageOf}`}
                          </p>
                        </div>

                        <span className="text-sm font-semibold text-zinc-200">
                          {item.type === "percentage"
                            ? `${item.value}%`
                            : formatCurrency(
                                item.value,
                                selectedStructure.currency
                              )}
                        </span>
                      </div>
                    )
                  )
                ) : (
                  <p className="rounded-xl border border-dashed border-white/[0.07] p-4 text-xs text-zinc-600">
                    No employer contributions configured.
                  </p>
                )}
              </div>
            </section>

            {/* Calculation */}
            {viewPreview && (
              <section>
                <h3 className="mb-3 text-sm font-semibold text-white">
                  Salary Summary
                </h3>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-xl bg-white/[0.025] p-3">
                    <p className="text-[10px] text-zinc-600">
                      Basic
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {formatCurrency(
                        viewPreview.basic,
                        selectedStructure.currency
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/[0.025] p-3">
                    <p className="text-[10px] text-zinc-600">
                      Gross
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {formatCurrency(
                        viewPreview.gross,
                        selectedStructure.currency
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/[0.025] p-3">
                    <p className="text-[10px] text-zinc-600">
                      Deductions
                    </p>
                    <p className="mt-1 text-sm font-semibold text-red-300">
                      {formatCurrency(
                        viewPreview.deductions,
                        selectedStructure.currency
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/[0.045] p-3">
                    <p className="text-[10px] text-zinc-500">
                      Net
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {formatCurrency(
                        viewPreview.net,
                        selectedStructure.currency
                      )}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {selectedStructure.notes && (
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                  Notes
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-400">
                  {selectedStructure.notes}
                </p>
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 border-t border-white/[0.06] pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setViewOpen(false)}
                className="h-10 rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 text-xs text-zinc-300 hover:bg-white/[0.06]"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  setViewOpen(false);
                  openEdit(selectedStructure);
                }}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white px-5 text-xs font-semibold text-black"
              >
                <Edit3 size={14} />
                Edit Structure
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal
        open={deleteOpen}
        onClose={() => !deleting && setDeleteOpen(false)}
        title="Delete Salary Structure"
        subtitle="This action cannot be undone."
        size="lg"
      >
        <div className="p-5 sm:p-6">
          <div className="rounded-xl border border-red-400/10 bg-red-400/[0.04] p-4">
            <div className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-400/10">
                <AlertCircle
                  size={18}
                  className="text-red-400"
                />
              </div>

              <div>
                <h3 className="text-sm font-medium text-white">
                  Confirm deletion
                </h3>

                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  You are about to permanently delete{" "}
                  <span className="font-medium text-zinc-300">
                    {selectedStructure?.name}
                  </span>
                  . Make sure this structure is not required
                  by any active salary assignment.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={deleting}
              onClick={() => setDeleteOpen(false)}
              className="h-10 rounded-xl border border-white/[0.08] bg-white/[0.025] px-5 text-xs text-zinc-300 hover:bg-white/[0.06] disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={deleting}
              onClick={handleDelete}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-red-500 px-5 text-xs font-semibold text-white hover:bg-red-400 disabled:opacity-60"
            >
              {deleting ? (
                <>
                  <Loader2
                    size={14}
                    className="animate-spin"
                  />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={14} />
                  Delete Structure
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 z-[200] w-[calc(100%-24px)] max-w-md -translate-x-1/2 sm:left-auto sm:right-5 sm:translate-x-0">
          <div
            className={`flex items-start gap-3 rounded-xl border p-4 shadow-2xl backdrop-blur-xl ${
              toast.type === "success"
                ? "border-emerald-400/15 bg-[#0e1713]/95"
                : "border-red-400/15 bg-[#170e0e]/95"
            }`}
          >
            <div
              className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                toast.type === "success"
                  ? "bg-emerald-400/10"
                  : "bg-red-400/10"
              }`}
            >
              {toast.type === "success" ? (
                <Check
                  size={15}
                  className="text-emerald-400"
                />
              ) : (
                <AlertCircle
                  size={15}
                  className="text-red-400"
                />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white">
                {toast.type === "success"
                  ? "Success"
                  : "Something went wrong"}
              </p>

              <p className="mt-1 text-xs leading-5 text-zinc-500">
                {toast.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-zinc-600 hover:text-white"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}