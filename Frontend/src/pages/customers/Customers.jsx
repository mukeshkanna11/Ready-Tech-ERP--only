import { useCallback, useEffect, useMemo, useState } from "react";

import {
  AlertCircle,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Eye,
  Filter,
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

// ============================================================
// CONFIG
// ============================================================

const CUSTOMER_ENDPOINT = "/customers";
const BRANCH_ENDPOINT = "/branches";

const EMPTY_FORM = {
  customerCode: "",
  name: "",
  displayName: "",
  customerType: "business",
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
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
  },
  shippingAddress: {
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
  },
  contactPerson: {
    name: "",
    designation: "",
    email: "",
    phone: "",
  },
  notes: "",
  status: "active",
};

// ============================================================
// HELPERS
// ============================================================

const safeString = (value) => {
  if (value === null || value === undefined) return "";
  return String(value);
};

const cleanString = (value) => safeString(value).trim();

const safeNumber = (value, fallback = 0) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
};

const normalizeObjectId = (value) => {
  if (!value) return "";

  if (typeof value === "object") {
    return safeString(value?._id || value?.id);
  }

  return safeString(value);
};

const normalizeAddress = (address = {}) => ({
  addressLine1: cleanString(address.addressLine1),
  addressLine2: cleanString(address.addressLine2),
  city: cleanString(address.city),
  state: cleanString(address.state),
  postalCode: cleanString(address.postalCode),
  country: cleanString(address.country) || "India",
});

const normalizeContactPerson = (contactPerson = {}) => ({
  name: cleanString(contactPerson.name),
  designation: cleanString(contactPerson.designation),
  email: cleanString(contactPerson.email),
  phone: cleanString(contactPerson.phone),
});

const normalizeData = (response) => {
  return (
    response?.data?.data ??
    response?.data ??
    response
  );
};

const getListData = (response) => {
  const body = response?.data;

  if (Array.isArray(body)) {
    return {
      items: body,
      pagination: null,
    };
  }

  const data = body?.data;

  if (Array.isArray(data)) {
    return {
      items: data,
      pagination: body?.pagination || null,
    };
  }

  return {
    items:
      body?.customers ||
      body?.items ||
      data?.customers ||
      data?.items ||
      [],
    pagination:
      body?.pagination ||
      data?.pagination ||
      null,
  };
};

const getErrorMessage = (
  error,
  fallback = "Something went wrong"
) => {
  const responseData = error?.response?.data;

  if (
    Array.isArray(responseData?.errors) &&
    responseData.errors.length
  ) {
    return responseData.errors.join(", ");
  }

  return (
    responseData?.message ||
    responseData?.error ||
    error?.message ||
    fallback
  );
};

const normalizeCustomerForForm = (customer = {}) => {
  const branchId = normalizeObjectId(customer.branchId);

  const creditLimit =
    customer.creditLimit === null ||
    customer.creditLimit === undefined ||
    customer.creditLimit === ""
      ? ""
      : safeString(customer.creditLimit);

  const paymentTerms =
    customer.paymentTerms === null ||
    customer.paymentTerms === undefined ||
    customer.paymentTerms === ""
      ? ""
      : safeString(customer.paymentTerms);

  return {
    customerCode: safeString(customer.customerCode),
    name: safeString(customer.name),
    displayName: safeString(customer.displayName),

    customerType:
      cleanString(customer.customerType).toLowerCase() ||
      "business",

    branchId,

    email: safeString(customer.email),
    phone: safeString(customer.phone),
    alternatePhone: safeString(customer.alternatePhone),
    website: safeString(customer.website),

    gstNumber: safeString(customer.gstNumber),
    panNumber: safeString(customer.panNumber),
    taxNumber: safeString(customer.taxNumber),

    creditLimit,
    paymentTerms,

    billingAddress: normalizeAddress(
      customer.billingAddress
    ),

    shippingAddress: normalizeAddress(
      customer.shippingAddress
    ),

    contactPerson: normalizeContactPerson(
      customer.contactPerson
    ),

    notes: safeString(customer.notes),

    status:
      cleanString(customer.status).toLowerCase() ||
      "active",
  };
};

const buildCustomerPayload = (form = {}) => {
  const payload = {
    customerCode: cleanString(form.customerCode).toUpperCase(),

    name: cleanString(form.name),

    displayName: cleanString(
      form.displayName || form.name
    ),

    customerType:
      cleanString(form.customerType).toLowerCase() ||
      "business",

    branchId: normalizeObjectId(form.branchId),

    email: cleanString(form.email),

    phone: cleanString(form.phone),

    alternatePhone: cleanString(form.alternatePhone),

    website: cleanString(form.website),

    gstNumber: cleanString(form.gstNumber).toUpperCase(),

    panNumber: cleanString(form.panNumber).toUpperCase(),

    taxNumber: cleanString(form.taxNumber),

    creditLimit: safeNumber(form.creditLimit, 0),

    paymentTerms: safeNumber(form.paymentTerms, 0),

    billingAddress: normalizeAddress(
      form.billingAddress
    ),

    shippingAddress: normalizeAddress(
      form.shippingAddress
    ),

    contactPerson: normalizeContactPerson(
      form.contactPerson
    ),

    notes: cleanString(form.notes),

    status:
      cleanString(form.status).toLowerCase() ||
      "active",
  };

  // Do not send empty optional identifiers.
  if (!payload.branchId) {
    delete payload.branchId;
  }

  if (!payload.gstNumber) {
    delete payload.gstNumber;
  }

  if (!payload.panNumber) {
    delete payload.panNumber;
  }

  if (!payload.taxNumber) {
    delete payload.taxNumber;
  }

  if (!payload.email) {
    delete payload.email;
  }

  if (!payload.phone) {
    delete payload.phone;
  }

  if (!payload.alternatePhone) {
    delete payload.alternatePhone;
  }

  if (!payload.website) {
    delete payload.website;
  }

  return payload;
};

const getCustomerId = (customer) => {
  return customer?._id || customer?.id || "";
};

const getBranchId = (branch) => {
  return normalizeObjectId(branch);
};

const getBranchName = (branch) => {
  return (
    branch?.name ||
    branch?.branchName ||
    branch?.displayName ||
    "Unnamed Branch"
  );
};

