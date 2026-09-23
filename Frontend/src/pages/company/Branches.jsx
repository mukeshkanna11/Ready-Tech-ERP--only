import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Eye,
  Loader2,
  Mail,
  MapPin,
  Network,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Star,
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

const FILTER_OPTIONS = [
  { value: "", label: "All statuses" },
  ...STATUS_OPTIONS,
];

const EMPTY_ADDRESS = {
  line1: "",
  line2: "",
  city: "",
  state: "",
  country: "",
  postalCode: "",
};

const EMPTY_BRANCH = {
  name: "",
  code: "",
  email: "",
  phone: "",
  status: "active",
  isHeadOffice: false,
  address: { ...EMPTY_ADDRESS },
};

const toFormState = (branch) => ({
  name: branch?.name || "",
  code: branch?.code || "",
  email: branch?.email || "",
  phone: branch?.phone || "",
  status: branch?.status || "active",
  isHeadOffice: Boolean(branch?.isHeadOffice),
  address: { ...EMPTY_ADDRESS, ...(branch?.address || {}) },
});

const validateBranch = (form) => {
  const errors = {};

  if (!form.name.trim()) {
    errors.name = "Branch name is required";
  }

  if (!form.code.trim()) {
    errors.code = "Branch code is required";
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

const RowActions = ({ branch, onView, onEdit, onDelete }) => (
  <div className="flex flex-wrap items-center gap-2">
    <button
      type="button"
      onClick={() => onView(branch)}
      aria-label={`View details of ${branch.name}`}
      className="flex min-h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-xs text-gray-300 transition hover:border-white/20 hover:bg-white/[0.07] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
    >
      <Eye size={13} />
      View
    </button>

    <button
      type="button"
      onClick={() => onEdit(branch)}
      aria-label={`Edit ${branch.name}`}
      className="flex min-h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-xs text-gray-300 transition hover:border-white/20 hover:bg-white/[0.07] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
    >
      <Pencil size={13} />
      Edit
    </button>

    <button
      type="button"
      onClick={() => onDelete(branch)}
      aria-label={`Delete ${branch.name}`}
      className="flex min-h-9 items-center gap-1.5 rounded-lg border border-red-400/15 bg-red-400/[0.06] px-3 text-xs text-red-300 transition hover:border-red-400/30 hover:bg-red-400/[0.12] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
    >
      <Trash2 size={13} />
      Delete
    </button>
  </div>
);

function Branches() {
  const [branches, setBranches] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");

  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_BRANCH);
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

    const fetchBranches = async () => {
      try {
        // Both calls are scoped by the companyId on the auth token, so only
        // the signed-in company's branches can ever be returned.
        const [branchRes, companyRes] = await Promise.all([
          api.get("/branches", {
            params: statusFilter ? { status: statusFilter } : undefined,
          }),
          api.get("/companies/me"),
        ]);

        if (cancelled) return;

        setBranches(branchRes?.data?.data || []);
        setCompany(companyRes?.data?.data || null);
        setLoadError("");
      } catch (err) {
        if (cancelled) return;

        setLoadError(getApiErrorMessage(err, "Unable to load branches."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchBranches();

    return () => {
      cancelled = true;
    };
  }, [reloadKey, statusFilter]);

  const visibleBranches = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return branches;

    return branches.filter((branch) =>
      [branch.name, branch.code, branch.address?.city, branch.email]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [branches, search]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_BRANCH, address: { ...EMPTY_ADDRESS } });
    setErrors({});
    setFormError("");
    setFormOpen(true);
  };

  const openEdit = (branch) => {
    setEditing(branch);
    setForm(toFormState(branch));
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

  // companyId is intentionally never sent: the backend derives it from the
  // auth token so a branch can only be filed under the signed-in company.
  const buildPayload = () => ({
    name: form.name.trim(),
    code: form.code.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    status: form.status,
    isHeadOffice: form.isHeadOffice,
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

    const nextErrors = validateBranch(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSaving(true);
    setFormError("");

    try {
      if (editing) {
        await api.put(`/branches/${editing._id}`, buildPayload());
        setNotice(`"${form.name.trim()}" was updated successfully.`);
      } else {
        await api.post("/branches", buildPayload());
        setNotice(`"${form.name.trim()}" was added to your branch network.`);
      }

      setFormOpen(false);
      load();
    } catch (err) {
      setFormError(
        getApiErrorMessage(
          err,
          editing ? "Unable to update branch." : "Unable to create branch."
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
      await api.delete(`/branches/${confirming._id}`);
      setConfirming(null);
      setNotice(`"${confirming.name}" was deactivated.`);
      load();
    } catch (err) {
      setDeleteError(getApiErrorMessage(err, "Unable to delete branch."));
    } finally {
      setDeleting(false);
    }
  };

  const activeCount = branches.filter((b) => b.status === "active").length;

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
        onClick={openCreate}
        className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.1] px-3 text-xs font-medium text-cyan-200 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.16] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 sm:flex-none sm:px-4 sm:text-sm"
      >
        <Plus size={14} />
        <span>New branch</span>
      </button>
    </>
  );

  return (
    <PageShell
      eyebrow="Core ERP"
      title="Branch Management"
      icon={Network}
      description="Every branch below belongs to your signed-in company. Branches from other companies are never returned by the API."
      actions={actions}
      backTo="/company"
      backLabel="Company"
    >
      {/* Owning company banner — makes the Company -> Branch link explicit */}
      <section className="mb-5 flex flex-col gap-4 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.055] to-white/[0.018] p-4 shadow-2xl shadow-black/20 backdrop-blur-xl sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.08] text-cyan-300">
            <Building2 size={20} />
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-400">
              Branches of
            </p>

            <h2 className="mt-0.5 truncate text-base font-semibold sm:text-xl">
              {company?.name || "Your company"}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-center sm:p-4">
            <p className="text-lg font-semibold sm:text-xl">
              {branches.length}
            </p>

            <p className="mt-1 text-[10px] text-gray-600 sm:text-[11px]">
              Total
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-center sm:p-4">
            <p className="text-lg font-semibold text-emerald-300 sm:text-xl">
              {activeCount}
            </p>

            <p className="mt-1 text-[10px] text-gray-600 sm:text-[11px]">
              Active
            </p>
          </div>
        </div>
      </section>

      {notice ? (
        <div
          role="status"
          className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.07] px-4 py-3 text-xs leading-6 text-emerald-200 sm:text-sm"
        >
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />

          <p className="min-w-0 flex-1 break-words">{notice}</p>

          <button
            type="button"
            onClick={() => setNotice("")}
            className="shrink-0 text-[11px] uppercase tracking-wide opacity-70 transition hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {/* Toolbar */}
      <section className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"
          />

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search branches by name, code, city or email"
            placeholder="Search name, code, city…"
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-9 pr-3 text-sm text-gray-100 outline-none transition placeholder:text-gray-600 focus:border-cyan-400/40 focus:bg-white/[0.05] focus:ring-2 focus:ring-cyan-400/15"
          />
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="branch-status-filter"
            className="shrink-0 text-xs text-gray-500"
          >
            Status
          </label>

          <select
            id="branch-status-filter"
            value={statusFilter}
            onChange={(event) => {
              setLoading(true);
              setStatusFilter(event.target.value);
            }}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-gray-100 outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/15"
          >
            {FILTER_OPTIONS.map((option) => (
              <option
                key={option.value}
                value={option.value}
                className="bg-[#0a0e15]"
              >
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {loading ? (
        <LoadingState label="Loading branches…" />
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={load} />
      ) : branches.length === 0 ? (
        <EmptyState
          icon={Network}
          title="No branches yet"
          description={`Add the first branch for ${
            company?.name || "your company"
          } to start organising operations by location.`}
          action={
            <button
              type="button"
              onClick={openCreate}
              className="flex min-h-10 items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.1] px-4 text-sm font-medium text-cyan-200 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.16] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
            >
              <Plus size={14} />
              Add branch
            </button>
          }
        />
      ) : visibleBranches.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching branches"
          description={`Nothing matches "${search}". Try a different name, code or city.`}
          action={
            <button
              type="button"
              onClick={() => setSearch("")}
              className="flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm text-gray-300 transition hover:border-white/20 hover:bg-white/[0.07] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
            >
              Clear search
            </button>
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] shadow-xl shadow-black/10 backdrop-blur-xl lg:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[840px] text-left">
                <caption className="sr-only">
                  Branches belonging to {company?.name || "your company"}
                </caption>

                <thead>
                  <tr className="border-b border-white/[0.07] bg-white/[0.02]">
                    <th
                      scope="col"
                      className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500"
                    >
                      Branch
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500"
                    >
                      Code
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500"
                    >
                      Location
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500"
                    >
                      Contact
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {visibleBranches.map((branch) => (
                    <tr
                      key={branch._id}
                      className="border-b border-white/[0.05] transition last:border-0 hover:bg-white/[0.03]"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-100">
                            {branch.name}
                          </span>

                          {branch.isHeadOffice ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
                              <Star size={10} />
                              HO
                            </span>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-5 py-4 font-mono text-xs text-gray-400">
                        {branch.code}
                      </td>

                      <td className="max-w-[240px] truncate px-5 py-4 text-sm text-gray-400">
                        {branch.address?.city || (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>

                      <td className="max-w-[220px] px-5 py-4 text-sm text-gray-400">
                        <span className="block truncate">
                          {branch.email || (
                            <span className="text-gray-600">—</span>
                          )}
                        </span>

                        {branch.phone ? (
                          <span className="block truncate text-xs text-gray-600">
                            {branch.phone}
                          </span>
                        ) : null}
                      </td>

                      <td className="px-5 py-4">
                        <StatusPill status={branch.status} />
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end">
                          <RowActions
                            branch={branch}
                            onView={setDetail}
                            onEdit={openEdit}
                            onDelete={(target) => {
                              setDeleteError("");
                              setConfirming(target);
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile / tablet cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:hidden">
            {visibleBranches.map((branch) => (
              <article
                key={branch._id}
                className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 backdrop-blur-xl transition hover:border-white/20"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-semibold text-gray-100">
                        {branch.name}
                      </h3>

                      {branch.isHeadOffice ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
                          <Star size={10} />
                          HO
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-1 font-mono text-[11px] text-gray-500">
                      {branch.code}
                    </p>
                  </div>

                  <StatusPill status={branch.status} />
                </div>

                <dl className="mt-3 space-y-1.5 text-xs text-gray-500">
                  {branch.address?.city ? (
                    <div className="flex items-center gap-2">
                      <MapPin size={12} className="shrink-0" />
                      <dd className="truncate">{branch.address.city}</dd>
                    </div>
                  ) : null}

                  {branch.email ? (
                    <div className="flex items-center gap-2">
                      <Mail size={12} className="shrink-0" />
                      <dd className="truncate">{branch.email}</dd>
                    </div>
                  ) : null}

                  {branch.phone ? (
                    <div className="flex items-center gap-2">
                      <Phone size={12} className="shrink-0" />
                      <dd className="truncate">{branch.phone}</dd>
                    </div>
                  ) : null}
                </dl>

                <div className="mt-4 border-t border-white/[0.07] pt-3">
                  <RowActions
                    branch={branch}
                    onView={setDetail}
                    onEdit={openEdit}
                    onDelete={(target) => {
                      setDeleteError("");
                      setConfirming(target);
                    }}
                  />
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {/* Create / edit form */}
      <Modal
        open={formOpen}
        title={editing ? "Edit branch" : "New branch"}
        description={`This branch belongs to ${
          company?.name || "your company"
        }. The company is taken from your session and cannot be changed here.`}
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
              form="branch-form"
              disabled={saving}
              className="flex min-h-10 items-center justify-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.12] px-4 text-sm font-medium text-cyan-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              {editing ? "Save changes" : "Create branch"}
            </button>
          </>
        }
      >
        <form id="branch-form" onSubmit={handleSubmit} noValidate>
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
              label="Branch name"
              required
              value={form.name}
              onChange={setValue("name")}
              error={errors.name}
              placeholder="Mumbai Regional Office"
            />

            <FormField
              label="Branch code"
              required
              value={form.code}
              onChange={setValue("code")}
              error={errors.code}
              hint="Unique within your company, stored in uppercase"
              placeholder="MUM"
            />

            <FormField
              label="Email"
              type="email"
              value={form.email}
              onChange={setValue("email")}
              error={errors.email}
              placeholder="mumbai@acme.io"
            />

            <FormField
              label="Phone"
              value={form.phone}
              onChange={setValue("phone")}
              placeholder="+91 22 1234 5678"
            />

            <FormField
              label="Status"
              options={STATUS_OPTIONS}
              value={form.status}
              onChange={setValue("status")}
            />

            <div className="flex items-end">
              <label className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 transition hover:border-white/20">
                <input
                  type="checkbox"
                  checked={form.isHeadOffice}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      isHeadOffice: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 accent-cyan-400"
                />

                <span className="text-sm text-gray-300">
                  Head office
                  <span className="ml-1 text-[11px] text-gray-600">
                    (one per company)
                  </span>
                </span>
              </label>
            </div>
          </div>

          <fieldset className="mt-6 border-t border-white/[0.07] pt-5">
            <legend className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
              Branch address
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
        title={detail?.name || "Branch details"}
        description={
          company?.name ? `Branch of ${company.name}` : "Branch details"
        }
        onClose={() => setDetail(null)}
      >
        <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
          <DetailRow icon={Network} label="Branch code" value={detail?.code} />
          <DetailRow
            icon={Star}
            label="Head office"
            value={detail?.isHeadOffice ? "Yes" : "No"}
          />
          <DetailRow icon={Mail} label="Email" value={detail?.email} />
          <DetailRow icon={Phone} label="Phone" value={detail?.phone} />
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
      </Modal>

      <ConfirmDialog
        open={Boolean(confirming)}
        title="Delete branch"
        message={`"${
          confirming?.name || ""
        }" will be deactivated. Its records are retained and it can be reactivated by setting the status back to active.`}
        confirmLabel="Delete branch"
        loading={deleting}
        error={deleteError}
        onConfirm={handleDelete}
        onClose={() => setConfirming(null)}
      />
    </PageShell>
  );
}

export default Branches;
