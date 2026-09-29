import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Activity,
  AlertCircle,
  Archive,
  ArrowDown,
  ArrowUp,
  Barcode,
  Boxes,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Edit3,
  Eye,
  Filter,
  Hash,
  Loader2,
  MoreHorizontal,
  Package,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Settings2,
  Tag,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { getToken, clearSession } from "../../services/api";

/* =========================================================
   API
========================================================= */

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

/* =========================================================
   CONSTANTS
========================================================= */

const PRODUCT_TYPES = [
  {
    value: "product",
    label: "Product",
  },
  {
    value: "service",
    label: "Service",
  },
  {
    value: "raw_material",
    label: "Raw Material",
  },
  {
    value: "finished_good",
    label: "Finished Good",
  },
  {
    value: "semi_finished",
    label: "Semi Finished",
  },
  {
    value: "consumable",
    label: "Consumable",
  },
  {
    value: "asset",
    label: "Asset",
  },
];

const EMPTY_FORM = {
  productCode: "",
  sku: "",
  name: "",
  displayName: "",
  productType: "product",
  category: "",
  brand: "",
  unit: "PCS",
  hsnSac: "",
  gstRate: 18,
  purchasePrice: 0,
  sellingPrice: 0,
  mrp: 0,
  openingStock: 0,
  reorderLevel: 0,
  minimumStock: 0,
  maximumStock: 0,
  barcode: "",
  description: "",
  status: "active",
  branchId: "",
};

/* =========================================================
   HELPERS
========================================================= */

const safeString = (value) => {
  if (value === null || value === undefined) return "";
  return String(value);
};

const parseResponse = async (response) => {
  const contentType =
    response.headers.get("content-type") || "";

  const text = await response.text();

  if (!text) return null;

  if (
    contentType.includes("application/json")
  ) {
    try {
      return JSON.parse(text);
    } catch {
      return {
        message: text,
      };
    }
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      message: text,
    };
  }
};

const getApiErrorMessage = (
  data,
  status
) => {
  if (
    Array.isArray(data?.errors) &&
    data.errors.length
  ) {
    return data.errors.join(", ");
  }

  if (typeof data?.errors === "string") {
    return data.errors;
  }

  if (data?.error?.message) {
    return data.error.message;
  }

  if (typeof data?.error === "string") {
    return data.error;
  }

  if (data?.message) {
    return data.message;
  }

  if (status === 401) {
    return "Session expired or authentication token was rejected. Please login again.";
  }

  if (status === 403) {
    return "You do not have permission to perform this action.";
  }

  if (status === 404) {
    return "Requested resource was not found.";
  }

  return `Request failed with status ${status}.`;
};

/* Clear the stale session and send the user to login once (no retry loop). */
const handleUnauthorized = () => {
  clearSession();

  if (window.location.pathname !== "/login") {
    window.location.replace("/login");
  }
};

const apiRequest = async (
  path,
  options = {}
) => {
  const token = getToken();

  if (!token) {
    handleUnauthorized();
    throw new Error(
      "Authentication token is missing. Please login again."
    );
  }

  const normalizedPath = path.startsWith("/")
    ? path
    : `/${path}`;

  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    ...(options.body
      ? {
          "Content-Type": "application/json",
        }
      : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(
    `${API_URL}${normalizedPath}`,
    {
      ...options,
      headers,
    }
  );

  const data = await parseResponse(response);

  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized();
    }

    throw new Error(
      getApiErrorMessage(
        data,
        response.status
      )
    );
  }

  return data;
};

const getListData = (data) => {
  if (Array.isArray(data)) {
    return {
      products: data,
      total: data.length,
      totalPages: 1,
    };
  }

  const nested = data?.data;

  if (
    nested &&
    typeof nested === "object" &&
    !Array.isArray(nested)
  ) {
    const products =
      nested.products ||
      nested.results ||
      nested.items ||
      [];

    const total =
      nested.total ??
      nested.pagination?.total ??
      nested.meta?.total ??
      products.length;

    const totalPages =
      nested.totalPages ??
      nested.pagination?.totalPages ??
      nested.meta?.totalPages ??
      1;

    return {
      products: Array.isArray(products)
        ? products
        : [],
      total: Number(total) || 0,
      totalPages: Math.max(
        1,
        Number(totalPages) || 1
      ),
    };
  }

  const products =
    data?.products ||
    data?.results ||
    data?.items ||
    (Array.isArray(data?.data)
      ? data.data
      : []);

  const total =
    data?.total ??
    data?.pagination?.total ??
    data?.meta?.total ??
    products.length;

  const totalPages =
    data?.totalPages ??
    data?.pagination?.totalPages ??
    data?.meta?.totalPages ??
    1;

  return {
    products: Array.isArray(products)
      ? products
      : [],
    total: Number(total) || 0,
    totalPages: Math.max(
      1,
      Number(totalPages) || 1
    ),
  };
};

const getBranchList = (data) => {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.branches)) {
    return data.branches;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  if (
    Array.isArray(data?.data?.branches)
  ) {
    return data.data.branches;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  return [];
};

const normalizeNumber = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(0, number);
};

const normalizeForm = (form) => ({
  productCode: safeString(
    form.productCode
  )
    .trim()
    .toUpperCase(),

  sku: safeString(form.sku)
    .trim()
    .toUpperCase(),

  name: safeString(form.name).trim(),

  displayName: safeString(
    form.displayName
  ).trim(),

  productType:
    form.productType || "product",

  category: safeString(
    form.category
  ).trim(),

  brand: safeString(
    form.brand
  ).trim(),

  unit:
    safeString(form.unit)
      .trim()
      .toUpperCase() || "PCS",

  hsnSac: safeString(
    form.hsnSac
  )
    .trim()
    .toUpperCase(),

  gstRate: normalizeNumber(
    form.gstRate
  ),

  purchasePrice:
    normalizeNumber(
      form.purchasePrice
    ),

  sellingPrice:
    normalizeNumber(
      form.sellingPrice
    ),

  mrp: normalizeNumber(
    form.mrp
  ),

  openingStock:
    normalizeNumber(
      form.openingStock
    ),

  reorderLevel:
    normalizeNumber(
      form.reorderLevel
    ),

  minimumStock:
    normalizeNumber(
      form.minimumStock
    ),

  maximumStock:
    normalizeNumber(
      form.maximumStock
    ),

  barcode: safeString(
    form.barcode
  ).trim(),

  description: safeString(
    form.description
  ).trim(),

  status:
    form.status || "active",

  branchId:
    form.branchId || null,
});

const getBranchName = (product) => {
  if (!product?.branchId) {
    return "All Branches";
  }

  if (
    typeof product.branchId === "object"
  ) {
    return (
      product.branchId.name ||
      product.branchId.branchName ||
      product.branchId.code ||
      "Assigned Branch"
    );
  }

  return "Assigned Branch";
};