const getCustomerBranchId = (customer) => {
  return normalizeObjectId(customer?.branchId);
};


// ============================================================
// SMALL UI COMPONENTS
// ============================================================

const StatusBadge = ({ status }) => {
  const active =
    String(status || "").toLowerCase() === "active";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
        active
          ? "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300"
          : "border-gray-400/20 bg-gray-400/[0.06] text-gray-400"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active ? "bg-emerald-400" : "bg-gray-500"
        }`}
      />
      {active ? "Active" : "Inactive"}
    </span>
  );
};

const CustomerTypeBadge = ({ type }) => (
  <span className="inline-flex rounded-lg border border-cyan-400/15 bg-cyan-400/[0.06] px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-cyan-300">
    {type || "Business"}
  </span>
);

const Modal = ({
  open,
  onClose,
  title,
  subtitle = "Ready Tech ERP · Customer Management",
  children,
  width = "max-w-4xl",
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-md sm:p-5">
      <div
        className={`flex max-h-[95vh] w-full ${width} flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#090e13] shadow-2xl shadow-black/70 sm:rounded-3xl`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.07] px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-white sm:text-lg">
              {title}
            </h2>

            <p className="mt-0.5 truncate text-[11px] text-gray-600">
              {subtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 text-gray-500 transition hover:bg-white/[0.05] hover:text-white"
          >
            <X size={17} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
          {children}
        </div>
      </div>
    </div>
  );
};

const FormInput = ({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  disabled = false,
}) => (
  <div>
    <label className="mb-1.5 block text-[11px] font-medium text-gray-400">
      {label}
      {required && (
        <span className="ml-1 text-cyan-400">*</span>
      )}
    </label>

    <input
      type={type}
      value={value ?? ""}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3.5 text-sm text-white outline-none transition placeholder:text-gray-700 focus:border-cyan-400/40 focus:bg-black/30 disabled:cursor-not-allowed disabled:opacity-50"
    />
  </div>
);

const FormTextarea = ({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}) => (
  <div>
    <label className="mb-1.5 block text-[11px] font-medium text-gray-400">
      {label}
    </label>

    <textarea
      value={value ?? ""}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className="w-full resize-none rounded-xl border border-white/10 bg-black/20 px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-gray-700 focus:border-cyan-400/40 focus:bg-black/30"
    />
  </div>
);

const FormSelect = ({
  label,
  value,
  onChange,
  children,
  required = false,
}) => (
  <div>
    <label className="mb-1.5 block text-[11px] font-medium text-gray-400">
      {label}
      {required && (
        <span className="ml-1 text-cyan-400">*</span>
      )}
    </label>

    <select
      value={value ?? ""}
      onChange={onChange}
      className="h-11 w-full rounded-xl border border-white/10 bg-[#0b1015] px-3.5 text-sm text-white outline-none transition focus:border-cyan-400/40"
    >
      {children}
    </select>
  </div>
);

const SectionTitle = ({ icon: Icon, title, description }) => (
  <div className="mb-4 flex items-start gap-3">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-400/10 bg-cyan-400/[0.06] text-cyan-300">
      <Icon size={16} />
    </div>

    <div>
      <h3 className="text-sm font-semibold text-white">
        {title}
      </h3>

      {description && (
        <p className="mt-0.5 text-[11px] text-gray-600">
          {description}
        </p>
      )}
    </div>
  </div>
);

const EmptyState = ({ search, onCreate }) => (
  <div className="flex min-h-[340px] flex-col items-center justify-center px-5 py-12 text-center">
    <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
      <UserRound size={27} className="text-gray-600" />
    </div>

    <h3 className="text-sm font-semibold text-white">
      {search ? "No customers found" : "No customers yet"}
    </h3>

    <p className="mt-2 max-w-sm text-xs leading-5 text-gray-600">
      {search
        ? "Try changing your search or filters."
        : "Create your first customer to start managing customer records."}
    </p>

    {!search && (
      <button
        type="button"
        onClick={onCreate}
        className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-cyan-400 px-4 text-xs font-semibold text-black transition hover:bg-cyan-300"
      >
        <Plus size={15} />
        Add Customer
      </button>
    )}
  </div>
);

// ============================================================
// CUSTOMER FORM
// ============================================================

