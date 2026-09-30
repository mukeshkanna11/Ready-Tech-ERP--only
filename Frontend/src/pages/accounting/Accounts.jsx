import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  X,
  Wallet,
  Landmark,
  TrendingUp,
  TrendingDown,
  CreditCard,
  CircleDollarSign,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import api from "../../services/api";

const ACCOUNT_TYPES = [
  "asset",
  "liability",
  "equity",
  "income",
  "expense",
];

const EMPTY_FORM = {
  code: "",
  name: "",
  description: "",
  type: "asset",
  subType: "",
  parentAccountId: "",
  openingBalance: "",
  openingBalanceType: "debit",
  currency: "INR",
  isCashAccount: false,
  isBankAccount: false,
  isTaxAccount: false,
  isActive: true,
  sortOrder: 0,
};

const money = (value = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const typeLabel = (type) =>
  type ? type.charAt(0).toUpperCase() + type.slice(1) : "";

const typeClass = (type) => {
  switch (type) {
    case "asset":
      return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
    case "liability":
      return "text-rose-400 bg-rose-400/10 border-rose-400/20";
    case "equity":
      return "text-violet-400 bg-violet-400/10 border-violet-400/20";
    case "income":
      return "text-cyan-400 bg-cyan-400/10 border-cyan-400/20";
    case "expense":
      return "text-amber-400 bg-amber-400/10 border-amber-400/20";
    default:
      return "text-slate-400 bg-slate-400/10 border-slate-400/20";
  }
};

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
    limit: 50,
  });

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      setError("");

      const params = {
        page,
        limit: 50,
      };

      if (search.trim()) params.search = search.trim();
      if (typeFilter) params.type = typeFilter;
      if (statusFilter) params.isActive = statusFilter;

      const [accountsRes, summaryRes] = await Promise.all([
        api.get("/accounts", { params }),
        api.get("/accounts/summary"),
      ]);

      const accountPayload = accountsRes.data || {};
      const summaryPayload = summaryRes.data || {};

      setAccounts(accountPayload.data || []);
      setPagination(
        accountPayload.pagination || {
          page: 1,
          pages: 1,
          total: accountPayload.data?.length || 0,
          limit: 50,
        }
      );
      setSummary(summaryPayload.data || null);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to load accounts. Please check the Finance API."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, [page, typeFilter, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (page !== 1) setPage(1);
      else loadAccounts();
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  const totals = useMemo(() => {
    const list = accounts || [];

    return {
      assets: list
        .filter((a) => a.type === "asset")
        .reduce((sum, a) => sum + Number(a.currentBalance || 0), 0),
      liabilities: list
        .filter((a) => a.type === "liability")
        .reduce((sum, a) => sum + Number(a.currentBalance || 0), 0),
      income: list
        .filter((a) => a.type === "income")
        .reduce((sum, a) => sum + Number(a.currentBalance || 0), 0),
      expense: list
        .filter((a) => a.type === "expense")
        .reduce((sum, a) => sum + Number(a.currentBalance || 0), 0),
    };
  }, [accounts]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const openEdit = (account) => {
    setEditingId(account._id);
    setForm({
      code: account.code || "",
      name: account.name || "",
      description: account.description || "",
      type: account.type || "asset",
      subType: account.subType || "",
      parentAccountId: account.parentAccountId || "",
      openingBalance: account.openingBalance ?? "",
      openingBalanceType: account.openingBalanceType || "debit",
      currency: account.currency || "INR",
      isCashAccount: !!account.isCashAccount,
      isBankAccount: !!account.isBankAccount,
      isTaxAccount: !!account.isTaxAccount,
      isActive: account.isActive !== false,
      sortOrder: account.sortOrder || 0,
    });
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const updateForm = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const submitForm = async (event) => {
    event.preventDefault();

    if (!form.code.trim() || !form.name.trim()) {
      setError("Account code and account name are required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        ...form,
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description.trim(),
        subType: form.subType.trim(),
        parentAccountId: form.parentAccountId || null,
        openingBalance:
          form.openingBalance === "" ? 0 : Number(form.openingBalance),
        sortOrder: Number(form.sortOrder || 0),
      };

      if (editingId) {
        await api.put(`/accounts/${editingId}`, payload);
        setSuccess("Account updated successfully.");
      } else {
        await api.post("/accounts", payload);
        setSuccess("Account created successfully.");
      }

      setShowModal(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
      await loadAccounts();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to save account. Please verify the entered values."
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async (account) => {
    if (account.isSystemAccount) {
      setError("System accounts cannot be deleted.");
      return;
    }

    const confirmed = window.confirm(
      `Delete account "${account.name}" (${account.code})?`
    );

    if (!confirmed) return;

    try {
      setError("");
      await api.delete(`/accounts/${account._id}`);
      setSuccess("Account deleted successfully.");
      await loadAccounts();
    } catch (err) {
      setError(
        err?.response?.data?.message || "Unable to delete this account."
      );
    }
  };

  const statCards = [
    {
      title: "Total Accounts",
      value: pagination.total || accounts.length,
      icon: Wallet,
      valueType: "number",
    },
    {
      title: "Assets",
      value: summary?.assets ?? totals.assets,
      icon: TrendingUp,
    },
    {
      title: "Liabilities",
      value: summary?.liabilities ?? totals.liabilities,
      icon: TrendingDown,
    },
    {
      title: "Income",
      value: summary?.income ?? totals.income,
      icon: CircleDollarSign,
    },
  ];

  return (
    <div className="min-h-screen bg-[#080b12] text-white">
      <div className="mx-auto max-w-[1600px] p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-7 flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-cyan-400">
              <Landmark size={14} />
              Finance
            </div>

            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              Chart of Accounts
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Manage your company's financial accounts and balances.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={loadAccounts}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/[0.08]"
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-400"
            >
              <Plus size={17} />
              New Account
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-5 flex items-center justify-between rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            <span>{error}</span>
            <button onClick={() => setError("")}>
              <X size={17} />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {success}
          </div>
        )}

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.title}
                className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-5 shadow-xl shadow-black/10 backdrop-blur"
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm text-slate-400">
                    {card.title}
                  </span>

                  <div className="rounded-xl bg-cyan-400/10 p-2.5 text-cyan-400">
                    <Icon size={18} />
                  </div>
                </div>

                <div className="text-2xl font-bold">
                  {card.valueType === "number"
                    ? card.value
                    : money(card.value)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="mb-5 rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_180px]">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search account code, name..."
                className="w-full rounded-xl border border-white/10 bg-[#0d111a] py-2.5 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500/50"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-white/10 bg-[#0d111a] px-3 py-2.5 text-sm text-slate-200 outline-none"
            >
              <option value="">All Types</option>
              {ACCOUNT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {typeLabel(type)}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-white/10 bg-[#0d111a] px-3 py-2.5 text-sm text-slate-200 outline-none"
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] shadow-2xl shadow-black/20">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="border-b border-white/[0.07] bg-white/[0.025]">
                <tr>
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Code
                  </th>
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Account
                  </th>
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Type
                  </th>
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Opening
                  </th>
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Current Balance
                  </th>
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/[0.05]">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-14 text-center">
                      <RefreshCw className="mx-auto mb-3 animate-spin text-cyan-400" />
                      <p className="text-sm text-slate-500">
                        Loading accounts...
                      </p>
                    </td>
                  </tr>
                ) : accounts.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-14 text-center">
                      <Wallet className="mx-auto mb-3 text-slate-600" size={32} />
                      <p className="text-sm text-slate-400">
                        No accounts found.
                      </p>
                    </td>
                  </tr>
                ) : (
                  accounts.map((account) => (
                    <tr
                      key={account._id}
                      className="transition hover:bg-white/[0.025]"
                    >
                      <td className="px-5 py-4">
                        <span className="font-mono text-sm text-cyan-300">
                          {account.code}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-medium text-white">
                          {account.name}
                        </div>

                        {account.description && (
                          <div className="mt-1 max-w-xs truncate text-xs text-slate-500">
                            {account.description}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${typeClass(
                            account.type
                          )}`}
                        >
                          {typeLabel(account.type)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-300">
                        {money(account.openingBalance)}
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-semibold text-white">
                          {money(account.currentBalance)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                            account.isActive
                              ? "bg-emerald-400/10 text-emerald-400"
                              : "bg-slate-400/10 text-slate-500"
                          }`}
                        >
                          {account.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEdit(account)}
                            className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-slate-300 transition hover:bg-cyan-400/10 hover:text-cyan-400"
                            title="Edit"
                          >
                            <Pencil size={15} />
                          </button>

                          <button
                            onClick={() => deleteAccount(account)}
                            className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-slate-300 transition hover:bg-rose-400/10 hover:text-rose-400"
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col gap-3 border-t border-white/[0.07] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              Showing {accounts.length} of {pagination.total || 0} accounts
            </p>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-white/10 p-2 text-slate-400 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>

              <span className="rounded-lg bg-white/[0.05] px-3 py-2 text-xs text-slate-300">
                {page} / {pagination.pages || 1}
              </span>

              <button
                disabled={page >= (pagination.pages || 1)}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-white/10 p-2 text-slate-400 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-[#0d111a] shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-white/[0.07] bg-[#0d111a] px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold">
                  {editingId ? "Edit Account" : "Create Account"}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Configure account details and opening balance.
                </p>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submitForm} className="space-y-5 p-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field
                  label="Account Code"
                  value={form.code}
                  onChange={(v) => updateForm("code", v)}
                  placeholder="1000"
                  required
                />

                <Field
                  label="Account Name"
                  value={form.name}
                  onChange={(v) => updateForm("name", v)}
                  placeholder="Cash"
                  required
                />

                <SelectField
                  label="Account Type"
                  value={form.type}
                  onChange={(v) => updateForm("type", v)}
                  options={ACCOUNT_TYPES.map((x) => ({
                    value: x,
                    label: typeLabel(x),
                  }))}
                />

                <Field
                  label="Sub Type"
                  value={form.subType}
                  onChange={(v) => updateForm("subType", v)}
                  placeholder="Current Asset"
                />

                <Field
                  label="Opening Balance"
                  type="number"
                  value={form.openingBalance}
                  onChange={(v) => updateForm("openingBalance", v)}
                  placeholder="0"
                />

                <SelectField
                  label="Opening Balance Type"
                  value={form.openingBalanceType}
                  onChange={(v) => updateForm("openingBalanceType", v)}
                  options={[
                    { value: "debit", label: "Debit" },
                    { value: "credit", label: "Credit" },
                  ]}
                />

                <Field
                  label="Currency"
                  value={form.currency}
                  onChange={(v) => updateForm("currency", v)}
                  placeholder="INR"
                />

                <Field
                  label="Sort Order"
                  type="number"
                  value={form.sortOrder}
                  onChange={(v) => updateForm("sortOrder", v)}
                  placeholder="0"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-slate-400">
                  Description
                </label>

                <textarea
                  value={form.description}
                  onChange={(e) =>
                    updateForm("description", e.target.value)
                  }
                  rows={3}
                  placeholder="Account description..."
                  className="w-full rounded-xl border border-white/10 bg-[#080b12] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-500/50"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Toggle
                  label="Cash Account"
                  checked={form.isCashAccount}
                  onChange={(v) => updateForm("isCashAccount", v)}
                />

                <Toggle
                  label="Bank Account"
                  checked={form.isBankAccount}
                  onChange={(v) => updateForm("isBankAccount", v)}
                />

                <Toggle
                  label="Tax Account"
                  checked={form.isTaxAccount}
                  onChange={(v) => updateForm("isTaxAccount", v)}
                />

                <Toggle
                  label="Active"
                  checked={form.isActive}
                  onChange={(v) => updateForm("isActive", v)}
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-white/[0.07] pt-5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-white/10 px-5 py-2.5 text-sm text-slate-300 hover:bg-white/5"
                >
                  Cancel
                </button>

                <button
                  disabled={saving}
                  type="submit"
                  className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingId
                    ? "Update Account"
                    : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  required = false,
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-medium text-slate-400">
        {label}
        {required && <span className="ml-1 text-cyan-400">*</span>}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-white/10 bg-[#080b12] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-500/50"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-medium text-slate-400">
        {label}
      </label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-[#080b12] px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-white/[0.025] px-3 py-3">
      <span className="text-xs text-slate-300">{label}</span>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 rounded-full transition ${
          checked ? "bg-cyan-500" : "bg-slate-700"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${
            checked ? "left-[18px]" : "left-0.5"
          }`}
        />
      </button>
    </label>
  );
}