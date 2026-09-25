import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Clock3,
  Plus,
  Search,
  RefreshCw,
  Edit3,
  Trash2,
  X,
  Check,
  AlertCircle,
  Moon,
  Sun,
  Timer,
  Coffee,
  Users,
  ChevronLeft,
  ChevronRight,
  Loader2,
  SlidersHorizontal,
} from "lucide-react";
import api, { getToken } from "../../services/api";
const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const initialForm = {
  name: "",
  code: "",
  startTime: "09:00",
  endTime: "18:00",
  breakMinutes: 60,
  graceMinutes: 15,
  workingMinutes: 480,
  shiftType: "regular",
  isActive: true,
};

const SHIFT_TYPES = [
  {
    value: "regular",
    label: "Regular",
    icon: Sun,
  },
  {
    value: "night",
    label: "Night",
    icon: Moon,
  },
  {
    value: "flexible",
    label: "Flexible",
    icon: Clock3,
  },
  {
    value: "rotational",
    label: "Rotational",
    icon: RefreshCw,
  },
];

const getErrorMessage = (error, fallback = "Something went wrong") => {
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }

  if (error?.message) {
    return error.message;
  }

  return fallback;
};

const formatMinutes = (minutes = 0) => {
  const value = Number(minutes) || 0;
  const hours = Math.floor(value / 60);
  const mins = value % 60;

  if (!hours) return `${mins}m`;
  if (!mins) return `${hours}h`;

  return `${hours}h ${mins}m`;
};

const calculateWorkingMinutes = (
  startTime,
  endTime,
  breakMinutes = 0
) => {
  if (!startTime || !endTime) return 0;

  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);

  if (
    Number.isNaN(startHour) ||
    Number.isNaN(startMinute) ||
    Number.isNaN(endHour) ||
    Number.isNaN(endMinute)
  ) {
    return 0;
  }

  let start = startHour * 60 + startMinute;
  let end = endHour * 60 + endMinute;

  if (end <= start) {
    end += 24 * 60;
  }

  return Math.max(end - start - Number(breakMinutes || 0), 0);
};

const getShiftType = (type) =>
  SHIFT_TYPES.find((item) => item.value === type) || SHIFT_TYPES[0];

const normalizeShiftResponse = (response) => {
  const payload = response?.data;

  if (Array.isArray(payload)) return payload;

  if (Array.isArray(payload?.data)) return payload.data;

  if (Array.isArray(payload?.shifts)) return payload.shifts;

  if (Array.isArray(payload?.data?.shifts)) return payload.data.shifts;

  return [];
};

const normalizeSingleResponse = (response) => {
  const payload = response?.data;

  return (
    payload?.data ||
    payload?.shift ||
    payload?.data?.shift ||
    payload
  );
};

