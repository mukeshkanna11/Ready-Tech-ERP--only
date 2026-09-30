import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  RefreshCw,
  FolderKanban,
  Users,
  IndianRupee,
  CalendarDays,
  MoreVertical,
  Pencil,
  Trash2,
  RotateCcw,
  X,
  Save,
  Eye,
  AlertCircle,
  CheckCircle2,
  Clock3,
  PauseCircle,
  XCircle,
  TrendingUp,
  UserRound,
} from "lucide-react";
import api from "../../services/api";

const STATUS_OPTIONS = [
  { value: "planning", label: "Planning", icon: Clock3 },
  { value: "active", label: "Active", icon: TrendingUp },
  { value: "on_hold", label: "On Hold", icon: PauseCircle },
  { value: "completed", label: "Completed", icon: CheckCircle2 },
  { value: "cancelled", label: "Cancelled", icon: XCircle },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const EMPTY_FORM = {
  branchId: "",
  customerId: "",
  projectCode: "",
  name: "",
  description: "",
  projectManagerId: "",
  teamMemberIds: [],
  startDate: "",
  endDate: "",
  budget: 0,
  actualCost: 0,
  revenue: 0,
  currency: "INR",
  status: "planning",
  priority: "medium",
  progress: 0,
  tags: "",
  notes: "",
};

const getStatusMeta = (status) =>
  STATUS_OPTIONS.find((item) => item.value === status) ||
  STATUS_OPTIONS[0];

const formatCurrency = (value, currency = "INR") => {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (date) => {
  if (!date) return "-";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "-";

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const normalizeList = (data) => {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.data)) return data.data;

  if (Array.isArray(data?.data?.items)) return data.data.items;

  if (Array.isArray(data?.items)) return data.items;

  return [];
};

function StatCard({ title, value, icon: Icon, subtitle }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[0.055]">
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/[0.035] blur-2xl transition group-hover:bg-white/[0.07]" />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <h3 className="mt-2 text-2xl font-bold tracking-tight text-white">
            {value}
          </h3>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3">
          <Icon size={19} className="text-slate-200" />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const meta = getStatusMeta(status);
  const Icon = meta.icon;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs font-medium text-slate-300">
      <Icon size={13} />
      {meta.label}
    </span>
  );
}

function PriorityBadge({ priority }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium capitalize text-slate-300">
      {priority || "medium"}
    </span>
  );
}

function Modal({ title, children, onClose, width = "max-w-3xl" }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div
        className={`max-h-[92vh] w-full ${width} overflow-hidden rounded-3xl border border-white/10 bg-[#101114] shadow-2xl shadow-black/60`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <p className="mt-1 text-xs text-slate-500">
              Manage project information
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[calc(92vh-90px)] overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", placeholder }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium text-slate-400">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-white/[0.045] px-3.5 py-3 text-sm text-white outline-none placeholder:text-slate-600 transition focus:border-white/25 focus:bg-white/[0.065]"
      />
    </label>
  );
}

function Select({ label, value, onChange, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium text-slate-400">
        {label}
      </span>

      <select
        value={value}
        onChange={onChange}
        className="w-full rounded-xl border border-white/10 bg-[#17181c] px-3.5 py-3 text-sm text-white outline-none focus:border-white/25"
      >
        {children}
      </select>
    </label>
  );
}

