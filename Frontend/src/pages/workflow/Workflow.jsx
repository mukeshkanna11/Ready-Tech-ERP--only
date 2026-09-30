import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  Edit3,
  Eye,
  Filter,
  GitBranch,
  History,
  Layers3,
  ListChecks,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
  User,
  Users,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import api from "../../services/api";

const ENTITY_TYPES = [
  { value: "purchase", label: "Purchase" },
  { value: "sales", label: "Sales" },
  { value: "quotation", label: "Quotation" },
  { value: "sales_order", label: "Sales Order" },
  { value: "invoice", label: "Invoice" },
  { value: "payment", label: "Payment" },
  { value: "expense", label: "Expense" },
  { value: "project", label: "Project" },
  { value: "task", label: "Task" },
  { value: "leave", label: "Leave" },
  { value: "payroll", label: "Payroll" },
  { value: "general", label: "General" },
];

const TRIGGER_TYPES = [
  { value: "manual", label: "Manual" },
  { value: "on_create", label: "On Create" },
  { value: "on_submit", label: "On Submit" },
  { value: "on_update", label: "On Update" },
];

const STATUS_META = {
  draft: {
    label: "Draft",
    className: "text-slate-300 bg-slate-500/10 border-slate-500/20",
  },
  active: {
    label: "Active",
    className: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
  },
  inactive: {
    label: "Inactive",
    className: "text-amber-300 bg-amber-500/10 border-amber-500/20",
  },
};

const EMPTY_STEP = {
  name: "",
  description: "",
  approverType: "user",
  approverUserId: "",
  approverRoleId: "",
  isRequired: true,
  allowSelfApproval: false,
  autoApprove: false,
  timeoutHours: 24,
};

const EMPTY_FORM = {
  name: "",
  description: "",
  entityType: "purchase",
  triggerType: "manual",
  status: "draft",
  priority: 0,
  allowParallelApproval: false,
  autoStart: false,
  steps: [{ ...EMPTY_STEP }],
};

function getErrorMessage(error, fallback = "Something went wrong") {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

function getArray(response) {
  const data = response?.data?.data ?? response?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function getObject(response) {
  const data = response?.data?.data ?? response?.data;
  return data || {};
}

function getId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value._id || value.id || "";
}

function getName(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.name || value.fullName || value.email || "";
}

function formatEntity(value) {
  const item = ENTITY_TYPES.find((x) => x.value === value);
  return item?.label || value?.replaceAll("_", " ") || "-";
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function Badge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.draft;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {meta.label}
    </span>
  );
}