const CustomerForm = ({
  form,
  setForm,
  branches,
  editing,
  submitting,
  onSubmit,
  onClose,
}) => {
  const updateField = (field, value) => {
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
    <form onSubmit={onSubmit} className="space-y-7">
      {/* BASIC INFORMATION */}
      <section>
        <SectionTitle
          icon={UserRound}
          title="Basic Information"
          description="Primary customer identity and classification"
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormInput
            label="Customer Code"
            value={form.customerCode}
            required
            placeholder="CUS-001"
            onChange={(e) =>
              updateField(
                "customerCode",
                e.target.value.toUpperCase()
              )
            }
          />

          <FormInput
            label="Customer Name"
            value={form.name}
            required
            placeholder="Customer / Company name"
            onChange={(e) =>
              updateField("name", e.target.value)
            }
          />

          <FormInput
            label="Display Name"
            value={form.displayName}
            placeholder="Display name"
            onChange={(e) =>
              updateField("displayName", e.target.value)
            }
          />

          <FormSelect
            label="Customer Type"
            value={form.customerType}
            onChange={(e) =>
              updateField("customerType", e.target.value)
            }
          >
            <option value="business">Business</option>
            <option value="individual">Individual</option>
          </FormSelect>

          <FormSelect
            label="Branch"
            value={form.branchId}
            onChange={(e) =>
              updateField("branchId", e.target.value)
            }
          >
            <option value="">No Branch</option>

            {branches.map((branch) => (
              <option
                key={getBranchId(branch)}
                value={getBranchId(branch)}
              >
                {getBranchName(branch)}
              </option>
            ))}
          </FormSelect>

          <FormSelect
            label="Status"
            value={form.status}
            onChange={(e) =>
              updateField("status", e.target.value)
            }
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </FormSelect>
        </div>
      </section>

      {/* CONTACT */}
      <section>
        <SectionTitle
          icon={Phone}
          title="Contact Information"
          description="Customer communication details"
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormInput
            label="Email"
            type="email"
            value={form.email}
            placeholder="customer@example.com"
            onChange={(e) =>
              updateField("email", e.target.value)
            }
          />

          <FormInput
            label="Phone"
            value={form.phone}
            placeholder="+91 98765 43210"
            onChange={(e) =>
              updateField("phone", e.target.value)
            }
          />

          <FormInput
            label="Alternate Phone"
            value={form.alternatePhone}
            placeholder="Alternate phone"
            onChange={(e) =>
              updateField(
                "alternatePhone",
                e.target.value
              )
            }
          />

          <FormInput
            label="Website"
            value={form.website}
            placeholder="https://example.com"
            onChange={(e) =>
              updateField("website", e.target.value)
            }
          />
        </div>
      </section>

      {/* TAX */}
      <section>
        <SectionTitle
          icon={Building2}
          title="Tax & Commercial"
          description="Tax identification and payment information"
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormInput
            label="GST Number"
            value={form.gstNumber}
            placeholder="GSTIN"
            onChange={(e) =>
              updateField(
                "gstNumber",
                e.target.value.toUpperCase()
              )
            }
          />

          <FormInput
            label="PAN Number"
            value={form.panNumber}
            placeholder="PAN"
            onChange={(e) =>
              updateField(
                "panNumber",
                e.target.value.toUpperCase()
              )
            }
          />

          <FormInput
            label="Tax Number"
            value={form.taxNumber}
            placeholder="Tax number"
            onChange={(e) =>
              updateField("taxNumber", e.target.value)
            }
          />

          <FormInput
            label="Credit Limit"
            type="number"
            value={form.creditLimit}
            placeholder="0"
            onChange={(e) =>
              updateField("creditLimit", e.target.value)
            }
          />

          <FormInput
            label="Payment Terms"
            value={form.paymentTerms}
            placeholder="30 days"
            onChange={(e) =>
              updateField("paymentTerms", e.target.value)
            }
          />
        </div>
      </section>

      {/* BILLING */}
      <section>
        <SectionTitle
          icon={MapPin}
          title="Billing Address"
          description="Primary billing location"
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <FormInput
              label="Address Line 1"
              value={form.billingAddress.addressLine1}
              placeholder="Street / building / door no."
              onChange={(e) =>
                updateNestedField(
                  "billingAddress",
                  "addressLine1",
                  e.target.value
                )
              }
            />
          </div>

          <div className="md:col-span-2">
            <FormInput
              label="Address Line 2"
              value={form.billingAddress.addressLine2}
              placeholder="Area / landmark"
              onChange={(e) =>
                updateNestedField(
                  "billingAddress",
                  "addressLine2",
                  e.target.value
                )
              }
            />
          </div>

          <FormInput
            label="City"
            value={form.billingAddress.city}
            placeholder="Coimbatore"
            onChange={(e) =>
              updateNestedField(
                "billingAddress",
                "city",
                e.target.value
              )
            }
          />

          <FormInput
            label="State"
            value={form.billingAddress.state}
            placeholder="Tamil Nadu"
            onChange={(e) =>
              updateNestedField(
                "billingAddress",
                "state",
                e.target.value
              )
            }
          />

          <FormInput
            label="Postal Code"
            value={form.billingAddress.postalCode}
            placeholder="641001"
            onChange={(e) =>
              updateNestedField(
                "billingAddress",
                "postalCode",
                e.target.value
              )
            }
          />

          <FormInput
            label="Country"
            value={form.billingAddress.country}
            placeholder="India"
            onChange={(e) =>
              updateNestedField(
                "billingAddress",
                "country",
                e.target.value
              )
            }
          />
        </div>
      </section>

      {/* SHIPPING */}
      <section>
        <SectionTitle
          icon={MapPin}
          title="Shipping Address"
          description="Delivery / shipping location"
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <FormInput
              label="Address Line 1"
              value={form.shippingAddress.addressLine1}
              placeholder="Street / building / door no."
              onChange={(e) =>
                updateNestedField(
                  "shippingAddress",
                  "addressLine1",
                  e.target.value
                )
              }
            />
          </div>

          <div className="md:col-span-2">
            <FormInput
              label="Address Line 2"
              value={form.shippingAddress.addressLine2}
              placeholder="Area / landmark"
              onChange={(e) =>
                updateNestedField(
                  "shippingAddress",
                  "addressLine2",
                  e.target.value
                )
              }
            />
          </div>

          <FormInput
            label="City"
            value={form.shippingAddress.city}
            placeholder="Coimbatore"
            onChange={(e) =>
              updateNestedField(
                "shippingAddress",
                "city",
                e.target.value
              )
            }
          />

          <FormInput
            label="State"
            value={form.shippingAddress.state}
            placeholder="Tamil Nadu"
            onChange={(e) =>
              updateNestedField(
                "shippingAddress",
                "state",
                e.target.value
              )
            }
          />

          <FormInput
            label="Postal Code"
            value={form.shippingAddress.postalCode}
            placeholder="641001"
            onChange={(e) =>
              updateNestedField(
                "shippingAddress",
                "postalCode",
                e.target.value
              )
            }
          />

          <FormInput
            label="Country"
            value={form.shippingAddress.country}
            placeholder="India"
            onChange={(e) =>
              updateNestedField(
                "shippingAddress",
                "country",
                e.target.value
              )
            }
          />
        </div>
      </section>

      {/* CONTACT PERSON */}
      <section>
        <SectionTitle
          icon={UserRound}
          title="Contact Person"
          description="Primary person responsible for this customer"
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormInput
            label="Name"
            value={form.contactPerson.name}
            placeholder="Contact person"
            onChange={(e) =>
              updateNestedField(
                "contactPerson",
                "name",
                e.target.value
              )
            }
          />

          <FormInput
            label="Designation"
            value={form.contactPerson.designation}
            placeholder="Manager"
            onChange={(e) =>
              updateNestedField(
                "contactPerson",
                "designation",
                e.target.value
              )
            }
          />

          <FormInput
            label="Email"
            type="email"
            value={form.contactPerson.email}
            placeholder="contact@example.com"
            onChange={(e) =>
              updateNestedField(
                "contactPerson",
                "email",
                e.target.value
              )
            }
          />

          <FormInput
            label="Phone"
            value={form.contactPerson.phone}
            placeholder="+91 98765 43210"
            onChange={(e) =>
              updateNestedField(
                "contactPerson",
                "phone",
                e.target.value
              )
            }
          />
        </div>
      </section>

      {/* NOTES */}
      <section>
        <SectionTitle
          icon={AlertCircle}
          title="Notes"
          description="Additional customer information"
        />

        <FormTextarea
          label="Internal Notes"
          value={form.notes}
          placeholder="Add any internal notes..."
          rows={4}
          onChange={(e) =>
            updateField("notes", e.target.value)
          }
        />
      </section>

      {/* ACTIONS */}
      <div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-2 border-t border-white/[0.07] bg-[#090e13]/95 px-4 pt-4 backdrop-blur-xl sm:-mx-6 sm:flex-row sm:justify-end sm:px-6">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="h-11 rounded-xl border border-white/10 px-5 text-xs font-medium text-gray-400 transition hover:bg-white/[0.04] hover:text-white disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-6 text-xs font-bold text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check size={15} />
              {editing
                ? "Update Customer"
                : "Create Customer"}
            </>
          )}
        </button>
      </div>
    </form>
  );
};