const getTypeLabel = (value) => {
  return (
    PRODUCT_TYPES.find(
      (item) => item.value === value
    )?.label || "Product"
  );
};

const formatCurrency = (value) => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "₹0.00";
  }

  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }
  ).format(amount);
};

const formatNumber = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return new Intl.NumberFormat(
    "en-IN",
    {
      maximumFractionDigits: 2,
    }
  ).format(number);
};

/* =========================================================
   SMALL UI COMPONENTS
========================================================= */

const StatusBadge = ({
  status,
}) => {
  const active =
    status === "active";

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        active
          ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20"
          : "bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/20",
      ].join(" ")}
    >
      <span
        className={[
          "h-1.5 w-1.5 rounded-full",
          active
            ? "bg-emerald-400"
            : "bg-slate-500",
        ].join(" ")}
      />

      {active
        ? "Active"
        : "Inactive"}
    </span>
  );
};

const TypeBadge = ({
  type,
}) => {
  return (
    <span className="inline-flex max-w-[150px] items-center rounded-lg border border-white/[0.06] bg-white/[0.035] px-2.5 py-1 text-[11px] font-medium text-slate-300">
      {getTypeLabel(type)}
    </span>
  );
};

const StatCard = ({
  title,
  value,
  icon: Icon,
  subtitle,
}) => {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#11141a] p-4 shadow-[0_12px_40px_rgba(0,0,0,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:border-white/[0.12]">
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/[0.025] blur-2xl" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-white">
            {value}
          </p>

          {subtitle && (
            <p className="mt-1 truncate text-[11px] text-slate-600">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.04] text-slate-300 transition-colors group-hover:bg-white/[0.07]">
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
};

const Field = ({
  label,
  required,
  children,
  hint,
}) => {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
        <span>
          {label}
          {required && (
            <span className="ml-1 text-rose-400">
              *
            </span>
          )}
        </span>

        {hint && (
          <span className="normal-case tracking-normal text-slate-700">
            {hint}
          </span>
        )}
      </label>

      {children}
    </div>
  );
};

const inputClass =
  "h-11 w-full rounded-xl border border-white/[0.08] bg-[#0c0f14] px-3.5 text-sm text-white outline-none transition-all placeholder:text-slate-700 focus:border-white/[0.18] focus:bg-[#0d1117] focus:ring-2 focus:ring-white/[0.04] disabled:cursor-not-allowed disabled:opacity-50";

const selectClass =
  "h-11 w-full appearance-none rounded-xl border border-white/[0.08] bg-[#0c0f14] px-3.5 pr-9 text-sm text-white outline-none transition-all focus:border-white/[0.18] focus:ring-2 focus:ring-white/[0.04] disabled:cursor-not-allowed disabled:opacity-50";

/* =========================================================
   MODAL
========================================================= */