function Toggle({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition ${
        checked
          ? "border-emerald-400/40 bg-emerald-500/30"
          : "border-white/10 bg-white/[0.06]"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <span
        className={`absolute top-1 h-4 w-4 rounded-full transition ${
          checked
            ? "left-6 bg-emerald-300 shadow-[0_0_12px_rgba(52,211,153,.45)]"
            : "left-1 bg-slate-400"
        }`}
      />
    </button>
  );
}

function Modal({ open, title, subtitle, onClose, children, wide = false }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
      <div
        className={`max-h-[94vh] w-full overflow-hidden rounded-3xl border border-white/10 bg-[#0b0f17] shadow-[0_25px_100px_rgba(0,0,0,.65)] ${
          wide ? "max-w-6xl" : "max-w-3xl"
        }`}
      >
        <div className="flex items-start justify-between border-b border-white/10 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-white">{title}</h2>
            {subtitle && (
              <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[calc(94vh-82px)] overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, description }) {
  return (
    <div className="group rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 shadow-[0_12px_40px_rgba(0,0,0,.15)] transition hover:border-white/[0.14] hover:bg-white/[0.05]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-white">
            {value}
          </p>
          {description && (
            <p className="mt-1 text-xs text-slate-500">{description}</p>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.05] p-2.5 text-slate-300">
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

function StepCard({
  step,
  index,
  users,
  roles,
  onChange,
  onRemove,
  onMove,
  canRemove,
}) {
  const update = (field, value) => {
    onChange(index, { ...step, [field]: value });
  };

  return (
    <div className="relative rounded-2xl border border-white/[0.08] bg-[#101620] p-5">
      <div className="absolute left-0 top-0 h-full w-1 rounded-l-2xl bg-gradient-to-b from-indigo-400/80 via-violet-400/60 to-transparent" />

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-sm font-bold text-indigo-300 ring-1 ring-indigo-400/20">
            {index + 1}
          </div>

          <div>
            <p className="text-sm font-semibold text-white">
              Approval Step {index + 1}
            </p>
            <p className="text-[11px] text-slate-500">
              Configure who can approve this stage
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => onMove(index, index - 1)}
            className="rounded-lg p-2 text-slate-500 hover:bg-white/10 hover:text-white disabled:opacity-30"
          >
            <ArrowUp size={15} />
          </button>

          <button
            type="button"
            disabled={index === 0}
            onClick={() => onMove(index, index - 1)}
            className="hidden"
          >
            <ArrowUp size={15} />
          </button>

          <button
            type="button"
            disabled={index === 999}
            onClick={() => onMove(index, index + 1)}
            className="rounded-lg p-2 text-slate-500 hover:bg-white/10 hover:text-white disabled:opacity-30"
          >
            <ArrowDown size={15} />
          </button>

          {canRemove && (
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="rounded-lg p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-300"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label="Step Name">
          <input
            value={step.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Manager Approval"
            className="input-dark"
          />
        </Field>

        <Field label="Approver Type">
          <select
            value={step.approverType}
            onChange={(e) => {
              const type = e.target.value;
              onChange(index, {
                ...step,
                approverType: type,
                approverUserId: "",
                approverRoleId: "",
              });
            }}
            className="input-dark"
          >
            <option value="user">Specific User</option>
            <option value="role">Role</option>
          </select>
        </Field>

        {step.approverType === "user" ? (
          <Field label="Approver User">
            <select
              value={getId(step.approverUserId)}
              onChange={(e) => update("approverUserId", e.target.value)}
              className="input-dark"
            >
              <option value="">Select user</option>
              {users.map((user) => (
                <option key={getId(user)} value={getId(user)}>
                  {getName(user)} {user.email ? `— ${user.email}` : ""}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <Field label="Approver Role">
            <select
              value={getId(step.approverRoleId)}
              onChange={(e) => update("approverRoleId", e.target.value)}
              className="input-dark"
            >
              <option value="">Select role</option>
              {roles.map((role) => (
                <option key={getId(role)} value={getId(role)}>
                  {getName(role)}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Timeout (Hours)">
          <input
            type="number"
            min="0"
            value={step.timeoutHours}
            onChange={(e) =>
              update("timeoutHours", Number(e.target.value || 0))
            }
            className="input-dark"
          />
        </Field>

        <Field label="Description">
          <input
            value={step.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Purchase request reviewed by manager"
            className="input-dark"
          />
        </Field>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        <SwitchRow
          label="Required"
          description="Must be completed"
          checked={step.isRequired}
          onChange={(value) => update("isRequired", value)}
        />

        <SwitchRow
          label="Self Approval"
          description="Requester can approve"
          checked={step.allowSelfApproval}
          onChange={(value) => update("allowSelfApproval", value)}
        />

        <SwitchRow
          label="Auto Approve"
          description="Automatically approve"
          checked={step.autoApprove}
          onChange={(value) => update("autoApprove", value)}
        />
      </div>
    </div>
  );
}

function SwitchRow({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-3">
      <div>
        <p className="text-xs font-semibold text-slate-200">{label}</p>
        <p className="text-[10px] text-slate-500">{description}</p>
      </div>

      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function Toast({ toast, onClose }) {
  if (!toast) return null;

  const success = toast.type === "success";

  return (
    <div className="fixed right-5 top-5 z-[200] w-[min(380px,calc(100vw-40px))]">
      <div
        className={`rounded-2xl border p-4 shadow-2xl backdrop-blur-xl ${
          success
            ? "border-emerald-400/20 bg-[#0b1713]/95"
            : "border-red-400/20 bg-[#190d10]/95"
        }`}
      >
        <div className="flex gap-3">
          {success ? (
            <CheckCircle2 className="mt-0.5 text-emerald-300" size={19} />
          ) : (
            <AlertCircle className="mt-0.5 text-red-300" size={19} />
          )}

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">
              {success ? "Success" : "Error"}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              {toast.message}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-white"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Workflow() {
  const [workflows, setWorkflows] = useState([]);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3500);
  };

  const loadAll = async () => {
    setLoading(true);

    try {
      const [workflowRes, summaryRes, usersRes, rolesRes] =
        await Promise.allSettled([
          api.get("/workflows"),
          api.get("/workflows/summary"),
          api.get("/users"),
          api.get("/roles"),
        ]);

      if (workflowRes.status === "fulfilled") {
        setWorkflows(getArray(workflowRes.value));
      } else {
        throw workflowRes.reason;
      }

      if (summaryRes.status === "fulfilled") {
        setSummary(getObject(summaryRes.value));
      }

      if (usersRes.status === "fulfilled") {
        setUsers(getArray(usersRes.value));
      }

      if (rolesRes.status === "fulfilled") {
        setRoles(getArray(rolesRes.value));
      }
    } catch (error) {
      showToast("error", getErrorMessage(error, "Unable to load workflows"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const filteredWorkflows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return workflows.filter((workflow) => {
      const matchesSearch =
        !query ||
        workflow.name?.toLowerCase().includes(query) ||
        workflow.workflowNumber?.toLowerCase().includes(query) ||
        workflow.description?.toLowerCase().includes(query);

      const matchesStatus =
        !statusFilter || workflow.status === statusFilter;

      const matchesEntity =
        !entityFilter || workflow.entityType === entityFilter;

      return matchesSearch && matchesStatus && matchesEntity;
    });
  }, [workflows, search, statusFilter, entityFilter]);

  const openCreate = () => {
    setEditingWorkflow(null);
    setForm({
      ...EMPTY_FORM,
      steps: [{ ...EMPTY_STEP }],
    });
    setModalOpen(true);
  };

  const openEdit = (workflow) => {
    setEditingWorkflow(workflow);

    setForm({
      name: workflow.name || "",
      description: workflow.description || "",
      entityType: workflow.entityType || "purchase",
      triggerType: workflow.triggerType || "manual",
      status: workflow.status || "draft",
      priority: workflow.priority ?? 0,
      allowParallelApproval: !!workflow.allowParallelApproval,
      autoStart: !!workflow.autoStart,
      steps:
        workflow.steps?.length > 0
          ? workflow.steps.map((step) => ({
              name: step.name || "",
              description: step.description || "",
              approverType: step.approverType || "user",
              approverUserId: getId(step.approverUserId),
              approverRoleId: getId(step.approverRoleId),
              isRequired: step.isRequired !== false,
              allowSelfApproval: !!step.allowSelfApproval,
              autoApprove: !!step.autoApprove,
              timeoutHours: step.timeoutHours ?? 24,
            }))
          : [{ ...EMPTY_STEP }],
    });

    setModalOpen(true);
  };

  const updateStep = (index, value) => {
    setForm((prev) => {
      const steps = [...prev.steps];
      steps[index] = value;
      return { ...prev, steps };
    });
  };

  const addStep = () => {
    setForm((prev) => ({
      ...prev,
      steps: [...prev.steps, { ...EMPTY_STEP }],
    }));
  };

  const removeStep = (index) => {
    setForm((prev) => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index),
    }));
  };

  const moveStep = (from, to) => {
    setForm((prev) => {
      if (to < 0 || to >= prev.steps.length) return prev;

      const steps = [...prev.steps];
      const [item] = steps.splice(from, 1);
      steps.splice(to, 0, item);

      return { ...prev, steps };
    });
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      showToast("error", "Workflow name is required");
      return false;
    }

    if (!form.entityType) {
      showToast("error", "Select an entity type");
      return false;
    }

    if (!form.steps.length) {
      showToast("error", "Add at least one approval step");
      return false;
    }

    for (let i = 0; i < form.steps.length; i += 1) {
      const step = form.steps[i];

      if (!step.name.trim()) {
        showToast("error", `Step ${i + 1} name is required`);
        return false;
      }

      if (step.approverType === "user" && !getId(step.approverUserId)) {
        showToast("error", `Select a user for Step ${i + 1}`);
        return false;
      }

      if (step.approverType === "role" && !getId(step.approverRoleId)) {
        showToast("error", `Select a role for Step ${i + 1}`);
        return false;
      }
    }

    return true;
  };

  const saveWorkflow = async (event) => {
    event.preventDefault();

    if (!validateForm()) return;

    setActionLoading("save");

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        entityType: form.entityType,
        triggerType: form.triggerType,
        status: form.status,
        priority: Number(form.priority || 0),
        allowParallelApproval: !!form.allowParallelApproval,
        autoStart: !!form.autoStart,
        steps: form.steps.map((step, index) => ({
          stepNumber: index + 1,
          name: step.name.trim(),
          description: step.description.trim(),
          approverType: step.approverType,
          approverUserId:
            step.approverType === "user" ? getId(step.approverUserId) : null,
          approverRoleId:
            step.approverType === "role" ? getId(step.approverRoleId) : null,
          isRequired: !!step.isRequired,
          allowSelfApproval: !!step.allowSelfApproval,
          autoApprove: !!step.autoApprove,
          timeoutHours: Number(step.timeoutHours || 0),
        })),
      };

      if (editingWorkflow) {
        await api.put(`/workflows/${editingWorkflow._id}`, payload);
        showToast("success", "Workflow updated successfully");
      } else {
        await api.post("/workflows", payload);
        showToast("success", "Workflow created successfully");
      }

      setModalOpen(false);
      await loadAll();
    } catch (error) {
      showToast("error", getErrorMessage(error, "Unable to save workflow"));
    } finally {
      setActionLoading("");
    }
  };

  const performAction = async (workflow, action) => {
    const labels = {
      delete: "delete this workflow",
      restore: "restore this workflow",
      activate: "activate this workflow",
      deactivate: "deactivate this workflow",
    };

    if (
      !window.confirm(
        `Are you sure you want to ${labels[action] || `${action} this workflow`}?`
      )
    ) {
      return;
    }

    setActionLoading(`${action}-${workflow._id}`);

    try {
      const endpoint =
        action === "delete"
          ? `/workflows/${workflow._id}`
          : `/workflows/${workflow._id}/${action}`;

      if (action === "delete") {
        await api.delete(endpoint);
      } else {
        await api.post(endpoint);
      }

      showToast(
        "success",
        `Workflow ${action === "delete" ? "deleted" : `${action}d`} successfully`
      );

      await loadAll();
    } catch (error) {
      showToast("error", getErrorMessage(error, `Unable to ${action} workflow`));
    } finally {
      setActionLoading("");
    }
  };

  return (
    <div className="min-h-screen bg-[#070a0f] px-4 py-5 text-white sm:px-6 lg:px-8">
      <style>{`
        .input-dark {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.035);
          padding: .72rem .85rem;
          color: #e5e7eb;
          outline: none;
          font-size: .8rem;
          transition: all .2s ease;
        }
        .input-dark:focus {
          border-color: rgba(129,140,248,.45);
          box-shadow: 0 0 0 3px rgba(99,102,241,.08);
          background: rgba(255,255,255,.05);
        }
        .input-dark::placeholder { color: #475569; }
        .input-dark option {
          background: #0b0f17;
          color: #e5e7eb;
        }
      `}</style>

      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="mx-auto max-w-[1600px]">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-300">
              <GitBranch size={14} />
              Automation
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Workflow Management
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Configure multi-level approvals and automate your ERP business
              processes.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadAll}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
            >
              <RefreshCw size={15} />
              Refresh
            </button>

            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-xs font-bold text-white shadow-[0_8px_30px_rgba(99,102,241,.22)] transition hover:bg-indigo-400"
            >
              <Plus size={16} />
              Create Workflow
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={GitBranch}
            label="Total Workflows"
            value={summary.totalWorkflows ?? workflows.length}
            description="Configured workflows"
          />

          <StatCard
            icon={CheckCircle2}
            label="Active"
            value={
              summary.activeWorkflows ??
              workflows.filter((x) => x.status === "active").length
            }
            description="Currently active"
          />

          <StatCard
            icon={Activity}
            label="Pending"
            value={summary.pendingInstances ?? 0}
            description="Approval instances"
          />

          <StatCard
            icon={ShieldCheck}
            label="Approved"
            value={summary.approvedInstances ?? 0}
            description="Completed approvals"
          />
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
                placeholder="Search workflow name, number or description..."
                className="input-dark pl-10"
              />
            </div>

            <div className="flex gap-2">
              <div className="relative">
                <Filter
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="input-dark min-w-[145px] pl-9"
                >
                  <option value="">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="input-dark min-w-[155px]"
              >
                <option value="">All Entities</option>
                {ENTITY_TYPES.map((entity) => (
                  <option key={entity.value} value={entity.value}>
                    {entity.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025]">
          <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
            <div>
              <h2 className="text-sm font-bold text-white">Workflows</h2>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {filteredWorkflows.length} workflow
                {filteredWorkflows.length !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="hidden items-center gap-2 text-[11px] text-slate-500 sm:flex">
              <ListChecks size={14} />
              Approval configuration
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[350px] items-center justify-center">
              <div className="text-center">
                <Loader2
                  size={28}
                  className="mx-auto animate-spin text-indigo-400"
                />
                <p className="mt-3 text-xs text-slate-500">
                  Loading workflows...
                </p>
              </div>
            </div>
          ) : filteredWorkflows.length === 0 ? (
            <div className="flex min-h-[350px] flex-col items-center justify-center px-5 text-center">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <GitBranch className="text-slate-500" size={28} />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-white">
                No workflows found
              </h3>
              <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
                Create a workflow or adjust your search and filters.
              </p>
              <button
                type="button"
                onClick={openCreate}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2 text-xs font-bold"
              >
                <Plus size={14} />
                Create Workflow
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-white/[0.06] text-left">
                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Workflow
                    </th>
                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Entity
                    </th>
                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Steps
                    </th>
                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Trigger
                    </th>
                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Status
                    </th>
                    <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredWorkflows.map((workflow) => (
                    <tr
                      key={workflow._id}
                      className="border-b border-white/[0.045] transition hover:bg-white/[0.025]"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-400/10 bg-indigo-500/10 text-indigo-300">
                            <GitBranch size={16} />
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-white">
                              {workflow.name}
                            </p>
                            <p className="mt-0.5 text-[10px] text-slate-500">
                              {workflow.workflowNumber || "-"} ·{" "}
                              {formatDate(workflow.createdAt)}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs text-slate-300">
                          {formatEntity(workflow.entityType)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">
                            {workflow.steps?.length || 0}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            approval steps
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Zap size={13} />
                          {TRIGGER_TYPES.find(
                            (x) => x.value === workflow.triggerType
                          )?.label || workflow.triggerType}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <Badge status={workflow.status} />
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(workflow)}
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-white/10 hover:text-white"
                            title="Edit"
                          >
                            <Edit3 size={15} />
                          </button>

                          {workflow.status === "active" ? (
                            <button
                              type="button"
                              onClick={() =>
                                performAction(workflow, "deactivate")
                              }
                              disabled={
                                actionLoading ===
                                `deactivate-${workflow._id}`
                              }
                              className="rounded-lg p-2 text-slate-500 transition hover:bg-amber-500/10 hover:text-amber-300 disabled:opacity-50"
                              title="Deactivate"
                            >
                              {actionLoading ===
                              `deactivate-${workflow._id}` ? (
                                <Loader2 size={15} className="animate-spin" />
                              ) : (
                                <XCircle size={15} />
                              )}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                performAction(workflow, "activate")
                              }
                              disabled={
                                actionLoading === `activate-${workflow._id}`
                              }
                              className="rounded-lg p-2 text-slate-500 transition hover:bg-emerald-500/10 hover:text-emerald-300 disabled:opacity-50"
                              title="Activate"
                            >
                              {actionLoading ===
                              `activate-${workflow._id}` ? (
                                <Loader2 size={15} className="animate-spin" />
                              ) : (
                                <CheckCircle2 size={15} />
                              )}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => performAction(workflow, "delete")}
                            disabled={
                              actionLoading === `delete-${workflow._id}`
                            }
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                            title="Delete"
                          >
                            {actionLoading === `delete-${workflow._id}` ? (
                              <Loader2 size={15} className="animate-spin" />
                            ) : (
                              <Trash2 size={15} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Bottom links */}
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href="/workflow/instances"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.07] hover:text-white"
          >
            <History size={15} />
            Approval Instances
          </a>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => !actionLoading && setModalOpen(false)}
        title={editingWorkflow ? "Edit Workflow" : "Create Workflow"}
        subtitle="Build a multi-level approval process for your ERP"
        wide
      >
        <form onSubmit={saveWorkflow}>
          <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
            <div className="space-y-5">
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Settings2 size={16} className="text-indigo-300" />
                  <h3 className="text-sm font-bold text-white">
                    Basic Configuration
                  </h3>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Workflow Name">
                    <input
                      value={form.name}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, name: e.target.value }))
                      }
                      placeholder="Purchase Approval Workflow"
                      className="input-dark"
                    />
                  </Field>

                  <Field label="Entity Type">
                    <select
                      value={form.entityType}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          entityType: e.target.value,
                        }))
                      }
                      className="input-dark"
                    >
                      {ENTITY_TYPES.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Trigger Type">
                    <select
                      value={form.triggerType}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          triggerType: e.target.value,
                        }))
                      }
                      className="input-dark"
                    >
                      {TRIGGER_TYPES.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Initial Status">
                    <select
                      value={form.status}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          status: e.target.value,
                        }))
                      }
                      className="input-dark"
                    >
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </Field>

                  <Field label="Priority">
                    <input
                      type="number"
                      min="0"
                      value={form.priority}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          priority: Number(e.target.value || 0),
                        }))
                      }
                      className="input-dark"
                    />
                  </Field>

                  <Field label="Description">
                    <input
                      value={form.description}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Describe this approval workflow"
                      className="input-dark"
                    />
                  </Field>
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Approval Steps
                    </h3>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Define the approval sequence
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={addStep}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-400/20 bg-indigo-500/10 px-3 py-2 text-xs font-bold text-indigo-300 hover:bg-indigo-500/20"
                  >
                    <Plus size={14} />
                    Add Step
                  </button>
                </div>

                <div className="space-y-3">
                  {form.steps.map((step, index) => (
                    <StepCard
                      key={`${index}-${step.name}`}
                      step={step}
                      index={index}
                      users={users}
                      roles={roles}
                      onChange={updateStep}
                      onRemove={removeStep}
                      onMove={moveStep}
                      canRemove={form.steps.length > 1}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-indigo-400/10 bg-indigo-500/[0.045] p-5">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={17} className="text-indigo-300" />
                  <h3 className="text-sm font-bold text-white">
                    Workflow Options
                  </h3>
                </div>

                <div className="mt-4 space-y-2">
                  <SwitchRow
                    label="Parallel Approval"
                    description="Allow parallel approvals"
                    checked={form.allowParallelApproval}
                    onChange={(value) =>
                      setForm((p) => ({
                        ...p,
                        allowParallelApproval: value,
                      }))
                    }
                  />

                  <SwitchRow
                    label="Auto Start"
                    description="Start automatically"
                    checked={form.autoStart}
                    onChange={(value) =>
                      setForm((p) => ({ ...p, autoStart: value }))
                    }
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
                <div className="flex items-center gap-2">
                  <Layers3 size={16} className="text-slate-300" />
                  <h3 className="text-sm font-bold text-white">
                    Workflow Preview
                  </h3>
                </div>

                <div className="mt-4 space-y-0">
                  {form.steps.map((step, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-indigo-400/20 bg-indigo-500/10 text-[10px] font-bold text-indigo-300">
                          {index + 1}
                        </div>
                        {index < form.steps.length - 1 && (
                          <div className="h-8 w-px bg-white/10" />
                        )}
                      </div>

                      <div className="pb-3">
                        <p className="text-xs font-semibold text-white">
                          {step.name || `Step ${index + 1}`}
                        </p>
                        <p className="mt-0.5 text-[10px] text-slate-500">
                          {step.approverType === "user"
                            ? "User approval"
                            : "Role approval"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-amber-400/10 bg-amber-500/[0.04] p-4">
                <div className="flex gap-2.5">
                  <AlertCircle
                    size={16}
                    className="mt-0.5 shrink-0 text-amber-300"
                  />
                  <p className="text-[11px] leading-5 text-slate-400">
                    If self approval is disabled, the requester cannot approve
                    that step. This is recommended for real approval flows.
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-bold text-slate-300 hover:bg-white/[0.08]"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={actionLoading === "save"}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-3 text-xs font-bold text-white hover:bg-indigo-400 disabled:opacity-60"
                >
                  {actionLoading === "save" && (
                    <Loader2 size={15} className="animate-spin" />
                  )}
                  {editingWorkflow ? "Update Workflow" : "Create Workflow"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}