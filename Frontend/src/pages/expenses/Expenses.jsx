import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Ban,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  Eye,
  FileText,
  Pencil,
  Plus,
  Receipt,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Trash2,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import api from "../../services/api";

const EMPTY_ITEM = {
  description: "",
  category: "",
  quantity: 1,
  unitPrice: 0,
  discountType: "percentage",
  discountValue: 0,
  gstRate: 18,
};

const EMPTY_FORM = {
  branchId: "",
  vendorId: "",
  expenseDate: new Date().toISOString().split("T")[0],
  dueDate: "",
  category: "",
  subCategory: "",
  paymentMethod: "cash",
  placeOfSupply: "Tamil Nadu",
  supplyType: "intra_state",
  reverseCharge: false,
  shippingCharges: 0,
  otherCharges: 0,
  roundOff: 0,
  notes: "",
  terms: "",
  items: [{ ...EMPTY_ITEM }],
};

const STATUS = {
  draft: {
    label: "Draft",
    color: "text-slate-300 bg-slate-500/10 border-slate-500/20",
    icon: FileText,
  },
  submitted: {
    label: "Submitted",
    color: "text-blue-300 bg-blue-500/10 border-blue-500/20",
    icon: Send,
  },
  approved: {
    label: "Approved",
    color: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected",
    color: "text-red-300 bg-red-500/10 border-red-500/20",
    icon: AlertCircle,
  },
  paid: {
    label: "Paid",
    color: "text-violet-300 bg-violet-500/10 border-violet-500/20",
    icon: CreditCard,
  },
  cancelled: {
    label: "Cancelled",
    color: "text-orange-300 bg-orange-500/10 border-orange-500/20",
    icon: Ban,
  },
};

const PAYMENT_STATUS = {
  unpaid:
    "text-red-300 bg-red-500/10 border-red-500/20",
  partial:
    "text-amber-300 bg-amber-500/10 border-amber-500/20",
  paid:
    "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
};

const PAYMENT_METHODS = [
  ["cash", "Cash"],
  ["bank_transfer", "Bank Transfer"],
  ["upi", "UPI"],
  ["card", "Card"],
  ["cheque", "Cheque"],
  ["credit", "Credit"],
  ["other", "Other"],
];

const CATEGORIES = [
  "Office Expenses",
  "Travel",
  "Utilities",
  "Software",
  "Maintenance",
  "Rent",
  "Salary",
  "Marketing",
  "Telephone",
  "Internet",
  "Transportation",
  "Professional Fees",
  "Insurance",
  "Bank Charges",
  "Miscellaneous",
];

const inputClass =
  "h-10 w-full rounded-xl border border-white/[0.08] bg-[#090d12] px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10";

const selectClass =
  "h-10 w-full rounded-xl border border-white/[0.08] bg-[#090d12] px-3 text-sm text-white outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10";

const textareaClass =
  "min-h-[90px] w-full resize-y rounded-xl border border-white/[0.08] bg-[#090d12] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10";

const getData = (response) => {
  const data = response?.data;

  if (data?.data !== undefined) {
    return data.data;
  }

  return data;
};

const listData = (response) => {
  const data = getData(response);

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;

  return [];
};

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const dateText = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const calculateItem = (item) => {
  const qty = Math.max(Number(item.quantity) || 0, 0);
  const price = Math.max(Number(item.unitPrice) || 0, 0);
  const discountValue = Math.max(
    Number(item.discountValue) || 0,
    0
  );
  const gstRate = Math.max(Number(item.gstRate) || 0, 0);

  const gross = qty * price;

  let discount = 0;

  if (item.discountType === "fixed") {
    discount = Math.min(discountValue, gross);
  } else {
    discount = Math.min(
      (gross * discountValue) / 100,
      gross
    );
  }

  const taxable = Math.max(gross - discount, 0);
  const tax = (taxable * gstRate) / 100;

  return {
    gross,
    discount,
    taxable,
    tax,
    total: taxable + tax,
  };
};

const calculateTotals = (form) => {
  let subtotal = 0;
  let discount = 0;
  let taxableAmount = 0;
  let taxAmount = 0;

  form.items.forEach((item) => {
    const result = calculateItem(item);

    subtotal += result.gross;
    discount += result.discount;
    taxableAmount += result.taxable;
    taxAmount += result.tax;
  });

  const cgst =
    form.supplyType === "inter_state"
      ? 0
      : taxAmount / 2;

  const sgst =
    form.supplyType === "inter_state"
      ? 0
      : taxAmount / 2;

  const igst =
    form.supplyType === "inter_state"
      ? taxAmount
      : 0;

  const shippingCharges =
    Number(form.shippingCharges) || 0;

  const otherCharges =
    Number(form.otherCharges) || 0;

  const roundOff =
    Number(form.roundOff) || 0;

  const grandTotal =
    taxableAmount +
    taxAmount +
    shippingCharges +
    otherCharges +
    roundOff;

  return {
    subtotal,
    discount,
    taxableAmount,
    taxAmount,
    cgst,
    sgst,
    igst,
    shippingCharges,
    otherCharges,
    roundOff,
    grandTotal,
  };
};

const StatusBadge = ({ status }) => {
  const config =
    STATUS[status] || STATUS.draft;

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${config.color}`}
    >
      <Icon size={12} />
      {config.label}
    </span>
  );
};

const PaymentBadge = ({ status }) => {
  const safeStatus = status || "unpaid";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${
        PAYMENT_STATUS[safeStatus] ||
        PAYMENT_STATUS.unpaid
      }`}
    >
      {safeStatus}
    </span>
  );
};

const Modal = ({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
}) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm">
    <div
      className={`flex max-h-[94vh] w-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d1117] shadow-[0_30px_100px_rgba(0,0,0,.7)] ${
        wide ? "max-w-5xl" : "max-w-xl"
      }`}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-white/[0.07] px-5 py-4">
        <div>
          <h2 className="text-base font-bold text-white">
            {title}
          </h2>

          {subtitle && (
            <p className="mt-1 text-xs text-slate-500">
              {subtitle}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.07] text-slate-400 hover:bg-white/[0.06] hover:text-white"
        >
          <X size={17} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {children}
      </div>
    </div>
  </div>
);

