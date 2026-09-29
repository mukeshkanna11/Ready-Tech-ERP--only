import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getToken } from "../../services/api";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

const QUOTATIONS_API = `${API_URL}/quotations`;
const CUSTOMERS_API = `${API_URL}/customers`;
const PRODUCTS_API = `${API_URL}/products`;
const BRANCHES_API = `${API_URL}/branches`;

const STATUS_CONFIG = {
  draft: {
    label: "Draft",
    className:
      "border-slate-500/30 bg-slate-500/10 text-slate-300",
  },
  sent: {
    label: "Sent",
    className:
      "border-blue-500/30 bg-blue-500/10 text-blue-300",
  },
  accepted: {
    label: "Accepted",
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  },
  rejected: {
    label: "Rejected",
    className:
      "border-red-500/30 bg-red-500/10 text-red-300",
  },
  expired: {
    label: "Expired",
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-300",
  },
  cancelled: {
    label: "Cancelled",
    className:
      "border-zinc-500/30 bg-zinc-500/10 text-zinc-400",
  },
};

const EMPTY_ADDRESS = {
  line1: "",
  line2: "",
  city: "",
  state: "",
  country: "India",
  postalCode: "",
};

const EMPTY_ITEM = {
  productId: "",
  productCode: "",
  sku: "",
  productName: "",
  description: "",
  quantity: 1,
  unit: "PCS",
  unitPrice: 0,
  discountPercent: 0,
  discountAmount: 0,
  taxableAmount: 0,
  taxPercent: 0,
  taxAmount: 0,
  lineTotal: 0,
};

const EMPTY_FORM = {
  customerId: "",
  branchId: "",
  referenceNumber: "",
  quotationDate: new Date().toISOString().slice(0, 10),
  validUntil: "",
  items: [{ ...EMPTY_ITEM }],
  shippingAmount: 0,
  otherCharges: 0,
  adjustmentAmount: 0,
  currency: "INR",
  billingAddress: { ...EMPTY_ADDRESS },
  shippingAddress: { ...EMPTY_ADDRESS },
  notes: "",
  termsAndConditions: "",
  customerNotes: "",
};

async function apiRequest(url, options = {}) {
  const token = getToken();

  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  let result = null;

  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (!response.ok) {
    throw new Error(
      result?.message ||
        result?.error ||
        `Request failed with status ${response.status}`
    );
  }

  return result;
}

function money(value, currency = "INR") {
  const number = Number(value || 0);

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(number);
  } catch {
    return `₹${number.toFixed(2)}`;
  }
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value) {
  return Math.round((number(value) + Number.EPSILON) * 100) / 100;
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getId(value) {
  if (!value) return "";

  if (typeof value === "string") return value;

  return value._id || value.id || "";
}

function getName(value) {
  if (!value) return "";

  if (typeof value === "string") return value;

  return (
    value.name ||
    value.displayName ||
    value.companyName ||
    value.customerName ||
    ""
  );
}

function extractArray(response) {
  if (Array.isArray(response)) return response;

  if (Array.isArray(response?.data)) return response.data;

  if (Array.isArray(response?.data?.data)) {
    return response.data.data;
  }

  if (Array.isArray(response?.results)) return response.results;

  return [];
}

function extractOne(response) {
  if (!response) return null;

  if (response?.data?.data) return response.data.data;

  if (response?.data && !Array.isArray(response.data)) {
    return response.data;
  }

  return response;
}

function calculateItem(item) {
  const quantity = Math.max(0, number(item.quantity));
  const unitPrice = Math.max(0, number(item.unitPrice));
  const discountPercent = Math.min(
    100,
    Math.max(0, number(item.discountPercent))
  );
  const taxPercent = Math.max(0, number(item.taxPercent));

  const gross = round(quantity * unitPrice);
  const discountAmount = round((gross * discountPercent) / 100);
  const taxableAmount = round(gross - discountAmount);
  const taxAmount = round((taxableAmount * taxPercent) / 100);
  const lineTotal = round(taxableAmount + taxAmount);

  return {
    ...item,
    quantity,
    unitPrice,
    discountPercent,
    discountAmount,
    taxableAmount,
    taxPercent,
    taxAmount,
    lineTotal,
  };
}

function calculateTotals(items, form) {
  const calculatedItems = items.map(calculateItem);

  const subtotal = round(
    calculatedItems.reduce(
      (sum, item) =>
        sum + number(item.quantity) * number(item.unitPrice),
      0
    )
  );

  const discountAmount = round(
    calculatedItems.reduce(
      (sum, item) => sum + number(item.discountAmount),
      0
    )
  );

  const taxableAmount = round(
    calculatedItems.reduce(
      (sum, item) => sum + number(item.taxableAmount),
      0
    )
  );

  const taxAmount = round(
    calculatedItems.reduce(
      (sum, item) => sum + number(item.taxAmount),
      0
    )
  );

  const shippingAmount = round(form.shippingAmount);
  const otherCharges = round(form.otherCharges);
  const adjustmentAmount = round(form.adjustmentAmount);

  const grandTotal = round(
    taxableAmount +
      taxAmount +
      shippingAmount +
      otherCharges +
      adjustmentAmount
  );

  return {
    items: calculatedItems,
    subtotal,
    discountAmount,
    taxableAmount,
    taxAmount,
    shippingAmount,
    otherCharges,
    adjustmentAmount,
    grandTotal,
  };
}

function normalizeQuotationForForm(quotation) {
  const sourceItems =
    Array.isArray(quotation?.items) && quotation.items.length
      ? quotation.items
      : [{ ...EMPTY_ITEM }];

  return {
    customerId: getId(quotation?.customerId),
    branchId: getId(quotation?.branchId),
    referenceNumber: quotation?.referenceNumber || "",
    quotationDate: quotation?.quotationDate
      ? new Date(quotation.quotationDate).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    validUntil: quotation?.validUntil
      ? new Date(quotation.validUntil).toISOString().slice(0, 10)
      : "",
    items: sourceItems.map((item) => ({
      ...EMPTY_ITEM,
      ...item,
      productId: getId(item.productId),
      quantity: number(item.quantity) || 1,
      unitPrice: number(item.unitPrice),
      discountPercent: number(item.discountPercent),
      taxPercent: number(item.taxPercent),
    })),
    shippingAmount: number(quotation?.shippingAmount),
    otherCharges: number(quotation?.otherCharges),
    adjustmentAmount: number(quotation?.adjustmentAmount),
    currency: quotation?.currency || "INR",
    billingAddress: {
      ...EMPTY_ADDRESS,
      ...(quotation?.billingAddress || {}),
    },
    shippingAddress: {
      ...EMPTY_ADDRESS,
      ...(quotation?.shippingAddress || {}),
    },
    notes: quotation?.notes || "",
    termsAndConditions: quotation?.termsAndConditions || "",
    customerNotes: quotation?.customerNotes || "",
  };
}

function Toast({ toast, onClose }) {
  if (!toast) return null;

  const typeClasses = {
    success:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    error: "border-red-500/30 bg-red-500/10 text-red-300",
    info: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  };

  return (
    <div className="fixed right-4 top-4 z-[100] w-[calc(100%-2rem)] max-w-sm">
      <div
        className={`flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl ${
          typeClasses[toast.type] || typeClasses.info
        }`}
      >
        <div className="mt-0.5 shrink-0">
          {toast.type === "success" ? (
            <CheckIcon />
          ) : toast.type === "error" ? (
            <AlertIcon />
          ) : (
            <InfoIcon />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{toast.title}</p>
          <p className="mt-0.5 text-xs opacity-80">{toast.message}</p>
        </div>

        <button
          onClick={onClose}
          className="rounded-lg p-1 opacity-60 transition hover:bg-white/10 hover:opacity-100"
        >
          <CloseIcon size={15} />
        </button>
      </div>
    </div>
  );
}

function ConfirmDialog({
  dialog,
  onCancel,
  onConfirm,
  loading,
}) {
  if (!dialog) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#111318] shadow-2xl">
        <div className="border-b border-white/10 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-300">
              <AlertIcon />
            </div>

            <div>
              <h3 className="text-base font-semibold text-white">
                {dialog.title}
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Please confirm this action.
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          <p className="text-sm leading-6 text-slate-300">
            {dialog.message}
          </p>
        </div>

        <div className="flex justify-end gap-3 border-t border-white/10 bg-white/[0.02] px-6 py-4">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            disabled={loading}
            className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Processing..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
  wide = false,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/70 p-3 backdrop-blur-md sm:p-5">
      <div className="flex min-h-full items-center justify-center py-4">
        <div
          className={`w-full overflow-hidden rounded-3xl border border-white/10 bg-[#0d0f13] shadow-2xl ${
            wide ? "max-w-6xl" : "max-w-3xl"
          }`}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#0d0f13]/95 px-5 py-4 backdrop-blur-xl sm:px-6">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-white sm:text-xl">
                {title}
              </h2>

              {subtitle && (
                <p className="mt-1 truncate text-xs text-slate-500">
                  {subtitle}
                </p>
              )}
            </div>

            <button
              onClick={onClose}
              className="ml-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <CloseIcon />
            </button>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  description,
  loading,
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 shadow-xl shadow-black/10 transition duration-300 hover:-translate-y-0.5 hover:border-white/[0.12] hover:bg-white/[0.04] sm:p-5">
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/[0.025] blur-2xl transition group-hover:bg-white/[0.05]" />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            {label}
          </p>

          {loading ? (
            <div className="mt-3 h-7 w-20 animate-pulse rounded-lg bg-white/10" />
          ) : (
            <p className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {value}
            </p>
          )}

          {description && (
            <p className="mt-1 text-xs text-slate-600">
              {description}
            </p>
          )}
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.045] text-slate-300">
          {icon}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const config =
    STATUS_CONFIG[status] || STATUS_CONFIG.draft;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${config.className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {config.label}
    </span>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  disabled,
  className = "",
}) {
  return (
    <label className={`block ${className}`}>
      {label && (
        <span className="mb-1.5 block text-xs font-medium text-slate-400">
          {label}
          {required && (
            <span className="ml-1 text-red-400">*</span>
          )}
        </span>
      )}

      <input
        type={type}
        value={value ?? ""}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.035] px-3 text-sm text-white outline-none transition placeholder:text-slate-600 hover:border-white/15 focus:border-white/25 focus:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-50"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  children,
  required,
  disabled,
  className = "",
}) {
  return (
    <label className={`block ${className}`}>
      {label && (
        <span className="mb-1.5 block text-xs font-medium text-slate-400">
          {label}
          {required && (
            <span className="ml-1 text-red-400">*</span>
          )}
        </span>
      )}

      <select
        value={value ?? ""}
        onChange={onChange}
        disabled={disabled}
        className="h-10 w-full rounded-xl border border-white/10 bg-[#15181e] px-3 text-sm text-white outline-none transition hover:border-white/15 focus:border-white/25 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {children}
      </select>
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-xs font-medium text-slate-400">
          {label}
        </span>
      )}

      <textarea
        value={value ?? ""}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        className="w-full resize-y rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 hover:border-white/15 focus:border-white/25 focus:bg-white/[0.05]"
      />
    </label>
  );
}