export default function Shifts() {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [showModal, setShowModal] = useState(false);
  const [editingShift, setEditingShift] = useState(null);

  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState("");
  const [error, setError] = useState("");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [shiftToDelete, setShiftToDelete] = useState(null);

  const token = getToken();

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }),
    [token]
  );

  const fetchShifts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/shifts`, {
        method: "GET",
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Failed to load shifts");
      }

      setShifts(normalizeShiftResponse({ data }));
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load shifts"));
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const filteredShifts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return shifts.filter((shift) => {
      const matchesSearch =
        !query ||
        String(shift?.name || "")
          .toLowerCase()
          .includes(query) ||
        String(shift?.code || "")
          .toLowerCase()
          .includes(query) ||
        String(shift?.shiftType || "")
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && shift?.isActive) ||
        (statusFilter === "inactive" && !shift?.isActive);

      const matchesType =
        typeFilter === "all" || shift?.shiftType === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [shifts, search, statusFilter, typeFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredShifts.length / limit)
  );

  const paginatedShifts = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredShifts.slice(start, start + limit);
  }, [filteredShifts, page, limit]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const stats = useMemo(() => {
    const active = shifts.filter((shift) => shift?.isActive).length;
    const inactive = shifts.length - active;
    const night = shifts.filter(
      (shift) => shift?.shiftType === "night"
    ).length;

    return {
      total: shifts.length,
      active,
      inactive,
      night,
    };
  }, [shifts]);

  const openCreateModal = () => {
    setEditingShift(null);
    setForm(initialForm);
    setFormError("");
    setShowModal(true);
  };

  const openEditModal = (shift) => {
    setEditingShift(shift);
    setForm({
      name: shift?.name || "",
      code: shift?.code || "",
      startTime: shift?.startTime || "09:00",
      endTime: shift?.endTime || "18:00",
      breakMinutes: shift?.breakMinutes ?? 60,
      graceMinutes: shift?.graceMinutes ?? 15,
      workingMinutes:
        shift?.workingMinutes ??
        calculateWorkingMinutes(
          shift?.startTime,
          shift?.endTime,
          shift?.breakMinutes
        ),
      shiftType: shift?.shiftType || "regular",
      isActive:
        typeof shift?.isActive === "boolean"
          ? shift.isActive
          : true,
    });
    setFormError("");
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingShift(null);
    setForm(initialForm);
    setFormError("");
  };

  const updateForm = (key, value) => {
    setForm((previous) => {
      const next = {
        ...previous,
        [key]: value,
      };

      if (
        ["startTime", "endTime", "breakMinutes"].includes(key)
      ) {
        next.workingMinutes = calculateWorkingMinutes(
          next.startTime,
          next.endTime,
          next.breakMinutes
        );
      }

      return next;
    });
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      return "Shift name is required";
    }

    if (!form.code.trim()) {
      return "Shift code is required";
    }

    if (!form.startTime || !form.endTime) {
      return "Start time and end time are required";
    }

    if (Number(form.breakMinutes) < 0) {
      return "Break minutes cannot be negative";
    }

    if (Number(form.graceMinutes) < 0) {
      return "Grace minutes cannot be negative";
    }

    if (Number(form.workingMinutes) < 0) {
      return "Working minutes cannot be negative";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    try {
      setSaving(true);
      setFormError("");

      const payload = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        startTime: form.startTime,
        endTime: form.endTime,
        breakMinutes: Number(form.breakMinutes),
        graceMinutes: Number(form.graceMinutes),
        workingMinutes: Number(form.workingMinutes),
        shiftType: form.shiftType,
        isActive: Boolean(form.isActive),
      };

      const url = editingShift
        ? `${API_URL}/shifts/${editingShift._id}`
        : `${API_URL}/shifts`;

      const response = await fetch(url, {
        method: editingShift ? "PUT" : "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            `Failed to ${
              editingShift ? "update" : "create"
            } shift`
        );
      }

      const savedShift = normalizeSingleResponse({ data });

      if (editingShift) {
        setShifts((previous) =>
          previous.map((item) =>
            item._id === editingShift._id
              ? savedShift || { ...item, ...payload }
              : item
          )
        );
      } else {
        setShifts((previous) => [
          savedShift || payload,
          ...previous,
        ]);
      }

      closeModal();
    } catch (err) {
      setFormError(
        getErrorMessage(
          err,
          `Unable to ${
            editingShift ? "update" : "create"
          } shift`
        )
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (shift) => {
    try {
      setError("");

      const response = await fetch(
        `${API_URL}/shifts/${shift._id}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify({
            isActive: !shift.isActive,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || "Failed to update shift status"
        );
      }

      const updated = normalizeSingleResponse({ data });

      setShifts((previous) =>
        previous.map((item) =>
          item._id === shift._id
            ? updated || {
                ...item,
                isActive: !item.isActive,
              }
            : item
        )
      );
    } catch (err) {
      setError(
        getErrorMessage(err, "Unable to update shift status")
      );
    }
  };

  const askDelete = (shift) => {
    setShiftToDelete(shift);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    if (deletingId) return;

    setShowDeleteModal(false);
    setShiftToDelete(null);
  };

  const confirmDelete = async () => {
    if (!shiftToDelete?._id) return;

    try {
      setDeletingId(shiftToDelete._id);
      setError("");

      const response = await fetch(
        `${API_URL}/shifts/${shiftToDelete._id}`,
        {
          method: "DELETE",
          headers,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || "Failed to delete shift"
        );
      }

      setShifts((previous) =>
        previous.filter(
          (item) => item._id !== shiftToDelete._id
        )
      );

      closeDeleteModal();
    } catch (err) {
      setError(
        getErrorMessage(err, "Unable to delete shift")
      );
    } finally {
      setDeletingId(null);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
    setPage(1);
  };

  return (
    <div className="min-h-screen w-full bg-[#07090d] text-white">
      <div className="relative w-full overflow-hidden">
        {/* Ambient background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-cyan-500/[0.07] blur-3xl" />
          <div className="absolute -right-32 top-40 h-96 w-96 rounded-full bg-violet-500/[0.06] blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-blue-500/[0.04] blur-3xl" />
        </div>

        <div className="relative w-full px-3 py-4 sm:px-5 md:px-6 lg:px-8 xl:px-10">
          {/* Header */}
          <div className="mb-6 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-cyan-400/80">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
                Human Resources
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Shift Management
              </h1>

              <p className="mt-1 max-w-2xl text-sm text-zinc-400 sm:text-[15px]">
                Create, manage and organize employee working
                schedules from one place.
              </p>
            </div>

            <div className="flex w-full gap-2 sm:w-auto">
              <button
                type="button"
                onClick={fetchShifts}
                disabled={loading}
                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 text-sm font-medium text-zinc-300 transition hover:border-white/[0.14] hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    loading ? "animate-spin" : ""
                  }`}
                />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <button
                type="button"
                onClick={openCreateModal}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 text-sm font-semibold text-black shadow-[0_0_24px_rgba(34,211,238,0.12)] transition hover:bg-cyan-300 sm:flex-none"
              >
                <Plus className="h-4 w-4" />
                Add Shift
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-4 text-sm text-red-300">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="flex-1">{error}</div>

              <button
                type="button"
                onClick={() => setError("")}
                className="text-red-300/60 transition hover:text-red-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Stats */}
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              icon={Clock3}
              label="Total Shifts"
              value={stats.total}
              description="All configured shifts"
            />

            <StatCard
              icon={Check}
              label="Active"
              value={stats.active}
              description="Currently available"
            />

            <StatCard
              icon={Users}
              label="Inactive"
              value={stats.inactive}
              description="Currently disabled"
            />

            <StatCard
              icon={Moon}
              label="Night Shifts"
              value={stats.night}
              description="Overnight schedules"
            />
          </div>

          {/* Main Card */}
          <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0c1017]/90 shadow-[0_20px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            {/* Toolbar */}
            <div className="border-b border-white/[0.06] p-3 sm:p-4 lg:p-5">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

                  <input
                    type="text"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Search shift name, code or type..."
                    className="h-11 w-full rounded-xl border border-white/[0.07] bg-black/20 pl-10 pr-4 text-sm text-white outline-none placeholder:text-zinc-600 transition focus:border-cyan-400/30 focus:bg-black/30"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 sm:flex">
                  <select
                    value={statusFilter}
                    onChange={(event) => {
                      setStatusFilter(event.target.value);
                      setPage(1);
                    }}
                    className="h-11 rounded-xl border border-white/[0.07] bg-[#11161f] px-3 text-sm text-zinc-300 outline-none focus:border-cyan-400/30"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>

                  <select
                    value={typeFilter}
                    onChange={(event) => {
                      setTypeFilter(event.target.value);
                      setPage(1);
                    }}
                    className="h-11 rounded-xl border border-white/[0.07] bg-[#11161f] px-3 text-sm text-zinc-300 outline-none focus:border-cyan-400/30"
                  >
                    <option value="all">All Types</option>
                    {SHIFT_TYPES.map((type) => (
                      <option
                        key={type.value}
                        value={type.value}
                      >
                        {type.label}
                      </option>
                    ))}
                  </select>

                  {(search ||
                    statusFilter !== "all" ||
                    typeFilter !== "all") && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="col-span-2 flex h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.07] px-3 text-sm text-zinc-400 transition hover:bg-white/[0.04] hover:text-white sm:col-span-1"
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Loading */}
            {loading ? (
              <div className="flex min-h-[360px] items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.06]">
                    <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
                  </div>
                  <p className="text-sm text-zinc-500">
                    Loading shifts...
                  </p>
                </div>
              </div>
            ) : filteredShifts.length === 0 ? (
              <EmptyState
                hasFilters={
                  Boolean(search) ||
                  statusFilter !== "all" ||
                  typeFilter !== "all"
                }
                onCreate={openCreateModal}
                onReset={resetFilters}
              />
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden overflow-x-auto lg:block">
                  <table className="w-full min-w-[900px]">
                    <thead>
                      <tr className="border-b border-white/[0.06] bg-white/[0.015]">
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                          Shift
                        </th>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                          Schedule
                        </th>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                          Working Time
                        </th>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                          Grace
                        </th>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                          Type
                        </th>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                          Status
                        </th>
                        <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {paginatedShifts.map((shift) => {
                        const type = getShiftType(
                          shift.shiftType
                        );
                        const TypeIcon = type.icon;

                        return (
                          <tr
                            key={shift._id}
                            className="group border-b border-white/[0.045] transition hover:bg-white/[0.018]"
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/10 bg-cyan-400/[0.06]">
                                  <Clock3 className="h-4 w-4 text-cyan-400" />
                                </div>

                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-white">
                                    {shift.name}
                                  </p>
                                  <p className="mt-0.5 text-xs font-medium tracking-wide text-zinc-500">
                                    {shift.code}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2 text-sm text-zinc-300">
                                <span>
                                  {shift.startTime}
                                </span>
                                <span className="text-zinc-600">
                                  →
                                </span>
                                <span>
                                  {shift.endTime}
                                </span>
                              </div>

                              <div className="mt-1 flex items-center gap-1.5 text-xs text-zinc-600">
                                <Coffee className="h-3.5 w-3.5" />
                                {formatMinutes(
                                  shift.breakMinutes
                                )}{" "}
                                break
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
                                <Timer className="h-4 w-4 text-zinc-500" />
                                {formatMinutes(
                                  shift.workingMinutes
                                )}
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <span className="text-sm text-zinc-300">
                                {formatMinutes(
                                  shift.graceMinutes
                                )}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <div className="inline-flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.025] px-2.5 py-1.5 text-xs font-medium text-zinc-300">
                                <TypeIcon className="h-3.5 w-3.5 text-cyan-400" />
                                {type.label}
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <button
                                type="button"
                                onClick={() =>
                                  toggleStatus(shift)
                                }
                                className="inline-flex items-center gap-2"
                              >
                                <span
                                  className={`relative h-5 w-9 rounded-full transition ${
                                    shift.isActive
                                      ? "bg-cyan-400/30"
                                      : "bg-zinc-700"
                                  }`}
                                >
                                  <span
                                    className={`absolute top-0.5 h-4 w-4 rounded-full transition ${
                                      shift.isActive
                                        ? "left-[18px] bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.5)]"
                                        : "left-0.5 bg-zinc-500"
                                    }`}
                                  />
                                </span>

                                <span
                                  className={`text-xs font-medium ${
                                    shift.isActive
                                      ? "text-cyan-300"
                                      : "text-zinc-500"
                                  }`}
                                >
                                  {shift.isActive
                                    ? "Active"
                                    : "Inactive"}
                                </span>
                              </button>
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex justify-end gap-1.5 opacity-70 transition group-hover:opacity-100">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openEditModal(shift)
                                  }
                                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.06] text-zinc-400 transition hover:border-cyan-400/20 hover:bg-cyan-400/[0.06] hover:text-cyan-300"
                                  title="Edit"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    askDelete(shift)
                                  }
                                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.06] text-zinc-400 transition hover:border-red-400/20 hover:bg-red-400/[0.06] hover:text-red-300"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile / Tablet Cards */}
                <div className="grid gap-3 p-3 sm:p-4 lg:hidden">
                  {paginatedShifts.map((shift) => {
                    const type = getShiftType(
                      shift.shiftType
                    );
                    const TypeIcon = type.icon;

                    return (
                      <div
                        key={shift._id}
                        className="rounded-2xl border border-white/[0.07] bg-black/10 p-4 transition hover:border-white/[0.11]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/10 bg-cyan-400/[0.06]">
                              <Clock3 className="h-5 w-5 text-cyan-400" />
                            </div>

                            <div className="min-w-0">
                              <h3 className="truncate text-sm font-semibold text-white">
                                {shift.name}
                              </h3>
                              <p className="mt-0.5 text-xs text-zinc-500">
                                {shift.code}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              toggleStatus(shift)
                            }
                            className={`shrink-0 rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${
                              shift.isActive
                                ? "border-cyan-400/15 bg-cyan-400/[0.06] text-cyan-300"
                                : "border-zinc-700 bg-zinc-800/50 text-zinc-500"
                            }`}
                          >
                            {shift.isActive
                              ? "Active"
                              : "Inactive"}
                          </button>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <InfoBox
                            label="Schedule"
                            value={`${shift.startTime} → ${shift.endTime}`}
                          />

                          <InfoBox
                            label="Working"
                            value={formatMinutes(
                              shift.workingMinutes
                            )}
                          />

                          <InfoBox
                            label="Break"
                            value={formatMinutes(
                              shift.breakMinutes
                            )}
                          />

                          <InfoBox
                            label="Grace"
                            value={formatMinutes(
                              shift.graceMinutes
                            )}
                          />
                        </div>

                        <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3">
                          <div className="flex items-center gap-2 text-xs text-zinc-400">
                            <TypeIcon className="h-3.5 w-3.5 text-cyan-400" />
                            {type.label}
                          </div>

                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                openEditModal(shift)
                              }
                              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.07] text-zinc-400 transition hover:bg-white/[0.05] hover:text-white"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                askDelete(shift)
                              }
                              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.07] text-zinc-400 transition hover:border-red-400/20 hover:bg-red-400/[0.06] hover:text-red-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                <div className="flex flex-col gap-3 border-t border-white/[0.06] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-zinc-500">
                    Showing{" "}
                    <span className="font-medium text-zinc-300">
                      {filteredShifts.length === 0
                        ? 0
                        : (page - 1) * limit + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-medium text-zinc-300">
                      {Math.min(
                        page * limit,
                        filteredShifts.length
                      )}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium text-zinc-300">
                      {filteredShifts.length}
                    </span>{" "}
                    shifts
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() =>
                        setPage((current) =>
                          Math.max(current - 1, 1)
                        )
                      }
                      className="flex h-9 items-center gap-1 rounded-lg border border-white/[0.07] px-3 text-xs text-zinc-400 transition hover:bg-white/[0.04] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </button>

                    <span className="flex h-9 min-w-9 items-center justify-center rounded-lg border border-cyan-400/10 bg-cyan-400/[0.05] px-3 text-xs font-semibold text-cyan-300">
                      {page} / {totalPages}
                    </span>

                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() =>
                        setPage((current) =>
                          Math.min(
                            current + 1,
                            totalPages
                          )
                        )
                      }
                      className="flex h-9 items-center gap-1 rounded-lg border border-white/[0.07] px-3 text-xs text-zinc-400 transition hover:bg-white/[0.04] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-3 backdrop-blur-md sm:p-5">
          <div className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0c1017] shadow-[0_30px_100px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-cyan-400/70">
                  {editingShift
                    ? "Update Configuration"
                    : "New Configuration"}
                </p>

                <h2 className="mt-1 text-lg font-semibold text-white">
                  {editingShift
                    ? "Edit Shift"
                    : "Create Shift"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.07] text-zinc-500 transition hover:bg-white/[0.05] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="max-h-[calc(100vh-180px)] overflow-y-auto p-5 sm:p-6">
                {formError && (
                  <div className="mb-5 flex gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.05] p-3 text-sm text-red-300">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    label="Shift Name"
                    required
                    value={form.name}
                    onChange={(value) =>
                      updateForm("name", value)
                    }
                    placeholder="General Shift"
                  />

                  <FormField
                    label="Shift Code"
                    required
                    value={form.code}
                    onChange={(value) =>
                      updateForm("code", value)
                    }
                    placeholder="GEN-001"
                  />

                  <FormField
                    label="Start Time"
                    required
                    type="time"
                    value={form.startTime}
                    onChange={(value) =>
                      updateForm("startTime", value)
                    }
                  />

                  <FormField
                    label="End Time"
                    required
                    type="time"
                    value={form.endTime}
                    onChange={(value) =>
                      updateForm("endTime", value)
                    }
                  />

                  <FormField
                    label="Break Minutes"
                    type="number"
                    min="0"
                    value={form.breakMinutes}
                    onChange={(value) =>
                      updateForm("breakMinutes", value)
                    }
                    placeholder="60"
                  />

                  <FormField
                    label="Grace Minutes"
                    type="number"
                    min="0"
                    value={form.graceMinutes}
                    onChange={(value) =>
                      updateForm("graceMinutes", value)
                    }
                    placeholder="15"
                  />

                  <FormField
                    label="Working Minutes"
                    type="number"
                    min="0"
                    value={form.workingMinutes}
                    onChange={(value) =>
                      updateForm("workingMinutes", value)
                    }
                    placeholder="480"
                  />

                  <div>
                    <label className="mb-2 block text-xs font-medium text-zinc-400">
                      Shift Type
                    </label>

                    <select
                      value={form.shiftType}
                      onChange={(event) =>
                        updateForm(
                          "shiftType",
                          event.target.value
                        )
                      }
                      className="h-11 w-full rounded-xl border border-white/[0.08] bg-black/20 px-3 text-sm text-white outline-none transition focus:border-cyan-400/30"
                    >
                      {SHIFT_TYPES.map((type) => (
                        <option
                          key={type.value}
                          value={type.value}
                        >
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Working time preview */}
                <div className="mt-5 rounded-xl border border-cyan-400/10 bg-cyan-400/[0.035] p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-400/[0.08]">
                      <Timer className="h-4 w-4 text-cyan-400" />
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-zinc-300">
                        Working Time Preview
                      </p>

                      <p className="mt-1 text-sm text-zinc-500">
                        {form.startTime} → {form.endTime}
                        {" · "}
                        {formatMinutes(
                          form.breakMinutes
                        )}{" "}
                        break
                      </p>

                      <p className="mt-2 text-lg font-semibold text-cyan-300">
                        {formatMinutes(
                          form.workingMinutes
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="mt-5 flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                  <div>
                    <p className="text-sm font-medium text-white">
                      Active Shift
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Allow this shift to be assigned to
                      employees.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      updateForm(
                        "isActive",
                        !form.isActive
                      )
                    }
                    className={`relative h-6 w-11 rounded-full transition ${
                      form.isActive
                        ? "bg-cyan-400/30"
                        : "bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full transition ${
                        form.isActive
                          ? "left-[22px] bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.5)]"
                          : "left-0.5 bg-zinc-500"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-white/[0.07] p-4 sm:flex-row sm:justify-end sm:px-6">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="h-11 rounded-xl border border-white/[0.07] px-5 text-sm font-medium text-zinc-400 transition hover:bg-white/[0.04] hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 text-sm font-semibold text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      {editingShift
                        ? "Update Shift"
                        : "Create Shift"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteModal && shiftToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0c1017] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.6)] sm:p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-red-400/15 bg-red-400/[0.06]">
              <Trash2 className="h-5 w-5 text-red-400" />
            </div>

            <h3 className="mt-4 text-lg font-semibold text-white">
              Delete Shift?
            </h3>

            <p className="mt-2 text-sm leading-6 text-zinc-500">
              You are about to delete{" "}
              <span className="font-medium text-zinc-300">
                {shiftToDelete.name}
              </span>
              . This action cannot be undone.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={Boolean(deletingId)}
                className="h-11 rounded-xl border border-white/[0.07] px-5 text-sm font-medium text-zinc-400 transition hover:bg-white/[0.04] hover:text-white"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDelete}
                disabled={Boolean(deletingId)}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-red-500 px-5 text-sm font-semibold text-white transition hover:bg-red-400 disabled:opacity-60"
              >
                {deletingId ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete Shift
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  description,
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0c1017]/90 p-4 shadow-[0_15px_50px_rgba(0,0,0,0.16)] transition hover:border-white/[0.11] sm:p-5">
      <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-cyan-400/[0.025] blur-2xl transition group-hover:bg-cyan-400/[0.05]" />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.13em] text-zinc-500">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-white">
            {value}
          </p>

          <p className="mt-1 text-xs text-zinc-600">
            {description}
          </p>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.025]">
          <Icon className="h-4 w-4 text-cyan-400" />
        </div>
      </div>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded-xl border border-white/[0.055] bg-white/[0.018] p-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-zinc-600">
        {label}
      </p>

      <p className="mt-1.5 truncate text-xs font-medium text-zinc-300">
        {value}
      </p>
    </div>
  );
}