const ProductModal = ({
  open,
  mode,
  form,
  branches,
  saving,
  error,
  onClose,
  onSubmit,
  onChange,
}) => {
  if (!open) return null;

  const isView =
    mode === "view";

  const title =
    mode === "create"
      ? "Create Product"
      : mode === "edit"
      ? "Edit Product"
      : "Product Details";

  const subtitle =
    mode === "create"
      ? "Add a new item to your ERP catalog."
      : mode === "edit"
      ? "Update product information and pricing."
      : "Review complete product information.";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="flex max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl border border-white/[0.08] bg-[#101318] shadow-[0_30px_100px_rgba(0,0,0,0.55)] sm:max-h-[92vh] sm:rounded-3xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.07] px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-slate-200">
                <Package size={17} />
              </div>

              <div className="min-w-0">
                <h2 className="truncate text-base font-bold text-white sm:text-lg">
                  {title}
                </h2>

                <p className="truncate text-[11px] text-slate-500 sm:text-xs">
                  {subtitle}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-5 mt-4 flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/[0.07] px-3.5 py-3 sm:mx-6">
            <AlertCircle
              size={17}
              className="mt-0.5 shrink-0 text-rose-400"
            />

            <p className="text-xs leading-5 text-rose-300">
              {error}
            </p>
          </div>
        )}

        {/* Content */}
        <form
          onSubmit={onSubmit}
          className="min-h-0 flex-1 overflow-y-auto"
        >
          <div className="space-y-7 p-5 sm:p-6">
            {/* Basic */}
            <section>
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-white">
                  Basic Information
                </h3>

                <p className="mt-1 text-[11px] text-slate-600">
                  Product identification and classification.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field
                  label="Product Code"
                  required
                >
                  <input
                    value={form.productCode}
                    onChange={(e) =>
                      onChange(
                        "productCode",
                        e.target.value
                      )
                    }
                    disabled={isView}
                    className={inputClass}
                    placeholder="PRD-001"
                  />
                </Field>

                <Field label="SKU">
                  <input
                    value={form.sku}
                    onChange={(e) =>
                      onChange(
                        "sku",
                        e.target.value
                      )
                    }
                    disabled={isView}
                    className={inputClass}
                    placeholder="SKU-001"
                  />
                </Field>

                <Field
                  label="Product Name"
                  required
                >
                  <input
                    value={form.name}
                    onChange={(e) =>
                      onChange(
                        "name",
                        e.target.value
                      )
                    }
                    disabled={isView}
                    className={inputClass}
                    placeholder="Product name"
                  />
                </Field>

                <Field label="Display Name">
                  <input
                    value={form.displayName}
                    onChange={(e) =>
                      onChange(
                        "displayName",
                        e.target.value
                      )
                    }
                    disabled={isView}
                    className={inputClass}
                    placeholder="Display name"
                  />
                </Field>

                <Field label="Product Type">
                  <div className="relative">
                    <select
                      value={form.productType}
                      onChange={(e) =>
                        onChange(
                          "productType",
                          e.target.value
                        )
                      }
                      disabled={isView}
                      className={selectClass}
                    >
                      {PRODUCT_TYPES.map(
                        (type) => (
                          <option
                            key={type.value}
                            value={type.value}
                          >
                            {type.label}
                          </option>
                        )
                      )}
                    </select>

                    <ChevronDown
                      size={15}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-600"
                    />
                  </div>
                </Field>

                <Field label="Category">
                  <input
                    value={form.category}
                    onChange={(e) =>
                      onChange(
                        "category",
                        e.target.value
                      )
                    }
                    disabled={isView}
                    className={inputClass}
                    placeholder="Electronics"
                  />
                </Field>

                <Field label="Brand">
                  <input
                    value={form.brand}
                    onChange={(e) =>
                      onChange(
                        "brand",
                        e.target.value
                      )
                    }
                    disabled={isView}
                    className={inputClass}
                    placeholder="Brand"
                  />
                </Field>

                <Field label="Unit">
                  <input
                    value={form.unit}
                    onChange={(e) =>
                      onChange(
                        "unit",
                        e.target.value
                      )
                    }
                    disabled={isView}
                    className={inputClass}
                    placeholder="PCS"
                  />
                </Field>

                <Field label="Branch">
                  <div className="relative">
                    <select
                      value={form.branchId}
                      onChange={(e) =>
                        onChange(
                          "branchId",
                          e.target.value
                        )
                      }
                      disabled={isView}
                      className={selectClass}
                    >
                      <option value="">
                        All Branches
                      </option>

                      {branches.map(
                        (branch) => (
                          <option
                            key={
                              branch._id ||
                              branch.id
                            }
                            value={
                              branch._id ||
                              branch.id
                            }
                          >
                            {branch.name ||
                              branch.branchName ||
                              branch.code ||
                              "Branch"}
                          </option>
                        )
                      )}
                    </select>

                    <ChevronDown
                      size={15}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-600"
                    />
                  </div>
                </Field>
              </div>
            </section>

            {/* Tax */}
            <section>
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-white">
                  Tax & Identification
                </h3>

                <p className="mt-1 text-[11px] text-slate-600">
                  GST, HSN/SAC and barcode information.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="HSN / SAC">
                  <input
                    value={form.hsnSac}
                    onChange={(e) =>
                      onChange(
                        "hsnSac",
                        e.target.value
                      )
                    }
                    disabled={isView}
                    className={inputClass}
                    placeholder="8471"
                  />
                </Field>

                <Field label="GST Rate">
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={form.gstRate}
                      onChange={(e) =>
                        onChange(
                          "gstRate",
                          e.target.value
                        )
                      }
                      disabled={isView}
                      className={`${inputClass} pr-10`}
                    />

                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-600">
                      %
                    </span>
                  </div>
                </Field>

                <Field label="Barcode">
                  <input
                    value={form.barcode}
                    onChange={(e) =>
                      onChange(
                        "barcode",
                        e.target.value
                      )
                    }
                    disabled={isView}
                    className={inputClass}
                    placeholder="8901234567890"
                  />
                </Field>
              </div>
            </section>

            {/* Pricing */}
            <section>
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-white">
                  Pricing
                </h3>

                <p className="mt-1 text-[11px] text-slate-600">
                  Purchase, selling and MRP configuration.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Purchase Price">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-600">
                      ₹
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        form.purchasePrice
                      }
                      onChange={(e) =>
                        onChange(
                          "purchasePrice",
                          e.target.value
                        )
                      }
                      disabled={isView}
                      className={`${inputClass} pl-8`}
                    />
                  </div>
                </Field>

                <Field label="Selling Price">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-600">
                      ₹
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        form.sellingPrice
                      }
                      onChange={(e) =>
                        onChange(
                          "sellingPrice",
                          e.target.value
                        )
                      }
                      disabled={isView}
                      className={`${inputClass} pl-8`}
                    />
                  </div>
                </Field>

                <Field label="MRP">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-600">
                      ₹
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.mrp}
                      onChange={(e) =>
                        onChange(
                          "mrp",
                          e.target.value
                        )
                      }
                      disabled={isView}
                      className={`${inputClass} pl-8`}
                    />
                  </div>
                </Field>
              </div>
            </section>

            {/* Inventory */}
            <section>
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-white">
                  Inventory
                </h3>

                <p className="mt-1 text-[11px] text-slate-600">
                  Opening stock and stock-level controls.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Opening Stock">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      form.openingStock
                    }
                    onChange={(e) =>
                      onChange(
                        "openingStock",
                        e.target.value
                      )
                    }
                    disabled={isView}
                    className={inputClass}
                  />
                </Field>

                <Field label="Reorder Level">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      form.reorderLevel
                    }
                    onChange={(e) =>
                      onChange(
                        "reorderLevel",
                        e.target.value
                      )
                    }
                    disabled={isView}
                    className={inputClass}
                  />
                </Field>

                <Field label="Minimum Stock">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      form.minimumStock
                    }
                    onChange={(e) =>
                      onChange(
                        "minimumStock",
                        e.target.value
                      )
                    }
                    disabled={isView}
                    className={inputClass}
                  />
                </Field>

                <Field label="Maximum Stock">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      form.maximumStock
                    }
                    onChange={(e) =>
                      onChange(
                        "maximumStock",
                        e.target.value
                      )
                    }
                    disabled={isView}
                    className={inputClass}
                  />
                </Field>
              </div>
            </section>

            {/* Description */}
            <section>
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-white">
                  Additional Information
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Field label="Description">
                  <textarea
                    rows={4}
                    value={form.description}
                    onChange={(e) =>
                      onChange(
                        "description",
                        e.target.value
                      )
                    }
                    disabled={isView}
                    className="w-full resize-none rounded-xl border border-white/[0.08] bg-[#0c0f14] px-3.5 py-3 text-sm text-white outline-none transition-all placeholder:text-slate-700 focus:border-white/[0.18] focus:ring-2 focus:ring-white/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Add product description..."
                  />
                </Field>

                <Field label="Status">
                  <div className="relative">
                    <select
                      value={form.status}
                      onChange={(e) =>
                        onChange(
                          "status",
                          e.target.value
                        )
                      }
                      disabled={isView}
                      className={selectClass}
                    >
                      <option value="active">
                        Active
                      </option>

                      <option value="inactive">
                        Inactive
                      </option>
                    </select>

                    <ChevronDown
                      size={15}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-600"
                    />
                  </div>
                </Field>
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 flex shrink-0 items-center justify-end gap-2 border-t border-white/[0.07] bg-[#101318]/95 px-5 py-4 backdrop-blur-xl sm:px-6">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-10 rounded-xl border border-white/[0.08] px-4 text-sm font-medium text-slate-400 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-40"
            >
              {isView
                ? "Close"
                : "Cancel"}
            </button>

            {!isView && (
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-black transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
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
                    {mode === "edit"
                      ? "Update Product"
                      : "Create Product"}
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

/* =========================================================
   MAIN COMPONENT
========================================================= */

const Products = () => {
  const [products, setProducts] =
    useState([]);

  const [branches, setBranches] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [branchesLoading, setBranchesLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [status, setStatus] =
    useState("");

  const [productType, setProductType] =
    useState("");

  const [branchFilter, setBranchFilter] =
    useState("");

  const [page, setPage] =
    useState(1);

  const limit = 10;

  const [total, setTotal] =
    useState(0);

  const [totalPages, setTotalPages] =
    useState(1);

  const [modalOpen, setModalOpen] =
    useState(false);

  const [modalMode, setModalMode] =
    useState("create");

  const [editingId, setEditingId] =
    useState(null);

  const [form, setForm] =
    useState({
      ...EMPTY_FORM,
    });

  const [actionId, setActionId] =
    useState(null);

  const [menuId, setMenuId] =
    useState(null);

  const menuRef = useRef(null);

  const branchRequestRef =
    useRef(null);

  const productRequestRef =
    useRef(null);

  /* =====================================================
     FETCH BRANCHES
  ===================================================== */

  const fetchBranches =
    useCallback(async (signal) => {
      try {
        setBranchesLoading(true);

        const data =
          await apiRequest(
            "/branches",
            {
              signal,
            }
          );

        if (signal?.aborted) {
          return;
        }

        setBranches(
          getBranchList(data)
        );
      } catch (err) {
        if (
          err?.name ===
          "AbortError"
        ) {
          return;
        }

        console.error(
          "Products: /branches error:",
          err
        );

        /*
          Branch failure should not prevent
          Products page from loading.
        */
      } finally {
        if (!signal?.aborted) {
          setBranchesLoading(false);
        }
      }
    }, []);

  /* =====================================================
     FETCH PRODUCTS
  ===================================================== */

  const fetchProducts =
    useCallback(
      async (signal) => {
        try {
          setLoading(true);
          setError("");

          const params =
            new URLSearchParams();

          params.set(
            "page",
            String(page)
          );

          params.set(
            "limit",
            String(limit)
          );

          if (search.trim()) {
            params.set(
              "search",
              search.trim()
            );
          }

          if (status) {
            params.set(
              "status",
              status
            );
          }

          if (productType) {
            params.set(
              "productType",
              productType
            );
          }

          if (branchFilter) {
            params.set(
              "branchId",
              branchFilter
            );
          }

          const data =
            await apiRequest(
              `/products?${params.toString()}`,
              {
                signal,
              }
            );

          if (signal?.aborted) {
            return;
          }

          const result =
            getListData(data);

          const list =
            Array.isArray(
              result.products
            )
              ? result.products
              : [];

          const numericTotal =
            Number(result.total);

          const numericPages =
            Number(
              result.totalPages
            );

          setProducts(list);

          setTotal(
            Number.isFinite(
              numericTotal
            )
              ? numericTotal
              : list.length
          );

          const calculatedPages =
            numericTotal > 0
              ? Math.ceil(
                  numericTotal /
                    limit
                )
              : 1;

          const finalPages =
            Math.max(
              1,
              Number.isFinite(
                numericPages
              ) &&
                numericPages > 0
                ? numericPages
                : calculatedPages
            );

          setTotalPages(
            finalPages
          );

          if (
            page > finalPages
          ) {
            setPage(finalPages);
          }
        } catch (err) {
          if (
            err?.name ===
            "AbortError"
          ) {
            return;
          }

          console.error(
            "Products: /products error:",
            err
          );

          setProducts([]);
          setTotal(0);
          setTotalPages(1);

          setError(
            err?.message ||
              "Failed to load products."
          );
        } finally {
          if (!signal?.aborted) {
            setLoading(false);
          }
        }
      },
      [
        page,
        search,
        status,
        productType,
        branchFilter,
      ]
    );

  /* =====================================================
     INITIAL / FILTER EFFECTS
  ===================================================== */

  useEffect(() => {
    const controller =
      new AbortController();

    branchRequestRef.current?.abort();

    branchRequestRef.current =
      controller;

    fetchBranches(
      controller.signal
    );

    return () => {
      controller.abort();
    };
  }, [fetchBranches]);

  useEffect(() => {
    const controller =
      new AbortController();

    productRequestRef.current?.abort();

    productRequestRef.current =
      controller;

    const timer =
      setTimeout(() => {
        fetchProducts(
          controller.signal
        );
      }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [fetchProducts]);

  /* =====================================================
     SUCCESS MESSAGE
  ===================================================== */

  useEffect(() => {
    if (!success) return;

    const timer =
      setTimeout(() => {
        setSuccess("");
      }, 3500);

    return () => {
      clearTimeout(timer);
    };
  }, [success]);

  /* =====================================================
     OUTSIDE MENU
  ===================================================== */

  useEffect(() => {
    const handlePointerDown =
      (event) => {
        if (
          !menuRef.current
        ) {
          return;
        }

        if (
          !menuRef.current.contains(
            event.target
          )
        ) {
          setMenuId(null);
        }
      };

    document.addEventListener(
      "mousedown",
      handlePointerDown
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handlePointerDown
      );
    };
  }, []);

  /* =====================================================
     ESCAPE
  ===================================================== */

  useEffect(() => {
    const handleEscape =
      (event) => {
        if (
          event.key !==
          "Escape"
        ) {
          return;
        }

        setMenuId(null);

        if (
          modalOpen &&
          !saving
        ) {
          setModalOpen(false);
          setEditingId(null);
          setForm({
            ...EMPTY_FORM,
          });
        }
      };

    window.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [
    modalOpen,
    saving,
  ]);

  /* =====================================================
     STATS
  ===================================================== */

  const stats = useMemo(() => {
    const active =
      products.filter(
        (item) =>
          item.status ===
          "active"
      ).length;

    const services =
      products.filter(
        (item) =>
          item.productType ===
          "service"
      ).length;

    const inventory =
      products.filter(
        (item) =>
          item.productType !==
          "service"
      ).length;

    const stockValue =
      products.reduce(
        (sum, item) =>
          sum +
          normalizeNumber(
            item.openingStock
          ) *
            normalizeNumber(
              item.purchasePrice
            ),
        0
      );

    return {
      active,
      services,
      inventory,
      stockValue,
    };
  }, [products]);

  /* =====================================================
     FORM
  ===================================================== */

  const handleFormChange =
    (field, value) => {
      setForm((previous) => ({
        ...previous,
        [field]: value,
      }));
    };

  const productToForm =
    (product) => ({
      productCode:
        safeString(
          product.productCode
        ),

      sku:
        safeString(
          product.sku
        ),

      name:
        safeString(
          product.name
        ),

      displayName:
        safeString(
          product.displayName
        ),

      productType:
        product.productType ||
        "product",

      category:
        safeString(
          product.category
        ),

      brand:
        safeString(
          product.brand
        ),

      unit:
        safeString(
          product.unit
        ) || "PCS",

      hsnSac:
        safeString(
          product.hsnSac
        ),

      gstRate:
        product.gstRate ??
        0,

      purchasePrice:
        product.purchasePrice ??
        0,

      sellingPrice:
        product.sellingPrice ??
        0,

      mrp:
        product.mrp ?? 0,

      openingStock:
        product.openingStock ??
        0,

      reorderLevel:
        product.reorderLevel ??
        0,

      minimumStock:
        product.minimumStock ??
        0,

      maximumStock:
        product.maximumStock ??
        0,

      barcode:
        safeString(
          product.barcode
        ),

      description:
        safeString(
          product.description
        ),

      status:
        product.status ||
        "active",

      branchId:
        typeof product.branchId ===
        "object"
          ? product.branchId?._id ||
            ""
          : product.branchId ||
            "",
    });

  const openCreate =
    () => {
      setForm({
        ...EMPTY_FORM,
      });

      setEditingId(null);
      setModalMode("create");
      setModalOpen(true);
      setMenuId(null);
      setError("");
    };

  const openEdit =
    (product) => {
      setEditingId(
        product._id
      );

      setForm(
        productToForm(product)
      );

      setModalMode("edit");
      setModalOpen(true);
      setMenuId(null);
      setError("");
    };

  const openView =
    (product) => {
      setEditingId(
        product._id
      );

      setForm(
        productToForm(product)
      );

      setModalMode("view");
      setModalOpen(true);
      setMenuId(null);
      setError("");
    };

  const closeModal =
    (force = false) => {
      if (
        saving &&
        !force
      ) {
        return;
      }

      setModalOpen(false);
      setEditingId(null);

      setForm({
        ...EMPTY_FORM,
      });
    };

  /* =====================================================
     VALIDATION
  ===================================================== */

  const validateForm =
    () => {
      if (
        !safeString(
          form.productCode
        ).trim()
      ) {
        return "Product code is required.";
      }

      if (
        !safeString(
          form.name
        ).trim()
      ) {
        return "Product name is required.";
      }

      const gst =
        Number(
          form.gstRate
        );

      if (
        !Number.isFinite(gst) ||
        gst < 0 ||
        gst > 100
      ) {
        return "GST rate must be between 0 and 100.";
      }

      const purchase =
        normalizeNumber(
          form.purchasePrice
        );

      const selling =
        normalizeNumber(
          form.sellingPrice
        );

      const mrp =
        normalizeNumber(
          form.mrp
        );

      if (
        selling <
        purchase
      ) {
        return "Selling price cannot be lower than purchase price.";
      }

      if (
        mrp > 0 &&
        mrp < selling
      ) {
        return "MRP cannot be lower than selling price.";
      }

      const minimum =
        normalizeNumber(
          form.minimumStock
        );

      const maximum =
        normalizeNumber(
          form.maximumStock
        );

      if (
        maximum > 0 &&
        maximum < minimum
      ) {
        return "Maximum stock cannot be lower than minimum stock.";
      }

      return "";
    };

  /* =====================================================
     CREATE / UPDATE
  ===================================================== */

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      const validationError =
        validateForm();

      if (validationError) {
        setError(
          validationError
        );

        return;
      }

      try {
        setSaving(true);
        setError("");

        const payload =
          normalizeForm(form);

        const isEdit =
          modalMode ===
            "edit" &&
          Boolean(editingId);

        const url = isEdit
          ? `/products/${editingId}`
          : "/products";

        const method = isEdit
          ? "PUT"
          : "POST";

        const data =
          await apiRequest(
            url,
            {
              method,
              body: JSON.stringify(
                payload
              ),
            }
          );

        setSuccess(
          data?.message ||
            (isEdit
              ? "Product updated successfully."
              : "Product created successfully.")
        );

        closeModal(true);

        await fetchProducts();
      } catch (err) {
        setError(
          err?.message ||
            "Unable to save product."
        );
      } finally {
        setSaving(false);
      }
    };

  /* =====================================================
     DELETE
  ===================================================== */

  const handleDelete =
    async (product) => {
      const confirmed =
        window.confirm(
          `Delete "${product.name}"?`
        );

      if (!confirmed) {
        return;
      }

      try {
        setActionId(
          product._id
        );

        setMenuId(null);
        setError("");

        const data =
          await apiRequest(
            `/products/${product._id}`,
            {
              method: "DELETE",
            }
          );

        setSuccess(
          data?.message ||
            "Product deleted successfully."
        );

        await fetchProducts();
      } catch (err) {
        setError(
          err?.message ||
            "Unable to delete product."
        );
      } finally {
        setActionId(null);
      }
    };

  /* =====================================================
     RESTORE
  ===================================================== */

  const handleRestore =
    async (product) => {
      try {
        setActionId(
          product._id
        );

        setMenuId(null);
        setError("");

        const data =
          await apiRequest(
            `/products/${product._id}/restore`,
            {
              method: "PATCH",
            }
          );

        setSuccess(
          data?.message ||
            "Product restored successfully."
        );

        await fetchProducts();
      } catch (err) {
        setError(
          err?.message ||
            "Unable to restore product."
        );
      } finally {
        setActionId(null);
      }
    };

  /* =====================================================
     FILTERS
  ===================================================== */

  const clearFilters =
    () => {
      setSearch("");
      setStatus("");
      setProductType("");
      setBranchFilter("");
      setPage(1);
    };

  const hasFilters =
    Boolean(
      search ||
        status ||
        productType ||
        branchFilter
    );

  const refresh =
    async () => {
      setMenuId(null);
      setError("");

      const controller =
        new AbortController();

      await Promise.all([
        fetchBranches(
          controller.signal
        ),
        fetchProducts(
          controller.signal
        ),
      ]);
    };

  /* =====================================================
     PAGINATION
  ===================================================== */

  const startItem =
    total === 0
      ? 0
      : (page - 1) * limit +
        1;

  const endItem =
    Math.min(
      page * limit,
      total
    );

  const visiblePages =
    useMemo(() => {
      const pages = [];

      const start =
        Math.max(
          1,
          page - 2
        );

      const end =
        Math.min(
          totalPages,
          page + 2
        );

      for (
        let current = start;
        current <= end;
        current += 1
      ) {
        pages.push(
          current
        );
      }

      return pages;
    }, [
      page,
      totalPages,
    ]);

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="min-h-full w-full bg-[#080a0e] text-white">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/4 top-0 h-72 w-72 rounded-full bg-white/[0.025] blur-[120px]" />

        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-white/[0.02] blur-[140px]" />
      </div>

      <div className="mx-auto w-full max-w-[1800px] p-3 sm:p-5 lg:p-6">
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-600">
              <span>
                Inventory
              </span>

              <span className="text-slate-800">
                /
              </span>

              <span className="text-slate-500">
                Products
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.045] text-slate-200 shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
                <Boxes
                  size={21}
                />
              </div>

              <div className="min-w-0">
                <h1 className="truncate text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Products
                </h1>

                <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                  Manage your product catalog, pricing and inventory.
                </p>
              </div>
            </div>
          </div>

          <div className="flex w-full items-center gap-2 xl:w-auto">
            <button
              type="button"
              onClick={refresh}
              disabled={
                loading ||
                branchesLoading
              }
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
            >
              <RefreshCw
                size={16}
                className={
                  loading
                    ? "animate-spin"
                    : ""
                }
              />

              <span className="hidden sm:inline">
                Refresh
              </span>
            </button>

            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-black shadow-[0_8px_25px_rgba(255,255,255,0.08)] transition hover:bg-slate-200 sm:flex-none"
            >
              <Plus size={17} />

              <span>
                Add Product
              </span>
            </button>
          </div>
        </div>

        {/* =================================================
            ALERTS
        ================================================= */}

        <div className="mb-4 space-y-2">
          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/[0.06] px-4 py-3">
              <AlertCircle
                size={18}
                className="mt-0.5 shrink-0 text-rose-400"
              />

              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-rose-300">
                  Unable to complete request
                </p>

                <p className="mt-0.5 break-words text-xs leading-5 text-rose-400/80">
                  {error}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setError("")
                }
                className="text-slate-600 transition hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3">
              <CheckCircle2
                size={18}
                className="shrink-0 text-emerald-400"
              />

              <p className="text-xs font-medium text-emerald-300">
                {success}
              </p>

              <button
                type="button"
                onClick={() =>
                  setSuccess("")
                }
                className="ml-auto text-slate-600 transition hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        {/* =================================================
            STATS
        ================================================= */}

        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            title="Products"
            value={formatNumber(
              total
            )}
            icon={Package}
            subtitle="Current catalog"
          />

          <StatCard
            title="Active"
            value={formatNumber(
              stats.active
            )}
            icon={CheckCircle2}
            subtitle="Visible products"
          />

          <StatCard
            title="Services"
            value={formatNumber(
              stats.services
            )}
            icon={Activity}
            subtitle="Service items"
          />

          <StatCard
            title="Stock Value"
            value={formatCurrency(
              stats.stockValue
            )}
            icon={
              CircleDollarSign
            }
            subtitle="Current page estimate"
          />
        </div>

        {/* =================================================
            FILTER BAR
        ================================================= */}

        <div className="mb-4 rounded-2xl border border-white/[0.07] bg-[#11141a] p-3 shadow-[0_12px_40px_rgba(0,0,0,0.16)] sm:p-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 lg:flex-row">
              {/* Search */}
              <div className="relative min-w-0 flex-1">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600"
                />

                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(
                      e.target.value
                    );
                    setPage(1);
                  }}
                  className="h-11 w-full rounded-xl border border-white/[0.08] bg-[#0b0e13] pl-10 pr-10 text-sm text-white outline-none transition focus:border-white/[0.18] focus:ring-2 focus:ring-white/[0.04] placeholder:text-slate-700"
                  placeholder="Search product, code, SKU, barcode..."
                />

                {search && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setPage(1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 transition hover:text-white"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-auto">
                {/* Status */}
                <div className="relative">
                  <select
                    value={status}
                    onChange={(e) => {
                      setStatus(
                        e.target.value
                      );
                      setPage(1);
                    }}
                    className="h-11 w-full min-w-0 appearance-none rounded-xl border border-white/[0.08] bg-[#0b0e13] px-3 pr-8 text-xs font-medium text-slate-300 outline-none transition focus:border-white/[0.18]"
                  >
                    <option value="">
                      All Status
                    </option>

                    <option value="active">
                      Active
                    </option>

                    <option value="inactive">
                      Inactive
                    </option>
                  </select>

                  <ChevronDown
                    size={14}
                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600"
                  />
                </div>

                {/* Type */}
                <div className="relative">
                  <select
                    value={productType}
                    onChange={(e) => {
                      setProductType(
                        e.target.value
                      );
                      setPage(1);
                    }}
                    className="h-11 w-full min-w-0 appearance-none rounded-xl border border-white/[0.08] bg-[#0b0e13] px-3 pr-8 text-xs font-medium text-slate-300 outline-none transition focus:border-white/[0.18]"
                  >
                    <option value="">
                      All Types
                    </option>

                    {PRODUCT_TYPES.map(
                      (type) => (
                        <option
                          key={type.value}
                          value={
                            type.value
                          }
                        >
                          {type.label}
                        </option>
                      )
                    )}
                  </select>

                  <ChevronDown
                    size={14}
                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600"
                  />
                </div>

                {/* Branch */}
                <div className="relative">
                  <select
                    value={branchFilter}
                    onChange={(e) => {
                      setBranchFilter(
                        e.target.value
                      );
                      setPage(1);
                    }}
                    disabled={
                      branchesLoading
                    }
                    className="h-11 w-full min-w-0 appearance-none rounded-xl border border-white/[0.08] bg-[#0b0e13] px-3 pr-8 text-xs font-medium text-slate-300 outline-none transition focus:border-white/[0.18] disabled:opacity-50"
                  >
                    <option value="">
                      All Branches
                    </option>

                    {branches.map(
                      (branch) => (
                        <option
                          key={
                            branch._id ||
                            branch.id
                          }
                          value={
                            branch._id ||
                            branch.id
                          }
                        >
                          {branch.name ||
                            branch.branchName ||
                            branch.code ||
                            "Branch"}
                        </option>
                      )
                    )}
                  </select>

                  <ChevronDown
                    size={14}
                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600"
                  />
                </div>

                <button
                  type="button"
                  onClick={
                    clearFilters
                  }
                  disabled={
                    !hasFilters
                  }
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#0b0e13] px-3 text-xs font-medium text-slate-500 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Filter
                    size={14}
                  />

                  Clear
                </button>
              </div>
            </div>

            {hasFilters && (
              <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.05] pt-3">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-700">
                  Filters
                </span>

                {search && (
                  <span className="rounded-lg bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-400">
                    Search: {search}
                  </span>
                )}

                {status && (
                  <span className="rounded-lg bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-400">
                    Status:{" "}
                    {status}
                  </span>
                )}

                {productType && (
                  <span className="rounded-lg bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-400">
                    Type:{" "}
                    {getTypeLabel(
                      productType
                    )}
                  </span>
                )}

                {branchFilter && (
                  <span className="rounded-lg bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-400">
                    Branch filter
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* =================================================
            TABLE
        ================================================= */}

        <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#11141a] shadow-[0_15px_50px_rgba(0,0,0,0.2)]">
          {/* Desktop */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[1050px] border-collapse">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.015]">
                  <th className="px-5 py-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                    Product
                  </th>

                  <th className="px-4 py-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                    Code / SKU
                  </th>

                  <th className="px-4 py-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                    Type
                  </th>

                  <th className="px-4 py-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                    Branch
                  </th>

                  <th className="px-4 py-3.5 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                    Selling
                  </th>

                  <th className="px-4 py-3.5 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                    Stock
                  </th>

                  <th className="px-4 py-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                    Status
                  </th>

                  <th className="w-16 px-4 py-3.5 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                    <Settings2
                      size={14}
                      className="ml-auto"
                    />
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/[0.045]">
                {loading ? (
                  Array.from({
                    length: 7,
                  }).map(
                    (_, index) => (
                      <tr
                        key={index}
                        className="animate-pulse"
                      >
                        {Array.from({
                          length: 8,
                        }).map(
                          (
                            __,
                            cellIndex
                          ) => (
                            <td
                              key={
                                cellIndex
                              }
                              className="px-4 py-4"
                            >
                              <div className="h-3 rounded bg-white/[0.04]" />
                            </td>
                          )
                        )}
                      </tr>
                    )
                  )
                ) : products.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-16"
                    >
                      <div className="mx-auto flex max-w-sm flex-col items-center text-center">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.03] text-slate-600">
                          <Package
                            size={24}
                          />
                        </div>

                        <h3 className="text-sm font-semibold text-slate-300">
                          No products found
                        </h3>

                        <p className="mt-1 text-xs leading-5 text-slate-600">
                          {hasFilters
                            ? "Try changing or clearing your filters."
                            : "Create your first product to start building your catalog."}
                        </p>

                        {hasFilters ? (
                          <button
                            type="button"
                            onClick={
                              clearFilters
                            }
                            className="mt-4 rounded-xl border border-white/[0.08] px-4 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
                          >
                            Clear Filters
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={
                              openCreate
                            }
                            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-black transition hover:bg-slate-200"
                          >
                            <Plus
                              size={14}
                            />
                            Add Product
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  products.map(
                    (product) => {
                      const deleted =
                        Boolean(
                          product.deletedAt
                        );

                      const isAction =
                        actionId ===
                        product._id;

                      return (
                        <tr
                          key={
                            product._id
                          }
                          className={[
                            "group transition-colors hover:bg-white/[0.018]",
                            deleted
                              ? "opacity-60"
                              : "",
                          ].join(
                            " "
                          )}
                        >
                          <td className="px-5 py-4">
                            <div className="flex min-w-[230px] items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.035] text-slate-400">
                                <Package
                                  size={17}
                                />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-200">
                                  {product.name ||
                                    "Unnamed Product"}
                                </p>

                                <p className="mt-0.5 truncate text-[11px] text-slate-600">
                                  {product.displayName ||
                                    product.category ||
                                    "No description"}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <div>
                              <p className="text-xs font-semibold text-slate-300">
                                {product.productCode ||
                                  "—"}
                              </p>

                              <p className="mt-1 text-[10px] text-slate-600">
                                {product.sku ||
                                  "No SKU"}
                              </p>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <TypeBadge
                              type={
                                product.productType
                              }
                            />
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                              <Building2
                                size={13}
                                className="text-slate-600"
                              />

                              <span className="max-w-[150px] truncate">
                                {getBranchName(
                                  product
                                )}
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-4 text-right">
                            <p className="text-xs font-semibold text-slate-200">
                              {formatCurrency(
                                product.sellingPrice
                              )}
                            </p>

                            {Number(
                              product.mrp
                            ) > 0 && (
                              <p className="mt-1 text-[10px] text-slate-600">
                                MRP{" "}
                                {formatCurrency(
                                  product.mrp
                                )}
                              </p>
                            )}
                          </td>

                          <td className="px-4 py-4 text-right">
                            <p className="text-xs font-semibold text-slate-300">
                              {formatNumber(
                                product.openingStock
                              )}{" "}
                              <span className="font-normal text-slate-600">
                                {product.unit ||
                                  "PCS"}
                              </span>
                            </p>

                            {Number(
                              product.reorderLevel
                            ) > 0 && (
                              <p className="mt-1 text-[10px] text-slate-600">
                                Reorder{" "}
                                {formatNumber(
                                  product.reorderLevel
                                )}
                              </p>
                            )}
                          </td>

                          <td className="px-4 py-4">
                            <StatusBadge
                              status={
                                product.status
                              }
                            />
                          </td>

                          <td className="relative px-4 py-4 text-right">
                            <button
                              type="button"
                              disabled={
                                isAction
                              }
                              onClick={() =>
                                setMenuId(
                                  menuId ===
                                    product._id
                                    ? null
                                    : product._id
                                )
                              }
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
                            >
                              {isAction ? (
                                <Loader2
                                  size={16}
                                  className="animate-spin"
                                />
                              ) : (
                                <MoreHorizontal
                                  size={17}
                                />
                              )}
                            </button>

                            {menuId ===
                              product._id && (
                              <div
                                ref={
                                  menuRef
                                }
                                className="absolute right-4 top-12 z-40 w-44 overflow-hidden rounded-xl border border-white/[0.08] bg-[#171b22] p-1 shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    openView(
                                      product
                                    )
                                  }
                                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-slate-400 transition hover:bg-white/[0.05] hover:text-white"
                                >
                                  <Eye
                                    size={14}
                                  />
                                  View
                                </button>

                                {!deleted && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openEdit(
                                        product
                                      )
                                    }
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-slate-400 transition hover:bg-white/[0.05] hover:text-white"
                                  >
                                    <Edit3
                                      size={14}
                                    />
                                    Edit
                                  </button>
                                )}

                                {deleted ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRestore(
                                        product
                                      )
                                    }
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-emerald-400 transition hover:bg-emerald-500/[0.08]"
                                  >
                                    <RotateCcw
                                      size={14}
                                    />
                                    Restore
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDelete(
                                        product
                                      )
                                    }
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-rose-400 transition hover:bg-rose-500/[0.08]"
                                  >
                                    <Trash2
                                      size={14}
                                    />
                                    Delete
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    }
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* =================================================
              MOBILE / TABLET CARDS
          ================================================= */}

          <div className="lg:hidden">
            {loading ? (
              <div className="divide-y divide-white/[0.05]">
                {Array.from({
                  length: 5,
                }).map(
                  (_, index) => (
                    <div
                      key={index}
                      className="animate-pulse p-4"
                    >
                      <div className="flex gap-3">
                        <div className="h-11 w-11 rounded-xl bg-white/[0.04]" />

                        <div className="flex-1 space-y-2">
                          <div className="h-3 w-2/3 rounded bg-white/[0.04]" />

                          <div className="h-2.5 w-1/3 rounded bg-white/[0.03]" />
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <div className="h-12 rounded-xl bg-white/[0.025]" />
                        <div className="h-12 rounded-xl bg-white/[0.025]" />
                        <div className="h-12 rounded-xl bg-white/[0.025]" />
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : products.length ===
              0 ? (
              <div className="px-5 py-14 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.03] text-slate-600">
                  <Package
                    size={24}
                  />
                </div>

                <h3 className="text-sm font-semibold text-slate-300">
                  No products found
                </h3>

                <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-slate-600">
                  {hasFilters
                    ? "Try changing or clearing your filters."
                    : "Create your first product to start building your catalog."}
                </p>

                <button
                  type="button"
                  onClick={
                    hasFilters
                      ? clearFilters
                      : openCreate
                  }
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/[0.08] px-4 py-2.5 text-xs font-medium text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
                >
                  {hasFilters ? (
                    <>
                      <Filter
                        size={14}
                      />
                      Clear Filters
                    </>
                  ) : (
                    <>
                      <Plus
                        size={14}
                      />
                      Add Product
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.05]">
                {products.map(
                  (product) => {
                    const deleted =
                      Boolean(
                        product.deletedAt
                      );

                    const isAction =
                      actionId ===
                      product._id;

                    return (
                      <div
                        key={
                          product._id
                        }
                        className={[
                          "p-4",
                          deleted
                            ? "opacity-60"
                            : "",
                        ].join(
                          " "
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.035] text-slate-400">
                            <Package
                              size={18}
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h3 className="truncate text-sm font-semibold text-slate-200">
                                  {product.name ||
                                    "Unnamed Product"}
                                </h3>

                                <p className="mt-1 truncate text-[11px] text-slate-600">
                                  {product.productCode ||
                                    "No code"}

                                  {product.sku
                                    ? ` • ${product.sku}`
                                    : ""}
                                </p>
                              </div>

                              <div className="relative shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setMenuId(
                                      menuId ===
                                        product._id
                                        ? null
                                        : product._id
                                    )
                                  }
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-white/[0.06] hover:text-white"
                                >
                                  {isAction ? (
                                    <Loader2
                                      size={
                                        16
                                      }
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <MoreHorizontal
                                      size={
                                        17
                                      }
                                    />
                                  )}
                                </button>

                                {menuId ===
                                  product._id && (
                                  <div
                                    ref={
                                      menuRef
                                    }
                                    className="absolute right-0 top-9 z-40 w-40 overflow-hidden rounded-xl border border-white/[0.08] bg-[#171b22] p-1 shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
                                  >
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openView(
                                          product
                                        )
                                      }
                                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-slate-400 hover:bg-white/[0.05] hover:text-white"
                                    >
                                      <Eye
                                        size={
                                          14
                                        }
                                      />
                                      View
                                    </button>

                                    {!deleted && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          openEdit(
                                            product
                                          )
                                        }
                                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-slate-400 hover:bg-white/[0.05] hover:text-white"
                                      >
                                        <Edit3
                                          size={
                                            14
                                          }
                                        />
                                        Edit
                                      </button>
                                    )}

                                    {deleted ? (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleRestore(
                                            product
                                          )
                                        }
                                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-emerald-400 hover:bg-emerald-500/[0.08]"
                                      >
                                        <RotateCcw
                                          size={
                                            14
                                          }
                                        />
                                        Restore
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleDelete(
                                            product
                                          )
                                        }
                                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-rose-400 hover:bg-rose-500/[0.08]"
                                      >
                                        <Trash2
                                          size={
                                            14
                                          }
                                        />
                                        Delete
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <TypeBadge
                                type={
                                  product.productType
                                }
                              />

                              <StatusBadge
                                status={
                                  product.status
                                }
                              />
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                            <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-700">
                              Selling
                            </p>

                            <p className="mt-1 text-xs font-semibold text-slate-200">
                              {formatCurrency(
                                product.sellingPrice
                              )}
                            </p>
                          </div>

                          <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                            <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-700">
                              Stock
                            </p>

                            <p className="mt-1 text-xs font-semibold text-slate-200">
                              {formatNumber(
                                product.openingStock
                              )}{" "}
                              <span className="text-[10px] font-normal text-slate-600">
                                {product.unit ||
                                  "PCS"}
                              </span>
                            </p>
                          </div>

                          <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                            <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-700">
                              GST
                            </p>

                            <p className="mt-1 text-xs font-semibold text-slate-200">
                              {formatNumber(
                                product.gstRate
                              )}
                              %
                            </p>
                          </div>

                          <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                            <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-700">
                              Branch
                            </p>

                            <p className="mt-1 truncate text-xs font-semibold text-slate-300">
                              {getBranchName(
                                product
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>

          {/* =================================================
              PAGINATION
          ================================================= */}

          {!loading &&
            total > 0 && (
              <div className="flex flex-col gap-3 border-t border-white/[0.06] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <p className="text-[11px] text-slate-600">
                  Showing{" "}
                  <span className="font-medium text-slate-400">
                    {startItem}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium text-slate-400">
                    {endItem}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-slate-400">
                    {total}
                  </span>{" "}
                  products
                </p>

                <div className="flex items-center justify-between gap-1 sm:justify-end">
                  <button
                    type="button"
                    disabled={
                      page <= 1
                    }
                    onClick={() =>
                      setPage(
                        (current) =>
                          Math.max(
                            1,
                            current -
                              1
                          )
                      )
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.07] text-slate-500 transition hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronLeft
                      size={15}
                    />
                  </button>

                  <div className="flex items-center gap-1">
                    {visiblePages.map(
                      (pageNumber) => (
                        <button
                          key={
                            pageNumber
                          }
                          type="button"
                          onClick={() =>
                            setPage(
                              pageNumber
                            )
                          }
                          className={[
                            "h-9 min-w-9 rounded-lg px-2 text-xs font-semibold transition",
                            page ===
                            pageNumber
                              ? "bg-white text-black"
                              : "text-slate-500 hover:bg-white/[0.05] hover:text-white",
                          ].join(
                            " "
                          )}
                        >
                          {
                            pageNumber
                          }
                        </button>
                      )
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={
                      page >=
                      totalPages
                    }
                    onClick={() =>
                      setPage(
                        (current) =>
                          Math.min(
                            totalPages,
                            current +
                              1
                          )
                      )
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.07] text-slate-500 transition hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronRight
                      size={15}
                    />
                  </button>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* ===================================================
          MODAL
      =================================================== */}

      <ProductModal
        open={modalOpen}
        mode={modalMode}
        form={form}
        branches={branches}
        saving={saving}
        error={error}
        onClose={() =>
          closeModal()
        }
        onSubmit={
          handleSubmit
        }
        onChange={
          handleFormChange
        }
      />
    </div>
  );
};

export default Products;