function SectionTitle({ icon, title, description }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300">
        {icon}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-white">
          {title}
        </h3>

        {description && (
          <p className="mt-0.5 text-xs text-slate-600">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

function QuotationForm({
  form,
  setForm,
  customers,
  products,
  branches,
  onSubmit,
  onClose,
  submitting,
  editing,
}) {
  const [sameAddress, setSameAddress] = useState(false);

  const totals = useMemo(
    () => calculateTotals(form.items, form),
    [form.items, form.shippingAmount, form.otherCharges, form.adjustmentAmount]
  );

  const selectedCustomer = useMemo(
    () =>
      customers.find(
        (customer) => getId(customer) === form.customerId
      ),
    [customers, form.customerId]
  );

  useEffect(() => {
    if (!form.customerId || !selectedCustomer) return;

    const customerBilling =
      selectedCustomer.billingAddress ||
      selectedCustomer.address ||
      selectedCustomer.billing ||
      null;

    const customerShipping =
      selectedCustomer.shippingAddress ||
      selectedCustomer.address ||
      selectedCustomer.shipping ||
      null;

    if (customerBilling) {
      setForm((previous) => ({
        ...previous,
        billingAddress: {
          ...EMPTY_ADDRESS,
          ...customerBilling,
        },
        shippingAddress: {
          ...EMPTY_ADDRESS,
          ...(customerShipping || customerBilling),
        },
      }));
    }
  }, [form.customerId]);

  const updateForm = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const updateAddress = (type, field, value) => {
    setForm((previous) => ({
      ...previous,
      [type]: {
        ...previous[type],
        [field]: value,
      },
    }));
  };

  const updateItem = (index, field, value) => {
    setForm((previous) => {
      const items = [...previous.items];

      items[index] = {
        ...items[index],
        [field]: value,
      };

      return {
        ...previous,
        items,
      };
    });
  };

  const selectProduct = (index, productId) => {
    const product = products.find(
      (item) => getId(item) === productId
    );

    setForm((previous) => {
      const items = [...previous.items];

      items[index] = {
        ...items[index],
        productId,
        productCode:
          product?.productCode ||
          product?.code ||
          "",
        sku: product?.sku || "",
        productName:
          product?.displayName ||
          product?.name ||
          "",
        description:
          product?.description ||
          "",
        unit:
          product?.unit ||
          product?.uom ||
          "PCS",
        unitPrice:
          number(
            product?.sellingPrice ??
              product?.salePrice ??
              product?.price
          ),
        taxPercent:
          number(
            product?.gstRate ??
              product?.taxRate ??
              product?.taxPercent
          ),
      };

      return {
        ...previous,
        items,
      };
    });
  };

  const addItem = () => {
    setForm((previous) => ({
      ...previous,
      items: [
        ...previous.items,
        {
          ...EMPTY_ITEM,
        },
      ],
    }));
  };

  const removeItem = (index) => {
    setForm((previous) => {
      if (previous.items.length === 1) {
        return previous;
      }

      return {
        ...previous,
        items: previous.items.filter(
          (_, itemIndex) => itemIndex !== index
        ),
      };
    });
  };

  const copyBillingToShipping = () => {
    setForm((previous) => ({
      ...previous,
      shippingAddress: {
        ...previous.billingAddress,
      },
    }));

    setSameAddress(true);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!form.customerId) {
      return;
    }

    if (!form.validUntil) {
      return;
    }

    if (!form.items.length) {
      return;
    }

    const validItems = form.items.filter(
      (item) =>
        item.productId &&
        number(item.quantity) > 0
    );

    if (!validItems.length) {
      return;
    }

    onSubmit({
      ...form,
      items: validItems.map(calculateItem),
      ...totals,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="max-h-[calc(100vh-150px)] overflow-y-auto">
        <div className="space-y-6 p-4 sm:p-6">
          <section>
            <SectionTitle
              icon={<FileIcon />}
              title="Quotation Details"
              description="Basic quotation and customer information"
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Select
                label="Customer"
                required
                value={form.customerId}
                onChange={(event) =>
                  updateForm(
                    "customerId",
                    event.target.value
                  )
                }
              >
                <option value="">Select customer</option>

                {customers.map((customer) => (
                  <option
                    key={getId(customer)}
                    value={getId(customer)}
                  >
                    {getName(customer) ||
                      customer.email ||
                      "Unnamed Customer"}
                  </option>
                ))}
              </Select>

              <Select
                label="Branch"
                value={form.branchId}
                onChange={(event) =>
                  updateForm(
                    "branchId",
                    event.target.value
                  )
                }
              >
                <option value="">Select branch</option>

                {branches.map((branch) => (
                  <option
                    key={getId(branch)}
                    value={getId(branch)}
                  >
                    {getName(branch) ||
                      branch.code ||
                      "Unnamed Branch"}
                  </option>
                ))}
              </Select>

              <Input
                label="Reference Number"
                value={form.referenceNumber}
                onChange={(event) =>
                  updateForm(
                    "referenceNumber",
                    event.target.value
                  )
                }
                placeholder="REQ-2026-001"
              />

              <Select
                label="Currency"
                value={form.currency}
                onChange={(event) =>
                  updateForm(
                    "currency",
                    event.target.value
                  )
                }
              >
                <option value="INR">INR — Indian Rupee</option>
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — Pound</option>
              </Select>

              <Input
                label="Quotation Date"
                type="date"
                value={form.quotationDate}
                onChange={(event) =>
                  updateForm(
                    "quotationDate",
                    event.target.value
                  )
                }
              />

              <Input
                label="Valid Until"
                required
                type="date"
                value={form.validUntil}
                onChange={(event) =>
                  updateForm(
                    "validUntil",
                    event.target.value
                  )
                }
              />
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <SectionTitle
                icon={<BoxIcon />}
                title="Items"
                description="Products and pricing"
              />

              <button
                type="button"
                onClick={addItem}
                className="flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
              >
                <PlusIcon size={14} />
                Add Item
              </button>
            </div>

            <div className="space-y-3">
              {form.items.map((item, index) => {
                const calculated = calculateItem(item);

                return (
                  <div
                    key={index}
                    className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3 sm:p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Item {index + 1}
                      </span>

                      {form.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            removeItem(index)
                          }
                          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-red-500/10 hover:text-red-400"
                        >
                          <TrashIcon size={15} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
                      <Select
                        label="Product"
                        required
                        value={item.productId}
                        onChange={(event) =>
                          selectProduct(
                            index,
                            event.target.value
                          )
                        }
                        className="lg:col-span-4"
                      >
                        <option value="">
                          Select product
                        </option>

                        {products.map((product) => (
                          <option
                            key={getId(product)}
                            value={getId(product)}
                          >
                            {product.productCode
                              ? `${product.productCode} — `
                              : ""}
                            {getName(product) ||
                              "Unnamed Product"}
                          </option>
                        ))}
                      </Select>

                      <Input
                        label="Quantity"
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(
                            index,
                            "quantity",
                            event.target.value
                          )
                        }
                        className="lg:col-span-2"
                      />

                      <Input
                        label="Unit Price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(event) =>
                          updateItem(
                            index,
                            "unitPrice",
                            event.target.value
                          )
                        }
                        className="lg:col-span-2"
                      />

                      <Input
                        label="Discount %"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={item.discountPercent}
                        onChange={(event) =>
                          updateItem(
                            index,
                            "discountPercent",
                            event.target.value
                          )
                        }
                        className="lg:col-span-2"
                      />

                      <Input
                        label="Tax %"
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.taxPercent}
                        onChange={(event) =>
                          updateItem(
                            index,
                            "taxPercent",
                            event.target.value
                          )
                        }
                        className="lg:col-span-2"
                      />
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5">
                        <p className="text-[10px] uppercase tracking-wider text-slate-600">
                          Discount
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-300">
                          {money(
                            calculated.discountAmount,
                            form.currency
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5">
                        <p className="text-[10px] uppercase tracking-wider text-slate-600">
                          Taxable
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-300">
                          {money(
                            calculated.taxableAmount,
                            form.currency
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5">
                        <p className="text-[10px] uppercase tracking-wider text-slate-600">
                          Tax
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-300">
                          {money(
                            calculated.taxAmount,
                            form.currency
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/[0.06] bg-white/[0.04] px-3 py-2.5">
                        <p className="text-[10px] uppercase tracking-wider text-slate-500">
                          Line Total
                        </p>
                        <p className="mt-1 text-sm font-bold text-white">
                          {money(
                            calculated.lineTotal,
                            form.currency
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <Input
                        label="Description"
                        value={item.description}
                        onChange={(event) =>
                          updateItem(
                            index,
                            "description",
                            event.target.value
                          )
                        }
                        placeholder="Optional item description"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <SectionTitle
              icon={<CalculatorIcon />}
              title="Charges & Totals"
              description="Additional charges and final quotation value"
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input
                label="Shipping Amount"
                type="number"
                min="0"
                step="0.01"
                value={form.shippingAmount}
                onChange={(event) =>
                  updateForm(
                    "shippingAmount",
                    event.target.value
                  )
                }
              />

              <Input
                label="Other Charges"
                type="number"
                min="0"
                step="0.01"
                value={form.otherCharges}
                onChange={(event) =>
                  updateForm(
                    "otherCharges",
                    event.target.value
                  )
                }
              />

              <Input
                label="Adjustment"
                type="number"
                step="0.01"
                value={form.adjustmentAmount}
                onChange={(event) =>
                  updateForm(
                    "adjustmentAmount",
                    event.target.value
                  )
                }
              />
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.015] p-4 sm:p-5">
              <div className="ml-auto w-full max-w-md space-y-2.5">
                <TotalRow
                  label="Subtotal"
                  value={totals.subtotal}
                  currency={form.currency}
                />

                <TotalRow
                  label="Discount"
                  value={-totals.discountAmount}
                  currency={form.currency}
                  muted
                />

                <TotalRow
                  label="Taxable Amount"
                  value={totals.taxableAmount}
                  currency={form.currency}
                />

                <TotalRow
                  label="Tax"
                  value={totals.taxAmount}
                  currency={form.currency}
                />

                <TotalRow
                  label="Shipping"
                  value={totals.shippingAmount}
                  currency={form.currency}
                />

                <TotalRow
                  label="Other Charges"
                  value={totals.otherCharges}
                  currency={form.currency}
                />

                <TotalRow
                  label="Adjustment"
                  value={totals.adjustmentAmount}
                  currency={form.currency}
                />

                <div className="my-3 border-t border-white/10" />

                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-semibold text-white">
                    Grand Total
                  </span>

                  <span className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                    {money(
                      totals.grandTotal,
                      form.currency
                    )}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section>
            <SectionTitle
              icon={<MapPinIcon />}
              title="Addresses"
              description="Billing and shipping information"
            />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <AddressCard
                title="Billing Address"
                address={form.billingAddress}
                onChange={(field, value) =>
                  updateAddress(
                    "billingAddress",
                    field,
                    value
                  )
                }
              />

              <AddressCard
                title="Shipping Address"
                address={form.shippingAddress}
                onChange={(field, value) =>
                  updateAddress(
                    "shippingAddress",
                    field,
                    value
                  )
                }
              />
            </div>

            <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-slate-400">
              <input
                type="checkbox"
                checked={sameAddress}
                onChange={(event) => {
                  setSameAddress(event.target.checked);

                  if (event.target.checked) {
                    copyBillingToShipping();
                  }
                }}
                className="h-4 w-4 rounded border-white/20 bg-white/5 accent-white"
              />
              Same as billing address
            </label>
          </section>

          <section>
            <SectionTitle
              icon={<NoteIcon />}
              title="Notes & Terms"
              description="Additional quotation information"
            />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Textarea
                label="Internal Notes"
                value={form.notes}
                onChange={(event) =>
                  updateForm(
                    "notes",
                    event.target.value
                  )
                }
                placeholder="Internal notes..."
              />

              <Textarea
                label="Customer Notes"
                value={form.customerNotes}
                onChange={(event) =>
                  updateForm(
                    "customerNotes",
                    event.target.value
                  )
                }
                placeholder="Notes visible to customer..."
              />

              <div className="lg:col-span-2">
                <Textarea
                  label="Terms & Conditions"
                  value={form.termsAndConditions}
                  onChange={(event) =>
                    updateForm(
                      "termsAndConditions",
                      event.target.value
                    )
                  }
                  placeholder="Payment terms, delivery terms, validity, warranty, etc."
                  rows={4}
                />
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-white/10 bg-[#0d0f13]/95 px-4 py-4 backdrop-blur-xl sm:flex-row sm:justify-end sm:px-6">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-white px-6 py-2.5 text-sm font-bold text-black shadow-lg shadow-white/5 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting
            ? editing
              ? "Updating..."
              : "Creating..."
            : editing
            ? "Update Quotation"
            : "Create Quotation"}
        </button>
      </div>
    </form>
  );
}

function AddressCard({
  title,
  address,
  onChange,
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </h4>

      <div className="space-y-3">
        <Input
          label="Address Line 1"
          value={address.line1}
          onChange={(event) =>
            onChange("line1", event.target.value)
          }
          placeholder="Street / building"
        />

        <Input
          label="Address Line 2"
          value={address.line2}
          onChange={(event) =>
            onChange("line2", event.target.value)
          }
          placeholder="Area / landmark"
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="City"
            value={address.city}
            onChange={(event) =>
              onChange("city", event.target.value)
            }
          />

          <Input
            label="State"
            value={address.state}
            onChange={(event) =>
              onChange("state", event.target.value)
            }
          />

          <Input
            label="Country"
            value={address.country}
            onChange={(event) =>
              onChange("country", event.target.value)
            }
          />

          <Input
            label="Postal Code"
            value={address.postalCode}
            onChange={(event) =>
              onChange(
                "postalCode",
                event.target.value
              )
            }
          />
        </div>
      </div>
    </div>
  );
}

function TotalRow({
  label,
  value,
  currency,
  muted,
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-xs">
      <span className={muted ? "text-slate-600" : "text-slate-500"}>
        {label}
      </span>

      <span
        className={
          muted
            ? "font-medium text-slate-600"
            : "font-semibold text-slate-300"
        }
      >
        {money(value, currency)}
      </span>
    </div>
  );
}

function ViewQuotation({
  quotation,
  onClose,
  onEdit,
  onAction,
  actionLoading,
}) {
  if (!quotation) return null;

  const customer =
    getName(quotation.customerId) ||
    quotation.customerName ||
    "Customer";

  const branch =
    getName(quotation.branchId) ||
    quotation.branchName ||
    "—";

  const currency = quotation.currency || "INR";

  return (
    <Modal
      open={!!quotation}
      title={quotation.quotationNumber || "Quotation"}
      subtitle={`${customer} • ${formatDate(
        quotation.quotationDate
      )}`}
      onClose={onClose}
      wide
    >
      <div className="max-h-[calc(100vh-150px)] overflow-y-auto">
        <div className="space-y-5 p-4 sm:p-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <InfoBox
              label="Quotation"
              value={
                quotation.quotationNumber || "—"
              }
            />

            <InfoBox
              label="Status"
              value={
                <StatusBadge
                  status={quotation.status}
                />
              }
            />

            <InfoBox
              label="Quotation Date"
              value={formatDate(
                quotation.quotationDate
              )}
            />

            <InfoBox
              label="Valid Until"
              value={formatDate(
                quotation.validUntil
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                Customer
              </p>

              <p className="mt-2 text-sm font-semibold text-white">
                {customer}
              </p>

              {quotation.customerId?.email && (
                <p className="mt-1 text-xs text-slate-500">
                  {quotation.customerId.email}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                Branch
              </p>

              <p className="mt-2 text-sm font-semibold text-white">
                {branch}
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                Reference
              </p>

              <p className="mt-2 text-sm font-semibold text-white">
                {quotation.referenceNumber ||
                  "—"}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/[0.08]">
            <div className="border-b border-white/[0.08] bg-white/[0.025] px-4 py-3">
              <h3 className="text-sm font-semibold text-white">
                Quotation Items
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr className="border-b border-white/[0.06] text-left">
                    <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                      Product
                    </th>

                    <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                      Qty
                    </th>

                    <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                      Price
                    </th>

                    <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                      Discount
                    </th>

                    <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                      Tax
                    </th>

                    <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                      Total
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {(quotation.items || []).map(
                    (item, index) => (
                      <tr
                        key={
                          getId(item.productId) ||
                          index
                        }
                        className="border-b border-white/[0.05] last:border-0"
                      >
                        <td className="px-4 py-4">
                          <p className="text-sm font-medium text-white">
                            {item.productName ||
                              getName(item.productId) ||
                              "Product"}
                          </p>

                          <p className="mt-1 text-[11px] text-slate-600">
                            {item.productCode ||
                              item.sku ||
                              ""}
                          </p>

                          {item.description && (
                            <p className="mt-1 max-w-sm text-xs text-slate-500">
                              {item.description}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-4 text-right text-sm text-slate-300">
                          {number(item.quantity)}
                        </td>

                        <td className="px-4 py-4 text-right text-sm text-slate-300">
                          {money(
                            item.unitPrice,
                            currency
                          )}
                        </td>

                        <td className="px-4 py-4 text-right text-sm text-slate-400">
                          {number(
                            item.discountPercent
                          )}
                          %
                        </td>

                        <td className="px-4 py-4 text-right text-sm text-slate-400">
                          {money(
                            item.taxAmount,
                            currency
                          )}
                        </td>

                        <td className="px-4 py-4 text-right text-sm font-semibold text-white">
                          {money(
                            item.lineTotal,
                            currency
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              <AddressDisplay
                title="Billing Address"
                address={quotation.billingAddress}
              />

              <AddressDisplay
                title="Shipping Address"
                address={quotation.shippingAddress}
              />
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
              <h3 className="mb-4 text-sm font-semibold text-white">
                Summary
              </h3>

              <div className="space-y-3">
                <TotalRow
                  label="Subtotal"
                  value={quotation.subtotal}
                  currency={currency}
                />

                <TotalRow
                  label="Discount"
                  value={-number(
                    quotation.discountAmount
                  )}
                  currency={currency}
                />

                <TotalRow
                  label="Taxable Amount"
                  value={quotation.taxableAmount}
                  currency={currency}
                />

                <TotalRow
                  label="Tax"
                  value={quotation.taxAmount}
                  currency={currency}
                />

                <TotalRow
                  label="Shipping"
                  value={quotation.shippingAmount}
                  currency={currency}
                />

                <TotalRow
                  label="Other Charges"
                  value={quotation.otherCharges}
                  currency={currency}
                />

                <TotalRow
                  label="Adjustment"
                  value={quotation.adjustmentAmount}
                  currency={currency}
                />

                <div className="border-t border-white/10 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">
                      Grand Total
                    </span>

                    <span className="text-2xl font-bold text-white">
                      {money(
                        quotation.grandTotal,
                        currency
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {(quotation.notes ||
            quotation.customerNotes ||
            quotation.termsAndConditions) && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {quotation.notes && (
                <NoteBox
                  title="Internal Notes"
                  value={quotation.notes}
                />
              )}

              {quotation.customerNotes && (
                <NoteBox
                  title="Customer Notes"
                  value={
                    quotation.customerNotes
                  }
                />
              )}

              {quotation.termsAndConditions && (
                <NoteBox
                  title="Terms & Conditions"
                  value={
                    quotation.termsAndConditions
                  }
                />
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t border-white/10 bg-[#0d0f13]/95 px-4 py-4 backdrop-blur-xl sm:px-6">
        {quotation.status === "draft" && (
          <>
            <ActionButton
              label="Edit"
              icon={<EditIcon size={14} />}
              onClick={onEdit}
            />

            <ActionButton
              label="Send"
              icon={<SendIcon size={14} />}
              onClick={() =>
                onAction("send", quotation)
              }
              loading={
                actionLoading ===
                `${quotation._id}-send`
              }
            />
          </>
        )}

        {quotation.status === "sent" && (
          <>
            <ActionButton
              label="Accept"
              icon={<CheckIcon size={14} />}
              onClick={() =>
                onAction("accept", quotation)
              }
              loading={
                actionLoading ===
                `${quotation._id}-accept`
              }
            />

            <ActionButton
              label="Reject"
              icon={<XIcon size={14} />}
              onClick={() =>
                onAction("reject", quotation)
              }
              loading={
                actionLoading ===
                `${quotation._id}-reject`
              }
            />

            <ActionButton
              label="Expire"
              icon={<ClockIcon size={14} />}
              onClick={() =>
                onAction("expire", quotation)
              }
              loading={
                actionLoading ===
                `${quotation._id}-expire`
              }
            />
          </>
        )}

        {quotation.status !== "cancelled" &&
          quotation.status !== "accepted" &&
          quotation.status !== "rejected" &&
          quotation.status !== "expired" && (
            <ActionButton
              label="Cancel"
              icon={<BanIcon size={14} />}
              onClick={() =>
                onAction("cancel", quotation)
              }
              loading={
                actionLoading ===
                `${quotation._id}-cancel`
              }
            />
          )}

        <ActionButton
          label="Duplicate"
          icon={<CopyIcon size={14} />}
          onClick={() =>
            onAction("duplicate", quotation)
          }
          loading={
            actionLoading ===
            `${quotation._id}-duplicate`
          }
        />

        <button
          onClick={onClose}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}

function AddressDisplay({ title, address }) {
  if (!address) return null;

  const lines = [
    address.line1,
    address.line2,
    [address.city, address.state]
      .filter(Boolean)
      .join(", "),
    [address.country, address.postalCode]
      .filter(Boolean)
      .join(" - "),
  ].filter(Boolean);

  if (!lines.length) return null;

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
        {title}
      </p>

      <div className="mt-2 space-y-0.5 text-xs leading-5 text-slate-400">
        {lines.map((line, index) => (
          <p key={index}>{line}</p>
        ))}
      </div>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3 sm:p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
        {label}
      </p>

      <div className="mt-2 truncate text-sm font-semibold text-white">
        {value}
      </div>
    </div>
  );
}

function NoteBox({ title, value }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
        {title}
      </p>

      <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-400">
        {value}
      </p>
    </div>
  );
}

function ActionButton({
  label,
  icon,
  onClick,
  loading,
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? (
        <Spinner size={14} />
      ) : (
        icon
      )}
      {loading ? "Processing..." : label}
    </button>
  );
}

function RowActions({
  quotation,
  onView,
  onEdit,
  onAction,
  onDelete,
  onRestore,
  actionLoading,
}) {
  const [open, setOpen] = useState(false);

  const canEdit =
    quotation.status === "draft";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white"
      >
        <MoreIcon />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />

          <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-2xl border border-white/10 bg-[#15181e] p-1.5 shadow-2xl">
            <MenuButton
              icon={<EyeIcon size={14} />}
              label="View quotation"
              onClick={() => {
                setOpen(false);
                onView(quotation);
              }}
            />

            {canEdit && (
              <MenuButton
                icon={<EditIcon size={14} />}
                label="Edit"
                onClick={() => {
                  setOpen(false);
                  onEdit(quotation);
                }}
              />
            )}

            {quotation.status === "draft" && (
              <MenuButton
                icon={<SendIcon size={14} />}
                label="Send"
                onClick={() => {
                  setOpen(false);
                  onAction(
                    "send",
                    quotation
                  );
                }}
                loading={
                  actionLoading ===
                  `${quotation._id}-send`
                }
              />
            )}

            {quotation.status === "sent" && (
              <>
                <MenuButton
                  icon={<CheckIcon size={14} />}
                  label="Accept"
                  onClick={() => {
                    setOpen(false);
                    onAction(
                      "accept",
                      quotation
                    );
                  }}
                />

                <MenuButton
                  icon={<XIcon size={14} />}
                  label="Reject"
                  onClick={() => {
                    setOpen(false);
                    onAction(
                      "reject",
                      quotation
                    );
                  }}
                />
              </>
            )}

            <MenuButton
              icon={<CopyIcon size={14} />}
              label="Duplicate"
              onClick={() => {
                setOpen(false);
                onAction(
                  "duplicate",
                  quotation
                );
              }}
            />

            {quotation.status !==
              "cancelled" &&
              quotation.status !==
                "accepted" &&
              quotation.status !==
                "rejected" &&
              quotation.status !==
                "expired" && (
                <MenuButton
                  icon={<BanIcon size={14} />}
                  label="Cancel"
                  onClick={() => {
                    setOpen(false);
                    onAction(
                      "cancel",
                      quotation
                    );
                  }}
                />
              )}

            {quotation.deletedAt ? (
              <MenuButton
                icon={<RestoreIcon size={14} />}
                label="Restore"
                onClick={() => {
                  setOpen(false);
                  onRestore(quotation);
                }}
              />
            ) : (
              <MenuButton
                danger
                icon={<TrashIcon size={14} />}
                label="Delete"
                onClick={() => {
                  setOpen(false);
                  onDelete(quotation);
                }}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

function MenuButton({
  icon,
  label,
  onClick,
  danger,
  loading,
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-medium transition ${
        danger
          ? "text-red-400 hover:bg-red-500/10"
          : "text-slate-300 hover:bg-white/10 hover:text-white"
      } disabled:opacity-50`}
    >
      {loading ? <Spinner size={14} /> : icon}
      {loading ? "Processing..." : label}
    </button>
  );
}

export default function Quotation() {
  const [quotations, setQuotations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);

  const [loading, setLoading] = useState(true);
  const [referenceLoading, setReferenceLoading] =
    useState(true);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] =
    useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] =
    useState(null);

  const [form, setForm] = useState({
    ...EMPTY_FORM,
    items: [{ ...EMPTY_ITEM }],
  });

  const [viewQuotation, setViewQuotation] =
    useState(null);

  const [submitting, setSubmitting] =
    useState(false);

  const [actionLoading, setActionLoading] =
    useState("");

  const [toast, setToast] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [dialogLoading, setDialogLoading] =
    useState(false);

  const showToast = useCallback(
    (type, title, message) => {
      setToast({
        type,
        title,
        message,
      });

      window.setTimeout(() => {
        setToast(null);
      }, 4000);
    },
    []
  );

  const fetchReferenceData = useCallback(
    async () => {
      setReferenceLoading(true);

      try {
        const [customerResponse, productResponse, branchResponse] =
          await Promise.all([
            apiRequest(CUSTOMERS_API),
            apiRequest(PRODUCTS_API),
            apiRequest(BRANCHES_API),
          ]);

        setCustomers(
          extractArray(customerResponse)
        );

        setProducts(
          extractArray(productResponse)
        );

        setBranches(
          extractArray(branchResponse)
        );
      } catch (err) {
        showToast(
          "error",
          "Reference data error",
          err.message ||
            "Unable to load customers, products or branches."
        );
      } finally {
        setReferenceLoading(false);
      }
    },
    [showToast]
  );

  const fetchQuotations = useCallback(
    async (showLoader = true) => {
      if (showLoader) {
        setLoading(true);
      }

      setError("");

      try {
        const params = new URLSearchParams();

        params.set("page", String(page));
        params.set("limit", String(limit));

        if (search.trim()) {
          params.set(
            "search",
            search.trim()
          );
        }

        if (status) {
          params.set("status", status);
        }

        if (dateFrom) {
          params.set("dateFrom", dateFrom);
        }

        if (dateTo) {
          params.set("dateTo", dateTo);
        }

        const response = await apiRequest(
          `${QUOTATIONS_API}?${params.toString()}`
        );

        const data = extractArray(response);

        setQuotations(data);

        const responseTotal =
          response?.total ??
          response?.pagination?.total ??
          response?.data?.total ??
          response?.meta?.total;

        setTotal(
          Number.isFinite(Number(responseTotal))
            ? Number(responseTotal)
            : data.length
        );
      } catch (err) {
        setError(
          err.message ||
            "Unable to load quotations."
        );
      } finally {
        setLoading(false);
      }
    },
    [
      page,
      limit,
      search,
      status,
      dateFrom,
      dateTo,
    ]
  );

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);

    try {
      const response = await apiRequest(
        `${QUOTATIONS_API}/summary`
      );

      setSummary(
        extractOne(response) || {}
      );
    } catch {
      setSummary({});
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReferenceData();
  }, [fetchReferenceData]);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const openCreate = () => {
    setEditingQuotation(null);

    setForm({
      ...EMPTY_FORM,
      quotationDate: new Date()
        .toISOString()
        .slice(0, 10),
      validUntil: "",
      items: [{ ...EMPTY_ITEM }],
    });

    setFormOpen(true);
  };

  const openEdit = (quotation) => {
    setViewQuotation(null);

    setEditingQuotation(quotation);

    setForm(
      normalizeQuotationForForm(
        quotation
      )
    );

    setFormOpen(true);
  };

  const closeForm = () => {
    if (submitting) return;

    setFormOpen(false);
    setEditingQuotation(null);
  };

  const submitQuotation = async (payload) => {
    setSubmitting(true);

    try {
      if (editingQuotation) {
        const response = await apiRequest(
          `${QUOTATIONS_API}/${editingQuotation._id}`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          }
        );

        const updated =
          extractOne(response);

        showToast(
          "success",
          "Quotation updated",
          `${
            updated?.quotationNumber ||
            editingQuotation.quotationNumber
          } was updated successfully.`
        );
      } else {
        const response = await apiRequest(
          QUOTATIONS_API,
          {
            method: "POST",
            body: JSON.stringify(payload),
          }
        );

        const created =
          extractOne(response);

        showToast(
          "success",
          "Quotation created",
          `${
            created?.quotationNumber ||
            "New quotation"
          } was created successfully.`
        );
      }

      setFormOpen(false);
      setEditingQuotation(null);

      await Promise.all([
        fetchQuotations(false),
        fetchSummary(),
      ]);
    } catch (err) {
      showToast(
        "error",
        editingQuotation
          ? "Update failed"
          : "Creation failed",
        err.message ||
          "Unable to save quotation."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const performAction = async (
    action,
    quotation
  ) => {
    const id = quotation?._id;

    if (!id) return;

    if (
      ["accept", "reject", "cancel", "expire"].includes(
        action
      )
    ) {
      const actionLabels = {
        accept: "accept",
        reject: "reject",
        cancel: "cancel",
        expire: "expire",
      };

      setDialog({
        title: `${actionLabels[action]} quotation?`,
        message: `Are you sure you want to ${actionLabels[action]} ${quotation.quotationNumber}?`,
        action,
        quotation,
      });

      return;
    }

    await executeAction(
      action,
      quotation
    );
  };

  const executeAction = async (
    action,
    quotation
  ) => {
    const id = quotation?._id;

    if (!id) return;

    const key = `${id}-${action}`;

    setActionLoading(key);

    try {
      let url = "";
      let method = "POST";
      let body;

      if (action === "send") {
        url = `${QUOTATIONS_API}/${id}/send`;
      }

      if (action === "accept") {
        url = `${QUOTATIONS_API}/${id}/accept`;
      }

      if (action === "reject") {
        url = `${QUOTATIONS_API}/${id}/reject`;

        body = JSON.stringify({
          reason:
            "Quotation rejected from ERP.",
        });
      }

      if (action === "expire") {
        url = `${QUOTATIONS_API}/${id}/expire`;
      }

      if (action === "cancel") {
        url = `${QUOTATIONS_API}/${id}/cancel`;
      }

      if (action === "duplicate") {
        url = `${QUOTATIONS_API}/${id}/duplicate`;
      }

      if (!url) return;

      const response = await apiRequest(url, {
        method,
        ...(body ? { body } : {}),
      });

      const result =
        extractOne(response);

      const messages = {
        send: "Quotation sent successfully.",
        accept:
          "Quotation accepted successfully.",
        reject:
          "Quotation rejected successfully.",
        expire:
          "Quotation expired successfully.",
        cancel:
          "Quotation cancelled successfully.",
        duplicate:
          "Quotation duplicated successfully.",
      };

      showToast(
        "success",
        "Action completed",
        messages[action]
      );

      if (action === "duplicate") {
        setViewQuotation(null);
      }

      if (
        viewQuotation &&
        viewQuotation._id === id
      ) {
        setViewQuotation(
          result || {
            ...viewQuotation,
            status:
              action === "send"
                ? "sent"
                : action === "accept"
                ? "accepted"
                : action === "reject"
                ? "rejected"
                : action === "expire"
                ? "expired"
                : action === "cancel"
                ? "cancelled"
                : viewQuotation.status,
          }
        );
      }

      await Promise.all([
        fetchQuotations(false),
        fetchSummary(),
      ]);
    } catch (err) {
      showToast(
        "error",
        "Action failed",
        err.message ||
          "Unable to complete the action."
      );
    } finally {
      setActionLoading("");
    }
  };

  const confirmDialogAction = async () => {
    if (!dialog) return;

    setDialogLoading(true);

    try {
      await executeAction(
        dialog.action,
        dialog.quotation
      );

      setDialog(null);
    } finally {
      setDialogLoading(false);
    }
  };

  const deleteQuotation = (quotation) => {
    setDialog({
      title: "Delete quotation?",
      message: `This will soft-delete ${quotation.quotationNumber}. You can restore it later.`,
      action: "delete",
      quotation,
    });
  };

  const restoreQuotation = (quotation) => {
    setDialog({
      title: "Restore quotation?",
      message: `Restore ${quotation.quotationNumber} and make it active again?`,
      action: "restore",
      quotation,
    });
  };

  const executeDeleteOrRestore =
    async () => {
      if (!dialog) return;

      const quotation =
        dialog.quotation;

      setDialogLoading(true);

      try {
        if (dialog.action === "delete") {
          await apiRequest(
            `${QUOTATIONS_API}/${quotation._id}`,
            {
              method: "DELETE",
            }
          );

          showToast(
            "success",
            "Quotation deleted",
            `${quotation.quotationNumber} was moved to deleted records.`
          );
        }

        if (dialog.action === "restore") {
          await apiRequest(
            `${QUOTATIONS_API}/${quotation._id}/restore`,
            {
              method: "PATCH",
            }
          );

          showToast(
            "success",
            "Quotation restored",
            `${quotation.quotationNumber} was restored successfully.`
          );
        }

        setDialog(null);

        await Promise.all([
          fetchQuotations(false),
          fetchSummary(),
        ]);
      } catch (err) {
        showToast(
          "error",
          "Operation failed",
          err.message ||
            "Unable to complete the operation."
        );
      } finally {
        setDialogLoading(false);
      }
    };

  useEffect(() => {
    if (
      dialog &&
      ["delete", "restore"].includes(
        dialog.action
      )
    ) {
      return;
    }
  }, [dialog]);

  const handleDialogConfirm =
    dialog?.action === "delete" ||
    dialog?.action === "restore"
      ? executeDeleteOrRestore
      : confirmDialogAction;

  const pages = Math.max(
    1,
    Math.ceil(total / limit)
  );

  const stats = useMemo(() => {
    const source =
      summary?.data || summary || {};

    const find = (...keys) => {
      for (const key of keys) {
        if (
          source[key] !== undefined &&
          source[key] !== null
        ) {
          return source[key];
        }
      }

      return 0;
    };

    return {
      total: find(
        "total",
        "totalQuotations",
        "count"
      ),
      draft: find(
        "draft",
        "draftCount"
      ),
      sent: find(
        "sent",
        "sentCount"
      ),
      accepted: find(
        "accepted",
        "acceptedCount"
      ),
      rejected: find(
        "rejected",
        "rejectedCount"
      ),
      expired: find(
        "expired",
        "expiredCount"
      ),
      value: find(
        "grandTotal",
        "totalValue",
        "totalAmount"
      ),
    };
  }, [summary]);

  const clearFilters = () => {
    setSearch("");
    setStatus("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const hasFilters =
    search ||
    status ||
    dateFrom ||
    dateTo;

  return (
    <div className="min-h-screen w-full bg-[#080a0d] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-white/[0.025] blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-white/[0.018] blur-3xl" />
      </div>

      <Toast
        toast={toast}
        onClose={() => setToast(null)}
      />

      <ConfirmDialog
        dialog={dialog}
        onCancel={() =>
          dialogLoading
            ? null
            : setDialog(null)
        }
        onConfirm={handleDialogConfirm}
        loading={dialogLoading}
      />

      <div className="relative w-full px-3 py-4 sm:px-5 lg:px-7 xl:px-8">
        <header className="mb-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                <span>Sales</span>
                <span className="text-slate-800">
                  /
                </span>
                <span className="text-slate-500">
                  Quotations
                </span>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045] shadow-lg shadow-black/20">
                  <FileIcon size={20} />
                </div>

                <div className="min-w-0">
                  <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    Quotations
                  </h1>

                  <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500 sm:text-sm">
                    Create, manage and track customer quotations from one workspace.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  fetchQuotations();
                  fetchSummary();
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                <RefreshIcon
                  size={14}
                  spinning={loading}
                />
                Refresh
              </button>

              <button
                onClick={openCreate}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-black shadow-xl shadow-white/[0.04] transition hover:bg-slate-200"
              >
                <PlusIcon size={15} />
                New Quotation
              </button>
            </div>
          </div>
        </header>

        <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Quotations"
            value={stats.total}
            icon={<FileIcon size={18} />}
            description="All quotation records"
            loading={summaryLoading}
          />

          <StatCard
            label="Draft"
            value={stats.draft}
            icon={<EditIcon size={18} />}
            description="Not yet sent"
            loading={summaryLoading}
          />

          <StatCard
            label="Sent"
            value={stats.sent}
            icon={<SendIcon size={18} />}
            description="Awaiting customer response"
            loading={summaryLoading}
          />

          <StatCard
            label="Accepted"
            value={stats.accepted}
            icon={<CheckIcon size={18} />}
            description="Customer accepted"
            loading={summaryLoading}
          />
        </section>

        <section className="mb-5 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] shadow-2xl shadow-black/10">
          <div className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <SearchIcon
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
              />

              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search quotation number, reference..."
                className="h-10 w-full rounded-xl border border-white/10 bg-black/20 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-white/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex">
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-xl border border-white/10 bg-[#15181e] px-3 text-xs text-slate-300 outline-none focus:border-white/20"
              >
                <option value="">
                  All Statuses
                </option>

                {Object.entries(
                  STATUS_CONFIG
                ).map(([key, config]) => (
                  <option
                    key={key}
                    value={key}
                  >
                    {config.label}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={dateFrom}
                onChange={(event) => {
                  setDateFrom(
                    event.target.value
                  );
                  setPage(1);
                }}
                className="h-10 rounded-xl border border-white/10 bg-[#15181e] px-3 text-xs text-slate-300 outline-none focus:border-white/20"
              />

              <input
                type="date"
                value={dateTo}
                onChange={(event) => {
                  setDateTo(
                    event.target.value
                  );
                  setPage(1);
                }}
                className="h-10 rounded-xl border border-white/10 bg-[#15181e] px-3 text-xs text-slate-300 outline-none focus:border-white/20"
              />

              <button
                onClick={clearFilters}
                disabled={!hasFilters}
                className="h-10 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-semibold text-slate-400 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                Clear
              </button>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] shadow-2xl shadow-black/10">
          <div className="flex flex-col gap-3 border-b border-white/[0.07] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 className="text-sm font-semibold text-white">
                Quotation Records
              </h2>

              <p className="mt-1 text-xs text-slate-600">
                {total} record
                {total === 1 ? "" : "s"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-600">
                Rows
              </span>

              <select
                value={limit}
                onChange={(event) => {
                  setLimit(
                    Number(event.target.value)
                  );
                  setPage(1);
                }}
                className="h-8 rounded-lg border border-white/10 bg-[#15181e] px-2 text-xs text-slate-400 outline-none"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {error ? (
            <div className="flex min-h-80 flex-col items-center justify-center px-5 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-400">
                <AlertIcon />
              </div>

              <h3 className="text-sm font-semibold text-white">
                Unable to load quotations
              </h3>

              <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">
                {error}
              </p>

              <button
                onClick={() =>
                  fetchQuotations()
                }
                className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10"
              >
                Try Again
              </button>
            </div>
          ) : loading ? (
            <QuotationTableSkeleton />
          ) : quotations.length === 0 ? (
            <div className="flex min-h-80 flex-col items-center justify-center px-5 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] text-slate-600">
                <FileIcon size={24} />
              </div>

              <h3 className="text-sm font-semibold text-white">
                No quotations found
              </h3>

              <p className="mt-1 max-w-sm text-xs leading-5 text-slate-600">
                Create your first quotation or adjust the current filters.
              </p>

              <button
                onClick={
                  hasFilters
                    ? clearFilters
                    : openCreate
                }
                className="mt-4 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-black hover:bg-slate-200"
              >
                {hasFilters
                  ? "Clear Filters"
                  : "Create Quotation"}
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[950px]">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-white/[0.015]">
                      <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                        Quotation
                      </th>

                      <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                        Customer
                      </th>

                      <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                        Date
                      </th>

                      <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                        Valid Until
                      </th>

                      <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                        Status
                      </th>

                      <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                        Amount
                      </th>

                      <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {quotations.map(
                      (quotation) => (
                        <tr
                          key={quotation._id}
                          className="group border-b border-white/[0.045] transition hover:bg-white/[0.025]"
                        >
                          <td className="px-4 py-4">
                            <button
                              onClick={() =>
                                setViewQuotation(
                                  quotation
                                )
                              }
                              className="text-left"
                            >
                              <p className="text-sm font-semibold text-white transition group-hover:text-slate-200">
                                {quotation.quotationNumber ||
                                  "—"}
                              </p>

                              <p className="mt-1 text-[11px] text-slate-600">
                                {quotation.referenceNumber ||
                                  "No reference"}
                              </p>
                            </button>
                          </td>

                          <td className="px-4 py-4">
                            <p className="max-w-[190px] truncate text-sm font-medium text-slate-300">
                              {getName(
                                quotation.customerId
                              ) ||
                                quotation.customerName ||
                                "Customer"}
                            </p>

                            {quotation.customerId
                              ?.email && (
                              <p className="mt-1 max-w-[190px] truncate text-[11px] text-slate-600">
                                {
                                  quotation
                                    .customerId
                                    .email
                                }
                              </p>
                            )}
                          </td>

                          <td className="px-4 py-4 text-xs text-slate-400">
                            {formatDate(
                              quotation.quotationDate
                            )}
                          </td>

                          <td className="px-4 py-4 text-xs text-slate-400">
                            {formatDate(
                              quotation.validUntil
                            )}
                          </td>

                          <td className="px-4 py-4">
                            <StatusBadge
                              status={
                                quotation.status
                              }
                            />
                          </td>

                          <td className="px-4 py-4 text-right">
                            <p className="text-sm font-semibold text-white">
                              {money(
                                quotation.grandTotal,
                                quotation.currency ||
                                  "INR"
                              )}
                            </p>

                            <p className="mt-1 text-[10px] text-slate-600">
                              {(
                                quotation
                                  .items || []
                              ).length}{" "}
                              item
                              {(
                                quotation
                                  .items || []
                              ).length === 1
                                ? ""
                                : "s"}
                            </p>
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex justify-end">
                              <RowActions
                                quotation={
                                  quotation
                                }
                                onView={
                                  setViewQuotation
                                }
                                onEdit={
                                  openEdit
                                }
                                onAction={
                                  performAction
                                }
                                onDelete={
                                  deleteQuotation
                                }
                                onRestore={
                                  restoreQuotation
                                }
                                actionLoading={
                                  actionLoading
                                }
                              />
                            </div>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-white/[0.07] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <p className="text-xs text-slate-600">
                  Page {page} of {pages}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setPage((value) =>
                        Math.max(1, value - 1)
                      )
                    }
                    disabled={page <= 1}
                    className="flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-semibold text-slate-400 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronLeftIcon size={14} />
                    Previous
                  </button>

                  <button
                    onClick={() =>
                      setPage((value) =>
                        Math.min(
                          pages,
                          value + 1
                        )
                      )
                    }
                    disabled={page >= pages}
                    className="flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-semibold text-slate-400 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    Next
                    <ChevronRightIcon size={14} />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <Modal
        open={formOpen}
        title={
          editingQuotation
            ? "Edit Quotation"
            : "Create New Quotation"
        }
        subtitle={
          editingQuotation
            ? editingQuotation.quotationNumber
            : "Prepare a new customer quotation"
        }
        onClose={closeForm}
        wide
      >
        {referenceLoading ? (
          <div className="flex min-h-[500px] items-center justify-center">
            <div className="text-center">
              <Spinner size={26} />

              <p className="mt-3 text-xs text-slate-600">
                Loading customers, products and branches...
              </p>
            </div>
          </div>
        ) : (
          <QuotationForm
            form={form}
            setForm={setForm}
            customers={customers}
            products={products}
            branches={branches}
            onSubmit={submitQuotation}
            onClose={closeForm}
            submitting={submitting}
            editing={!!editingQuotation}
          />
        )}
      </Modal>

      {viewQuotation && (
        <ViewQuotation
          quotation={viewQuotation}
          onClose={() =>
            setViewQuotation(null)
          }
          onEdit={() =>
            openEdit(viewQuotation)
          }
          onAction={performAction}
          actionLoading={actionLoading}
        />
      )}
    </div>
  );
}

function QuotationTableSkeleton() {
  return (
    <div className="overflow-hidden">
      <div className="space-y-px">
        {Array.from({ length: 7 }).map(
          (_, index) => (
            <div
              key={index}
              className="grid min-w-[950px] grid-cols-7 gap-4 border-b border-white/[0.04] px-4 py-5"
            >
              {Array.from({ length: 7 }).map(
                (_, itemIndex) => (
                  <div
                    key={itemIndex}
                    className="h-4 animate-pulse rounded bg-white/[0.06]"
                  />
                )
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}

function Spinner({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.25"
      />

      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Icon({
  children,
  size = 18,
  className = "",
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

function PlusIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

function FileIcon(props) {
  return (
    <Icon {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8M8 17h6" />
    </Icon>
  );
}

function BoxIcon(props) {
  return (
    <Icon {...props}>
      <path d="m21 8-9-5-9 5 9 5 9-5Z" />
      <path d="m3 8 9 5 9-5M3 16l9 5 9-5M3 8v8M21 8v8M12 13v8" />
    </Icon>
  );
}

function CalculatorIcon(props) {
  return (
    <Icon {...props}>
      <rect
        x="5"
        y="2.5"
        width="14"
        height="19"
        rx="2"
      />
      <path d="M8 6h8M8 10h2M14 10h2M8 14h2M14 14h2M8 18h2M14 18h2" />
    </Icon>
  );
}

function MapPinIcon(props) {
  return (
    <Icon {...props}>
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </Icon>
  );
}

function NoteIcon(props) {
  return (
    <Icon {...props}>
      <path d="M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </Icon>
  );
}

function SearchIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </Icon>
  );
}

function RefreshIcon({
  spinning,
  ...props
}) {
  return (
    <Icon
      {...props}
      className={
        spinning
          ? "animate-spin"
          : ""
      }
    >
      <path d="M20 11a8.1 8.1 0 0 0-14.9-4L3 9" />
      <path d="M3 4v5h5" />
      <path d="M4 13a8.1 8.1 0 0 0 14.9 4L21 15" />
      <path d="M21 20v-5h-5" />
    </Icon>
  );
}

function MoreIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </Icon>
  );
}

function EyeIcon(props) {
  return (
    <Icon {...props}>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.5" />
    </Icon>
  );
}

function EditIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z" />
    </Icon>
  );
}

function TrashIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4 7h16" />
      <path d="M10 11v6M14 11v6" />
      <path d="M6 7l1 14h10l1-14" />
      <path d="M9 7V4h6v3" />
    </Icon>
  );
}

function RestoreIcon(props) {
  return (
    <Icon {...props}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v6h6" />
      <path d="M12 8v5l3 2" />
    </Icon>
  );
}

function SendIcon(props) {
  return (
    <Icon {...props}>
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </Icon>
  );
}

function CheckIcon(props) {
  return (
    <Icon {...props}>
      <path d="m5 12 4 4L19 6" />
    </Icon>
  );
}

function XIcon(props) {
  return (
    <Icon {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </Icon>
  );
}

function CloseIcon(props) {
  return (
    <Icon {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </Icon>
  );
}

function AlertIcon(props) {
  return (
    <Icon {...props}>
      <path d="M10.3 3.8 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </Icon>
  );
}

function InfoIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </Icon>
  );
}

function CopyIcon(props) {
  return (
    <Icon {...props}>
      <rect
        x="8"
        y="8"
        width="11"
        height="11"
        rx="2"
      />
      <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
    </Icon>
  );
}

function ClockIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Icon>
  );
}

function BanIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m6 6 12 12" />
    </Icon>
  );
}

function ChevronLeftIcon(props) {
  return (
    <Icon {...props}>
      <path d="m15 18-6-6 6-6" />
    </Icon>
  );
}

function ChevronRightIcon(props) {
  return (
    <Icon {...props}>
      <path d="m9 18 6-6-6-6" />
    </Icon>
  );
}