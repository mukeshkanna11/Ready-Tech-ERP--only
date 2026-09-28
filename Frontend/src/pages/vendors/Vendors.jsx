import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Eye,
  Filter,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

import api from "../../services/api";

const VENDOR_ENDPOINT = "/vendors";
const BRANCH_ENDPOINT = "/branches";

const EMPTY_ADDRESS = {
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
};

const EMPTY_CONTACT = {
  name: "",
  designation: "",
  email: "",
  phone: "",
};

const EMPTY_FORM = {
  vendorCode: "",
  name: "",
  displayName: "",
  vendorType: "business",
  branchId: "",
  email: "",
  phone: "",
  alternatePhone: "",
  website: "",
  gstNumber: "",
  panNumber: "",
  taxNumber: "",
  creditLimit: "",
  paymentTerms: "",
  billingAddress: {
    ...EMPTY_ADDRESS,
  },
  shippingAddress: {
    ...EMPTY_ADDRESS,
  },
  contactPerson: {
    ...EMPTY_CONTACT,
  },
  notes: "",
  status: "active",
};

// ============================================================
// HELPERS
// ============================================================

const getListData = (response) => {
  const body = response?.data;

  if (Array.isArray(body)) {
    return {
      items: body,
      pagination: null,
    };
  }

  return {
    items:
      body?.data ||
      body?.vendors ||
      body?.items ||
      [],
    pagination:
      body?.pagination || null,
  };
};

const normalizeData = (response) => {
  return (
    response?.data?.data ??
    response?.data ??
    response
  );
};

const getErrorMessage = (
  error,
  fallback = "Something went wrong"
) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
};

const safeString = (value) => {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value);
};

const formatCurrency = (value) => {
  const number = Number(value || 0);

  if (Number.isNaN(number)) {
    return "₹0";
  }

  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }
  ).format(number);
};

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
};

const getBranchName = (branch) => {
  if (!branch) {
    return "No branch";
  }

  return (
    branch.name ||
    branch.branchName ||
    branch.code ||
    "Branch"
  );
};

// ============================================================
// STATUS BADGE
// ============================================================

const StatusBadge = ({
  status,
}) => {
  const active =
    status === "active";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
        active
          ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
          : "border-slate-500/20 bg-slate-500/10 text-slate-300"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active
            ? "bg-emerald-400"
            : "bg-slate-400"
        }`}
      />
      {active
        ? "Active"
        : "Inactive"}
    </span>
  );
};

// ============================================================
// VENDOR TYPE BADGE
// ============================================================

const VendorTypeBadge = ({
  type,
}) => {
  const business =
    type === "business";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${
        business
          ? "border-blue-400/20 bg-blue-400/10 text-blue-300"
          : "border-violet-400/20 bg-violet-400/10 text-violet-300"
      }`}
    >
      {business
        ? "Business"
        : "Individual"}
    </span>
  );
};

// ============================================================
// FIELD COMPONENT
// ============================================================

const Field = ({
  label,
  required = false,
  children,
  className = "",
}) => {
  return (
    <div
      className={`space-y-2 ${className}`}
    >
      <label className="block text-xs font-medium tracking-wide text-slate-400">
        {label}
        {required && (
          <span className="ml-1 text-rose-400">
            *
          </span>
        )}
      </label>

      {children}
    </div>
  );
};

const inputClass =
  "w-full rounded-xl border border-white/[0.08] bg-white/[0.035] px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-400/50 focus:bg-white/[0.055] focus:ring-2 focus:ring-indigo-500/10";

const selectClass =
  "w-full appearance-none rounded-xl border border-white/[0.08] bg-[#10141c] px-3.5 py-3 text-sm text-white outline-none transition focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-500/10";

// ============================================================
// ADDRESS FORM
// ============================================================

const AddressFields = ({
  value,
  onChange,
}) => {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field
        label="Address Line 1"
        className="sm:col-span-2"
      >
        <input
          className={inputClass}
          value={
            value?.addressLine1 || ""
          }
          onChange={(e) =>
            onChange(
              "addressLine1",
              e.target.value
            )
          }
          placeholder="Street / Building"
        />
      </Field>

      <Field
        label="Address Line 2"
        className="sm:col-span-2"
      >
        <input
          className={inputClass}
          value={
            value?.addressLine2 || ""
          }
          onChange={(e) =>
            onChange(
              "addressLine2",
              e.target.value
            )
          }
          placeholder="Area / Landmark"
        />
      </Field>

      <Field label="City">
        <input
          className={inputClass}
          value={
            value?.city || ""
          }
          onChange={(e) =>
            onChange(
              "city",
              e.target.value
            )
          }
          placeholder="Coimbatore"
        />
      </Field>

      <Field label="State">
        <input
          className={inputClass}
          value={
            value?.state || ""
          }
          onChange={(e) =>
            onChange(
              "state",
              e.target.value
            )
          }
          placeholder="Tamil Nadu"
        />
      </Field>

      <Field label="Postal Code">
        <input
          className={inputClass}
          value={
            value?.postalCode || ""
          }
          onChange={(e) =>
            onChange(
              "postalCode",
              e.target.value
            )
          }
          placeholder="641001"
        />
      </Field>

      <Field label="Country">
        <input
          className={inputClass}
          value={
            value?.country || ""
          }
          onChange={(e) =>
            onChange(
              "country",
              e.target.value
            )
          }
          placeholder="India"
        />
      </Field>
    </div>
  );
};

// ============================================================
// SECTION HEADER
// ============================================================

const FormSection = ({
  icon: Icon,
  title,
  description,
  children,
}) => {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.018]">
      <div className="border-b border-white/[0.06] px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-indigo-400/10 bg-indigo-400/[0.08] text-indigo-300">
            <Icon
              size={17}
            />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white">
              {title}
            </h3>

            {description && (
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {children}
      </div>
    </section>
  );
};

// ============================================================
// VENDOR FORM
// ============================================================

