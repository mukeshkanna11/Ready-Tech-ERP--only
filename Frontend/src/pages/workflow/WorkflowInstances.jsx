import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Eye,
  Filter,
  GitBranch,
  History,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldCheck,
  User,
  X,
  XCircle,
} from "lucide-react";
import api from "../../services/api";

const ENTITY_TYPES = [
  "purchase",
  "sales",
  "quotation",
  "sales_order",
  "invoice",
  "payment",
  "expense",
  "project",
  "task",
  "leave",
  "payroll",
  "general",
];

const STATUS_META = {
  pending: {
    label: "Pending",
    className: "text-amber-300 bg-amber-500/10 border-amber-400/20",
  },
  approved: {
    label: "Approved",
    className: "text-emerald-300 bg-emerald-500/10 border-emerald-400/20",
  },
  rejected: {
    label: "Rejected",
    className: "text-red-300 bg-red-500/10 border-red-400/20",
  },
  cancelled: {
    label: "Cancelled",
    className: "text-slate-300 bg-slate-500/10 border-slate-400/20",
  },
};

function getArray(response) {
  const data = response?.data?.data ?? response?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

function getId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value._id || value.id || "";
}

function getName(value) {
  if (!value) return "-";
  if (typeof value === "string") return value;
  return value.name || value.fullName || value.email || getId(value) || "-";
}

function formatEntity(value) {
  return value
    ? value
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    : "-";
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Badge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.pending;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {meta.label}
    </span>
  );
}

