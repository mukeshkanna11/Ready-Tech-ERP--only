import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  CheckCircle2,
  Eye,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Network,
  Pencil,
  Phone,
  Plus,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import api from "../../services/api";
import { getApiErrorMessage } from "../../utils/apiError";
import PageShell from "../../components/layout/PageShell";
import Modal from "../../components/ui/Modal";
import FormField from "../../components/ui/FormField";
import ConfirmDialog from "../../components/modals/ConfirmDialog";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../components/common/StateBlock";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const EMPTY_ADDRESS = {
  line1: "",
  line2: "",
  city: "",
  state: "",
  country: "",
  postalCode: "",
};

const EMPTY_COMPANY = {
  name: "",
  legalName: "",
  email: "",
  phone: "",
  website: "",
  registrationNumber: "",
  gstNumber: "",
  currency: "INR",
  status: "active",
  address: { ...EMPTY_ADDRESS },
};

const toFormState = (company) => ({
  name: company?.name || "",
  legalName: company?.legalName || "",
  email: company?.email || "",
  phone: company?.phone || "",
  website: company?.website || "",
  registrationNumber: company?.registrationNumber || "",
  gstNumber: company?.gstNumber || "",
  currency: company?.currency || "INR",
  status: company?.status || "active",
  address: { ...EMPTY_ADDRESS, ...(company?.address || {}) },
});

const validateCompany = (form) => {
  const errors = {};

  if (!form.name.trim()) {
    errors.name = "Company name is required";
  }

  if (form.email.trim() && !EMAIL_REGEX.test(form.email.trim())) {
    errors.email = "Enter a valid email address";
  }

  return errors;
};

const formatAddress = (address) =>
  [
    address?.line1,
    address?.line2,
    address?.city,
    address?.state,
    address?.postalCode,
    address?.country,
  ]
    .filter(Boolean)
    .join(", ");

const StatusPill = ({ status }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-medium capitalize sm:text-xs ${
      status === "active"
        ? "bg-emerald-400/10 text-emerald-300"
        : "bg-gray-400/10 text-gray-400"
    }`}
  >
    <span
      className={`h-1.5 w-1.5 rounded-full ${
        status === "active" ? "bg-emerald-400" : "bg-gray-500"
      }`}
    />
    {status || "unknown"}
  </span>
);

const SummaryCard = ({ icon: Icon, label, value, tone = "cyan" }) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 backdrop-blur-xl transition duration-300 hover:border-white/20 hover:bg-white/[0.055] sm:p-5">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-xs text-gray-500 sm:text-sm">{label}</p>

        <p className="mt-2 truncate text-2xl font-semibold tracking-tight sm:text-3xl">
          {value}
        </p>
      </div>

      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] ${
          tone === "emerald" ? "text-emerald-300" : "text-cyan-300"
        }`}
      >
        <Icon size={18} />
      </div>
    </div>
  </div>
);

const DetailRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 border-b border-white/[0.05] py-3 last:border-0">
    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-gray-500">
      <Icon size={14} />
    </div>

    <div className="min-w-0 flex-1">
      <p className="text-[11px] uppercase tracking-wide text-gray-600">
        {label}
      </p>

      <p className="mt-0.5 break-words text-sm text-gray-200">
        {value || <span className="text-gray-600">Not provided</span>}
      </p>
    </div>
  </div>
);