const Field = ({
  label,
  required = false,
  children,
}) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-semibold text-slate-400">
      {label}
      {required && (
        <span className="ml-1 text-red-400">*</span>
      )}
    </label>

    {children}
  </div>
);

const SummaryCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  className,
}) => (
  <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#11151c] p-5 shadow-[0_15px_45px_rgba(0,0,0,.18)] transition hover:border-white/[0.12]">
    <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/[0.02] blur-2xl" />

    <div className="relative flex items-start justify-between">
      <div className="min-w-0">
        <p className="text-xs text-slate-500">
          {title}
        </p>

        <p className="mt-2 truncate text-xl font-bold text-white">
          {value}
        </p>

        <p className="mt-1 text-[11px] text-slate-600">
          {subtitle}
        </p>
      </div>

      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${className}`}
      >
        <Icon size={18} />
      </div>
    </div>
  </div>
);

const ExpenseForm = ({
  form,
  setForm,
  branches,
  vendors,
  onSubmit,
  onClose,
  saving,
  editing,
}) => {
  const totals = useMemo(
    () => calculateTotals(form),
    [form]
  );

  const update = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const updateItem = (
    index,
    key,
    value
  ) => {
    setForm((prev) => {
      const items = [...prev.items];

      items[index] = {
        ...items[index],
        [key]: value,
      };

      return {
        ...prev,
        items,
      };
    });
  };

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { ...EMPTY_ITEM },
      ],
    }));
  };

  const removeItem = (index) => {
    setForm((prev) => ({
      ...prev,
      items:
        prev.items.length === 1
          ? prev.items
          : prev.items.filter(
              (_, i) => i !== index
            ),
    }));
  };

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5"
    >
      {/* Basic */}
      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
        <div className="mb-4 flex items-center gap-2">
          <Building2
            size={16}
            className="text-indigo-400"
          />

          <div>
            <h3 className="text-sm font-bold text-white">
              Expense Information
            </h3>

            <p className="text-[11px] text-slate-600">
              Branch, vendor and expense details
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Field
            label="Branch"
            required
          >
            <select
              value={form.branchId}
              onChange={(e) =>
                update(
                  "branchId",
                  e.target.value
                )
              }
              className={selectClass}
              required
            >
              <option value="">
                Select Branch
              </option>

              {branches.map((branch) => (
                <option
                  key={branch._id}
                  value={branch._id}
                >
                  {branch.name}
                  {branch.code
                    ? ` (${branch.code})`
                    : ""}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Vendor">
            <select
              value={form.vendorId}
              onChange={(e) =>
                update(
                  "vendorId",
                  e.target.value
                )
              }
              className={selectClass}
            >
              <option value="">
                No Vendor
              </option>

              {vendors.map((vendor) => (
                <option
                  key={vendor._id}
                  value={vendor._id}
                >
                  {vendor.name ||
                    vendor.displayName ||
                    vendor.companyName ||
                    "Unnamed Vendor"}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Category"
            required
          >
            <select
              value={form.category}
              onChange={(e) =>
                update(
                  "category",
                  e.target.value
                )
              }
              className={selectClass}
              required
            >
              <option value="">
                Select Category
              </option>

              {CATEGORIES.map(
                (category) => (
                  <option
                    key={category}
                    value={category}
                  >
                    {category}
                  </option>
                )
              )}
            </select>
          </Field>

          <Field label="Sub Category">
            <input
              value={form.subCategory}
              onChange={(e) =>
                update(
                  "subCategory",
                  e.target.value
                )
              }
              className={inputClass}
              placeholder="Office supplies"
            />
          </Field>

          <Field
            label="Expense Date"
            required
          >
            <input
              type="date"
              value={form.expenseDate}
              onChange={(e) =>
                update(
                  "expenseDate",
                  e.target.value
                )
              }
              className={inputClass}
              required
            />
          </Field>

          <Field label="Due Date">
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) =>
                update(
                  "dueDate",
                  e.target.value
                )
              }
              className={inputClass}
            />
          </Field>

          <Field label="Payment Method">
            <select
              value={form.paymentMethod}
              onChange={(e) =>
                update(
                  "paymentMethod",
                  e.target.value
                )
              }
              className={selectClass}
            >
              {PAYMENT_METHODS.map(
                ([value, label]) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {label}
                  </option>
                )
              )}
            </select>
          </Field>

          <Field label="Place of Supply">
            <input
              value={form.placeOfSupply}
              onChange={(e) =>
                update(
                  "placeOfSupply",
                  e.target.value
                )
              }
              className={inputClass}
              placeholder="Tamil Nadu"
            />
          </Field>

          <Field label="Supply Type">
            <select
              value={form.supplyType}
              onChange={(e) =>
                update(
                  "supplyType",
                  e.target.value
                )
              }
              className={selectClass}
            >
              <option value="intra_state">
                Intra State
              </option>

              <option value="inter_state">
                Inter State
              </option>
            </select>
          </Field>
        </div>

        <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2">
          <input
            type="checkbox"
            checked={form.reverseCharge}
            onChange={(e) =>
              update(
                "reverseCharge",
                e.target.checked
              )
            }
            className="h-4 w-4 accent-indigo-500"
          />

          <span className="text-xs text-slate-300">
            Reverse Charge
          </span>
        </label>
      </section>

      {/* Items */}
      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt
              size={16}
              className="text-indigo-400"
            />

            <div>
              <h3 className="text-sm font-bold text-white">
                Expense Items
              </h3>

              <p className="text-[11px] text-slate-600">
                Add multiple expense items
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={addItem}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-indigo-500/10 px-3 text-xs font-bold text-indigo-300 hover:bg-indigo-500/20"
          >
            <Plus size={14} />
            Add Item
          </button>
        </div>

        <div className="space-y-3">
          {form.items.map(
            (item, index) => {
              const calculation =
                calculateItem(item);

              return (
                <div
                  key={index}
                  className="rounded-2xl border border-white/[0.06] bg-[#090d12] p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[10px] font-bold tracking-wider text-slate-600">
                      ITEM #{index + 1}
                    </span>

                    {form.items.length >
                      1 && (
                      <button
                        type="button"
                        onClick={() =>
                          removeItem(index)
                        }
                        className="text-slate-600 hover:text-red-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-6">
                    <div className="lg:col-span-2">
                      <Field
                        label="Description"
                        required
                      >
                        <input
                          value={
                            item.description
                          }
                          onChange={(e) =>
                            updateItem(
                              index,
                              "description",
                              e.target.value
                            )
                          }
                          className={inputClass}
                          placeholder="Expense description"
                          required
                        />
                      </Field>
                    </div>

                    <Field label="Item Category">
                      <input
                        value={
                          item.category
                        }
                        onChange={(e) =>
                          updateItem(
                            index,
                            "category",
                            e.target.value
                          )
                        }
                        className={inputClass}
                        placeholder="Category"
                      />
                    </Field>

                    <Field label="Quantity">
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={
                          item.quantity
                        }
                        onChange={(e) =>
                          updateItem(
                            index,
                            "quantity",
                            e.target.value
                          )
                        }
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Unit Price">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          item.unitPrice
                        }
                        onChange={(e) =>
                          updateItem(
                            index,
                            "unitPrice",
                            e.target.value
                          )
                        }
                        className={inputClass}
                      />
                    </Field>

                    <Field label="GST %">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          item.gstRate
                        }
                        onChange={(e) =>
                          updateItem(
                            index,
                            "gstRate",
                            e.target.value
                          )
                        }
                        className={inputClass}
                      />
                    </Field>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <Field label="Discount Type">
                      <select
                        value={
                          item.discountType
                        }
                        onChange={(e) =>
                          updateItem(
                            index,
                            "discountType",
                            e.target.value
                          )
                        }
                        className={selectClass}
                      >
                        <option value="percentage">
                          Percentage
                        </option>

                        <option value="fixed">
                          Fixed
                        </option>
                      </select>
                    </Field>

                    <Field label="Discount">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          item.discountValue
                        }
                        onChange={(e) =>
                          updateItem(
                            index,
                            "discountValue",
                            e.target.value
                          )
                        }
                        className={inputClass}
                      />
                    </Field>

                    <div className="flex items-end">
                      <div className="w-full rounded-xl border border-indigo-500/10 bg-indigo-500/5 p-3">
                        <p className="text-[10px] text-slate-600">
                          LINE TOTAL
                        </p>

                        <p className="mt-1 text-sm font-bold text-white">
                          {money(
                            calculation.total
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
          )}
        </div>
      </section>

      {/* Bottom */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
        <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
          <h3 className="mb-4 text-sm font-bold text-white">
            Additional Details
          </h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Shipping Charges">
              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  form.shippingCharges
                }
                onChange={(e) =>
                  update(
                    "shippingCharges",
                    e.target.value
                  )
                }
                className={inputClass}
              />
            </Field>

            <Field label="Other Charges">
              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  form.otherCharges
                }
                onChange={(e) =>
                  update(
                    "otherCharges",
                    e.target.value
                  )
                }
                className={inputClass}
              />
            </Field>

            <Field label="Round Off">
              <input
                type="number"
                step="0.01"
                value={form.roundOff}
                onChange={(e) =>
                  update(
                    "roundOff",
                    e.target.value
                  )
                }
                className={inputClass}
              />
            </Field>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Notes">
              <textarea
                value={form.notes}
                onChange={(e) =>
                  update(
                    "notes",
                    e.target.value
                  )
                }
                className={textareaClass}
                placeholder="Internal notes..."
              />
            </Field>

            <Field label="Terms">
              <textarea
                value={form.terms}
                onChange={(e) =>
                  update(
                    "terms",
                    e.target.value
                  )
                }
                className={textareaClass}
                placeholder="Payment terms..."
              />
            </Field>
          </div>
        </section>

        <section className="rounded-2xl border border-indigo-500/10 bg-indigo-500/[0.05] p-4">
          <div className="mb-4 flex items-center gap-2">
            <Wallet
              size={16}
              className="text-indigo-300"
            />

            <h3 className="text-sm font-bold text-white">
              Summary
            </h3>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span className="text-slate-300">
                {money(
                  totals.subtotal
                )}
              </span>
            </div>

            <div className="flex justify-between text-slate-500">
              <span>Discount</span>
              <span className="text-red-300">
                -{money(totals.discount)}
              </span>
            </div>

            <div className="flex justify-between text-slate-500">
              <span>Taxable</span>
              <span className="text-slate-300">
                {money(
                  totals.taxableAmount
                )}
              </span>
            </div>

            <div className="flex justify-between text-slate-500">
              <span>CGST</span>
              <span>
                {money(totals.cgst)}
              </span>
            </div>

            <div className="flex justify-between text-slate-500">
              <span>SGST</span>
              <span>
                {money(totals.sgst)}
              </span>
            </div>

            <div className="flex justify-between text-slate-500">
              <span>IGST</span>
              <span>
                {money(totals.igst)}
              </span>
            </div>

            <div className="flex justify-between text-slate-500">
              <span>Other Charges</span>
              <span>
                {money(
                  totals.otherCharges
                )}
              </span>
            </div>

            <div className="mt-3 rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-200">
                  Grand Total
                </span>

                <span className="text-xl font-black text-white">
                  {money(
                    totals.grandTotal
                  )}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-white/[0.07] pt-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          className="h-10 rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 text-xs font-semibold text-slate-300 hover:bg-white/[0.07]"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-500 px-5 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-400 disabled:opacity-50"
        >
          {saving ? (
            <>
              <RefreshCw
                size={14}
                className="animate-spin"
              />
              Saving...
            </>
          ) : (
            <>
              <Check size={14} />
              {editing
                ? "Update Expense"
                : "Create Expense"}
            </>
          )}
        </button>
      </div>
    </form>
  );
};

const Expenses = () => {
  const [expenses, setExpenses] =
    useState([]);

  const [branches, setBranches] =
    useState([]);

  const [vendors, setVendors] =
    useState([]);

  const [summary, setSummary] =
    useState({
      totalExpenses: 0,
      totalAmount: 0,
      paidAmount: 0,
      balanceAmount: 0,
      draftCount: 0,
      submittedCount: 0,
      approvedCount: 0,
      paidCount: 0,
    });

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [status, setStatus] =
    useState("");

  const [paymentStatus, setPaymentStatus] =
    useState("");

  const [branchId, setBranchId] =
    useState("");

  const [dateFrom, setDateFrom] =
    useState("");

  const [dateTo, setDateTo] =
    useState("");

  const [page, setPage] =
    useState(1);

  const limit = 10;

  const [pagination, setPagination] =
    useState({
      total: 0,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    });

  const [modal, setModal] =
    useState(null);

  const [selectedExpense, setSelectedExpense] =
    useState(null);

  const [form, setForm] =
    useState(EMPTY_FORM);

  const [saving, setSaving] =
    useState(false);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [toast, setToast] =
    useState(null);

  const notify = (type, message) => {
    setToast({
      type,
      message,
    });

    window.setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const loadMasterData = async () => {
    try {
      const [
        branchResponse,
        vendorResponse,
      ] = await Promise.all([
        api.get("/branches?limit=100"),
        api.get("/vendors?limit=100"),
      ]);

      setBranches(
        listData(branchResponse)
      );

      setVendors(
        listData(vendorResponse)
      );
    } catch (error) {
      console.error(
        "Master data error:",
        error
      );

      if (
        error?.response?.status === 401
      ) {
        notify(
          "error",
          "Session expired. Please login again."
        );
      }
    }
  };

  const loadExpenses = async (
    silent = false
  ) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const params = {
        page,
        limit,
      };

      if (search.trim()) {
        params.search =
          search.trim();
      }

      if (status) {
        params.status = status;
      }

      if (paymentStatus) {
        params.paymentStatus =
          paymentStatus;
      }

      if (branchId) {
        params.branchId =
          branchId;
      }

      if (dateFrom) {
        params.dateFrom =
          dateFrom;
      }

      if (dateTo) {
        params.dateTo =
          dateTo;
      }

      const [
        expenseResponse,
        summaryResponse,
      ] = await Promise.all([
        api.get("/expenses", {
          params,
        }),
        api.get("/expenses/summary", {
          params: {
            dateFrom:
              dateFrom || undefined,
            dateTo:
              dateTo || undefined,
            status:
              status || undefined,
            branchId:
              branchId || undefined,
          },
        }),
      ]);

      const expenseData =
        getData(expenseResponse);

      const expenseList =
        Array.isArray(expenseData)
          ? expenseData
          : Array.isArray(
              expenseData?.data
            )
          ? expenseData.data
          : [];

      setExpenses(expenseList);

      const pageData =
        expenseResponse?.data
          ?.pagination ||
        expenseData?.pagination ||
        {};

      setPagination({
        total:
          Number(pageData.total) ||
          expenseList.length,
        totalPages:
          Number(
            pageData.totalPages
          ) || 1,
        hasNextPage:
          Boolean(
            pageData.hasNextPage
          ),
        hasPreviousPage:
          Boolean(
            pageData.hasPreviousPage
          ),
      });

      const summaryData =
        getData(summaryResponse);

      const s =
        summaryData?.data ||
        summaryData ||
        {};

      setSummary({
        totalExpenses:
          Number(
            s.totalExpenses ??
              s.totalCount ??
              s.count ??
              0
          ),
        totalAmount:
          Number(
            s.totalAmount ??
              s.total ??
              s.grandTotal ??
              0
          ),
        paidAmount:
          Number(
            s.paidAmount ?? 0
          ),
        balanceAmount:
          Number(
            s.balanceAmount ?? 0
          ),
        draftCount:
          Number(
            s.draftCount ?? 0
          ),
        submittedCount:
          Number(
            s.submittedCount ?? 0
          ),
        approvedCount:
          Number(
            s.approvedCount ?? 0
          ),
        paidCount:
          Number(
            s.paidCount ?? 0
          ),
      });
    } catch (error) {
      console.error(
        "Expenses load error:",
        error
      );

      if (
        error?.response?.status === 401
      ) {
        notify(
          "error",
          "Authentication token missing or expired."
        );
      } else {
        notify(
          "error",
          error?.response?.data
            ?.message ||
            "Failed to load expenses."
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMasterData();
  }, []);

  useEffect(() => {
    loadExpenses();
  }, [
    page,
    status,
    paymentStatus,
    branchId,
    dateFrom,
    dateTo,
  ]);

  useEffect(() => {
    const timer =
      window.setTimeout(() => {
        setPage(1);
        loadExpenses(true);
      }, 450);

    return () =>
      window.clearTimeout(timer);
  }, [search]);

  const resetFilters = () => {
    setSearch("");
    setStatus("");
    setPaymentStatus("");
    setBranchId("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const openCreate = () => {
    const defaultBranch =
      branches.length === 1
        ? branches[0]._id
        : "";

    setSelectedExpense(null);

    setForm({
      ...EMPTY_FORM,
      branchId: defaultBranch,
      items: [{ ...EMPTY_ITEM }],
    });

    setModal("create");
  };

  const openEdit = (expense) => {
    setSelectedExpense(expense);

    setForm({
      branchId:
        expense.branchId?._id ||
        expense.branchId ||
        "",
      vendorId:
        expense.vendorId?._id ||
        expense.vendorId ||
        "",
      expenseDate: expense.expenseDate
        ? new Date(
            expense.expenseDate
          )
            .toISOString()
            .split("T")[0]
        : "",
      dueDate: expense.dueDate
        ? new Date(
            expense.dueDate
          )
            .toISOString()
            .split("T")[0]
        : "",
      category:
        expense.category || "",
      subCategory:
        expense.subCategory || "",
      paymentMethod:
        expense.paymentMethod ||
        "cash",
      placeOfSupply:
        expense.placeOfSupply ||
        "Tamil Nadu",
      supplyType:
        expense.supplyType ||
        "intra_state",
      reverseCharge:
        Boolean(
          expense.reverseCharge
        ),
      shippingCharges:
        expense.shippingCharges ||
        0,
      otherCharges:
        expense.otherCharges ||
        0,
      roundOff:
        expense.roundOff || 0,
      notes: expense.notes || "",
      terms: expense.terms || "",
      items:
        expense.items?.length
          ? expense.items.map(
              (item) => ({
                description:
                  item.description ||
                  "",
                category:
                  item.category ||
                  "",
                quantity:
                  item.quantity ||
                  1,
                unitPrice:
                  item.unitPrice ||
                  0,
                discountType:
                  item.discountType ||
                  "percentage",
                discountValue:
                  item.discountValue ||
                  0,
                gstRate:
                  item.gstRate || 0,
              })
            )
          : [{ ...EMPTY_ITEM }],
    });

    setModal("edit");
  };

  const openView = async (expense) => {
    setSelectedExpense(expense);
    setModal("view");

    try {
      const response =
        await api.get(
          `/expenses/${expense._id}`
        );

      const data =
        getData(response);

      const detail =
        data?.data || data;

      if (detail?._id) {
        setSelectedExpense(
          detail
        );
      }
    } catch (error) {
      console.error(
        "Expense detail error:",
        error
      );
    }
  };

  const closeModal = () => {
    if (
      saving ||
      actionLoading
    ) {
      return;
    }

    setModal(null);
    setSelectedExpense(null);
  };

  const validateForm = () => {
    if (!form.branchId) {
      notify(
        "error",
        "Please select a branch."
      );
      return false;
    }

    if (!form.category) {
      notify(
        "error",
        "Please select a category."
      );
      return false;
    }

    if (!form.expenseDate) {
      notify(
        "error",
        "Please select expense date."
      );
      return false;
    }

    for (
      let i = 0;
      i < form.items.length;
      i++
    ) {
      const item =
        form.items[i];

      if (
        !item.description.trim()
      ) {
        notify(
          "error",
          `Item ${i + 1} description is required.`
        );
        return false;
      }

      if (
        Number(item.quantity) <=
        0
      ) {
        notify(
          "error",
          `Item ${i + 1} quantity must be greater than 0.`
        );
        return false;
      }
    }

    return true;
  };

  const buildPayload = () => ({
    branchId: form.branchId,
    vendorId:
      form.vendorId || null,
    expenseDate:
      form.expenseDate,
    dueDate:
      form.dueDate || null,
    category:
      form.category,
    subCategory:
      form.subCategory || "",
    paymentMethod:
      form.paymentMethod,
    placeOfSupply:
      form.placeOfSupply,
    supplyType:
      form.supplyType,
    reverseCharge:
      Boolean(
        form.reverseCharge
      ),
    items: form.items.map(
      (item) => ({
        description:
          item.description.trim(),
        category:
          item.category?.trim() ||
          "",
        quantity:
          Number(item.quantity) ||
          0,
        unitPrice:
          Number(item.unitPrice) ||
          0,
        discountType:
          item.discountType ||
          "percentage",
        discountValue:
          Number(
            item.discountValue
          ) || 0,
        gstRate:
          Number(item.gstRate) ||
          0,
      })
    ),
    shippingCharges:
      Number(
        form.shippingCharges
      ) || 0,
    otherCharges:
      Number(
        form.otherCharges
      ) || 0,
    roundOff:
      Number(form.roundOff) || 0,
    notes: form.notes || "",
    terms: form.terms || "",
  });

  const saveExpense = async (
    event
  ) => {
    event.preventDefault();

    if (!validateForm()) return;

    setSaving(true);

    try {
      const payload =
        buildPayload();

      if (modal === "edit") {
        await api.put(
          `/expenses/${selectedExpense._id}`,
          payload
        );

        notify(
          "success",
          "Expense updated successfully."
        );
      } else {
        await api.post(
          "/expenses",
          payload
        );

        notify(
          "success",
          "Expense created successfully."
        );
      }

      setModal(null);
      setSelectedExpense(null);

      await loadExpenses(true);
    } catch (error) {
      console.error(
        "Save expense error:",
        error
      );

      notify(
        "error",
        error?.response?.data
          ?.message ||
          "Failed to save expense."
      );
    } finally {
      setSaving(false);
    }
  };

  const action = async (
    expense,
    type,
    body = {}
  ) => {
    setActionLoading(true);

    try {
      if (type === "delete") {
        await api.delete(
          `/expenses/${expense._id}`
        );
      } else {
        await api.post(
          `/expenses/${expense._id}/${type}`,
          body
        );
      }

      notify(
        "success",
        `Expense ${type} successful.`
      );

      setModal(null);
      setSelectedExpense(null);

      await loadExpenses(true);
    } catch (error) {
      console.error(
        `${type} expense error:`,
        error
      );

      notify(
        "error",
        error?.response?.data
          ?.message ||
          `Unable to ${type} expense.`
      );
    } finally {
      setActionLoading(false);
    }
  };

  const branchName = (id) => {
    const value =
      id?._id || id;

    return (
      branches.find(
        (branch) =>
          branch._id === value
      )?.name ||
      id?.name ||
      "-"
    );
  };

  const vendorName = (id) => {
    const value =
      id?._id || id;

    const vendor =
      vendors.find(
        (item) =>
          item._id === value
      );

    return (
      vendor?.name ||
      vendor?.displayName ||
      vendor?.companyName ||
      id?.name ||
      "-"
    );
  };

  const canEdit = (expense) =>
    expense.status === "draft";

  const canSubmit = (expense) =>
    expense.status === "draft";

  const canApprove = (expense) =>
    expense.status === "submitted";

  const canReject = (expense) =>
    expense.status === "submitted";

  const canPay = (expense) =>
    expense.status === "approved" &&
    expense.paymentStatus !==
      "paid";

  const canCancel = (expense) =>
    ![
      "paid",
      "cancelled",
    ].includes(expense.status);

  const canDelete = (expense) =>
    [
      "draft",
      "rejected",
      "cancelled",
    ].includes(expense.status);

  const totalPages = Math.max(
    pagination.totalPages || 1,
    1
  );

  return (
    <div className="min-h-screen bg-[#090c11] text-white">
      <div className="mx-auto max-w-[1800px] space-y-5 p-4 sm:p-6 lg:p-7">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-400">
              <Wallet size={13} />
              Finance
            </div>

            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Expenses
            </h1>

            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Manage expenses, approvals,
              payments and GST.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                loadExpenses(true)
              }
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-xs font-bold text-slate-300 hover:bg-white/[0.07]"
            >
              <RefreshCw
                size={15}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-500 px-4 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-400"
            >
              <Plus size={16} />
              New Expense
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Total Expenses"
            value={money(
              summary.totalAmount
            )}
            subtitle={`${summary.totalExpenses} records`}
            icon={Receipt}
            className="border-indigo-500/20 bg-indigo-500/10 text-indigo-300"
          />

          <SummaryCard
            title="Paid Amount"
            value={money(
              summary.paidAmount
            )}
            subtitle={`${summary.paidCount} paid`}
            icon={CreditCard}
            className="border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
          />

          <SummaryCard
            title="Outstanding"
            value={money(
              summary.balanceAmount
            )}
            subtitle="Unpaid / partial"
            icon={Clock3}
            className="border-amber-500/20 bg-amber-500/10 text-amber-300"
          />

          <SummaryCard
            title="Pending Approval"
            value={summary.submittedCount}
            subtitle={`${summary.draftCount} drafts`}
            icon={Send}
            className="border-blue-500/20 bg-blue-500/10 text-blue-300"
          />
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-white/[0.07] bg-[#11151c] p-3">
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 xl:grid-cols-7">
            <div className="relative xl:col-span-2">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
              />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                placeholder="Search expenses..."
                className={`${inputClass} pl-9`}
              />
            </div>

            <select
              value={status}
              onChange={(e) => {
                setStatus(
                  e.target.value
                );
                setPage(1);
              }}
              className={selectClass}
            >
              <option value="">
                All Status
              </option>
              <option value="draft">
                Draft
              </option>
              <option value="submitted">
                Submitted
              </option>
              <option value="approved">
                Approved
              </option>
              <option value="rejected">
                Rejected
              </option>
              <option value="paid">
                Paid
              </option>
              <option value="cancelled">
                Cancelled
              </option>
            </select>

            <select
              value={paymentStatus}
              onChange={(e) => {
                setPaymentStatus(
                  e.target.value
                );
                setPage(1);
              }}
              className={selectClass}
            >
              <option value="">
                Payment Status
              </option>
              <option value="unpaid">
                Unpaid
              </option>
              <option value="partial">
                Partial
              </option>
              <option value="paid">
                Paid
              </option>
            </select>

            <select
              value={branchId}
              onChange={(e) => {
                setBranchId(
                  e.target.value
                );
                setPage(1);
              }}
              className={selectClass}
            >
              <option value="">
                All Branches
              </option>

              {branches.map(
                (branch) => (
                  <option
                    key={branch._id}
                    value={branch._id}
                  >
                    {branch.name}
                  </option>
                )
              )}
            </select>

            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(
                  e.target.value
                );
                setPage(1);
              }}
              className={inputClass}
            />

            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(
                  e.target.value
                );
                setPage(1);
              }}
              className={inputClass}
            />

            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-xs font-bold text-slate-400 hover:bg-white/[0.07] hover:text-white"
            >
              <RotateCcw size={14} />
              Reset
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#11151c]">
          <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-4">
            <div>
              <h2 className="text-sm font-bold">
                Expense Records
              </h2>

              <p className="mt-1 text-[11px] text-slate-600">
                {pagination.total} records
              </p>
            </div>

            <Receipt
              size={17}
              className="text-slate-600"
            />
          </div>

          {loading ? (
            <div className="space-y-3 p-5">
              {Array.from({
                length: 7,
              }).map((_, i) => (
                <div
                  key={i}
                  className="h-14 animate-pulse rounded-xl bg-white/[0.03]"
                />
              ))}
            </div>
          ) : expenses.length === 0 ? (
            <div className="flex min-h-[350px] flex-col items-center justify-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.03] text-slate-600">
                <Receipt size={26} />
              </div>

              <h3 className="mt-4 text-sm font-bold">
                No expenses found
              </h3>

              <p className="mt-1 text-xs text-slate-600">
                Create an expense or
                change your filters.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px]">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-white/[0.015] text-left">
                      {[
                        "Expense",
                        "Branch",
                        "Category",
                        "Date",
                        "Amount",
                        "Payment",
                        "Status",
                        "Actions",
                      ].map(
                        (heading) => (
                          <th
                            key={heading}
                            className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-600"
                          >
                            {heading}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {expenses.map(
                      (expense) => (
                        <tr
                          key={
                            expense._id
                          }
                          className="border-b border-white/[0.045] hover:bg-white/[0.02]"
                        >
                          <td className="px-4 py-3">
                            <p className="text-xs font-bold text-white">
                              {expense.expenseNumber ||
                                "EXP"}
                            </p>

                            <p className="mt-1 max-w-[190px] truncate text-[10px] text-slate-600">
                              {expense.referenceNumber ||
                                expense.subCategory ||
                                "No reference"}
                            </p>
                          </td>

                          <td className="px-4 py-3 text-xs text-slate-300">
                            {branchName(
                              expense.branchId
                            )}
                          </td>

                          <td className="px-4 py-3">
                            <p className="text-xs font-semibold text-slate-300">
                              {
                                expense.category
                              }
                            </p>

                            <p className="mt-1 text-[10px] text-slate-600">
                              {
                                expense.subCategory ||
                                "General"
                              }
                            </p>
                          </td>

                          <td className="px-4 py-3 text-xs text-slate-300">
                            {dateText(
                              expense.expenseDate
                            )}
                          </td>

                          <td className="px-4 py-3">
                            <p className="text-xs font-bold text-white">
                              {money(
                                expense.grandTotal
                              )}
                            </p>

                            {Number(
                              expense.balanceAmount
                            ) > 0 && (
                              <p className="mt-1 text-[10px] text-amber-400">
                                Bal{" "}
                                {money(
                                  expense.balanceAmount
                                )}
                              </p>
                            )}
                          </td>

                          <td className="px-4 py-3">
                            <PaymentBadge
                              status={
                                expense.paymentStatus
                              }
                            />

                            <p className="mt-1 text-[10px] capitalize text-slate-600">
                              {(
                                expense.paymentMethod ||
                                "-"
                              ).replace(
                                "_",
                                " "
                              )}
                            </p>
                          </td>

                          <td className="px-4 py-3">
                            <StatusBadge
                              status={
                                expense.status
                              }
                            />
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  openView(
                                    expense
                                  )
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-white/[0.06] hover:text-white"
                                title="View"
                              >
                                <Eye
                                  size={14}
                                />
                              </button>

                              {canEdit(
                                expense
                              ) && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openEdit(
                                      expense
                                    )
                                  }
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-indigo-500/10 hover:text-indigo-300"
                                  title="Edit"
                                >
                                  <Pencil
                                    size={14}
                                  />
                                </button>
                              )}

                              {canSubmit(
                                expense
                              ) && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    action(
                                      expense,
                                      "submit"
                                    )
                                  }
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-blue-500/10 hover:text-blue-300"
                                  title="Submit"
                                >
                                  <Send
                                    size={14}
                                  />
                                </button>
                              )}

                              {canApprove(
                                expense
                              ) && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    action(
                                      expense,
                                      "approve"
                                    )
                                  }
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-emerald-500/10 hover:text-emerald-300"
                                  title="Approve"
                                >
                                  <Check
                                    size={14}
                                  />
                                </button>
                              )}

                              {canReject(
                                expense
                              ) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedExpense(
                                      expense
                                    );
                                    setModal(
                                      "reject"
                                    );
                                  }}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-red-500/10 hover:text-red-300"
                                  title="Reject"
                                >
                                  <AlertCircle
                                    size={14}
                                  />
                                </button>
                              )}

                              {canPay(
                                expense
                              ) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedExpense(
                                      expense
                                    );
                                    setModal(
                                      "pay"
                                    );
                                  }}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-violet-500/10 hover:text-violet-300"
                                  title="Pay"
                                >
                                  <CreditCard
                                    size={14}
                                  />
                                </button>
                              )}

                              {canCancel(
                                expense
                              ) && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    action(
                                      expense,
                                      "cancel"
                                    )
                                  }
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-orange-500/10 hover:text-orange-300"
                                  title="Cancel"
                                >
                                  <Ban
                                    size={14}
                                  />
                                </button>
                              )}

                              {canDelete(
                                expense
                              ) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedExpense(
                                      expense
                                    );
                                    setModal(
                                      "delete"
                                    );
                                  }}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-red-500/10 hover:text-red-300"
                                  title="Delete"
                                >
                                  <Trash2
                                    size={14}
                                  />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-white/[0.07] px-4 py-3">
                <span className="text-[11px] text-slate-600">
                  Page {page} of{" "}
                  {totalPages}
                </span>

                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={
                      page <= 1
                    }
                    onClick={() =>
                      setPage(
                        (p) =>
                          Math.max(
                            p - 1,
                            1
                          )
                      )
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] text-slate-500 disabled:opacity-30"
                  >
                    <ChevronLeft
                      size={15}
                    />
                  </button>

                  <div className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-indigo-500/10 px-2 text-xs font-bold text-indigo-300">
                    {page}
                  </div>

                  <button
                    type="button"
                    disabled={
                      page >=
                      totalPages
                    }
                    onClick={() =>
                      setPage(
                        (p) =>
                          Math.min(
                            p + 1,
                            totalPages
                          )
                      )
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] text-slate-500 disabled:opacity-30"
                  >
                    <ChevronRight
                      size={15}
                    />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create / Edit */}
      {(modal === "create" ||
        modal === "edit") && (
        <Modal
          title={
            modal === "edit"
              ? "Edit Expense"
              : "Create Expense"
          }
          subtitle={
            modal === "edit"
              ? selectedExpense?.expenseNumber
              : "Create a new company expense"
          }
          onClose={closeModal}
          wide
        >
          <ExpenseForm
            form={form}
            setForm={setForm}
            branches={branches}
            vendors={vendors}
            onSubmit={saveExpense}
            onClose={closeModal}
            saving={saving}
            editing={
              modal === "edit"
            }
          />
        </Modal>
      )}

      {/* View */}
      {modal === "view" &&
        selectedExpense && (
          <Modal
            title={
              selectedExpense.expenseNumber ||
              "Expense Details"
            }
            subtitle="Complete expense information"
            onClose={closeModal}
            wide
          >
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <SummaryCard
                  title="Total"
                  value={money(
                    selectedExpense.grandTotal
                  )}
                  subtitle="Grand total"
                  icon={Receipt}
                  className="border-indigo-500/20 bg-indigo-500/10 text-indigo-300"
                />

                <SummaryCard
                  title="Paid"
                  value={money(
                    selectedExpense.paidAmount
                  )}
                  subtitle="Paid amount"
                  icon={CreditCard}
                  className="border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                />

                <SummaryCard
                  title="Balance"
                  value={money(
                    selectedExpense.balanceAmount
                  )}
                  subtitle="Outstanding"
                  icon={Clock3}
                  className="border-amber-500/20 bg-amber-500/10 text-amber-300"
                />

                <div className="rounded-2xl border border-white/[0.07] bg-[#11151c] p-5">
                  <p className="text-xs text-slate-500">
                    Status
                  </p>

                  <div className="mt-3">
                    <StatusBadge
                      status={
                        selectedExpense.status
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Building2
                      size={14}
                    />
                    <span className="text-[11px]">
                      Branch
                    </span>
                  </div>

                  <p className="mt-2 text-sm font-bold text-white">
                    {branchName(
                      selectedExpense.branchId
                    )}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                  <div className="flex items-center gap-2 text-slate-600">
                    <UserRound
                      size={14}
                    />
                    <span className="text-[11px]">
                      Vendor
                    </span>
                  </div>

                  <p className="mt-2 text-sm font-bold text-white">
                    {vendorName(
                      selectedExpense.vendorId
                    )}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                  <div className="flex items-center gap-2 text-slate-600">
                    <CalendarDays
                      size={14}
                    />
                    <span className="text-[11px]">
                      Expense Date
                    </span>
                  </div>

                  <p className="mt-2 text-sm font-bold text-white">
                    {dateText(
                      selectedExpense.expenseDate
                    )}
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-white/[0.07]">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="px-4 py-3 text-left text-[10px] uppercase text-slate-600">
                        Description
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] uppercase text-slate-600">
                        Qty
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] uppercase text-slate-600">
                        Price
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] uppercase text-slate-600">
                        GST
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] uppercase text-slate-600">
                        Total
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {(
                      selectedExpense.items ||
                      []
                    ).map(
                      (item, index) => {
                        const calc =
                          calculateItem(
                            item
                          );

                        return (
                          <tr
                            key={index}
                            className="border-b border-white/[0.045]"
                          >
                            <td className="px-4 py-3">
                              <p className="text-xs font-semibold text-white">
                                {
                                  item.description
                                }
                              </p>

                              <p className="mt-1 text-[10px] text-slate-600">
                                {item.category ||
                                  "-"}
                              </p>
                            </td>

                            <td className="px-4 py-3 text-right text-xs text-slate-300">
                              {
                                item.quantity
                              }
                            </td>

                            <td className="px-4 py-3 text-right text-xs text-slate-300">
                              {money(
                                item.unitPrice
                              )}
                            </td>

                            <td className="px-4 py-3 text-right text-xs text-slate-300">
                              {item.gstRate ||
                                0}
                              %
                            </td>

                            <td className="px-4 py-3 text-right text-xs font-bold text-white">
                              {money(
                                calc.total
                              )}
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap justify-end gap-2 border-t border-white/[0.07] pt-4">
                {canEdit(
                  selectedExpense
                ) && (
                  <button
                    type="button"
                    onClick={() => {
                      setModal(
                        "edit"
                      );
                      openEdit(
                        selectedExpense
                      );
                    }}
                    className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/[0.08] px-4 text-xs font-bold text-slate-300"
                  >
                    <Pencil size={14} />
                    Edit
                  </button>
                )}

                {canSubmit(
                  selectedExpense
                ) && (
                  <button
                    type="button"
                    onClick={() =>
                      action(
                        selectedExpense,
                        "submit"
                      )
                    }
                    className="inline-flex h-9 items-center gap-2 rounded-xl bg-blue-500 px-4 text-xs font-bold"
                  >
                    <Send size={14} />
                    Submit
                  </button>
                )}

                {canApprove(
                  selectedExpense
                ) && (
                  <button
                    type="button"
                    onClick={() =>
                      action(
                        selectedExpense,
                        "approve"
                      )
                    }
                    className="inline-flex h-9 items-center gap-2 rounded-xl bg-emerald-500 px-4 text-xs font-bold"
                  >
                    <Check size={14} />
                    Approve
                  </button>
                )}

                {canPay(
                  selectedExpense
                ) && (
                  <button
                    type="button"
                    onClick={() =>
                      setModal("pay")
                    }
                    className="inline-flex h-9 items-center gap-2 rounded-xl bg-violet-500 px-4 text-xs font-bold"
                  >
                    <CreditCard
                      size={14}
                    />
                    Pay
                  </button>
                )}
              </div>
            </div>
          </Modal>
        )}

      {/* Delete */}
      {modal === "delete" &&
        selectedExpense && (
          <Modal
            title="Delete Expense"
            subtitle={
              selectedExpense.expenseNumber
            }
            onClose={closeModal}
          >
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
                <Trash2 size={23} />
              </div>

              <h3 className="mt-4 text-base font-bold">
                Delete this expense?
              </h3>

              <p className="mt-2 text-xs text-slate-600">
                This action will remove
                the expense from active
                records.
              </p>

              <div className="mt-5 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="h-10 rounded-xl border border-white/[0.08] px-5 text-xs font-bold text-slate-300"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={
                    actionLoading
                  }
                  onClick={() =>
                    action(
                      selectedExpense,
                      "delete"
                    )
                  }
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-500 px-5 text-xs font-bold"
                >
                  {actionLoading && (
                    <RefreshCw
                      size={14}
                      className="animate-spin"
                    />
                  )}
                  Delete
                </button>
              </div>
            </div>
          </Modal>
        )}

      {/* Reject */}
      {modal === "reject" &&
        selectedExpense && (
          <Modal
            title="Reject Expense"
            subtitle={
              selectedExpense.expenseNumber
            }
            onClose={closeModal}
          >
            <div className="space-y-4">
              <Field label="Rejection Reason">
                <textarea
                  id="expense-rejection-reason"
                  className={textareaClass}
                  placeholder="Enter rejection reason..."
                />
              </Field>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="h-10 rounded-xl border border-white/[0.08] px-5 text-xs font-bold text-slate-300"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={
                    actionLoading
                  }
                  onClick={() =>
                    action(
                      selectedExpense,
                      "reject",
                      {
                        reason:
                          document.getElementById(
                            "expense-rejection-reason"
                          )?.value ||
                          "",
                      }
                    )
                  }
                  className="h-10 rounded-xl bg-red-500 px-5 text-xs font-bold"
                >
                  Reject
                </button>
              </div>
            </div>
          </Modal>
        )}

      {/* Pay */}
      {modal === "pay" &&
        selectedExpense && (
          <Modal
            title="Pay Expense"
            subtitle={
              selectedExpense.expenseNumber
            }
            onClose={closeModal}
          >
            <div className="space-y-4">
              <div className="rounded-2xl border border-violet-500/15 bg-violet-500/5 p-4">
                <p className="text-xs text-slate-500">
                  Payment Amount
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {money(
                    selectedExpense.balanceAmount ??
                      selectedExpense.grandTotal
                  )}
                </p>
              </div>

              <Field label="Payment Method">
                <select
                  id="expense-payment-method"
                  defaultValue={
                    selectedExpense.paymentMethod ||
                    "cash"
                  }
                  className={selectClass}
                >
                  {PAYMENT_METHODS.map(
                    ([value, label]) => (
                      <option
                        key={value}
                        value={value}
                      >
                        {label}
                      </option>
                    )
                  )}
                </select>
              </Field>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="h-10 rounded-xl border border-white/[0.08] px-5 text-xs font-bold text-slate-300"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={
                    actionLoading
                  }
                  onClick={() =>
                    action(
                      selectedExpense,
                      "pay",
                      {
                        paymentMethod:
                          document.getElementById(
                            "expense-payment-method"
                          )?.value ||
                          "cash",
                      }
                    )
                  }
                  className="h-10 rounded-xl bg-violet-500 px-5 text-xs font-bold"
                >
                  Confirm Payment
                </button>
              </div>
            </div>
          </Modal>
        )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-[200] w-[calc(100%-2rem)] max-w-sm">
          <div
            className={`flex items-start gap-3 rounded-2xl border p-4 shadow-2xl ${
              toast.type === "success"
                ? "border-emerald-500/20 bg-[#0d1714]"
                : "border-red-500/20 bg-[#190e11]"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2
                size={18}
                className="text-emerald-400"
              />
            ) : (
              <AlertCircle
                size={18}
                className="text-red-400"
              />
            )}

            <div className="flex-1">
              <p className="text-xs font-bold">
                {toast.type ===
                "success"
                  ? "Success"
                  : "Error"}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                {toast.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setToast(null)
              }
            >
              <X
                size={15}
                className="text-slate-600 hover:text-white"
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;