// ============================================================
// CUSTOMER DETAILS
// ============================================================

const DetailRow = ({ label, value }) => (
  <div className="flex flex-col gap-1 border-b border-white/[0.05] py-3 last:border-0">
    <span className="text-[10px] font-medium uppercase tracking-wider text-gray-600">
      {label}
    </span>

    <span className="break-words text-sm text-gray-200">
      {value || "—"}
    </span>
  </div>
);

const CustomerDetails = ({
  customer,
  branchName,
  onClose,
  onEdit,
}) => {
  if (!customer) return null;

  return (
    <Modal
      open={!!customer}
      onClose={onClose}
      title="Customer Details"
      subtitle="Customer profile and account information"
      width="max-w-5xl"
    >
      <div className="space-y-6">
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.07] text-cyan-300">
                <UserRound size={24} />
              </div>

              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold text-white">
                  {customer.name || "Unnamed Customer"}
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  {customer.customerCode || "No customer code"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <StatusBadge status={customer.status} />
              <CustomerTypeBadge
                type={customer.customerType}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
            <SectionTitle
              icon={UserRound}
              title="Customer"
            />

            <DetailRow
              label="Customer Code"
              value={customer.customerCode}
            />

            <DetailRow
              label="Display Name"
              value={customer.displayName}
            />

            <DetailRow
              label="Customer Type"
              value={customer.customerType}
            />

            <DetailRow
              label="Branch"
              value={branchName}
            />
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
            <SectionTitle
              icon={Phone}
              title="Contact"
            />

            <DetailRow
              label="Email"
              value={customer.email}
            />

            <DetailRow
              label="Phone"
              value={customer.phone}
            />

            <DetailRow
              label="Alternate Phone"
              value={customer.alternatePhone}
            />

            <DetailRow
              label="Website"
              value={customer.website}
            />
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
            <SectionTitle
              icon={Building2}
              title="Tax & Commercial"
            />

            <DetailRow
              label="GST Number"
              value={customer.gstNumber}
            />

            <DetailRow
              label="PAN Number"
              value={customer.panNumber}
            />

            <DetailRow
              label="Tax Number"
              value={customer.taxNumber}
            />

            <DetailRow
              label="Credit Limit"
              value={customer.creditLimit}
            />

            <DetailRow
              label="Payment Terms"
              value={customer.paymentTerms}
            />
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
            <SectionTitle
              icon={UserRound}
              title="Contact Person"
            />

            <DetailRow
              label="Name"
              value={customer.contactPerson?.name}
            />

            <DetailRow
              label="Designation"
              value={
                customer.contactPerson?.designation
              }
            />

            <DetailRow
              label="Email"
              value={customer.contactPerson?.email}
            />

            <DetailRow
              label="Phone"
              value={customer.contactPerson?.phone}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
            <SectionTitle
              icon={MapPin}
              title="Billing Address"
            />

            <p className="text-sm leading-6 text-gray-300">
              {customer.billingAddress?.addressLine1}
              {customer.billingAddress?.addressLine2 && (
                <>
                  <br />
                  {customer.billingAddress.addressLine2}
                </>
              )}
              {(customer.billingAddress?.city ||
                customer.billingAddress?.state) && (
                <>
                  <br />
                  {[
                    customer.billingAddress.city,
                    customer.billingAddress.state,
                    customer.billingAddress.postalCode,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </>
              )}
              {customer.billingAddress?.country && (
                <>
                  <br />
                  {customer.billingAddress.country}
                </>
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
            <SectionTitle
              icon={MapPin}
              title="Shipping Address"
            />

            <p className="text-sm leading-6 text-gray-300">
              {customer.shippingAddress?.addressLine1}
              {customer.shippingAddress?.addressLine2 && (
                <>
                  <br />
                  {customer.shippingAddress.addressLine2}
                </>
              )}
              {(customer.shippingAddress?.city ||
                customer.shippingAddress?.state) && (
                <>
                  <br />
                  {[
                    customer.shippingAddress.city,
                    customer.shippingAddress.state,
                    customer.shippingAddress.postalCode,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </>
              )}
              {customer.shippingAddress?.country && (
                <>
                  <br />
                  {customer.shippingAddress.country}
                </>
              )}
            </p>
          </div>
        </div>

        {customer.notes && (
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
            <SectionTitle
              icon={AlertCircle}
              title="Notes"
            />

            <p className="whitespace-pre-wrap text-sm leading-6 text-gray-400">
              {customer.notes}
            </p>
          </div>
        )}

        <div className="flex justify-end border-t border-white/[0.07] pt-4">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-cyan-400 px-5 text-xs font-bold text-black transition hover:bg-cyan-300"
          >
            <Edit3 size={14} />
            Edit Customer
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [branches, setBranches] = useState([]);

  const [loading, setLoading] = useState(true);
  const [branchesLoading, setBranchesLoading] =
    useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("all");
  const [typeFilter, setTypeFilter] =
    useState("all");
  const [branchFilter, setBranchFilter] =
    useState("all");

  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [pagination, setPagination] =
    useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] =
    useState(false);

  const [editingCustomer, setEditingCustomer] =
    useState(null);

  const [selectedCustomer, setSelectedCustomer] =
    useState(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] =
    useState(false);
  const [deletingId, setDeletingId] =
    useState(null);

  // ==========================================================
  // BRANCH NAME MAP
  // ==========================================================

  const branchMap = useMemo(() => {
    const map = {};

    branches.forEach((branch) => {
      const id = getBranchId(branch);

      if (id) {
        map[id] = getBranchName(branch);
      }
    });

    return map;
  }, [branches]);

  // ==========================================================
  // FETCH BRANCHES
  // ==========================================================

  const fetchBranches = useCallback(async () => {
    setBranchesLoading(true);

    try {
      const response = await api.get(
        BRANCH_ENDPOINT
      );

      const body = normalizeData(response);

      let items = [];

      if (Array.isArray(body)) {
        items = body;
      } else if (Array.isArray(body?.data)) {
        items = body.data;
      } else if (Array.isArray(body?.branches)) {
        items = body.branches;
      } else if (Array.isArray(body?.items)) {
        items = body.items;
      }

      setBranches(items);
    } catch (error) {
      setBranches([]);

      setError(
        getErrorMessage(
          error,
          "Unable to load branches"
        )
      );
    } finally {
      setBranchesLoading(false);
    }
  }, []);

  // ==========================================================
  // FETCH CUSTOMERS
  // ==========================================================

  const fetchCustomers = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const params = {
          page,
          limit,
        };

        if (search.trim()) {
          params.search = search.trim();
        }

        if (statusFilter !== "all") {
          params.status = statusFilter;
        }

        if (typeFilter !== "all") {
          params.customerType = typeFilter;
        }

        if (branchFilter !== "all") {
          params.branchId = branchFilter;
        }

        const response = await api.get(
          CUSTOMER_ENDPOINT,
          { params }
        );

        const result = getListData(response);

        setCustomers(
          Array.isArray(result.items)
            ? result.items
            : []
        );

        setPagination(result.pagination);
      } catch (error) {
        setCustomers([]);

        setError(
          getErrorMessage(
            error,
            "Unable to load customers"
          )
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      page,
      limit,
      search,
      statusFilter,
      typeFilter,
      branchFilter,
    ]
  );

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 250);

    return () => clearTimeout(timer);
  }, [fetchCustomers]);

  // ==========================================================
  // SUCCESS MESSAGE
  // ==========================================================

  useEffect(() => {
    if (!success) return;

    const timer = setTimeout(() => {
      setSuccess("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [success]);

  // ==========================================================
  // STATS
  // ==========================================================

  const stats = useMemo(() => {
    const active = customers.filter(
      (item) =>
        String(item.status).toLowerCase() === "active"
    ).length;

    const business = customers.filter(
      (item) =>
        String(item.customerType).toLowerCase() ===
        "business"
    ).length;

    const individual = customers.filter(
      (item) =>
        String(item.customerType).toLowerCase() ===
        "individual"
    ).length;

    return {
      total: pagination?.total ?? customers.length,
      active,
      business,
      individual,
    };
  }, [customers, pagination]);

  // ==========================================================
  // RESET FORM
  // ==========================================================

  const resetForm = () => {
    setForm({
      ...EMPTY_FORM,
      billingAddress: {
        ...EMPTY_FORM.billingAddress,
      },
      shippingAddress: {
        ...EMPTY_FORM.shippingAddress,
      },
      contactPerson: {
        ...EMPTY_FORM.contactPerson,
      },
    });
  };

  // ==========================================================
  // OPEN CREATE
  // ==========================================================

  const openCreate = () => {
    setEditingCustomer(null);
    setSelectedCustomer(null);
    resetForm();
    setError("");
    setFormOpen(true);
  };

  // ==========================================================
  // OPEN EDIT
  // ==========================================================

  const openEdit = (customer) => {
    setEditingCustomer(customer);
    setSelectedCustomer(null);
    setDetailsOpen(false);
    setError("");

    setForm(
      normalizeCustomerForForm(customer)
    );

    setFormOpen(true);
  };

  // ==========================================================
  // OPEN DETAILS
  // ==========================================================

  const openDetails = (customer) => {
    setSelectedCustomer(customer);
    setDetailsOpen(true);
  };

  // ==========================================================
  // CLOSE FORM
  // ==========================================================

  const closeForm = () => {
    if (submitting) return;

    setFormOpen(false);
    setEditingCustomer(null);
    resetForm();
  };

  // ==========================================================
  // VALIDATE FORM
  // ==========================================================

  // ==========================================================
// VALIDATE FORM
// ==========================================================

const validateForm = () => {
  const customerCode = cleanString(form.customerCode);
  const name = cleanString(form.name);

  if (!customerCode) {
    return "Customer code is required";
  }

  if (!name) {
    return "Customer name is required";
  }

  // Credit limit must be a valid non-negative number
  if (
    form.creditLimit !== "" &&
    form.creditLimit !== null &&
    form.creditLimit !== undefined
  ) {
    const creditLimit = Number(form.creditLimit);

    if (!Number.isFinite(creditLimit) || creditLimit < 0) {
      return "Credit limit must be a valid positive number";
    }
  }

  // Payment terms is stored as NUMBER in Customer model
  if (
    form.paymentTerms !== "" &&
    form.paymentTerms !== null &&
    form.paymentTerms !== undefined
  ) {
    const paymentTerms = Number(form.paymentTerms);

    if (!Number.isFinite(paymentTerms) || paymentTerms < 0) {
      return "Payment terms must be a valid number of days";
    }
  }

  // Customer email
  const email = cleanString(form.email);

  if (
    email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return "Please enter a valid email address";
  }

  // Contact person email
  const contactEmail = cleanString(
    form.contactPerson?.email
  );

  if (
    contactEmail &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)
  ) {
    return "Please enter a valid contact person email";
  }

  return "";
};

// ==========================================================
// BUILD PAYLOAD
// ==========================================================

const buildPayload = () => {
  const customerCode = cleanString(
    form.customerCode
  ).toUpperCase();

  const name = cleanString(form.name);

  const displayName =
    cleanString(form.displayName) || name;

  const payload = {
    customerCode,
    name,
    displayName,

    customerType:
      cleanString(form.customerType).toLowerCase() ||
      "business",

    email: cleanString(form.email),
    phone: cleanString(form.phone),
    alternatePhone: cleanString(
      form.alternatePhone
    ),
    website: cleanString(form.website),

    gstNumber: cleanString(
      form.gstNumber
    ).toUpperCase(),

    panNumber: cleanString(
      form.panNumber
    ).toUpperCase(),

    taxNumber: cleanString(
      form.taxNumber
    ),

    // Customer model expects Number
    creditLimit:
      form.creditLimit === "" ||
      form.creditLimit === null ||
      form.creditLimit === undefined
        ? 0
        : Number(form.creditLimit),

    // Customer model expects Number
    paymentTerms:
      form.paymentTerms === "" ||
      form.paymentTerms === null ||
      form.paymentTerms === undefined
        ? 0
        : Number(form.paymentTerms),

    billingAddress: normalizeAddress(
      form.billingAddress
    ),

    shippingAddress: normalizeAddress(
      form.shippingAddress
    ),

    contactPerson: normalizeContactPerson(
      form.contactPerson
    ),

    notes: cleanString(form.notes),

    status:
      cleanString(form.status).toLowerCase() ||
      "active",
  };

  // --------------------------------------------------------
  // OPTIONAL FIELDS
  // --------------------------------------------------------
  // Empty optional values should NOT be sent.
  // This prevents empty GST / identifiers from triggering
  // duplicate validation.
  // --------------------------------------------------------

  const branchId = getBranchId({
    _id: form.branchId,
  });

  if (branchId) {
    payload.branchId = branchId;
  }

  if (!payload.email) {
    delete payload.email;
  }

  if (!payload.phone) {
    delete payload.phone;
  }

  if (!payload.alternatePhone) {
    delete payload.alternatePhone;
  }

  if (!payload.website) {
    delete payload.website;
  }

  if (!payload.gstNumber) {
    delete payload.gstNumber;
  }

  if (!payload.panNumber) {
    delete payload.panNumber;
  }

  if (!payload.taxNumber) {
    delete payload.taxNumber;
  }

  return payload;
};

// ==========================================================
// CREATE / UPDATE
// ==========================================================

const handleSubmit = async (event) => {
  event.preventDefault();

  setError("");
  setSuccess("");

  const validationError = validateForm();

  if (validationError) {
    setError(validationError);
    return;
  }

  const payload = buildPayload();

  // Temporary debug.
  // Keep this until browser POST is confirmed working.
  console.log(
    "CUSTOMER CREATE/UPDATE PAYLOAD:",
    payload
  );

  setSubmitting(true);

  try {
    if (editingCustomer) {
      const id = getCustomerId(
        editingCustomer
      );

      if (!id) {
        throw new Error(
          "Customer ID is missing"
        );
      }

      await api.put(
        `${CUSTOMER_ENDPOINT}/${id}`,
        payload
      );

      setSuccess(
        "Customer updated successfully"
      );
    } else {
      await api.post(
        CUSTOMER_ENDPOINT,
        payload
      );

      setSuccess(
        "Customer created successfully"
      );
    }

    closeForm();

    await fetchCustomers(true);
  } catch (error) {
    console.error(
      "Customer save error:",
      error?.response?.data || error
    );

    setError(
      getErrorMessage(
        error,
        editingCustomer
          ? "Unable to update customer"
          : "Unable to create customer"
      )
    );
  } finally {
    setSubmitting(false);
  }
};

  // ==========================================================
  // DELETE
  // ==========================================================

  const handleDelete = async (customer) => {
    const id = getCustomerId(customer);

    if (!id) {
      setError("Customer ID is missing");
      return;
    }

    const confirmed = window.confirm(
      `Delete customer "${customer.name || "this customer"}"?`
    );

    if (!confirmed) return;

    setDeletingId(id);
    setError("");
    setSuccess("");

    try {
      await api.delete(
        `${CUSTOMER_ENDPOINT}/${id}`
      );

      setSuccess(
        "Customer deleted successfully"
      );

      await fetchCustomers(true);
    } catch (error) {
      setError(
        getErrorMessage(
          error,
          "Unable to delete customer"
        )
      );
    } finally {
      setDeletingId(null);
    }
  };

  // ==========================================================
  // PAGINATION
  // ==========================================================

  const currentPage =
    Number(
      pagination?.page ??
        pagination?.currentPage ??
        page
    ) || page;

  const totalPages =
    Number(
      pagination?.pages ??
        pagination?.totalPages ??
        1
    ) || 1;

  const totalRecords =
    Number(
      pagination?.total ??
        pagination?.totalItems ??
        stats.total
    ) || 0;

  const canGoPrevious = currentPage > 1;
  const canGoNext =
    currentPage < totalPages;

  const goPrevious = () => {
    if (canGoPrevious) {
      setPage((value) => value - 1);
    }
  };

  const goNext = () => {
    if (canGoNext) {
      setPage((value) => value + 1);
    }
  };

  // ==========================================================
  // RESET PAGE WHEN FILTER CHANGES
  // ==========================================================

  useEffect(() => {
    setPage(1);
  }, [
    statusFilter,
    typeFilter,
    branchFilter,
  ]);

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="min-h-full w-full bg-[#060a0e] text-white">
      {/* BACKGROUND */}
      <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-cyan-400/[0.035] blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-blue-500/[0.025] blur-3xl" />

        <div
          className="absolute inset-0 opacity-[0.018]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="relative z-10 w-full px-3 py-4 sm:px-5 lg:px-7 xl:px-8">
        {/* HEADER */}
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-400/70">
              <Building2 size={13} />
              ERP · Masters
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Customers
            </h1>

            <p className="mt-1 text-xs leading-5 text-gray-600 sm:text-sm">
              Manage customer profiles, branches,
              contact information and commercial details.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <button
              type="button"
              onClick={() => {
                fetchCustomers(true);
                fetchBranches();
              }}
              disabled={refreshing}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.025] px-4 text-xs font-medium text-gray-300 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-50"
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
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 text-xs font-bold text-black shadow-lg shadow-cyan-400/10 transition hover:bg-cyan-300"
            >
              <Plus size={16} />
              Add Customer
            </button>
          </div>
        </div>

        {/* ALERTS */}
        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-400/15 bg-red-400/[0.06] px-4 py-3 text-xs text-red-300">
            <AlertCircle
              size={16}
              className="mt-0.5 shrink-0"
            />

            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setError("")}
              className="shrink-0 text-red-300/60 hover:text-red-200"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.06] px-4 py-3 text-xs text-emerald-300">
            <Check
              size={16}
              className="shrink-0"
            />

            <span>{success}</span>
          </div>
        )}

        {/* STAT CARDS */}
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-600">
                Total
              </span>

              <UserRound
                size={15}
                className="text-cyan-400/70"
              />
            </div>

            <p className="text-2xl font-bold text-white">
              {stats.total}
            </p>

            <p className="mt-1 text-[10px] text-gray-700">
              Customer records
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-600">
                Active
              </span>

              <span className="h-2 w-2 rounded-full bg-emerald-400" />
            </div>

            <p className="text-2xl font-bold text-white">
              {stats.active}
            </p>

            <p className="mt-1 text-[10px] text-gray-700">
              Current customers
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-600">
                Business
              </span>

              <Building2
                size={15}
                className="text-blue-400/70"
              />
            </div>

            <p className="text-2xl font-bold text-white">
              {stats.business}
            </p>

            <p className="mt-1 text-[10px] text-gray-700">
              Business accounts
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-600">
                Individual
              </span>

              <UserRound
                size={15}
                className="text-violet-400/70"
              />
            </div>

            <p className="text-2xl font-bold text-white">
              {stats.individual}
            </p>

            <p className="mt-1 text-[10px] text-gray-700">
              Individual accounts
            </p>
          </div>
        </div>

        {/* TOOLBAR */}
        <div className="mb-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3">
          <div className="flex flex-col gap-3 xl:flex-row">
            {/* SEARCH */}
            <div className="relative min-w-0 flex-1">
              <Search
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600"
              />

              <input
                type="search"
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search customer name, code, email, phone..."
                className="h-11 w-full rounded-xl border border-white/10 bg-black/20 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-gray-700 focus:border-cyan-400/40"
              />
            </div>

            {/* FILTERS */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:flex">
              <div className="relative">
                <Filter
                  size={13}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"
                />

                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(
                      e.target.value
                    )
                  }
                  className="h-11 w-full min-w-[135px] appearance-none rounded-xl border border-white/10 bg-[#0b1015] pl-8 pr-8 text-xs text-gray-300 outline-none focus:border-cyan-400/40"
                >
                  <option value="all">
                    All Status
                  </option>
                  <option value="active">
                    Active
                  </option>
                  <option value="inactive">
                    Inactive
                  </option>
                </select>
              </div>

              <select
                value={typeFilter}
                onChange={(e) =>
                  setTypeFilter(e.target.value)
                }
                className="h-11 min-w-[135px] rounded-xl border border-white/10 bg-[#0b1015] px-3 text-xs text-gray-300 outline-none focus:border-cyan-400/40"
              >
                <option value="all">
                  All Types
                </option>
                <option value="business">
                  Business
                </option>
                <option value="individual">
                  Individual
                </option>
              </select>

              <select
                value={branchFilter}
                onChange={(e) =>
                  setBranchFilter(
                    e.target.value
                  )
                }
                disabled={branchesLoading}
                className="h-11 min-w-[155px] rounded-xl border border-white/10 bg-[#0b1015] px-3 text-xs text-gray-300 outline-none focus:border-cyan-400/40 disabled:opacity-50"
              >
                <option value="all">
                  All Branches
                </option>

                {branches.map((branch) => (
                  <option
                    key={getBranchId(branch)}
                    value={getBranchId(branch)}
                  >
                    {getBranchName(branch)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* TABLE CARD */}
        <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] shadow-2xl shadow-black/20">
          {/* DESKTOP TABLE */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-white/[0.07] bg-white/[0.015]">
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-600">
                    Customer
                  </th>

                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-600">
                    Contact
                  </th>

                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-600">
                    Branch
                  </th>

                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-600">
                    Type
                  </th>

                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-600">
                    Status
                  </th>

                  <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-20"
                    >
                      <div className="flex flex-col items-center justify-center">
                        <Loader2
                          size={25}
                          className="animate-spin text-cyan-400"
                        />

                        <p className="mt-3 text-xs text-gray-600">
                          Loading customers...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState
                        search={
                          !!search.trim() ||
                          statusFilter !== "all" ||
                          typeFilter !== "all" ||
                          branchFilter !== "all"
                        }
                        onCreate={openCreate}
                      />
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => {
                    const id =
                      getCustomerId(customer);

                    const branchId =
                      getCustomerBranchId(
                        customer
                      );

                    const branchName =
                      typeof customer.branchId ===
                      "object"
                        ? getBranchName(
                            customer.branchId
                          )
                        : branchMap[
                            branchId
                          ] || "No Branch";

                    return (
                      <tr
                        key={id}
                        className="border-b border-white/[0.045] transition hover:bg-white/[0.025]"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/10 bg-cyan-400/[0.05] text-cyan-300">
                              <UserRound
                                size={16}
                              />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-white">
                                {customer.name ||
                                  "Unnamed"}
                              </p>

                              <p className="mt-0.5 text-[10px] text-gray-600">
                                {customer.customerCode ||
                                  "No Code"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="max-w-[230px]">
                            {customer.email && (
                              <div className="flex items-center gap-2 truncate text-xs text-gray-400">
                                <Mail
                                  size={12}
                                  className="shrink-0 text-gray-600"
                                />
                                <span className="truncate">
                                  {
                                    customer.email
                                  }
                                </span>
                              </div>
                            )}

                            {customer.phone && (
                              <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                                <Phone
                                  size={12}
                                  className="shrink-0 text-gray-600"
                                />
                                <span>
                                  {
                                    customer.phone
                                  }
                                </span>
                              </div>
                            )}

                            {!customer.email &&
                              !customer.phone && (
                                <span className="text-xs text-gray-700">
                                  No contact
                                </span>
                              )}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex max-w-[180px] items-center gap-2">
                            <MapPin
                              size={13}
                              className="shrink-0 text-gray-600"
                            />

                            <span className="truncate text-xs text-gray-400">
                              {branchName}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <CustomerTypeBadge
                            type={
                              customer.customerType
                            }
                          />
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge
                            status={
                              customer.status
                            }
                          />
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              title="View"
                              onClick={() =>
                                openDetails(
                                  customer
                                )
                              }
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition hover:bg-white/[0.05] hover:text-white"
                            >
                              <Eye size={15} />
                            </button>

                            <button
                              type="button"
                              title="Edit"
                              onClick={() =>
                                openEdit(
                                  customer
                                )
                              }
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition hover:bg-cyan-400/[0.08] hover:text-cyan-300"
                            >
                              <Edit3
                                size={15}
                              />
                            </button>

                            <button
                              type="button"
                              title="Delete"
                              disabled={
                                deletingId === id
                              }
                              onClick={() =>
                                handleDelete(
                                  customer
                                )
                              }
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition hover:bg-red-400/[0.08] hover:text-red-300 disabled:opacity-50"
                            >
                              {deletingId ===
                              id ? (
                                <Loader2
                                  size={15}
                                  className="animate-spin"
                                />
                              ) : (
                                <Trash2
                                  size={15}
                                />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARDS */}
          <div className="md:hidden">
            {loading ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center">
                <Loader2
                  size={25}
                  className="animate-spin text-cyan-400"
                />

                <p className="mt-3 text-xs text-gray-600">
                  Loading customers...
                </p>
              </div>
            ) : customers.length === 0 ? (
              <EmptyState
                search={
                  !!search.trim() ||
                  statusFilter !== "all" ||
                  typeFilter !== "all" ||
                  branchFilter !== "all"
                }
                onCreate={openCreate}
              />
            ) : (
              <div className="divide-y divide-white/[0.05]">
                {customers.map((customer) => {
                  const id =
                    getCustomerId(customer);

                  const branchId =
                    getCustomerBranchId(
                      customer
                    );

                  const branchName =
                    typeof customer.branchId ===
                    "object"
                      ? getBranchName(
                          customer.branchId
                        )
                      : branchMap[
                          branchId
                        ] || "No Branch";

                  return (
                    <div
                      key={id}
                      className="p-4 transition hover:bg-white/[0.02]"
                    >
                      <div className="flex gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/10 bg-cyan-400/[0.05] text-cyan-300">
                          <UserRound size={17} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="truncate text-sm font-semibold text-white">
                                {customer.name ||
                                  "Unnamed Customer"}
                              </h3>

                              <p className="mt-1 text-[10px] text-gray-600">
                                {customer.customerCode ||
                                  "No Code"}
                              </p>
                            </div>

                            <StatusBadge
                              status={
                                customer.status
                              }
                            />
                          </div>

                          <div className="mt-3 grid grid-cols-1 gap-2">
                            {customer.email && (
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Mail
                                  size={12}
                                />
                                <span className="truncate">
                                  {
                                    customer.email
                                  }
                                </span>
                              </div>
                            )}

                            {customer.phone && (
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Phone
                                  size={12}
                                />
                                <span>
                                  {
                                    customer.phone
                                  }
                                </span>
                              </div>
                            )}

                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <MapPin
                                size={12}
                              />
                              <span className="truncate">
                                {branchName}
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                            <CustomerTypeBadge
                              type={
                                customer.customerType
                              }
                            />

                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  openDetails(
                                    customer
                                  )
                                }
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-gray-500 hover:bg-white/[0.05] hover:text-white"
                              >
                                <Eye size={14} />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  openEdit(
                                    customer
                                  )
                                }
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-gray-500 hover:bg-cyan-400/[0.06] hover:text-cyan-300"
                              >
                                <Edit3 size={14} />
                              </button>

                              <button
                                type="button"
                                disabled={
                                  deletingId ===
                                  id
                                }
                                onClick={() =>
                                  handleDelete(
                                    customer
                                  )
                                }
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-gray-500 hover:bg-red-400/[0.06] hover:text-red-300 disabled:opacity-50"
                              >
                                {deletingId ===
                                id ? (
                                  <Loader2
                                    size={14}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <Trash2
                                    size={14}
                                  />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* PAGINATION */}
          {!loading &&
            customers.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-white/[0.07] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <p className="text-[10px] text-gray-600">
                  {totalRecords > 0
                    ? `Page ${currentPage} of ${totalPages} · ${totalRecords} customers`
                    : `Page ${currentPage}`}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={goPrevious}
                    disabled={!canGoPrevious}
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-white/10 px-3 text-[10px] font-medium text-gray-400 transition hover:bg-white/[0.04] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronLeft size={14} />
                    Previous
                  </button>

                  <div className="flex h-9 min-w-9 items-center justify-center rounded-lg border border-cyan-400/10 bg-cyan-400/[0.05] px-2 text-[10px] font-semibold text-cyan-300">
                    {currentPage}
                  </div>

                  <button
                    type="button"
                    onClick={goNext}
                    disabled={!canGoNext}
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-white/10 px-3 text-[10px] font-medium text-gray-400 transition hover:bg-white/[0.04] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    Next
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      <Modal
        open={formOpen}
        onClose={closeForm}
        title={
          editingCustomer
            ? "Edit Customer"
            : "Create Customer"
        }
        subtitle={
          editingCustomer
            ? "Update customer information"
            : "Add a new customer to your workspace"
        }
        width="max-w-4xl"
      >
        <CustomerForm
          form={form}
          setForm={setForm}
          branches={branches}
          editing={!!editingCustomer}
          submitting={submitting}
          onSubmit={handleSubmit}
          onClose={closeForm}
        />
      </Modal>

      {/* DETAILS MODAL */}
      {detailsOpen && selectedCustomer && (
        <CustomerDetails
          customer={selectedCustomer}
          branchName={
            typeof selectedCustomer.branchId ===
            "object"
              ? getBranchName(
                  selectedCustomer.branchId
                )
              : branchMap[
                  getCustomerBranchId(
                    selectedCustomer
                  )
                ] || "No Branch"
          }
          onClose={() => {
            setDetailsOpen(false);
            setSelectedCustomer(null);
          }}
          onEdit={() =>
            openEdit(selectedCustomer)
          }
        />
      )}
    </div>
  );
}