function Toast({ toast, onClose }) {
  if (!toast) return null;

  const success = toast.type === "success";

  return (
    <div className="fixed right-5 top-5 z-[200] w-[min(380px,calc(100vw-40px))]">
      <div
        className={`rounded-2xl border p-4 shadow-2xl ${
          success
            ? "border-emerald-400/20 bg-[#0b1713]"
            : "border-red-400/20 bg-[#190d10]"
        }`}
      >
        <div className="flex gap-3">
          {success ? (
            <CheckCircle2 className="text-emerald-300" size={19} />
          ) : (
            <AlertCircle className="text-red-300" size={19} />
          )}

          <div className="flex-1">
            <p className="text-sm font-semibold text-white">
              {success ? "Success" : "Error"}
            </p>
            <p className="mt-1 text-xs text-slate-400">{toast.message}</p>
          </div>

          <button type="button" onClick={onClose}>
            <X size={15} className="text-slate-500" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionModal({
  open,
  type,
  instance,
  loading,
  onClose,
  onSubmit,
}) {
  const [comments, setComments] = useState("");

  useEffect(() => {
    if (open) setComments("");
  }, [open, type]);

  if (!open || !instance) return null;

  const config = {
    approve: {
      title: "Approve Workflow",
      description: "Confirm this approval step.",
      button: "Approve",
      className: "bg-emerald-500 hover:bg-emerald-400",
    },
    reject: {
      title: "Reject Workflow",
      description: "Reject this approval request.",
      button: "Reject",
      className: "bg-red-500 hover:bg-red-400",
    },
    cancel: {
      title: "Cancel Workflow",
      description: "Cancel this pending workflow.",
      button: "Cancel Workflow",
      className: "bg-slate-600 hover:bg-slate-500",
    },
  }[type];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0b0f17] p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">{config.title}</h2>
            <p className="mt-1 text-xs text-slate-500">
              {config.description}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 hover:bg-white/10 hover:text-white"
          >
            <X size={17} />
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            Request
          </p>
          <p className="mt-1 text-sm font-bold text-white">
            {instance.entityNumber || "-"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {formatEntity(instance.entityType)} · Step{" "}
            {instance.currentStepNumber}
          </p>
        </div>

        <label className="mt-5 block">
          <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Comments
          </span>

          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={4}
            placeholder="Add approval comments..."
            className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.035] px-3 py-3 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-indigo-400/40"
          />
        </label>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-bold text-slate-300 hover:bg-white/[0.08]"
          >
            Close
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => onSubmit(comments)}
            className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-bold text-white disabled:opacity-50 ${config.className}`}
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            {config.button}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WorkflowInstances() {
  const [instances, setInstances] = useState([]);
  const [pending, setPending] = useState([]);
  const [activeTab, setActiveTab] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [toast, setToast] = useState(null);

  const [actionModal, setActionModal] = useState({
    open: false,
    type: "",
    instance: null,
  });

  const showToast = (type, message) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3500);
  };

  const loadInstances = async () => {
    setLoading(true);

    try {
      const [allRes, pendingRes] = await Promise.all([
        api.get("/workflows/instances/all"),
        api.get("/workflows/instances/pending"),
      ]);

      setInstances(getArray(allRes));
      setPending(getArray(pendingRes));
    } catch (error) {
      showToast(
        "error",
        getErrorMessage(error, "Unable to load workflow instances")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInstances();
  }, []);

  const displayedInstances = useMemo(() => {
    const source = activeTab === "pending" ? pending : instances;
    const query = search.trim().toLowerCase();

    return source.filter((instance) => {
      const matchesSearch =
        !query ||
        instance.entityNumber?.toLowerCase().includes(query) ||
        instance.workflowNumber?.toLowerCase().includes(query) ||
        instance.entityType?.toLowerCase().includes(query);

      const matchesStatus =
        !statusFilter || instance.status === statusFilter;

      const matchesEntity =
        !entityFilter || instance.entityType === entityFilter;

      return matchesSearch && matchesStatus && matchesEntity;
    });
  }, [
    activeTab,
    pending,
    instances,
    search,
    statusFilter,
    entityFilter,
  ]);

  const executeAction = async (comments) => {
    const { type, instance } = actionModal;

    if (!instance?._id || !type) return;

    setActionLoading(`${type}-${instance._id}`);

    try {
      await api.post(`/workflows/instances/${instance._id}/${type}`, {
        comments: comments || "",
      });

      showToast(
        "success",
        `Workflow ${type === "approve" ? "approved" : `${type}led`} successfully`
      );

      setActionModal({
        open: false,
        type: "",
        instance: null,
      });

      await loadInstances();
    } catch (error) {
      showToast(
        "error",
        getErrorMessage(error, `Unable to ${type} workflow`)
      );
    } finally {
      setActionLoading("");
    }
  };

  return (
    <div className="min-h-screen bg-[#070a0f] px-4 py-5 text-white sm:px-6 lg:px-8">
      <style>{`
        .input-dark {
          width: 100%;
          border-radius: .75rem;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.035);
          padding: .72rem .85rem;
          color: #e5e7eb;
          outline: none;
          font-size: .8rem;
        }
        .input-dark:focus {
          border-color: rgba(129,140,248,.45);
          box-shadow: 0 0 0 3px rgba(99,102,241,.08);
        }
        .input-dark option {
          background: #0b0f17;
          color: #e5e7eb;
        }
      `}</style>

      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="mx-auto max-w-[1600px]">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-300">
              <History size={14} />
              Workflow Center
            </div>

            <h1 className="text-2xl font-bold sm:text-3xl">
              Approval Instances
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Monitor pending requests and manage approval actions.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={loadInstances}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/[0.08] hover:text-white"
            >
              <RefreshCw size={15} />
              Refresh
            </button>

            <a
              href="/workflow"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-400"
            >
              <GitBranch size={15} />
              Workflows
            </a>
          </div>
        </div>

        {/* Approval stats */}
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl border border-amber-400/10 bg-amber-500/[0.035] p-4">
            <Clock3 className="text-amber-300" size={19} />
            <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              My Pending
            </p>
            <p className="mt-1 text-2xl font-bold">{pending.length}</p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
            <GitBranch className="text-indigo-300" size={19} />
            <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              All Instances
            </p>
            <p className="mt-1 text-2xl font-bold">{instances.length}</p>
          </div>

          <div className="rounded-2xl border border-emerald-400/10 bg-emerald-500/[0.035] p-4">
            <CheckCircle2 className="text-emerald-300" size={19} />
            <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Approved
            </p>
            <p className="mt-1 text-2xl font-bold">
              {instances.filter((x) => x.status === "approved").length}
            </p>
          </div>

          <div className="rounded-2xl border border-red-400/10 bg-red-500/[0.035] p-4">
            <XCircle className="text-red-300" size={19} />
            <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Rejected
            </p>
            <p className="mt-1 text-2xl font-bold">
              {instances.filter((x) => x.status === "rejected").length}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex w-full overflow-x-auto rounded-2xl border border-white/[0.08] bg-white/[0.025] p-1">
          <button
            type="button"
            onClick={() => setActiveTab("pending")}
            className={`flex min-w-[150px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === "pending"
                ? "bg-indigo-500 text-white shadow-lg"
                : "text-slate-500 hover:text-white"
            }`}
          >
            <Clock3 size={15} />
            My Pending
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px]">
              {pending.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`flex min-w-[150px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === "all"
                ? "bg-indigo-500 text-white shadow-lg"
                : "text-slate-500 hover:text-white"
            }`}
          >
            <LayersIcon />
            All Instances
          </button>
        </div>

        {/* Filters */}
        <div className="mb-4 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search PO number, workflow number or entity..."
                className="input-dark pl-10"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-dark lg:w-[160px]"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="input-dark lg:w-[170px]"
            >
              <option value="">All Entities</option>
              {ENTITY_TYPES.map((entity) => (
                <option key={entity} value={entity}>
                  {formatEntity(entity)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* List */}
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025]">
          <div className="border-b border-white/[0.07] px-5 py-4">
            <h2 className="text-sm font-bold text-white">
              {activeTab === "pending"
                ? "Pending Approvals"
                : "Workflow Instances"}
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {displayedInstances.length} result
              {displayedInstances.length !== 1 ? "s" : ""}
            </p>
          </div>

          {loading ? (
            <div className="flex min-h-[350px] items-center justify-center">
              <Loader2
                size={28}
                className="animate-spin text-indigo-400"
              />
            </div>
          ) : displayedInstances.length === 0 ? (
            <div className="flex min-h-[350px] flex-col items-center justify-center text-center">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <ShieldCheck size={28} className="text-slate-500" />
              </div>

              <h3 className="mt-4 text-sm font-semibold text-white">
                {activeTab === "pending"
                  ? "No pending approvals"
                  : "No workflow instances"}
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Everything is clear for the selected filters.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.045]">
              {displayedInstances.map((instance) => (
                <div
                  key={instance._id}
                  className="group flex flex-col gap-4 p-5 transition hover:bg-white/[0.025] xl:flex-row xl:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-400/10 bg-indigo-500/10 text-indigo-300">
                      <GitBranch size={17} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-white">
                          {instance.entityNumber || "Unnamed Request"}
                        </p>
                        <Badge status={instance.status} />
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                        <span>
                          {formatEntity(instance.entityType)}
                        </span>
                        <span>•</span>
                        <span>
                          {instance.workflowNumber ||
                            instance.workflowId ||
                            "-"}
                        </span>
                        <span>•</span>
                        <span>Step {instance.currentStepNumber || 1}</span>
                      </div>
                    </div>
                  </div>

                  <div className="hidden min-w-[190px] items-center gap-2 md:flex">
                    <User size={14} className="text-slate-600" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-600">
                        Requested By
                      </p>
                      <p className="mt-0.5 max-w-[150px] truncate text-xs text-slate-400">
                        {getName(instance.requestedBy)}
                      </p>
                    </div>
                  </div>

                  <div className="hidden min-w-[170px] items-center gap-2 lg:flex">
                    <Clock3 size={14} className="text-slate-600" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-600">
                        Started
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {formatDate(instance.startedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <a
                      href={`/workflow/instances/${instance._id}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-[11px] font-bold text-slate-300 hover:bg-white/[0.08] hover:text-white"
                    >
                      <Eye size={14} />
                      View
                    </a>

                    {instance.status === "pending" &&
                      activeTab === "pending" && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setActionModal({
                                open: true,
                                type: "reject",
                                instance,
                              })
                            }
                            className="inline-flex items-center gap-1.5 rounded-xl border border-red-400/15 bg-red-500/[0.06] px-3 py-2 text-[11px] font-bold text-red-300 hover:bg-red-500/10"
                          >
                            <XCircle size={14} />
                            Reject
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setActionModal({
                                open: true,
                                type: "approve",
                                instance,
                              })
                            }
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-[11px] font-bold text-white hover:bg-emerald-400"
                          >
                            <CheckCircle2 size={14} />
                            Approve
                          </button>
                        </>
                      )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ActionModal
        open={actionModal.open}
        type={actionModal.type}
        instance={actionModal.instance}
        loading={
          actionModal.instance
            ? actionLoading ===
              `${actionModal.type}-${actionModal.instance._id}`
            : false
        }
        onClose={() =>
          setActionModal({
            open: false,
            type: "",
            instance: null,
          })
        }
        onSubmit={executeAction}
      />
    </div>
  );
}

function LayersIcon() {
  return <History size={15} />;
}