import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  RefreshCw,
  X,
  Pencil,
  Trash2,
  Send,
  Ban,
  BookOpen,
  CheckCircle2,
  Clock3,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import api from "../../services/api";

const ENTRY_TYPES = [
  "general",
  "sales",
  "purchase",
  "payment",
  "receipt",
  "expense",
  "invoice",
  "adjustment",
  "opening",
  "closing",
  "transfer",
  "tax",
  "payroll",
  "other",
];

const EMPTY_LINE = {
  accountId: "",
  description: "",
  debit: "",
  credit: "",
};

const EMPTY_FORM = {
  journalDate: new Date().toISOString().slice(0, 10),
  description: "",
  referenceNumber: "",
  entryType: "general",
  currency: "INR",
  notes: "",
  lines: [
    { ...EMPTY_LINE },
    { ...EMPTY_LINE },
  ],
};

const money = (value = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const label = (value) =>
  value
    ? value
        .split("_")
        .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
        .join(" ")
    : "";

const statusClass = (status) => {
  if (status === "posted")
    return "bg-emerald-400/10 text-emerald-400 border-emerald-400/20";

  if (status === "cancelled")
    return "bg-rose-400/10 text-rose-400 border-rose-400/20";

  return "bg-amber-400/10 text-amber-400 border-amber-400/20";
};

export default function JournalEntries() {
  const [entries, setEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [summary, setSummary] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [entryType, setEntryType] = useState("");

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
  });

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const params = {
        page,
        limit: 50,
      };

      if (search.trim()) params.search = search.trim();
      if (status) params.status = status;
      if (entryType) params.entryType = entryType;

      const [entriesRes, accountsRes, summaryRes] = await Promise.all([
        api.get("/journal-entries", { params }),
        api.get("/accounts", { params: { limit: 500 } }),
        api.get("/journal-entries/summary"),
      ]);

      setEntries(entriesRes.data?.data || []);
      setPagination(
        entriesRes.data?.pagination || {
          page: 1,
          pages: 1,
          total: entriesRes.data?.data?.length || 0,
        }
      );

      setAccounts(accountsRes.data?.data || []);
      setSummary(summaryRes.data?.data || null);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to load journal entries."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, status, entryType]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (page !== 1) setPage(1);
      else loadData();
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  const totals = useMemo(() => {
    return form.lines.reduce(
      (acc, line) => {
        acc.debit += Number(line.debit || 0);
        acc.credit += Number(line.credit || 0);
        return acc;
      },
      { debit: 0, credit: 0 }
    );
  }, [form.lines]);

  const difference = Number(
    (totals.debit - totals.credit).toFixed(2)
  );

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      journalDate: new Date().toISOString().slice(0, 10),
      lines: [
        { ...EMPTY_LINE },
        { ...EMPTY_LINE },
      ],
    });
    setError("");
    setShowModal(true);
  };

  const openEdit = (entry) => {
    if (entry.status !== "draft") {
      setError("Only draft journal entries can be edited.");
      return;
    }

    setEditingId(entry._id);

    setForm({
      journalDate: entry.journalDate
        ? String(entry.journalDate).slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      description: entry.description || "",
      referenceNumber: entry.referenceNumber || "",
      entryType: entry.entryType || "general",
      currency: entry.currency || "INR",
      notes: entry.notes || "",
      lines:
        entry.lines?.length >= 2
          ? entry.lines.map((line) => ({
              accountId:
                line.accountId?._id || line.accountId || "",
              description: line.description || "",
              debit: line.debit || "",
              credit: line.credit || "",
            }))
          : [
              { ...EMPTY_LINE },
              { ...EMPTY_LINE },
            ],
    });

    setError("");
    setShowModal(true);
  };

  const updateForm = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const updateLine = (index, key, value) => {
    setForm((prev) => {
      const lines = [...prev.lines];
      lines[index] = {
        ...lines[index],
        [key]: value,
      };

      if (key === "debit" && Number(value) > 0) {
        lines[index].credit = "";
      }

      if (key === "credit" && Number(value) > 0) {
        lines[index].debit = "";
      }

      return {
        ...prev,
        lines,
      };
    });
  };

  const addLine = () => {
    setForm((prev) => ({
      ...prev,
      lines: [...prev.lines, { ...EMPTY_LINE }],
    }));
  };

  const removeLine = (index) => {
    if (form.lines.length <= 2) return;

    setForm((prev) => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index),
    }));
  };

  const submitForm = async (event) => {
    event.preventDefault();

    if (!form.description.trim()) {
      setError("Journal description is required.");
      return;
    }

    if (form.lines.length < 2) {
      setError("At least two journal lines are required.");
      return;
    }

    if (Math.abs(difference) > 0.01) {
      setError(
        `Journal entry is not balanced. Difference: ${money(
          Math.abs(difference)
        )}`
      );
      return;
    }

    const invalidLine = form.lines.find(
      (line) =>
        !line.accountId ||
        (Number(line.debit || 0) <= 0 &&
          Number(line.credit || 0) <= 0)
    );

    if (invalidLine) {
      setError(
        "Every journal line must have an account and either debit or credit."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        journalDate: form.journalDate,
        description: form.description.trim(),
        referenceNumber: form.referenceNumber.trim(),
        entryType: form.entryType,
        currency: form.currency,
        notes: form.notes.trim(),
        lines: form.lines.map((line) => ({
          accountId: line.accountId,
          description: line.description.trim(),
          debit: Number(line.debit || 0),
          credit: Number(line.credit || 0),
        })),
      };

      if (editingId) {
        await api.put(`/journal-entries/${editingId}`, payload);
        setSuccess("Journal entry updated successfully.");
      } else {
        await api.post("/journal-entries", payload);
        setSuccess("Journal entry created successfully.");
      }

      setShowModal(false);
      setEditingId(null);
      setForm(EMPTY_FORM);

      await loadData();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to save journal entry."
      );
    } finally {
      setSaving(false);
    }
  };

  const postEntry = async (entry) => {
    if (entry.status !== "draft") return;

    if (
      !window.confirm(
        `Post journal ${entry.journalNumber}? This will update account balances.`
      )
    ) {
      return;
    }

    try {
      setError("");
      await api.post(`/journal-entries/${entry._id}/post`);
      setSuccess(`${entry.journalNumber} posted successfully.`);
      await loadData();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to post journal entry."
      );
    }
  };

  const cancelEntry = async (entry) => {
    if (
      !window.confirm(
        `Cancel journal ${entry.journalNumber}?`
      )
    ) {
      return;
    }

    try {
      setError("");
      await api.post(`/journal-entries/${entry._id}/cancel`, {
        reason: "Cancelled from Finance UI",
      });
      setSuccess(`${entry.journalNumber} cancelled.`);
      await loadData();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to cancel journal entry."
      );
    }
  };

  const deleteEntry = async (entry) => {
    if (
      !window.confirm(
        `Delete draft journal ${entry.journalNumber}?`
      )
    ) {
      return;
    }

    try {
      setError("");
      await api.delete(`/journal-entries/${entry._id}`);
      setSuccess("Journal entry deleted.");
      await loadData();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to delete journal entry."
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#080b12] text-white">
      <div className="mx-auto max-w-[1600px] p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-violet-400">
              <BookOpen size={14} />
              Finance
            </div>

            <h1 className="text-2xl font-bold md:text-3xl">
              Journal Entries
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Record, review, post and manage double-entry transactions.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={loadData}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-slate-200 hover:bg-white/[0.08]"
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 hover:bg-violet-400"
            >
              <Plus size={17} />
              New Journal
            </button>
          </div>
        </div>

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
          <Stat
            title="Total Entries"
            value={summary?.total ?? pagination.total ?? 0}
            icon={FileText}
          />
          <Stat
            title="Draft"
            value={summary?.draft ?? 0}
            icon={Clock3}
          />
          <Stat
            title="Posted"
            value={summary?.posted ?? 0}
            icon={CheckCircle2}
          />
          <Stat
            title="Cancelled"
            value={summary?.cancelled ?? 0}
            icon={Ban}
          />
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
                placeholder="Search journal number, description..."
                className="w-full rounded-xl border border-white/10 bg-[#0d111a] py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-500/50"
              />
            </div>

            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-white/10 bg-[#0d111a] px-3 py-2.5 text-sm text-slate-200 outline-none"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="posted">Posted</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={entryType}
              onChange={(e) => {
                setEntryType(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-white/10 bg-[#0d111a] px-3 py-2.5 text-sm text-slate-200 outline-none"
            >
              <option value="">All Types</option>
              {ENTRY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {label(type)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left">
              <thead className="border-b border-white/[0.07] bg-white/[0.025]">
                <tr>
                  <th className="px-5 py-4 text-xs uppercase tracking-wider text-slate-500">
                    Journal
                  </th>
                  <th className="px-5 py-4 text-xs uppercase tracking-wider text-slate-500">
                    Date
                  </th>
                  <th className="px-5 py-4 text-xs uppercase tracking-wider text-slate-500">
                    Description
                  </th>
                  <th className="px-5 py-4 text-xs uppercase tracking-wider text-slate-500">
                    Type
                  </th>
                  <th className="px-5 py-4 text-xs uppercase tracking-wider text-slate-500">
                    Debit
                  </th>
                  <th className="px-5 py-4 text-xs uppercase tracking-wider text-slate-500">
                    Credit
                  </th>
                  <th className="px-5 py-4 text-xs uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="px-5 py-4 text-right text-xs uppercase tracking-wider text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/[0.05]">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-5 py-14 text-center">
                      <RefreshCw className="mx-auto mb-3 animate-spin text-violet-400" />
                      <p className="text-sm text-slate-500">
                        Loading journal entries...
                      </p>
                    </td>
                  </tr>
                ) : entries.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-5 py-14 text-center">
                      <BookOpen
                        className="mx-auto mb-3 text-slate-600"
                        size={34}
                      />
                      <p className="text-sm text-slate-400">
                        No journal entries found.
                      </p>
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => (
                    <tr
                      key={entry._id}
                      className="transition hover:bg-white/[0.025]"
                    >
                      <td className="px-5 py-4">
                        <span className="font-mono text-sm text-violet-300">
                          {entry.journalNumber}
                        </span>

                        {entry.referenceNumber && (
                          <div className="mt-1 text-xs text-slate-600">
                            Ref: {entry.referenceNumber}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-300">
                        {entry.journalDate
                          ? new Date(
                              entry.journalDate
                            ).toLocaleDateString("en-IN")
                          : "-"}
                      </td>

                      <td className="max-w-xs px-5 py-4">
                        <div className="truncate text-sm font-medium text-white">
                          {entry.description}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-xs text-slate-400">
                        {label(entry.entryType)}
                      </td>

                      <td className="px-5 py-4 text-sm font-medium text-emerald-400">
                        {money(entry.totalDebit)}
                      </td>

                      <td className="px-5 py-4 text-sm font-medium text-rose-400">
                        {money(entry.totalCredit)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${statusClass(
                            entry.status
                          )}`}
                        >
                          {label(entry.status)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1.5">
                          {entry.status === "draft" && (
                            <>
                              <button
                                onClick={() => openEdit(entry)}
                                title="Edit"
                                className="rounded-lg p-2 text-slate-400 hover:bg-violet-400/10 hover:text-violet-400"
                              >
                                <Pencil size={15} />
                              </button>

                              <button
                                onClick={() => postEntry(entry)}
                                title="Post"
                                className="rounded-lg p-2 text-emerald-400 hover:bg-emerald-400/10"
                              >
                                <Send size={15} />
                              </button>

                              <button
                                onClick={() => deleteEntry(entry)}
                                title="Delete"
                                className="rounded-lg p-2 text-rose-400 hover:bg-rose-400/10"
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}

                          {entry.status === "posted" && (
                            <button
                              onClick={() => cancelEntry(entry)}
                              title="Cancel"
                              className="rounded-lg p-2 text-amber-400 hover:bg-amber-400/10"
                            >
                              <Ban size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-white/[0.07] px-5 py-4">
            <p className="text-xs text-slate-500">
              {pagination.total || 0} total entries
            </p>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-white/10 p-2 disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>

              <span className="rounded-lg bg-white/[0.05] px-3 py-2 text-xs">
                {page} / {pagination.pages || 1}
              </span>

              <button
                disabled={page >= (pagination.pages || 1)}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-white/10 p-2 disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Journal Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm">
          <div className="max-h-[95vh] w-full max-w-6xl overflow-y-auto rounded-2xl border border-white/10 bg-[#0d111a] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.07] bg-[#0d111a] px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold">
                  {editingId
                    ? "Edit Journal Entry"
                    : "Create Journal Entry"}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Debit and credit totals must be equal.
                </p>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submitForm} className="p-5">
              <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <FormField
                  label="Journal Date"
                  type="date"
                  value={form.journalDate}
                  onChange={(v) => updateForm("journalDate", v)}
                />

                <FormField
                  label="Reference Number"
                  value={form.referenceNumber}
                  onChange={(v) =>
                    updateForm("referenceNumber", v)
                  }
                  placeholder="REF-001"
                />

                <SelectField
                  label="Entry Type"
                  value={form.entryType}
                  onChange={(v) => updateForm("entryType", v)}
                  options={ENTRY_TYPES.map((x) => ({
                    value: x,
                    label: label(x),
                  }))}
                />

                <FormField
                  label="Currency"
                  value={form.currency}
                  onChange={(v) => updateForm("currency", v)}
                />
              </div>

              <div className="mb-6">
                <FormField
                  label="Description"
                  value={form.description}
                  onChange={(v) =>
                    updateForm("description", v)
                  }
                  placeholder="Enter journal description"
                  required
                />
              </div>

              <div className="overflow-x-auto rounded-xl border border-white/[0.07]">
                <table className="w-full min-w-[850px]">
                  <thead className="bg-white/[0.03]">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs text-slate-500">
                        Account
                      </th>
                      <th className="px-3 py-3 text-left text-xs text-slate-500">
                        Description
                      </th>
                      <th className="px-3 py-3 text-right text-xs text-slate-500">
                        Debit
                      </th>
                      <th className="px-3 py-3 text-right text-xs text-slate-500">
                        Credit
                      </th>
                      <th className="w-12" />
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/[0.05]">
                    {form.lines.map((line, index) => (
                      <tr key={index}>
                        <td className="p-2">
                          <select
                            value={line.accountId}
                            onChange={(e) =>
                              updateLine(
                                index,
                                "accountId",
                                e.target.value
                              )
                            }
                            className="w-full rounded-lg border border-white/10 bg-[#080b12] px-3 py-2.5 text-sm text-white outline-none"
                            required
                          >
                            <option value="">
                              Select account
                            </option>

                            {accounts.map((account) => (
                              <option
                                key={account._id}
                                value={account._id}
                              >
                                {account.code} — {account.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="p-2">
                          <input
                            value={line.description}
                            onChange={(e) =>
                              updateLine(
                                index,
                                "description",
                                e.target.value
                              )
                            }
                            placeholder="Line description"
                            className="w-full rounded-lg border border-white/10 bg-[#080b12] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600"
                          />
                        </td>

                        <td className="p-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.debit}
                            onChange={(e) =>
                              updateLine(
                                index,
                                "debit",
                                e.target.value
                              )
                            }
                            className="w-full rounded-lg border border-white/10 bg-[#080b12] px-3 py-2.5 text-right text-sm text-emerald-400 outline-none"
                          />
                        </td>

                        <td className="p-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.credit}
                            onChange={(e) =>
                              updateLine(
                                index,
                                "credit",
                                e.target.value
                              )
                            }
                            className="w-full rounded-lg border border-white/10 bg-[#080b12] px-3 py-2.5 text-right text-sm text-rose-400 outline-none"
                          />
                        </td>

                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeLine(index)}
                            disabled={form.lines.length <= 2}
                            className="rounded-lg p-2 text-slate-500 hover:bg-rose-400/10 hover:text-rose-400 disabled:opacity-20"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  <tfoot className="border-t border-white/[0.07] bg-white/[0.025]">
                    <tr>
                      <td colSpan="2" className="p-3">
                        <button
                          type="button"
                          onClick={addLine}
                          className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
                        >
                          <Plus size={14} />
                          Add Line
                        </button>
                      </td>

                      <td className="p-3 text-right font-semibold text-emerald-400">
                        {money(totals.debit)}
                      </td>

                      <td className="p-3 text-right font-semibold text-rose-400">
                        {money(totals.credit)}
                      </td>

                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div
                className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
                  Math.abs(difference) <= 0.01
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                    : "border-rose-500/20 bg-rose-500/10 text-rose-300"
                }`}
              >
                {Math.abs(difference) <= 0.01
                  ? "✓ Journal is balanced."
                  : `✕ Journal difference: ${money(
                      Math.abs(difference)
                    )}`}
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-xs text-slate-400">
                  Notes
                </label>

                <textarea
                  value={form.notes}
                  onChange={(e) =>
                    updateForm("notes", e.target.value)
                  }
                  rows={3}
                  placeholder="Optional notes..."
                  className="w-full rounded-xl border border-white/10 bg-[#080b12] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2 border-t border-white/[0.07] pt-5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-white/10 px-5 py-2.5 text-sm text-slate-300 hover:bg-white/5"
                >
                  Cancel
                </button>

                <button
                  disabled={saving || Math.abs(difference) > 0.01}
                  type="submit"
                  className="rounded-xl bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-40"
                >
                  {saving
                    ? "Saving..."
                    : editingId
                    ? "Update Journal"
                    : "Save Journal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ title, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-slate-400">{title}</span>
        <div className="rounded-xl bg-violet-400/10 p-2.5 text-violet-400">
          <Icon size={18} />
        </div>
      </div>

      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-medium text-slate-400">
        {label}
        {required && <span className="ml-1 text-violet-400">*</span>}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-white/10 bg-[#080b12] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-500/50"
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
        className="w-full rounded-xl border border-white/10 bg-[#080b12] px-3 py-2.5 text-sm text-white outline-none"
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