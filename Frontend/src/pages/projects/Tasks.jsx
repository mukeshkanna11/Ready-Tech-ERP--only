import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  RefreshCw,
  ListTodo,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  Pencil,
  Trash2,
  X,
  Save,
  Eye,
  AlertCircle,
  UserRound,
  CalendarDays,
} from "lucide-react";
import api from "../../services/api";

const STATUS_OPTIONS = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "review", label: "Review" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const EMPTY_FORM = {
  projectId: "",
  branchId: "",
  title: "",
  description: "",
  assignedTo: "",
  priority: "medium",
  status: "todo",
  startDate: "",
  dueDate: "",
  estimatedHours: 0,
  actualHours: 0,
  progress: 0,
  tags: "",
  notes: "",
};

const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.items)) return data.items;
  return [];
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

function StatusBadge({ status }) {
  const label =
    STATUS_OPTIONS.find((item) => item.value === status)?.label ||
    status ||
    "To Do";

  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs font-medium text-slate-300">
      {label}
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

function Modal({ title, onClose, children, width = "max-w-3xl" }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div
        className={`max-h-[92vh] w-full ${width} overflow-hidden rounded-3xl border border-white/10 bg-[#101114] shadow-2xl shadow-black/60`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <p className="mt-1 text-xs text-slate-500">
              Manage task information
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white"
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
        className="w-full rounded-xl border border-white/10 bg-white/[0.045] px-3.5 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-white/25"
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

function StatCard({ title, value, icon: Icon, subtitle }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/[0.035] blur-2xl" />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <h3 className="mt-2 text-2xl font-bold text-white">{value}</h3>

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

export default function Task() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);

  const [summary, setSummary] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const [editingTask, setEditingTask] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError("");

      const params = {};

      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (projectFilter) params.projectId = projectFilter;

      const response = await api.get("/projects/tasks", { params });

      setTasks(normalizeList(response.data));
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load tasks"
      );
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const response = await api.get("/projects/tasks/summary");

      setSummary(response.data?.data || response.data || null);
    } catch {
      setSummary(null);
    }
  };

  const loadSupportingData = async () => {
    const requests = await Promise.allSettled([
      api.get("/projects", { params: { limit: 1000 } }),
      api.get("/users", { params: { limit: 1000 } }),
      api.get("/branches", { params: { limit: 1000 } }),
    ]);

    if (requests[0].status === "fulfilled") {
      setProjects(normalizeList(requests[0].value.data));
    }

    if (requests[1].status === "fulfilled") {
      setUsers(normalizeList(requests[1].value.data));
    }

    if (requests[2].status === "fulfilled") {
      setBranches(normalizeList(requests[2].value.data));
    }
  };

  useEffect(() => {
    loadSupportingData();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadTasks();
      loadSummary();
    }, 250);

    return () => clearTimeout(timer);
  }, [search, statusFilter, priorityFilter, projectFilter]);

  const openCreate = () => {
    setEditingTask(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (task) => {
    setEditingTask(task);

    setForm({
      projectId: task.projectId?._id || task.projectId || "",
      branchId: task.branchId?._id || task.branchId || "",
      title: task.title || "",
      description: task.description || "",
      assignedTo: task.assignedTo?._id || task.assignedTo || "",
      priority: task.priority || "medium",
      status: task.status || "todo",
      startDate: task.startDate
        ? new Date(task.startDate).toISOString().slice(0, 10)
        : "",
      dueDate: task.dueDate
        ? new Date(task.dueDate).toISOString().slice(0, 10)
        : "",
      estimatedHours: task.estimatedHours ?? 0,
      actualHours: task.actualHours ?? 0,
      progress: task.progress ?? 0,
      tags: Array.isArray(task.tags) ? task.tags.join(", ") : "",
      notes: task.notes || "",
    });

    setShowModal(true);
  };

  const saveTask = async (event) => {
    event.preventDefault();

    if (!form.projectId) {
      setError("Project is required");
      return;
    }

    if (!form.title.trim()) {
      setError("Task title is required");
      return;
    }

    if (
      form.startDate &&
      form.dueDate &&
      new Date(form.dueDate) < new Date(form.startDate)
    ) {
      setError("Due date cannot be before start date");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        projectId: form.projectId,
        branchId: form.branchId || null,
        title: form.title.trim(),
        description: form.description.trim(),
        assignedTo: form.assignedTo || null,
        priority: form.priority,
        status: form.status,
        startDate: form.startDate || null,
        dueDate: form.dueDate || null,
        estimatedHours: Number(form.estimatedHours || 0),
        actualHours: Number(form.actualHours || 0),
        progress: Number(form.progress || 0),
        tags: form.tags
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        notes: form.notes.trim(),
      };

      if (editingTask) {
        await api.put(`/projects/tasks/${editingTask._id}`, payload);
      } else {
        await api.post("/projects/tasks", payload);
      }

      setShowModal(false);
      setEditingTask(null);
      setForm(EMPTY_FORM);

      await Promise.all([loadTasks(), loadSummary()]);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to save task"
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteTask = async (task) => {
    const confirmed = window.confirm(
      `Delete task "${task.title}"?`
    );

    if (!confirmed) return;

    try {
      setError("");

      await api.delete(`/projects/tasks/${task._id}`);

      if (selectedTask?._id === task._id) {
        setSelectedTask(null);
        setShowDetails(false);
      }

      await Promise.all([loadTasks(), loadSummary()]);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to delete task"
      );
    }
  };

  const openDetails = async (task) => {
    try {
      const response = await api.get(`/projects/tasks/${task._id}`);

      setSelectedTask(response.data?.data || response.data || task);
    } catch {
      setSelectedTask(task);
    }

    setShowDetails(true);
  };

  const stats = useMemo(() => {
    const list = tasks || [];

    return {
      total: summary?.total ?? list.length,
      completed:
        summary?.completed ??
        list.filter((item) => item.status === "completed").length,
      inProgress:
        summary?.inProgress ??
        list.filter((item) => item.status === "in_progress").length,
      overdue:
        summary?.overdue ??
        list.filter(
          (item) =>
            item.dueDate &&
            new Date(item.dueDate) < new Date() &&
            !["completed", "cancelled"].includes(item.status)
        ).length,
    };
  }, [tasks, summary]);

  return (
    <div className="min-h-full bg-[#090a0c] text-white">
      <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
        {/* HEADER */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              <ListTodo size={14} />
              Project Management
            </div>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Tasks
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Plan, assign and track project tasks.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                loadTasks();
                loadSummary();
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-slate-300 hover:bg-white/[0.08] hover:text-white"
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black hover:bg-slate-200"
            >
              <Plus size={17} />
              New Task
            </button>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/[0.07] px-4 py-3 text-sm text-red-300">
            <AlertCircle size={18} className="mt-0.5" />
            <span>{error}</span>

            <button
              onClick={() => setError("")}
              className="ml-auto"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* STATS */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Tasks"
            value={stats.total}
            icon={ListTodo}
            subtitle="Workspace tasks"
          />

          <StatCard
            title="In Progress"
            value={stats.inProgress}
            icon={Clock3}
            subtitle="Currently being worked on"
          />

          <StatCard
            title="Completed"
            value={stats.completed}
            icon={CheckCircle2}
            subtitle="Finished tasks"
          />

          <StatCard
            title="Overdue"
            value={stats.overdue}
            icon={AlertTriangle}
            subtitle="Past due date"
          />
        </div>

        {/* FILTERS */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_190px_170px_170px_auto]">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
              />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks..."
                className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-white/20"
              />
            </div>

            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="rounded-xl border border-white/10 bg-[#17181c] px-3 py-3 text-sm text-slate-300 outline-none"
            >
              <option value="">All Projects</option>

              {projects.map((project) => (
                <option key={project._id} value={project._id}>
                  {project.name}
                </option>
              ))}
            </select>

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
                setProjectFilter("");
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
                  <th className="px-5 py-4">Task</th>
                  <th className="px-5 py-4">Project</th>
                  <th className="px-5 py-4">Assigned To</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Priority</th>
                  <th className="px-5 py-4">Progress</th>
                  <th className="px-5 py-4">Due Date</th>
                  <th className="px-5 py-4">Hours</th>
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
                ) : tasks.length === 0 ? (
                  <tr>
                    <td colSpan="9">
                      <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                          <ListTodo
                            className="text-slate-500"
                            size={28}
                          />
                        </div>

                        <h3 className="mt-4 text-sm font-semibold text-white">
                          No tasks found
                        </h3>

                        <p className="mt-1 text-xs text-slate-500">
                          Create a task or change the filters.
                        </p>

                        <button
                          onClick={openCreate}
                          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black"
                        >
                          <Plus size={15} />
                          Create Task
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  tasks.map((task) => {
                    const overdue =
                      task.dueDate &&
                      new Date(task.dueDate) < new Date() &&
                      !["completed", "cancelled"].includes(task.status);

                    return (
                      <tr
                        key={task._id}
                        className="group transition hover:bg-white/[0.025]"
                      >
                        <td className="px-5 py-5">
                          <button
                            onClick={() => openDetails(task)}
                            className="text-left"
                          >
                            <p className="font-semibold text-white">
                              {task.title}
                            </p>

                            <p className="mt-1 text-xs text-slate-600">
                              {task.taskNumber}
                            </p>
                          </button>
                        </td>

                        <td className="px-5 py-5 text-sm text-slate-400">
                          {task.projectId?.name ||
                            task.project?.name ||
                            "-"}
                        </td>

                        <td className="px-5 py-5">
                          <div className="flex items-center gap-2 text-sm text-slate-400">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.05]">
                              <UserRound size={14} />
                            </div>

                            {task.assignedTo?.name ||
                              task.assignedUser?.name ||
                              task.assignedTo?.email ||
                              "-"}
                          </div>
                        </td>

                        <td className="px-5 py-5">
                          <StatusBadge status={task.status} />
                        </td>

                        <td className="px-5 py-5">
                          <PriorityBadge priority={task.priority} />
                        </td>

                        <td className="px-5 py-5">
                          <div className="w-28">
                            <div className="mb-1.5 flex justify-between text-xs">
                              <span className="text-slate-500">
                                Progress
                              </span>

                              <span className="text-slate-300">
                                {task.progress || 0}%
                              </span>
                            </div>

                            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                              <div
                                className="h-full rounded-full bg-white"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    Math.max(
                                      0,
                                      Number(task.progress || 0)
                                    )
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-5">
                          <div
                            className={`flex items-center gap-2 text-xs ${
                              overdue
                                ? "text-red-300"
                                : "text-slate-500"
                            }`}
                          >
                            <CalendarDays size={14} />
                            {formatDate(task.dueDate)}
                          </div>
                        </td>

                        <td className="px-5 py-5 text-xs text-slate-500">
                          {Number(task.actualHours || 0)} /
                          {Number(task.estimatedHours || 0)} hrs
                        </td>

                        <td className="px-5 py-5">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => openDetails(task)}
                              className="rounded-lg p-2 text-slate-500 hover:bg-white/10 hover:text-white"
                              title="View"
                            >
                              <Eye size={16} />
                            </button>

                            <button
                              onClick={() => openEdit(task)}
                              className="rounded-lg p-2 text-slate-500 hover:bg-white/10 hover:text-white"
                              title="Edit"
                            >
                              <Pencil size={16} />
                            </button>

                            <button
                              onClick={() => deleteTask(task)}
                              className="rounded-lg p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-300"
                              title="Delete"
                            >
                              <Trash2 size={16} />
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
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <Modal
          title={editingTask ? "Edit Task" : "Create Task"}
          onClose={() => {
            if (!saving) setShowModal(false);
          }}
        >
          <form onSubmit={saveTask} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Select
                label="Project *"
                value={form.projectId}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    projectId: e.target.value,
                  }))
                }
              >
                <option value="">Select Project</option>

                {projects.map((project) => (
                  <option key={project._id} value={project._id}>
                    {project.name}
                  </option>
                ))}
              </Select>

              <Input
                label="Task Title *"
                value={form.title}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                placeholder="Design landing page"
              />

              <Select
                label="Assigned To"
                value={form.assignedTo}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    assignedTo: e.target.value,
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
                label="Due Date"
                type="date"
                value={form.dueDate}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    dueDate: e.target.value,
                  }))
                }
              />

              <Input
                label="Estimated Hours"
                type="number"
                value={form.estimatedHours}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    estimatedHours: e.target.value,
                  }))
                }
              />

              <Input
                label="Actual Hours"
                type="number"
                value={form.actualHours}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    actualHours: e.target.value,
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

              <Input
                label="Tags"
                value={form.tags}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    tags: e.target.value,
                  }))
                }
                placeholder="frontend, urgent, ui"
              />

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
                  placeholder="Describe the task..."
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
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black disabled:opacity-50"
              >
                <Save size={16} />

                {saving
                  ? "Saving..."
                  : editingTask
                  ? "Update Task"
                  : "Create Task"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* DETAILS */}
      {showDetails && selectedTask && (
        <Modal
          title={selectedTask.title}
          onClose={() => setShowDetails(false)}
          width="max-w-4xl"
        >
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={selectedTask.status} />
              <PriorityBadge priority={selectedTask.priority} />

              <span className="text-xs text-slate-600">
                {selectedTask.taskNumber}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <p className="text-xs text-slate-500">Project</p>

                <p className="mt-2 text-sm font-semibold text-white">
                  {selectedTask.projectId?.name ||
                    selectedTask.project?.name ||
                    "-"}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <p className="text-xs text-slate-500">Assigned To</p>

                <p className="mt-2 text-sm font-semibold text-white">
                  {selectedTask.assignedTo?.name ||
                    selectedTask.assignedUser?.name ||
                    "-"}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <p className="text-xs text-slate-500">Progress</p>

                <p className="mt-2 text-sm font-semibold text-white">
                  {selectedTask.progress || 0}%
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <p className="text-xs text-slate-500">Due Date</p>

                <p className="mt-2 text-sm font-semibold text-white">
                  {formatDate(selectedTask.dueDate)}
                </p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="mb-3 text-sm font-semibold text-white">
                  Description
                </h3>

                <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-sm leading-6 text-slate-400">
                  {selectedTask.description ||
                    "No description provided."}
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold text-white">
                  Time Tracking
                </h3>

                <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                  <div>
                    <div className="mb-2 flex justify-between text-xs">
                      <span className="text-slate-500">
                        Progress
                      </span>

                      <span className="text-slate-300">
                        {selectedTask.progress || 0}%
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-white/[0.07]">
                      <div
                        className="h-full rounded-full bg-white"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(
                              0,
                              Number(selectedTask.progress || 0)
                            )
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-xs text-slate-500">
                        Estimated
                      </p>
                      <p className="mt-1 text-sm font-semibold text-white">
                        {selectedTask.estimatedHours || 0} hrs
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-xs text-slate-500">Actual</p>
                      <p className="mt-1 text-sm font-semibold text-white">
                        {selectedTask.actualHours || 0} hrs
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold text-white">
                Dates
              </h3>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                  <p className="text-xs text-slate-500">Start Date</p>
                  <p className="mt-2 text-sm text-slate-300">
                    {formatDate(selectedTask.startDate)}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                  <p className="text-xs text-slate-500">Due Date</p>
                  <p className="mt-2 text-sm text-slate-300">
                    {formatDate(selectedTask.dueDate)}
                  </p>
                </div>
              </div>
            </div>

            {selectedTask.notes && (
              <div>
                <h3 className="mb-3 text-sm font-semibold text-white">
                  Notes
                </h3>

                <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-sm leading-6 text-slate-400">
                  {selectedTask.notes}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}