function FormField({
  label,
  required = false,
  type = "text",
  value,
  onChange,
  placeholder,
  min,
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-medium text-zinc-400">
        {label}
        {required && (
          <span className="ml-1 text-cyan-400">*</span>
        )}
      </label>

      <input
        type={type}
        value={value}
        min={min}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-white/[0.08] bg-black/20 px-3 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-cyan-400/30 focus:bg-black/30"
      />
    </div>
  );
}

function EmptyState({
  hasFilters,
  onCreate,
  onReset,
}) {
  return (
    <div className="flex min-h-[380px] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.05]">
        <Clock3 className="h-7 w-7 text-cyan-400/80" />
      </div>

      <h3 className="mt-5 text-base font-semibold text-white">
        {hasFilters
          ? "No shifts found"
          : "No shifts created yet"}
      </h3>

      <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">
        {hasFilters
          ? "Try changing your search or filters to find the shift you're looking for."
          : "Create your first employee shift to start managing working schedules."}
      </p>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        {hasFilters && (
          <button
            type="button"
            onClick={onReset}
            className="h-10 rounded-xl border border-white/[0.07] px-4 text-sm font-medium text-zinc-400 transition hover:bg-white/[0.04] hover:text-white"
          >
            Reset Filters
          </button>
        )}

        <button
          type="button"
          onClick={onCreate}
          className="flex h-10 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 text-sm font-semibold text-black transition hover:bg-cyan-300"
        >
          <Plus className="h-4 w-4" />
          Add Shift
        </button>
      </div>
    </div>
  );
}