function Textarea({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium text-slate-400">
        {label}
      </span>

      <textarea
        value={value}
        onChange={onChange}
        rows={4}
        placeholder={placeholder}
        className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.045] px-3.5 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-white/25"
      />
    </label>
  );
}

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);

  const [summary, setSummary] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const [editingProject, setEditingProject] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError("");

      const params = {};

      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;

      const response = await api.get("/projects", { params });

      setProjects(normalizeList(response.data));
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load projects"
      );
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const response = await api.get("/projects/summary");
      setSummary(response.data?.data || response.data || null);
    } catch {
      setSummary(null);
    }
  };

  const loadSupportingData = async () => {
    const requests = await Promise.allSettled([
      api.get("/customers", { params: { limit: 1000 } }),
      api.get("/branches", { params: { limit: 1000 } }),
      api.get("/users", { params: { limit: 1000 } }),
    ]);

    if (requests[0].status === "fulfilled") {
      setCustomers(normalizeList(requests[0].value.data));
    }

    if (requests[1].status === "fulfilled") {
      setBranches(normalizeList(requests[1].value.data));
    }

    if (requests[2].status === "fulfilled") {
      setUsers(normalizeList(requests[2].value.data));
    }
  };

  useEffect(() => {
    loadSupportingData();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProjects();
      loadSummary();
    }, 250);

    return () => clearTimeout(timer);
  }, [search, statusFilter, priorityFilter]);

  const openCreate = () => {
    setEditingProject(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (project) => {
    setEditingProject(project);

    setForm({
      branchId: project.branchId?._id || project.branchId || "",
      customerId: project.customerId?._id || project.customerId || "",
      projectCode: project.projectCode || "",
      name: project.name || "",
      description: project.description || "",
      projectManagerId:
        project.projectManagerId?._id || project.projectManagerId || "",
      teamMemberIds: Array.isArray(project.teamMemberIds)
        ? project.teamMemberIds.map((item) => item?._id || item)
        : [],
      startDate: project.startDate
        ? new Date(project.startDate).toISOString().slice(0, 10)
        : "",
      endDate: project.endDate
        ? new Date(project.endDate).toISOString().slice(0, 10)
        : "",
      budget: project.budget ?? 0,
      actualCost: project.actualCost ?? 0,
      revenue: project.revenue ?? 0,
      currency: project.currency || "INR",
      status: project.status || "planning",
      priority: project.priority || "medium",
      progress: project.progress ?? 0,
      tags: Array.isArray(project.tags) ? project.tags.join(", ") : "",
      notes: project.notes || "",
    });

    setShowModal(true);
  };

  const saveProject = async (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("Project name is required");
      return;
    }

    if (
      form.startDate &&
      form.endDate &&
      new Date(form.endDate) < new Date(form.startDate)
    ) {
      setError("End date cannot be before start date");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        branchId: form.branchId || null,
        customerId: form.customerId || null,
        projectCode: form.projectCode.trim() || null,
        name: form.name.trim(),
        description: form.description.trim(),
        projectManagerId: form.projectManagerId || null,
        teamMemberIds: form.teamMemberIds,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        budget: Number(form.budget || 0),
        actualCost: Number(form.actualCost || 0),
        revenue: Number(form.revenue || 0),
        currency: form.currency || "INR",
        status: form.status,
        priority: form.priority,
        progress: Number(form.progress || 0),
        tags: form.tags
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        notes: form.notes.trim(),
      };

      if (editingProject) {
        await api.put(`/projects/${editingProject._id}`, payload);
      } else {
        await api.post("/projects", payload);
      }

      setShowModal(false);
      setEditingProject(null);
      setForm(EMPTY_FORM);

      await Promise.all([loadProjects(), loadSummary()]);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to save project"
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteProject = async (project) => {
    const confirmed = window.confirm(
      `Delete project "${project.name}"?`
    );

    if (!confirmed) return;

    try {
      setError("");

      await api.delete(`/projects/${project._id}`);

      if (selectedProject?._id === project._id) {
        setSelectedProject(null);
        setShowDetails(false);
      }

      await Promise.all([loadProjects(), loadSummary()]);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to delete project"
      );
    }
  };

  const restoreProject = async (project) => {
    try {
      setError("");

      await api.post(`/projects/${project._id}/restore`);

      await Promise.all([loadProjects(), loadSummary()]);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to restore project"
      );
    }
  };

  const openDetails = async (project) => {
    try {
      const response = await api.get(`/projects/${project._id}`);

      setSelectedProject(
        response.data?.data || response.data || project
      );
    } catch {
      setSelectedProject(project);
    }

    setShowDetails(true);
  };

  const visibleStats = useMemo(() => {
    const list = projects || [];

    return {
      total: summary?.total ?? list.length,
      active:
        summary?.active ??
        list.filter((item) => item.status === "active").length,
      completed:
        summary?.completed ??
        list.filter((item) => item.status === "completed").length,
      budget:
        summary?.totalBudget ??
        list.reduce((sum, item) => sum + Number(item.budget || 0), 0),
    };
  }, [projects, summary]);

  return (
    <div className="min-h-full bg-[#090a0c] text-white">
      <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
        {/* HEADER */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              <FolderKanban size={14} />
              Project Management
            </div>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Projects
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage projects, budgets, teams and progress from one place.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                loadProjects();
                loadSummary();
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            <button
              onClick={openCreate}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-slate-200"
            >
              <Plus size={17} />
              New Project
            </button>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/[0.07] px-4 py-3 text-sm text-red-300">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>

            <button
              onClick={() => setError("")}
              className="ml-auto text-red-400 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* STATS */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Projects"
            value={visibleStats.total}
            icon={FolderKanban}
            subtitle="All active workspace projects"
          />

          <StatCard
            title="Active Projects"
            value={visibleStats.active}
            icon={TrendingUp}
            subtitle="Currently in progress"
          />

          <StatCard
            title="Completed"
            value={visibleStats.completed}
            icon={CheckCircle2}
            subtitle="Successfully completed"
          />

          <StatCard
            title="Total Budget"
            value={formatCurrency(visibleStats.budget)}
            icon={IndianRupee}
            subtitle="Combined project budget"
          />
        </div>

        {/* FILTER BAR */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 backdrop-blur-xl">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_180px_auto]">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
              />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects..."
                className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-white/20"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-white/10 bg-[#17181c] px-3 py-3 text-sm text-slate-300 outline-none"
            >
              <option value="">All Status</option>

              {STATUS_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="rounded-xl border border-white/10 bg-[#17181c] px-3 py-3 text-sm text-slate-300 outline-none"
            >
              <option value="">All Priority</option>

              {PRIORITY_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                setSearch("");
                setStatusFilter("");
                setPriorityFilter("");
              }}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-400 hover:bg-white/[0.08] hover:text-white"
            >
              Clear
            </button>
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] shadow-2xl shadow-black/20">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px]">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.025] text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-4">Project</th>
                  <th className="px-5 py-4">Customer</th>
                  <th className="px-5 py-4">Manager</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Priority</th>
                  <th className="px-5 py-4">Progress</th>
                  <th className="px-5 py-4">Budget</th>
                  <th className="px-5 py-4">Dates</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/[0.06]">
                {loading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <tr key={index}>
                      {Array.from({ length: 9 }).map((__, cell) => (
                        <td key={cell} className="px-5 py-5">
                          <div className="h-4 animate-pulse rounded bg-white/[0.06]" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : projects.length === 0 ? (
                  <tr>
                    <td colSpan="9">
                      <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                          <FolderKanban className="text-slate-500" size={28} />
                        </div>

                        <h3 className="mt-4 text-sm font-semibold text-white">
                          No projects found
                        </h3>

                        <p className="mt-1 max-w-sm text-xs text-slate-500">
                          Create your first project or adjust your search
                          filters.
                        </p>

                        <button
                          onClick={openCreate}
                          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black"
                        >
                          <Plus size={15} />
                          Create Project
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  projects.map((project) => (
                    <tr
                      key={project._id}
                      className="group transition hover:bg-white/[0.025]"
                    >
                      <td className="px-5 py-5">
                        <button
                          onClick={() => openDetails(project)}
                          className="text-left"
                        >
                          <div className="font-semibold text-white group-hover:text-slate-200">
                            {project.name}
                          </div>

                          <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                            <span>{project.projectNumber}</span>

                            {project.projectCode && (
                              <>
                                <span>•</span>
                                <span>{project.projectCode}</span>
                              </>
                            )}
                          </div>
                        </button>
                      </td>

                      <td className="px-5 py-5 text-sm text-slate-400">
                        {project.customerId?.name ||
                          project.customer?.name ||
                          "-"}
                      </td>

                      <td className="px-5 py-5">
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.05]">
                            <UserRound size={14} />
                          </div>

                          {project.projectManagerId?.name ||
                            project.projectManager?.name ||
                            "-"}
                        </div>
                      </td>

                      <td className="px-5 py-5">
                        <StatusBadge status={project.status} />
                      </td>

                      <td className="px-5 py-5">
                        <PriorityBadge priority={project.priority} />
                      </td>

                      <td className="px-5 py-5">
                        <div className="w-28">
                          <div className="mb-1.5 flex justify-between text-xs">
                            <span className="text-slate-500">Progress</span>
                            <span className="font-medium text-slate-300">
                              {project.progress || 0}%
                            </span>
                          </div>

                          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                            <div
                              className="h-full rounded-full bg-white transition-all"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.max(0, Number(project.progress || 0))
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-5 text-sm font-medium text-slate-300">
                        {formatCurrency(
                          project.budget,
                          project.currency || "INR"
                        )}
                      </td>

                      <td className="px-5 py-5">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <CalendarDays size={14} />
                          {formatDate(project.startDate)}
                          <span>→</span>
                          {formatDate(project.endDate)}
                        </div>
                      </td>

                      <td className="px-5 py-5">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => openDetails(project)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-white/10 hover:text-white"
                            title="View"
                          >
                            <Eye size={16} />
                          </button>

                          <button
                            onClick={() => openEdit(project)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-white/10 hover:text-white"
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </button>

                          {project.deletedAt ? (
                            <button
                              onClick={() => restoreProject(project)}
                              className="rounded-lg p-2 text-slate-500 hover:bg-white/10 hover:text-white"
                              title="Restore"
                            >
                              <RotateCcw size={16} />
                            </button>
                          ) : (
                            <button
                              onClick={() => deleteProject(project)}
                              className="rounded-lg p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-300"
                              title="Delete"
                            >
                              <Trash2 size={16} />
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
        </div>
      </div>

      {/* CREATE / EDIT */}
      {showModal && (
        <Modal
          title={editingProject ? "Edit Project" : "Create Project"}
          onClose={() => {
            if (!saving) setShowModal(false);
          }}
        >
          <form onSubmit={saveProject} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Project Name *"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Website Development"
              />

              <Input
                label="Project Code"
                value={form.projectCode}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    projectCode: e.target.value,
                  }))
                }
                placeholder="WEB-001"
              />

              <Select
                label="Customer"
                value={form.customerId}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    customerId: e.target.value,
                  }))
                }
              >
                <option value="">No Customer</option>

                {customers.map((customer) => (
                  <option key={customer._id} value={customer._id}>
                    {customer.name ||
                      customer.companyName ||
                      customer.customerName ||
                      customer.email ||
                      customer._id}
                  </option>
                ))}
              </Select>

              <Select
                label="Branch"
                value={form.branchId}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    branchId: e.target.value,
                  }))
                }
              >
                <option value="">No Branch</option>

                {branches.map((branch) => (
                  <option key={branch._id} value={branch._id}>
                    {branch.name || branch.branchName || branch.code}
                  </option>
                ))}
              </Select>

              <Select
                label="Project Manager"
                value={form.projectManagerId}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    projectManagerId: e.target.value,
                  }))
                }
              >
                <option value="">Unassigned</option>

                {users.map((user) => (
                  <option key={user._id} value={user._id}>
                    {user.name ||
                      user.fullName ||
                      user.email ||
                      user._id}
                  </option>
                ))}
              </Select>

              <Select
                label="Status"
                value={form.status}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    status: e.target.value,
                  }))
                }
              >
                {STATUS_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>

              <Select
                label="Priority"
                value={form.priority}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    priority: e.target.value,
                  }))
                }
              >
                {PRIORITY_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>

              <Input
                label="Currency"
                value={form.currency}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    currency: e.target.value.toUpperCase(),
                  }))
                }
                placeholder="INR"
              />

              <Input
                label="Start Date"
                type="date"
                value={form.startDate}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    startDate: e.target.value,
                  }))
                }
              />

              <Input
                label="End Date"
                type="date"
                value={form.endDate}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    endDate: e.target.value,
                  }))
                }
              />

              <Input
                label="Budget"
                type="number"
                value={form.budget}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    budget: e.target.value,
                  }))
                }
              />

              <Input
                label="Actual Cost"
                type="number"
                value={form.actualCost}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    actualCost: e.target.value,
                  }))
                }
              />

              <Input
                label="Revenue"
                type="number"
                value={form.revenue}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    revenue: e.target.value,
                  }))
                }
              />

              <Input
                label="Progress %"
                type="number"
                value={form.progress}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    progress: Math.min(
                      100,
                      Math.max(0, Number(e.target.value || 0))
                    ),
                  }))
                }
              />

              <div className="md:col-span-2">
                <Input
                  label="Tags"
                  value={form.tags}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      tags: e.target.value,
                    }))
                  }
                  placeholder="website, frontend, client"
                />
              </div>

              <div className="md:col-span-2">
                <Textarea
                  label="Description"
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Describe the project..."
                />
              </div>

              <div className="md:col-span-2">
                <Textarea
                  label="Notes"
                  value={form.notes}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  placeholder="Internal notes..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-white/10 pt-5">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-slate-400 hover:bg-white/[0.05] hover:text-white"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save size={16} />
                {saving
                  ? "Saving..."
                  : editingProject
                  ? "Update Project"
                  : "Create Project"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* DETAILS */}
      {showDetails && selectedProject && (
        <Modal
          title={selectedProject.name}
          onClose={() => setShowDetails(false)}
          width="max-w-5xl"
        >
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <p className="text-xs text-slate-500">Project Number</p>
                <p className="mt-2 font-semibold text-white">
                  {selectedProject.projectNumber}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <p className="text-xs text-slate-500">Status</p>
                <div className="mt-2">
                  <StatusBadge status={selectedProject.status} />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <p className="text-xs text-slate-500">Budget</p>
                <p className="mt-2 font-semibold text-white">
                  {formatCurrency(
                    selectedProject.budget,
                    selectedProject.currency
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <p className="text-xs text-slate-500">Progress</p>
                <p className="mt-2 font-semibold text-white">
                  {selectedProject.progress || 0}%
                </p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="mb-3 text-sm font-semibold text-white">
                  Description
                </h3>

                <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-sm leading-6 text-slate-400">
                  {selectedProject.description || "No description provided."}
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold text-white">
                  Project Information
                </h3>

                <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-slate-500">Customer</span>
                    <span className="text-slate-300">
                      {selectedProject.customerId?.name ||
                        selectedProject.customer?.name ||
                        "-"}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-slate-500">Manager</span>
                    <span className="text-slate-300">
                      {selectedProject.projectManagerId?.name ||
                        selectedProject.projectManager?.name ||
                        "-"}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-slate-500">Start</span>
                    <span className="text-slate-300">
                      {formatDate(selectedProject.startDate)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-slate-500">End</span>
                    <span className="text-slate-300">
                      {formatDate(selectedProject.endDate)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {Array.isArray(selectedProject.tasks) && (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">
                    Project Tasks
                  </h3>

                  <span className="text-xs text-slate-500">
                    {selectedProject.tasks.length} tasks
                  </span>
                </div>

                <div className="overflow-hidden rounded-2xl border border-white/10">
                  {selectedProject.tasks.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-500">
                      No tasks available.
                    </div>
                  ) : (
                    <div className="divide-y divide-white/[0.06]">
                      {selectedProject.tasks.map((task) => (
                        <div
                          key={task._id}
                          className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="text-sm font-medium text-white">
                              {task.title}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {task.taskNumber}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <StatusBadge status={task.status} />

                            <span className="text-xs text-slate-500">
                              {task.progress || 0}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}