function Company() {
  const navigate = useNavigate();

  const [companies, setCompanies] = useState([]);
  const [currentCompany, setCurrentCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_COMPANY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [detail, setDetail] = useState(null);

  const [confirming, setConfirming] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError("");
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchCompany = async () => {
      try {
        // `/companies` is the tenant-scoped list, `/companies/me` adds the
        // populated branches used for the summary cards.
        const [listRes, meRes] = await Promise.all([
          api.get("/companies"),
          api.get("/companies/me"),
        ]);

        if (cancelled) return;

        setCompanies(listRes?.data?.data || []);
        setCurrentCompany(meRes?.data?.data || null);
        setLoadError("");
      } catch (err) {
        if (cancelled) return;

        setLoadError(getApiErrorMessage(err, "Unable to load company details."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchCompany();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_COMPANY, address: { ...EMPTY_ADDRESS } });
    setErrors({});
    setFormError("");
    setFormOpen(true);
  };

  const openEdit = (company) => {
    setEditing(company);
    setForm(toFormState(company));
    setErrors({});
    setFormError("");
    setFormOpen(true);
  };

  const setValue = (field) => (event) => {
    const { value } = event.target;
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const setAddressValue = (field) => (event) => {
    const { value } = event.target;
    setForm((prev) => ({
      ...prev,
      address: { ...prev.address, [field]: value },
    }));
  };

  const buildPayload = () => ({
    name: form.name.trim(),
    legalName: form.legalName.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    website: form.website.trim(),
    registrationNumber: form.registrationNumber.trim(),
    gstNumber: form.gstNumber.trim(),
    currency: form.currency.trim(),
    status: form.status,
    address: {
      line1: form.address.line1.trim(),
      line2: form.address.line2.trim(),
      city: form.address.city.trim(),
      state: form.address.state.trim(),
      country: form.address.country.trim(),
      postalCode: form.address.postalCode.trim(),
    },
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    const nextErrors = validateCompany(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSaving(true);
    setFormError("");

    try {
      if (editing) {
        await api.put(`/companies/${editing._id}`, buildPayload());
        setNotice({
          tone: "success",
          message: `"${form.name.trim()}" was updated successfully.`,
        });
      } else {
        const { data } = await api.post("/companies", buildPayload());
        const created = data?.data;

        // A newly registered company is a separate tenant, so it will not show
        // up in this list until a user signs in against it.
        setNotice({
          tone: "info",
          message: `Company "${created?.name}" was registered. Use company ID ${created?._id} to register its first user — it will not appear below until you sign in under that company.`,
        });
      }

      setFormOpen(false);
      load();
    } catch (err) {
      setFormError(
        getApiErrorMessage(
          err,
          editing ? "Unable to update company." : "Unable to create company."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirming || deleting) return;

    setDeleting(true);
    setDeleteError("");

    try {
      await api.delete(`/companies/${confirming._id}`);
      setConfirming(null);
      setNotice({
        tone: "info",
        message: `"${confirming.name}" and all of its branches were deactivated.`,
      });
      load();
    } catch (err) {
      setDeleteError(getApiErrorMessage(err, "Unable to delete company."));
    } finally {
      setDeleting(false);
    }
  };

  const branches = currentCompany?.branches || [];
  const activeBranches = branches.filter((b) => b.status === "active").length;
  const headOffice = branches.find((b) => b.isHeadOffice);

  const actions = (
    <>
      <button
        type="button"
        onClick={load}
        disabled={loading}
        className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs text-gray-300 transition hover:border-white/20 hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 disabled:opacity-50 sm:flex-none sm:px-4 sm:text-sm"
      >
        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        <span>Refresh</span>
      </button>

      <button
        type="button"
        onClick={() => navigate("/company/branches")}
        className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs text-gray-300 transition hover:border-white/20 hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 sm:flex-none sm:px-4 sm:text-sm"
      >
        <Network size={14} />
        <span>Branches</span>
      </button>

      <button
        type="button"
        onClick={openCreate}
        className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.1] px-3 text-xs font-medium text-cyan-200 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.16] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 sm:flex-none sm:px-4 sm:text-sm"
      >
        <Plus size={14} />
        <span>New company</span>
      </button>
    </>
  );

  return (
    <PageShell
      eyebrow="Core ERP"
      title="Company Management"
      icon={Building2}
      description="Manage your organisation profile, registration details and the branch network operating under it."
      actions={actions}
    >
      {notice ? (
        <div
          role="status"
          className={`mb-5 flex items-start gap-3 rounded-2xl border px-4 py-3 text-xs leading-6 sm:text-sm ${
            notice.tone === "success"
              ? "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-200"
              : "border-cyan-400/20 bg-cyan-400/[0.07] text-cyan-100"
          }`}
        >
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />

          <p className="min-w-0 flex-1 break-words">{notice.message}</p>

          <button
            type="button"
            onClick={() => setNotice(null)}
            className="shrink-0 text-[11px] uppercase tracking-wide opacity-70 transition hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {loading ? (
        <LoadingState label="Loading company details…" />
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={load} />
      ) : companies.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No company linked to your account"
          description="Your sign-in is not associated with a company profile yet. Register a company to get started."
          action={
            <button
              type="button"
              onClick={openCreate}
              className="flex min-h-10 items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.1] px-4 text-sm font-medium text-cyan-200 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.16] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
            >
              <Plus size={14} />
              Register company
            </button>
          }
        />
      ) : (
        <>
          <section className="mb-5 grid grid-cols-1 gap-3 sm:mb-6 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
            <SummaryCard
              icon={Network}
              label="Total branches"
              value={branches.length}
            />
            <SummaryCard
              icon={CheckCircle2}
              label="Active branches"
              value={activeBranches}
              tone="emerald"
            />
            <SummaryCard
              icon={MapPin}
              label="Head office"
              value={headOffice?.code || "—"}
            />
            <SummaryCard
              icon={ShieldCheck}
              label="Company status"
              value={
                currentCompany?.status === "active" ? "Active" : "Inactive"
              }
              tone={currentCompany?.status === "active" ? "emerald" : "cyan"}
            />
          </section>

          <section className="grid grid-cols-1 gap-4 sm:gap-5 2xl:grid-cols-2">
            {companies.map((company) => (
              <article
                key={company._id}
                className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 backdrop-blur-xl transition duration-300 hover:border-white/20 sm:p-6"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.08] text-sm font-bold uppercase text-cyan-300">
                      {company.name?.slice(0, 2) || "CO"}
                    </div>

                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold sm:text-lg">
                        {company.name}
                      </h2>

                      {company.legalName ? (
                        <p className="mt-0.5 truncate text-xs text-gray-500">
                          {company.legalName}
                        </p>
                      ) : null}

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusPill status={company.status} />

                        <span className="rounded-md bg-white/[0.05] px-2 py-1 text-[10px] text-gray-400 sm:text-xs">
                          {company.currency || "—"}
                        </span>

                        {company.gstNumber ? (
                          <span className="rounded-md bg-white/[0.05] px-2 py-1 font-mono text-[10px] text-gray-400 sm:text-xs">
                            {company.gstNumber}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDetail(currentCompany || company)}
                      aria-label={`View details of ${company.name}`}
                      className="flex min-h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-xs text-gray-300 transition hover:border-white/20 hover:bg-white/[0.07] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
                    >
                      <Eye size={13} />
                      View
                    </button>

                    <button
                      type="button"
                      onClick={() => openEdit(company)}
                      aria-label={`Edit ${company.name}`}
                      className="flex min-h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-xs text-gray-300 transition hover:border-white/20 hover:bg-white/[0.07] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
                    >
                      <Pencil size={13} />
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDeleteError("");
                        setConfirming(company);
                      }}
                      aria-label={`Delete ${company.name}`}
                      className="flex min-h-9 items-center gap-1.5 rounded-lg border border-red-400/15 bg-red-400/[0.06] px-3 text-xs text-red-300 transition hover:border-red-400/30 hover:bg-red-400/[0.12] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
                    >
                      <Trash2 size={13} />
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                  <DetailRow icon={Mail} label="Email" value={company.email} />
                  <DetailRow icon={Phone} label="Phone" value={company.phone} />
                  <DetailRow
                    icon={Globe}
                    label="Website"
                    value={company.website}
                  />
                  <DetailRow
                    icon={ReceiptText}
                    label="Registration no."
                    value={company.registrationNumber}
                  />
                </div>

                <div className="mt-4 flex flex-col gap-3 rounded-xl border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">Branch network</p>

                    <p className="mt-1 text-sm text-gray-200">
                      {branches.length === 0
                        ? "No branches yet"
                        : `${branches.length} branch${
                            branches.length === 1 ? "" : "es"
                          } · ${activeBranches} active`}
                    </p>

                    {branches.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {branches.slice(0, 5).map((branch) => (
                          <span
                            key={branch._id}
                            className="rounded-md bg-white/[0.05] px-2 py-1 text-[10px] text-gray-400"
                          >
                            {branch.code}
                            {branch.isHeadOffice ? " · HO" : ""}
                          </span>
                        ))}

                        {branches.length > 5 ? (
                          <span className="rounded-md bg-white/[0.05] px-2 py-1 text-[10px] text-gray-500">
                            +{branches.length - 5} more
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate("/company/branches")}
                    className="flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-xs text-gray-300 transition hover:border-white/20 hover:bg-white/[0.07] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 sm:text-sm"
                  >
                    <Network size={14} />
                    Manage branches
                  </button>
                </div>
              </article>
            ))}
          </section>
        </>
      )}

      {/* Create / edit form */}
      <Modal
        open={formOpen}
        title={editing ? "Edit company" : "Register company"}
        description={
          editing
            ? "Update your organisation profile. Fields left blank stay unchanged."
            : "Register a new company profile. Its first user can then sign up against the returned company ID."
        }
        onClose={() => (saving ? null : setFormOpen(false))}
        footer={
          <>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              disabled={saving}
              className="min-h-10 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm text-gray-300 transition hover:border-white/20 hover:bg-white/[0.07] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              form="company-form"
              disabled={saving}
              className="flex min-h-10 items-center justify-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.12] px-4 text-sm font-medium text-cyan-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              {editing ? "Save changes" : "Register company"}
            </button>
          </>
        }
      >
        <form id="company-form" onSubmit={handleSubmit} noValidate>
          {formError ? (
            <p
              role="alert"
              className="mb-4 rounded-xl border border-red-400/20 bg-red-400/[0.07] px-3 py-2.5 text-xs text-red-300"
            >
              {formError}
            </p>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label="Company name"
              required
              value={form.name}
              onChange={setValue("name")}
              error={errors.name}
              placeholder="Acme Traders"
              autoComplete="organization"
            />

            <FormField
              label="Legal name"
              value={form.legalName}
              onChange={setValue("legalName")}
              placeholder="Acme Traders Pvt Ltd"
            />

            <FormField
              label="Email"
              type="email"
              value={form.email}
              onChange={setValue("email")}
              error={errors.email}
              placeholder="info@acme.io"
              autoComplete="email"
            />

            <FormField
              label="Phone"
              value={form.phone}
              onChange={setValue("phone")}
              placeholder="+91 98765 43210"
              autoComplete="tel"
            />

            <FormField
              label="Website"
              value={form.website}
              onChange={setValue("website")}
              placeholder="https://acme.io"
            />

            <FormField
              label="Registration number"
              value={form.registrationNumber}
              onChange={setValue("registrationNumber")}
              placeholder="U72900KA2020PTC000000"
            />

            <FormField
              label="GST number"
              value={form.gstNumber}
              onChange={setValue("gstNumber")}
              hint="Must be unique across companies"
              placeholder="29ABCDE1234F1Z5"
            />

            <FormField
              label="Currency"
              value={form.currency}
              onChange={setValue("currency")}
              placeholder="INR"
              maxLength={3}
            />

            <FormField
              label="Status"
              options={STATUS_OPTIONS}
              value={form.status}
              onChange={setValue("status")}
            />
          </div>

          <fieldset className="mt-6 border-t border-white/[0.07] pt-5">
            <legend className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
              Registered address
            </legend>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="Address line 1"
                value={form.address.line1}
                onChange={setAddressValue("line1")}
                className="sm:col-span-2"
              />

              <FormField
                label="Address line 2"
                value={form.address.line2}
                onChange={setAddressValue("line2")}
                className="sm:col-span-2"
              />

              <FormField
                label="City"
                value={form.address.city}
                onChange={setAddressValue("city")}
              />

              <FormField
                label="State"
                value={form.address.state}
                onChange={setAddressValue("state")}
              />

              <FormField
                label="Postal code"
                value={form.address.postalCode}
                onChange={setAddressValue("postalCode")}
              />

              <FormField
                label="Country"
                value={form.address.country}
                onChange={setAddressValue("country")}
              />
            </div>
          </fieldset>
        </form>
      </Modal>

      {/* Details */}
      <Modal
        open={Boolean(detail)}
        title={detail?.name || "Company details"}
        description={detail?.legalName || undefined}
        onClose={() => setDetail(null)}
      >
        <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
          <DetailRow icon={Mail} label="Email" value={detail?.email} />
          <DetailRow icon={Phone} label="Phone" value={detail?.phone} />
          <DetailRow icon={Globe} label="Website" value={detail?.website} />
          <DetailRow
            icon={ReceiptText}
            label="Registration number"
            value={detail?.registrationNumber}
          />
          <DetailRow
            icon={ReceiptText}
            label="GST number"
            value={detail?.gstNumber}
          />
          <DetailRow
            icon={ShieldCheck}
            label="Currency"
            value={detail?.currency}
          />
          <DetailRow
            icon={MapPin}
            label="Address"
            value={formatAddress(detail?.address)}
          />
          <DetailRow
            icon={CheckCircle2}
            label="Status"
            value={detail?.status}
          />
        </div>

        <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs uppercase tracking-wide text-gray-600">
            Branches under this company
          </p>

          {detail?.branches?.length ? (
            <ul className="mt-3 space-y-2">
              {detail.branches.map((branch) => (
                <li
                  key={branch._id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2"
                >
                  <span className="min-w-0 truncate text-sm text-gray-200">
                    {branch.name}

                    <span className="ml-2 font-mono text-[11px] text-gray-500">
                      {branch.code}
                    </span>
                  </span>

                  <StatusPill status={branch.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-gray-500">
              No branches recorded yet.
            </p>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirming)}
        title="Delete company"
        message={`"${
          confirming?.name || ""
        }" will be deactivated along with every branch under it. Existing records are retained and the company can be reactivated by setting its status back to active.`}
        confirmLabel="Delete company"
        loading={deleting}
        error={deleteError}
        onConfirm={handleDelete}
        onClose={() => setConfirming(null)}
      />
    </PageShell>
  );
}

export default Company;