const VendorForm = ({
  form,
  setForm,
  branches,
  editing,
  submitting,
  onSubmit,
  onClose,
}) => {
  const updateField = (
    field,
    value
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateNestedField = (
    section,
    field,
    value
  ) => {
    setForm((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  return (
    <form
      onSubmit={onSubmit}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
        {/* BASIC INFORMATION */}
        <FormSection
          icon={Building2}
          title="Basic Information"
          description="Core vendor and business details."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Vendor Code"
              required
            >
              <input
                className={inputClass}
                value={
                  form.vendorCode
                }
                onChange={(e) =>
                  updateField(
                    "vendorCode",
                    e.target.value
                  )
                }
                placeholder="VEN-001"
                autoComplete="off"
              />
            </Field>

            <Field
              label="Vendor Name"
              required
            >
              <input
                className={inputClass}
                value={
                  form.name
                }
                onChange={(e) =>
                  updateField(
                    "name",
                    e.target.value
                  )
                }
                placeholder="ABC Industrial Supplies"
              />
            </Field>

            <Field label="Display Name">
              <input
                className={inputClass}
                value={
                  form.displayName
                }
                onChange={(e) =>
                  updateField(
                    "displayName",
                    e.target.value
                  )
                }
                placeholder="ABC Industrial Supplies"
              />
            </Field>

            <Field label="Vendor Type">
              <div className="relative">
                <select
                  className={
                    selectClass
                  }
                  value={
                    form.vendorType
                  }
                  onChange={(e) =>
                    updateField(
                      "vendorType",
                      e.target.value
                    )
                  }
                >
                  <option value="business">
                    Business
                  </option>
                  <option value="individual">
                    Individual
                  </option>
                </select>

                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
              </div>
            </Field>

            <Field label="Branch">
              <div className="relative">
                <select
                  className={
                    selectClass
                  }
                  value={
                    form.branchId
                  }
                  onChange={(e) =>
                    updateField(
                      "branchId",
                      e.target.value
                    )
                  }
                >
                  <option value="">
                    No branch
                  </option>

                  {branches.map(
                    (branch) => (
                      <option
                        key={
                          branch._id
                        }
                        value={
                          branch._id
                        }
                      >
                        {getBranchName(
                          branch
                        )}
                      </option>
                    )
                  )}
                </select>

                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
              </div>
            </Field>

            <Field label="Status">
              <div className="relative">
                <select
                  className={
                    selectClass
                  }
                  value={
                    form.status
                  }
                  onChange={(e) =>
                    updateField(
                      "status",
                      e.target.value
                    )
                  }
                >
                  <option value="active">
                    Active
                  </option>
                  <option value="inactive">
                    Inactive
                  </option>
                </select>

                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
              </div>
            </Field>
          </div>
        </FormSection>

        {/* CONTACT */}
        <FormSection
          icon={Phone}
          title="Contact Information"
          description="Primary communication details."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Email">
              <div className="relative">
                <Mail
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600"
                />

                <input
                  type="email"
                  className={`${inputClass} pl-10`}
                  value={
                    form.email
                  }
                  onChange={(e) =>
                    updateField(
                      "email",
                      e.target.value
                    )
                  }
                  placeholder="vendor@example.com"
                />
              </div>
            </Field>

            <Field label="Phone">
              <div className="relative">
                <Phone
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600"
                />

                <input
                  className={`${inputClass} pl-10`}
                  value={
                    form.phone
                  }
                  onChange={(e) =>
                    updateField(
                      "phone",
                      e.target.value
                    )
                  }
                  placeholder="+91 98765 43210"
                />
              </div>
            </Field>

            <Field label="Alternate Phone">
              <input
                className={inputClass}
                value={
                  form.alternatePhone
                }
                onChange={(e) =>
                  updateField(
                    "alternatePhone",
                    e.target.value
                  )
                }
                placeholder="+91 98765 43211"
              />
            </Field>

            <Field label="Website">
              <div className="relative">
                <Globe
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600"
                />

                <input
                  className={`${inputClass} pl-10`}
                  value={
                    form.website
                  }
                  onChange={(e) =>
                    updateField(
                      "website",
                      e.target.value
                    )
                  }
                  placeholder="https://example.com"
                />
              </div>
            </Field>
          </div>
        </FormSection>

        {/* TAX */}
        <FormSection
          icon={Building2}
          title="Tax & Financial Information"
          description="GST, PAN, credit and payment configuration."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="GST Number">
              <input
                className={inputClass}
                value={
                  form.gstNumber
                }
                onChange={(e) =>
                  updateField(
                    "gstNumber",
                    e.target.value
                      .toUpperCase()
                  )
                }
                placeholder="33ABCDE1234F1Z5"
              />
            </Field>

            <Field label="PAN Number">
              <input
                className={inputClass}
                value={
                  form.panNumber
                }
                onChange={(e) =>
                  updateField(
                    "panNumber",
                    e.target.value
                      .toUpperCase()
                  )
                }
                placeholder="ABCDE1234F"
              />
            </Field>

            <Field label="Tax Number">
              <input
                className={inputClass}
                value={
                  form.taxNumber
                }
                onChange={(e) =>
                  updateField(
                    "taxNumber",
                    e.target.value
                  )
                }
                placeholder="Tax registration number"
              />
            </Field>

            <Field label="Credit Limit">
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputClass}
                value={
                  form.creditLimit
                }
                onChange={(e) =>
                  updateField(
                    "creditLimit",
                    e.target.value
                  )
                }
                placeholder="0"
              />
            </Field>

            <Field label="Payment Terms">
              <input
                className={inputClass}
                value={safeString(
                  form.paymentTerms
                )}
                onChange={(e) =>
                  updateField(
                    "paymentTerms",
                    e.target.value
                  )
                }
                placeholder="30 Days"
              />
            </Field>
          </div>
        </FormSection>

        {/* BILLING ADDRESS */}
        <FormSection
          icon={MapPin}
          title="Billing Address"
          description="Registered billing address of the vendor."
        >
          <AddressFields
            value={
              form.billingAddress
            }
            onChange={(
              field,
              value
            ) =>
              updateNestedField(
                "billingAddress",
                field,
                value
              )
            }
          />
        </FormSection>

        {/* SHIPPING ADDRESS */}
        <FormSection
          icon={MapPin}
          title="Shipping Address"
          description="Vendor warehouse or delivery address."
        >
          <AddressFields
            value={
              form.shippingAddress
            }
            onChange={(
              field,
              value
            ) =>
              updateNestedField(
                "shippingAddress",
                field,
                value
              )
            }
          />
        </FormSection>

        {/* CONTACT PERSON */}
        <FormSection
          icon={UserRound}
          title="Contact Person"
          description="Primary person responsible for vendor communication."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Name">
              <input
                className={inputClass}
                value={
                  form
                    .contactPerson
                    ?.name || ""
                }
                onChange={(e) =>
                  updateNestedField(
                    "contactPerson",
                    "name",
                    e.target.value
                  )
                }
                placeholder="Contact person"
              />
            </Field>

            <Field label="Designation">
              <input
                className={inputClass}
                value={
                  form
                    .contactPerson
                    ?.designation ||
                  ""
                }
                onChange={(e) =>
                  updateNestedField(
                    "contactPerson",
                    "designation",
                    e.target.value
                  )
                }
                placeholder="Purchase Manager"
              />
            </Field>

            <Field label="Email">
              <input
                type="email"
                className={inputClass}
                value={
                  form
                    .contactPerson
                    ?.email || ""
                }
                onChange={(e) =>
                  updateNestedField(
                    "contactPerson",
                    "email",
                    e.target.value
                  )
                }
                placeholder="contact@example.com"
              />
            </Field>

            <Field label="Phone">
              <input
                className={inputClass}
                value={
                  form
                    .contactPerson
                    ?.phone || ""
                }
                onChange={(e) =>
                  updateNestedField(
                    "contactPerson",
                    "phone",
                    e.target.value
                  )
                }
                placeholder="+91 98765 43210"
              />
            </Field>
          </div>
        </FormSection>

        {/* NOTES */}
        <FormSection
          icon={Edit3}
          title="Notes"
          description="Additional vendor information."
        >
          <textarea
            rows={4}
            className={`${inputClass} resize-none`}
            value={
              form.notes
            }
            onChange={(e) =>
              updateField(
                "notes",
                e.target.value
              )
            }
            placeholder="Add any additional notes..."
          />
        </FormSection>
      </div>

      {/* FORM FOOTER */}
      <div className="shrink-0 border-t border-white/[0.07] bg-[#0b0e14]/95 px-4 py-4 backdrop-blur-xl sm:px-6">
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2
                  size={16}
                  className="animate-spin"
                />
                Saving...
              </>
            ) : (
              <>
                <Check
                  size={16}
                />
                {editing
                  ? "Update Vendor"
                  : "Create Vendor"}
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
};

// ============================================================
// VIEW DETAILS
// ============================================================

const DetailRow = ({
  label,
  value,
}) => {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
        {label}
      </p>

      <p className="mt-1.5 break-words text-sm text-slate-200">
        {value || "—"}
      </p>
    </div>
  );
};

const VendorDetails = ({
  vendor,
  onClose,
  onEdit,
}) => {
  const billing =
    vendor?.billingAddress ||
    {};

  const shipping =
    vendor?.shippingAddress ||
    {};

  const contact =
    vendor?.contactPerson ||
    {};

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        <div className="space-y-5">
          {/* HEADER */}
          <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-br from-indigo-500/[0.10] via-white/[0.02] to-transparent p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-indigo-400/15 bg-indigo-400/10 text-indigo-300">
                  <Building2
                    size={24}
                  />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-medium text-indigo-300">
                    {vendor.vendorCode}
                  </p>

                  <h3 className="mt-1 truncate text-lg font-semibold text-white">
                    {vendor.name}
                  </h3>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusBadge
                      status={
                        vendor.status
                      }
                    />

                    <VendorTypeBadge
                      type={
                        vendor.vendorType
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <p className="text-xs text-slate-500">
                  Credit Limit
                </p>

                <p className="mt-1 text-lg font-semibold text-white">
                  {formatCurrency(
                    vendor.creditLimit
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* BASIC */}
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Vendor Information
            </h4>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailRow
                label="Vendor Code"
                value={
                  vendor.vendorCode
                }
              />

              <DetailRow
                label="Display Name"
                value={
                  vendor.displayName
                }
              />

              <DetailRow
                label="Vendor Type"
                value={
                  vendor.vendorType ===
                  "individual"
                    ? "Individual"
                    : "Business"
                }
              />

              <DetailRow
                label="Branch"
                value={getBranchName(
                  vendor.branchId
                )}
              />

              <DetailRow
                label="Created"
                value={formatDate(
                  vendor.createdAt
                )}
              />

              <DetailRow
                label="Updated"
                value={formatDate(
                  vendor.updatedAt
                )}
              />
            </div>
          </div>

          {/* CONTACT */}
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Contact
            </h4>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailRow
                label="Email"
                value={
                  vendor.email
                }
              />

              <DetailRow
                label="Phone"
                value={
                  vendor.phone
                }
              />

              <DetailRow
                label="Alternate Phone"
                value={
                  vendor.alternatePhone
                }
              />

              <DetailRow
                label="Website"
                value={
                  vendor.website
                }
              />
            </div>
          </div>

          {/* TAX */}
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Tax & Payment
            </h4>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailRow
                label="GST Number"
                value={
                  vendor.gstNumber
                }
              />

              <DetailRow
                label="PAN Number"
                value={
                  vendor.panNumber
                }
              />

              <DetailRow
                label="Tax Number"
                value={
                  vendor.taxNumber
                }
              />

              <DetailRow
                label="Credit Limit"
                value={formatCurrency(
                  vendor.creditLimit
                )}
              />

              <DetailRow
                label="Payment Terms"
                value={
                  vendor.paymentTerms
                }
              />
            </div>
          </div>

          {/* BILLING */}
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Billing Address
            </h4>

            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-sm leading-6 text-slate-300">
                {billing.addressLine1 ||
                  "—"}
                {billing.addressLine2 && (
                  <>
                    <br />
                    {
                      billing.addressLine2
                    }
                  </>
                )}
                {(billing.city ||
                  billing.state ||
                  billing.postalCode) && (
                  <>
                    <br />
                    {[
                      billing.city,
                      billing.state,
                      billing.postalCode,
                    ]
                      .filter(Boolean)
                      .join(
                        ", "
                      )}
                  </>
                )}
                {billing.country && (
                  <>
                    <br />
                    {
                      billing.country
                    }
                  </>
                )}
              </p>
            </div>
          </div>

          {/* SHIPPING */}
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Shipping Address
            </h4>

            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-sm leading-6 text-slate-300">
                {shipping.addressLine1 ||
                  "—"}
                {shipping.addressLine2 && (
                  <>
                    <br />
                    {
                      shipping.addressLine2
                    }
                  </>
                )}
                {(shipping.city ||
                  shipping.state ||
                  shipping.postalCode) && (
                  <>
                    <br />
                    {[
                      shipping.city,
                      shipping.state,
                      shipping.postalCode,
                    ]
                      .filter(Boolean)
                      .join(
                        ", "
                      )}
                  </>
                )}
                {shipping.country && (
                  <>
                    <br />
                    {
                      shipping.country
                    }
                  </>
                )}
              </p>
            </div>
          </div>

          {/* CONTACT PERSON */}
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Contact Person
            </h4>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailRow
                label="Name"
                value={
                  contact.name
                }
              />

              <DetailRow
                label="Designation"
                value={
                  contact.designation
                }
              />

              <DetailRow
                label="Email"
                value={
                  contact.email
                }
              />

              <DetailRow
                label="Phone"
                value={
                  contact.phone
                }
              />
            </div>
          </div>

          {/* NOTES */}
          {vendor.notes && (
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Notes
              </h4>

              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">
                  {vendor.notes}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-white/[0.07] bg-[#0b0e14]/95 px-4 py-4 backdrop-blur-xl sm:px-6">
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
          >
            Close
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onEdit(vendor);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400"
          >
            <Edit3 size={15} />
            Edit Vendor
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// MODAL
// ============================================================

const Modal = ({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
        onClick={onClose}
      />

      <div
        className={`relative flex max-h-[94vh] w-full flex-col overflow-hidden rounded-3xl border border-white/[0.09] bg-[#0b0e14] shadow-2xl shadow-black/50 ${
          wide
            ? "max-w-5xl"
            : "max-w-2xl"
        }`}
      >
        <div className="flex shrink-0 items-start justify-between border-b border-white/[0.07] px-4 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0 pr-4">
            <h2 className="truncate text-lg font-semibold text-white sm:text-xl">
              {title}
            </h2>

            {subtitle && (
              <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                {subtitle}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03] text-slate-400 transition hover:bg-white/[0.07] hover:text-white"
          >
            <X size={17} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

const Vendors = () => {
  const [vendors, setVendors] =
    useState([]);

  const [branches, setBranches] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [
    branchesLoading,
    setBranchesLoading,
  ] = useState(true);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    deletingId,
    setDeletingId,
  ] = useState(null);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("");

  const [
    vendorTypeFilter,
    setVendorTypeFilter,
  ] = useState("");

  const [
    branchFilter,
    setBranchFilter,
  ] = useState("");

  const [page, setPage] =
    useState(1);

  const [limit, setLimit] =
    useState(10);

  const [
    pagination,
    setPagination,
  ] = useState(null);

  const [
    showFilters,
    setShowFilters,
  ] = useState(false);

  const [
    showForm,
    setShowForm,
  ] = useState(false);

  const [
    showDetails,
    setShowDetails,
  ] = useState(false);

  const [
    editingVendor,
    setEditingVendor,
  ] = useState(null);

  const [
    selectedVendor,
    setSelectedVendor,
  ] = useState(null);

  const [form, setForm] =
    useState({
      ...EMPTY_FORM,
      billingAddress: {
        ...EMPTY_ADDRESS,
      },
      shippingAddress: {
        ...EMPTY_ADDRESS,
      },
      contactPerson: {
        ...EMPTY_CONTACT,
      },
    });

  // ==========================================================
  // FETCH BRANCHES
  // ==========================================================

  const fetchBranches =
    useCallback(
      async () => {
        setBranchesLoading(true);

        try {
          const response =
            await api.get(
              BRANCH_ENDPOINT
            );

          const data =
            normalizeData(
              response
            );

          let branchItems = [];

          if (Array.isArray(data)) {
            branchItems = data;
          } else if (
            Array.isArray(
              data?.data
            )
          ) {
            branchItems =
              data.data;
          } else if (
            Array.isArray(
              response?.data
                ?.data
            )
          ) {
            branchItems =
              response.data.data;
          } else if (
            Array.isArray(
              response?.data
                ?.branches
            )
          ) {
            branchItems =
              response.data.branches;
          }

          setBranches(
            branchItems
          );
        } catch (err) {
          setBranches([]);
          setError(
            getErrorMessage(
              err,
              "Unable to load branches"
            )
          );
        } finally {
          setBranchesLoading(
            false
          );
        }
      },
      []
    );

  // ==========================================================
  // FETCH VENDORS
  // ==========================================================

  const fetchVendors =
    useCallback(
      async () => {
        setLoading(true);
        setError("");

        try {
          const params = {
            page,
            limit,
          };

          if (
            search.trim()
          ) {
            params.search =
              search.trim();
          }

          if (
            statusFilter
          ) {
            params.status =
              statusFilter;
          }

          if (
            vendorTypeFilter
          ) {
            params.vendorType =
              vendorTypeFilter;
          }

          if (
            branchFilter
          ) {
            params.branchId =
              branchFilter;
          }

          const response =
            await api.get(
              VENDOR_ENDPOINT,
              {
                params,
              }
            );

          const result =
            getListData(
              response
            );

          setVendors(
            Array.isArray(
              result.items
            )
              ? result.items
              : []
          );

          setPagination(
            result.pagination
          );
        } catch (err) {
          setVendors([]);
          setPagination(null);

          setError(
            getErrorMessage(
              err,
              "Unable to fetch vendors"
            )
          );
        } finally {
          setLoading(false);
        }
      },
      [
        page,
        limit,
        search,
        statusFilter,
        vendorTypeFilter,
        branchFilter,
      ]
    );

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  // ==========================================================
  // AUTO CLEAR ALERTS
  // ==========================================================

  useEffect(() => {
    if (!success) {
      return;
    }

    const timer =
      setTimeout(
        () =>
          setSuccess(""),
        3500
      );

    return () =>
      clearTimeout(timer);
  }, [success]);

  useEffect(() => {
    if (!error) {
      return;
    }

    const timer =
      setTimeout(
        () => setError(""),
        5000
      );

    return () =>
      clearTimeout(timer);
  }, [error]);

  // ==========================================================
  // STATS
  // ==========================================================

  const stats =
    useMemo(() => {
      const active =
        vendors.filter(
          (item) =>
            item.status ===
            "active"
        ).length;

      const inactive =
        vendors.filter(
          (item) =>
            item.status ===
            "inactive"
        ).length;

      const totalCredit =
        vendors.reduce(
          (sum, item) =>
            sum +
            Number(
              item.creditLimit ||
                0
            ),
          0
        );

      return {
        visible: vendors.length,
        active,
        inactive,
        totalCredit,
      };
    }, [vendors]);

  // ==========================================================
  // OPEN CREATE
  // ==========================================================

  const openCreate =
    () => {
      setEditingVendor(null);

      setForm({
        ...EMPTY_FORM,
        billingAddress: {
          ...EMPTY_ADDRESS,
        },
        shippingAddress: {
          ...EMPTY_ADDRESS,
        },
        contactPerson: {
          ...EMPTY_CONTACT,
        },
      });

      setShowDetails(false);
      setShowForm(true);
    };

  // ==========================================================
  // OPEN EDIT
  // ==========================================================

  const openEdit =
    (vendor) => {
      setEditingVendor(
        vendor
      );

      setForm({
        vendorCode:
          safeString(
            vendor.vendorCode
          ),

        name:
          safeString(
            vendor.name
          ),

        displayName:
          safeString(
            vendor.displayName
          ),

        vendorType:
          vendor.vendorType ||
          "business",

        branchId:
          typeof vendor.branchId ===
          "object"
            ? vendor.branchId?._id ||
              ""
            : vendor.branchId ||
              "",

        email:
          safeString(
            vendor.email
          ),

        phone:
          safeString(
            vendor.phone
          ),

        alternatePhone:
          safeString(
            vendor.alternatePhone
          ),

        website:
          safeString(
            vendor.website
          ),

        gstNumber:
          safeString(
            vendor.gstNumber
          ),

        panNumber:
          safeString(
            vendor.panNumber
          ),

        taxNumber:
          safeString(
            vendor.taxNumber
          ),

        creditLimit:
          vendor.creditLimit ===
            null ||
          vendor.creditLimit ===
            undefined
            ? ""
            : String(
                vendor.creditLimit
              ),

        paymentTerms:
          safeString(
            vendor.paymentTerms
          ),

        billingAddress: {
          ...EMPTY_ADDRESS,
          ...(vendor.billingAddress ||
            {}),
        },

        shippingAddress: {
          ...EMPTY_ADDRESS,
          ...(vendor.shippingAddress ||
            {}),
        },

        contactPerson: {
          ...EMPTY_CONTACT,
          ...(vendor.contactPerson ||
            {}),
        },

        notes:
          safeString(
            vendor.notes
          ),

        status:
          vendor.status ||
          "active",
      });

      setShowDetails(false);
      setShowForm(true);
    };

  // ==========================================================
  // VIEW
  // ==========================================================

  const openDetails =
    (vendor) => {
      setSelectedVendor(
        vendor
      );

      setShowDetails(true);
    };

  // ==========================================================
  // SAVE
  // ==========================================================

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      setError("");
      setSuccess("");

      const vendorCode =
        safeString(
          form.vendorCode
        )
          .trim()
          .toUpperCase();

      const name =
        safeString(
          form.name
        ).trim();

      if (!vendorCode) {
        setError(
          "Vendor code is required."
        );
        return;
      }

      if (!name) {
        setError(
          "Vendor name is required."
        );
        return;
      }

      const creditLimitRaw =
        form.creditLimit;

      let creditLimit = 0;

      if (
        creditLimitRaw !==
          "" &&
        creditLimitRaw !==
          null &&
        creditLimitRaw !==
          undefined
      ) {
        creditLimit =
          Number(
            creditLimitRaw
          );

        if (
          Number.isNaN(
            creditLimit
          ) ||
          creditLimit < 0
        ) {
          setError(
            "Credit limit must be a valid positive number."
          );
          return;
        }
      }

      /*
       * IMPORTANT:
       * Everything is normalized before sending.
       * paymentTerms is always safely converted to string.
       */
      const payload = {
        vendorCode,

        name,

        displayName:
          safeString(
            form.displayName
          ).trim(),

        vendorType:
          form.vendorType ||
          "business",

        email:
          safeString(
            form.email
          )
            .trim()
            .toLowerCase(),

        phone:
          safeString(
            form.phone
          ).trim(),

        alternatePhone:
          safeString(
            form.alternatePhone
          ).trim(),

        website:
          safeString(
            form.website
          ).trim(),

        gstNumber:
          safeString(
            form.gstNumber
          )
            .trim()
            .toUpperCase(),

        panNumber:
          safeString(
            form.panNumber
          )
            .trim()
            .toUpperCase(),

        taxNumber:
          safeString(
            form.taxNumber
          ).trim(),

        creditLimit,

        paymentTerms:
          form.paymentTerms ===
            null ||
          form.paymentTerms ===
            undefined
            ? ""
            : String(
                form.paymentTerms
              ).trim(),

        billingAddress: {
          ...EMPTY_ADDRESS,
          ...(form.billingAddress ||
            {}),
        },

        shippingAddress: {
          ...EMPTY_ADDRESS,
          ...(form.shippingAddress ||
            {}),
        },

        contactPerson: {
          ...EMPTY_CONTACT,
          ...(form.contactPerson ||
            {}),
        },

        notes:
          safeString(
            form.notes
          ).trim(),

        status:
          form.status ||
          "active",
      };

      /*
       * Do not send empty branchId.
       */
      if (
        form.branchId
      ) {
        payload.branchId =
          form.branchId;
      }

      setSubmitting(true);

      try {
        if (editingVendor?._id) {
          await api.put(
            `${VENDOR_ENDPOINT}/${editingVendor._id}`,
            payload
          );

          setSuccess(
            "Vendor updated successfully."
          );
        } else {
          await api.post(
            VENDOR_ENDPOINT,
            payload
          );

          setSuccess(
            "Vendor created successfully."
          );
        }

        setShowForm(false);
        setEditingVendor(null);

        await fetchVendors();
      } catch (err) {
        setError(
          getErrorMessage(
            err,
            editingVendor
              ? "Unable to update vendor."
              : "Unable to create vendor."
          )
        );
      } finally {
        setSubmitting(false);
      }
    };

  // ==========================================================
  // DELETE
  // ==========================================================

  const handleDelete =
    async (vendor) => {
      if (
        !vendor?._id
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          `Delete vendor "${vendor.name}"?`
        );

      if (!confirmed) {
        return;
      }

      setDeletingId(
        vendor._id
      );

      setError("");
      setSuccess("");

      try {
        await api.delete(
          `${VENDOR_ENDPOINT}/${vendor._id}`
        );

        setSuccess(
          "Vendor deleted successfully."
        );

        await fetchVendors();
      } catch (err) {
        setError(
          getErrorMessage(
            err,
            "Unable to delete vendor."
          )
        );
      } finally {
        setDeletingId(null);
      }
    };

  // ==========================================================
  // RESET FILTERS
  // ==========================================================

  const resetFilters =
    () => {
      setSearch("");
      setStatusFilter("");
      setVendorTypeFilter("");
      setBranchFilter("");
      setPage(1);
    };

  const hasFilters =
    Boolean(
      search ||
        statusFilter ||
        vendorTypeFilter ||
        branchFilter
    );

  // ==========================================================
  // PAGINATION
  // ==========================================================

  const totalPages =
    pagination?.totalPages ||
    pagination?.pages ||
    1;

  const currentPage =
    pagination?.page ||
    page;

  const total =
    pagination?.total ??
    vendors.length;

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="min-h-full w-full bg-[#07090d] text-white">
      <div className="mx-auto w-full max-w-[1800px] px-3 py-4 sm:px-5 sm:py-6 lg:px-7">
        {/* =====================================================
            PAGE HEADER
        ====================================================== */}
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-br from-white/[0.045] via-white/[0.02] to-indigo-500/[0.035] p-5 shadow-2xl shadow-black/10 sm:p-7">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-500/[0.08] blur-3xl" />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-indigo-400/15 bg-indigo-400/10 text-indigo-300 shadow-lg shadow-indigo-500/10 sm:h-14 sm:w-14">
                <Building2
                  size={25}
                />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-300">
                    Procurement
                  </p>

                  <span className="h-1 w-1 rounded-full bg-slate-700" />

                  <p className="text-[10px] uppercase tracking-[0.15em] text-slate-600">
                    Vendor Management
                  </p>
                </div>

                <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Vendors
                </h1>

                <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
                  Manage suppliers, vendor
                  contacts, tax information,
                  branches and payment terms
                  from one workspace.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={openCreate}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-xl shadow-indigo-500/20 transition hover:-translate-y-0.5 hover:bg-indigo-400"
            >
              <Plus
                size={17}
              />
              Add Vendor
            </button>
          </div>
        </div>

        {/* =====================================================
            ALERTS
        ====================================================== */}

        {(error ||
          success) && (
          <div className="mt-4">
            {error && (
              <div className="flex items-start gap-3 rounded-2xl border border-rose-400/15 bg-rose-400/[0.07] px-4 py-3.5 text-sm text-rose-200">
                <AlertCircle
                  size={18}
                  className="mt-0.5 shrink-0 text-rose-400"
                />

                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {error}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setError("")
                  }
                  className="text-rose-400/70 hover:text-rose-300"
                >
                  <X
                    size={16}
                  />
                </button>
              </div>
            )}

            {success && (
              <div className="flex items-start gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.07] px-4 py-3.5 text-sm text-emerald-200">
                <Check
                  size={18}
                  className="mt-0.5 shrink-0 text-emerald-400"
                />

                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {success}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSuccess("")
                  }
                  className="text-emerald-400/70 hover:text-emerald-300"
                >
                  <X
                    size={16}
                  />
                </button>
              </div>
            )}
          </div>
        )}

        {/* =====================================================
            STATS
        ====================================================== */}

        <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
              Vendors
            </p>

            <p className="mt-2 text-xl font-bold text-white">
              {pagination?.total ??
                stats.visible}
            </p>

            <p className="mt-1 text-xs text-slate-600">
              Total records
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-400/[0.08] bg-emerald-400/[0.025] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
              Active
            </p>

            <p className="mt-2 text-xl font-bold text-emerald-300">
              {stats.active}
            </p>

            <p className="mt-1 text-xs text-slate-600">
              Current page
            </p>
          </div>

          <div className="rounded-2xl border border-slate-400/[0.08] bg-white/[0.02] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
              Inactive
            </p>

            <p className="mt-2 text-xl font-bold text-slate-300">
              {stats.inactive}
            </p>

            <p className="mt-1 text-xs text-slate-600">
              Current page
            </p>
          </div>

          <div className="rounded-2xl border border-indigo-400/[0.08] bg-indigo-400/[0.025] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
              Credit Limit
            </p>

            <p className="mt-2 truncate text-xl font-bold text-indigo-300">
              {formatCurrency(
                stats.totalCredit
              )}
            </p>

            <p className="mt-1 text-xs text-slate-600">
              Current page
            </p>
          </div>
        </div>

        {/* =====================================================
            TOOLBAR
        ====================================================== */}

        <div className="mt-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search
                size={17}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600"
              />

              <input
                value={search}
                onChange={(e) => {
                  setSearch(
                    e.target.value
                  );
                  setPage(1);
                }}
                placeholder="Search vendor code, name, email, phone, GST or PAN..."
                className="w-full rounded-xl border border-white/[0.07] bg-black/20 py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-500/10"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setShowFilters(
                    (value) =>
                      !value
                  )
                }
                className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-3 text-sm font-medium transition ${
                  hasFilters
                    ? "border-indigo-400/25 bg-indigo-400/10 text-indigo-300"
                    : "border-white/[0.07] bg-white/[0.025] text-slate-400 hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                <Filter
                  size={16}
                />
                Filters

                {hasFilters && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-400/20 px-1 text-[10px] text-indigo-300">
                    {
                      [
                        statusFilter,
                        vendorTypeFilter,
                        branchFilter,
                      ].filter(Boolean)
                        .length
                    }
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  fetchVendors();
                  fetchBranches();
                }}
                disabled={
                  loading ||
                  branchesLoading
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-3 text-sm font-medium text-slate-400 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-50"
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
            </div>
          </div>

          {showFilters && (
            <div className="mt-3 grid grid-cols-1 gap-3 border-t border-white/[0.06] pt-3 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                  Status
                </label>

                <div className="relative">
                  <select
                    value={
                      statusFilter
                    }
                    onChange={(e) => {
                      setStatusFilter(
                        e.target.value
                      );
                      setPage(1);
                    }}
                    className={selectClass}
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
                    size={15}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                  Vendor Type
                </label>

                <div className="relative">
                  <select
                    value={
                      vendorTypeFilter
                    }
                    onChange={(e) => {
                      setVendorTypeFilter(
                        e.target.value
                      );
                      setPage(1);
                    }}
                    className={selectClass}
                  >
                    <option value="">
                      All Types
                    </option>
                    <option value="business">
                      Business
                    </option>
                    <option value="individual">
                      Individual
                    </option>
                  </select>

                  <ChevronDown
                    size={15}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                  Branch
                </label>

                <div className="relative">
                  <select
                    value={
                      branchFilter
                    }
                    onChange={(e) => {
                      setBranchFilter(
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
                          key={
                            branch._id
                          }
                          value={
                            branch._id
                          }
                        >
                          {getBranchName(
                            branch
                          )}
                        </option>
                      )
                    )}
                  </select>

                  <ChevronDown
                    size={15}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={
                    resetFilters
                  }
                  disabled={
                    !hasFilters
                  }
                  className="w-full rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-sm font-medium text-slate-400 transition hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* =====================================================
            TABLE / CARDS
        ====================================================== */}

        <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02]">
          {/* DESKTOP */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[1050px]">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="px-5 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                    Vendor
                  </th>

                  <th className="px-5 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                    Contact
                  </th>

                  <th className="px-5 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                    Branch
                  </th>

                  <th className="px-5 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                    Tax
                  </th>

                  <th className="px-5 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                    Credit
                  </th>

                  <th className="px-5 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                    Status
                  </th>

                  <th className="px-5 py-4 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/[0.045]">
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-16 text-center"
                    >
                      <Loader2
                        size={25}
                        className="mx-auto animate-spin text-indigo-400"
                      />

                      <p className="mt-3 text-sm text-slate-500">
                        Loading vendors...
                      </p>
                    </td>
                  </tr>
                ) : vendors.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-16 text-center"
                    >
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.025] text-slate-600">
                        <Building2
                          size={22}
                        />
                      </div>

                      <p className="mt-4 text-sm font-medium text-slate-300">
                        No vendors found
                      </p>

                      <p className="mt-1 text-xs text-slate-600">
                        {hasFilters
                          ? "Try changing your filters."
                          : "Create your first vendor to get started."}
                      </p>

                      {!hasFilters && (
                        <button
                          type="button"
                          onClick={
                            openCreate
                          }
                          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-400"
                        >
                          <Plus
                            size={15}
                          />
                          Add Vendor
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  vendors.map(
                    (vendor) => (
                      <tr
                        key={
                          vendor._id
                        }
                        className="group transition hover:bg-white/[0.025]"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.035] text-slate-400">
                              <Building2
                                size={17}
                              />
                            </div>

                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() =>
                                  openDetails(
                                    vendor
                                  )
                                }
                                className="block max-w-[260px] truncate text-sm font-semibold text-white transition hover:text-indigo-300"
                              >
                                {
                                  vendor.name
                                }
                              </button>

                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                <span className="font-mono text-[10px] text-indigo-300">
                                  {
                                    vendor.vendorCode
                                  }
                                </span>

                                <VendorTypeBadge
                                  type={
                                    vendor.vendorType
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="space-y-1">
                            {vendor.email && (
                              <div className="flex max-w-[220px] items-center gap-2 truncate text-xs text-slate-400">
                                <Mail
                                  size={13}
                                  className="shrink-0 text-slate-600"
                                />
                                <span className="truncate">
                                  {
                                    vendor.email
                                  }
                                </span>
                              </div>
                            )}

                            {vendor.phone && (
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <Phone
                                  size={13}
                                  className="shrink-0 text-slate-600"
                                />
                                {
                                  vendor.phone
                                }
                              </div>
                            )}

                            {!vendor.email &&
                              !vendor.phone && (
                                <span className="text-xs text-slate-600">
                                  No contact
                                </span>
                              )}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <MapPin
                              size={13}
                              className="text-slate-600"
                            />
                            <span className="max-w-[150px] truncate">
                              {getBranchName(
                                vendor.branchId
                              )}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="space-y-1">
                            <p className="font-mono text-[11px] text-slate-300">
                              {vendor.gstNumber ||
                                "No GST"}
                            </p>

                            {vendor.panNumber && (
                              <p className="font-mono text-[10px] text-slate-600">
                                {
                                  vendor.panNumber
                                }
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div>
                            <p className="text-sm font-semibold text-slate-200">
                              {formatCurrency(
                                vendor.creditLimit
                              )}
                            </p>

                            {vendor.paymentTerms && (
                              <p className="mt-1 text-[10px] text-slate-600">
                                {
                                  vendor.paymentTerms
                                }
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge
                            status={
                              vendor.status
                            }
                          />
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-1.5 opacity-70 transition group-hover:opacity-100">
                            <button
                              type="button"
                              title="View"
                              onClick={() =>
                                openDetails(
                                  vendor
                                )
                              }
                              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.025] text-slate-500 transition hover:border-indigo-400/20 hover:bg-indigo-400/10 hover:text-indigo-300"
                            >
                              <Eye
                                size={15}
                              />
                            </button>

                            <button
                              type="button"
                              title="Edit"
                              onClick={() =>
                                openEdit(
                                  vendor
                                )
                              }
                              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.025] text-slate-500 transition hover:border-amber-400/20 hover:bg-amber-400/10 hover:text-amber-300"
                            >
                              <Edit3
                                size={15}
                              />
                            </button>

                            <button
                              type="button"
                              title="Delete"
                              disabled={
                                deletingId ===
                                vendor._id
                              }
                              onClick={() =>
                                handleDelete(
                                  vendor
                                )
                              }
                              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.025] text-slate-500 transition hover:border-rose-400/20 hover:bg-rose-400/10 hover:text-rose-300 disabled:opacity-40"
                            >
                              {deletingId ===
                              vendor._id ? (
                                <Loader2
                                  size={
                                    15
                                  }
                                  className="animate-spin"
                                />
                              ) : (
                                <Trash2
                                  size={
                                    15
                                  }
                                />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* MOBILE / TABLET CARDS */}
          <div className="lg:hidden">
            {loading ? (
              <div className="px-5 py-16 text-center">
                <Loader2
                  size={25}
                  className="mx-auto animate-spin text-indigo-400"
                />

                <p className="mt-3 text-sm text-slate-500">
                  Loading vendors...
                </p>
              </div>
            ) : vendors.length ===
              0 ? (
              <div className="px-5 py-16 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.025] text-slate-600">
                  <Building2
                    size={22}
                  />
                </div>

                <p className="mt-4 text-sm font-medium text-slate-300">
                  No vendors found
                </p>

                <p className="mt-1 text-xs text-slate-600">
                  {hasFilters
                    ? "Try changing your filters."
                    : "Create your first vendor to get started."}
                </p>

                {!hasFilters && (
                  <button
                    type="button"
                    onClick={
                      openCreate
                    }
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-xs font-semibold text-white"
                  >
                    <Plus
                      size={15}
                    />
                    Add Vendor
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-white/[0.05]">
                {vendors.map(
                  (vendor) => (
                    <div
                      key={
                        vendor._id
                      }
                      className="p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.035] text-slate-400">
                            <Building2
                              size={18}
                            />
                          </div>

                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() =>
                                openDetails(
                                  vendor
                                )
                              }
                              className="block max-w-[calc(100vw-150px)] truncate text-sm font-semibold text-white hover:text-indigo-300"
                            >
                              {
                                vendor.name
                              }
                            </button>

                            <p className="mt-1 font-mono text-[10px] text-indigo-300">
                              {
                                vendor.vendorCode
                              }
                            </p>
                          </div>
                        </div>

                        <StatusBadge
                          status={
                            vendor.status
                          }
                        />
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                          <p className="text-[9px] uppercase tracking-wider text-slate-600">
                            Type
                          </p>

                          <div className="mt-1.5">
                            <VendorTypeBadge
                              type={
                                vendor.vendorType
                              }
                            />
                          </div>
                        </div>

                        <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                          <p className="text-[9px] uppercase tracking-wider text-slate-600">
                            Credit
                          </p>

                          <p className="mt-1.5 text-xs font-semibold text-slate-200">
                            {formatCurrency(
                              vendor.creditLimit
                            )}
                          </p>
                        </div>

                        <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                          <p className="text-[9px] uppercase tracking-wider text-slate-600">
                            Branch
                          </p>

                          <p className="mt-1.5 truncate text-xs text-slate-400">
                            {getBranchName(
                              vendor.branchId
                            )}
                          </p>
                        </div>

                        <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                          <p className="text-[9px] uppercase tracking-wider text-slate-600">
                            Payment
                          </p>

                          <p className="mt-1.5 truncate text-xs text-slate-400">
                            {vendor.paymentTerms ||
                              "—"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 space-y-2">
                        {vendor.email && (
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Mail
                              size={13}
                              className="text-slate-600"
                            />
                            <span className="truncate">
                              {
                                vendor.email
                              }
                            </span>
                          </div>
                        )}

                        {vendor.phone && (
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Phone
                              size={13}
                              className="text-slate-600"
                            />
                            {
                              vendor.phone
                            }
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openDetails(
                              vendor
                            )
                          }
                          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] py-2.5 text-xs font-medium text-slate-400 hover:bg-white/[0.05] hover:text-white"
                        >
                          <Eye
                            size={14}
                          />
                          View
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openEdit(
                              vendor
                            )
                          }
                          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] py-2.5 text-xs font-medium text-slate-400 hover:bg-amber-400/10 hover:text-amber-300"
                        >
                          <Edit3
                            size={14}
                          />
                          Edit
                        </button>

                        <button
                          type="button"
                          disabled={
                            deletingId ===
                            vendor._id
                          }
                          onClick={() =>
                            handleDelete(
                              vendor
                            )
                          }
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-slate-500 hover:bg-rose-400/10 hover:text-rose-300 disabled:opacity-40"
                        >
                          {deletingId ===
                          vendor._id ? (
                            <Loader2
                              size={
                                15
                              }
                              className="animate-spin"
                            />
                          ) : (
                            <Trash2
                              size={
                                15
                              }
                            />
                          )}
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          {/* ===================================================
              PAGINATION
          ==================================================== */}

          {!loading &&
            vendors.length >
              0 && (
              <div className="flex flex-col gap-3 border-t border-white/[0.06] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="flex items-center gap-3">
                  <p className="text-xs text-slate-600">
                    Showing{" "}
                    <span className="text-slate-400">
                      {vendors.length}
                    </span>{" "}
                    of{" "}
                    <span className="text-slate-400">
                      {total}
                    </span>
                  </p>

                  <div className="hidden items-center gap-2 sm:flex">
                    <span className="text-xs text-slate-700">
                      Rows
                    </span>

                    <select
                      value={limit}
                      onChange={(e) => {
                        setLimit(
                          Number(
                            e.target.value
                          )
                        );
                        setPage(1);
                      }}
                      className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-2 py-1.5 text-xs text-slate-400 outline-none"
                    >
                      <option value={10}>
                        10
                      </option>
                      <option value={20}>
                        20
                      </option>
                      <option value={50}>
                        50
                      </option>
                      <option value={100}>
                        100
                      </option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 sm:justify-end">
                  <span className="text-xs text-slate-600">
                    Page{" "}
                    <span className="text-slate-300">
                      {
                        currentPage
                      }
                    </span>{" "}
                    /{" "}
                    <span className="text-slate-300">
                      {Math.max(
                        totalPages,
                        1
                      )}
                    </span>
                  </span>

                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      disabled={
                        currentPage <=
                        1
                      }
                      onClick={() =>
                        setPage(
                          (value) =>
                            Math.max(
                              value -
                                1,
                              1
                            )
                        )
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025] text-slate-500 transition hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ChevronLeft
                        size={15}
                      />
                    </button>

                    <button
                      type="button"
                      disabled={
                        currentPage >=
                        totalPages
                      }
                      onClick={() =>
                        setPage(
                          (value) =>
                            value +
                            1
                        )
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025] text-slate-500 transition hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ChevronRight
                        size={15}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* =======================================================
          CREATE / EDIT MODAL
      ======================================================== */}

      {showForm && (
        <Modal
          title={
            editingVendor
              ? "Edit Vendor"
              : "Add New Vendor"
          }
          subtitle={
            editingVendor
              ? "Update vendor information and configuration."
              : "Create a new supplier/vendor for your workspace."
          }
          onClose={() =>
            !submitting &&
            setShowForm(false)
          }
          wide
        >
          <VendorForm
            form={form}
            setForm={setForm}
            branches={branches}
            editing={
              Boolean(
                editingVendor
              )
            }
            submitting={
              submitting
            }
            onSubmit={
              handleSubmit
            }
            onClose={() =>
              !submitting &&
              setShowForm(false)
            }
          />
        </Modal>
      )}

      {/* =======================================================
          DETAILS MODAL
      ======================================================== */}

      {showDetails &&
        selectedVendor && (
          <Modal
            title="Vendor Details"
            subtitle={`${selectedVendor.vendorCode} · ${selectedVendor.name}`}
            onClose={() =>
              setShowDetails(
                false
              )
            }
            wide
          >
            <VendorDetails
              vendor={
                selectedVendor
              }
              onClose={() =>
                setShowDetails(
                  false
                )
              }
              onEdit={
                openEdit
              }
            />
          </Modal>
        )}
    </div>
  );
};

export default Vendors;