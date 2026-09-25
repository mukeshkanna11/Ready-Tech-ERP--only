import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  RefreshCw,
  Download,
  Plus,
  AlertCircle,
  X,
  CheckCircle2,
  Users,
  UserCheck,
  XCircle,
  Clock3,
  Filter,
  Search,
  MoreHorizontal,
  Edit3,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Check,
  LogIn,
  LogOut,
} from "lucide-react";

import api from "../../services/api";

const ATTENDANCE_STATUSES = [
  {
    value: "present",
    label: "Present",
  },
  {
    value: "absent",
    label: "Absent",
  },
  {
    value: "late",
    label: "Late",
  },
  {
    value: "half_day",
    label: "Half Day",
  },
  {
    value: "leave",
    label: "Leave",
  },
  {
    value: "holiday",
    label: "Holiday",
  },
  {
    value: "week_off",
    label: "Week Off",
  },
];

const EMPTY_FORM = {
  employeeId: "",
  date: "",
  checkIn: "",
  checkOut: "",
  status: "present",
  notes: "",
};

function normalizeListResponse(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  if (Array.isArray(data?.data?.data)) {
    return data.data.data;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  return [];
}

function getPagination(data) {
  return (
    data?.pagination ||
    data?.data?.pagination ||
    {}
  );
}

function formatDate(dateValue) {
  if (!dateValue) return "-";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(dateValue) {
  if (!dateValue) return "-";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatMinutes(minutes) {
  const value = Number(minutes) || 0;

  const hours = Math.floor(value / 60);
  const mins = value % 60;

  return `${hours}h ${mins}m`;
}

function toDateInputValue(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function toDateTimeLocalValue(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getEmployeeName(employee) {
  return (
    employee?.userId?.name ||
    employee?.name ||
    employee?.user?.name ||
    employee?.employeeCode ||
    "Unknown Employee"
  );
}

function getEmployeeEmail(employee) {
  return (
    employee?.userId?.email ||
    employee?.email ||
    employee?.user?.email ||
    ""
  );
}

function getEmployeeCode(employee) {
  return employee?.employeeCode || employee?.code || "";
}

function getStatusLabel(status) {
  const item = ATTENDANCE_STATUSES.find(
    (item) => item.value === status
  );

  return item?.label || status || "-";
}

function getStatusClasses(status) {
  switch (status) {
    case "present":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "absent":
      return "bg-red-50 text-red-700 border-red-200";

    case "late":
      return "bg-amber-50 text-amber-700 border-amber-200";

    case "half_day":
      return "bg-orange-50 text-orange-700 border-orange-200";

    case "leave":
      return "bg-blue-50 text-blue-700 border-blue-200";

    case "holiday":
      return "bg-purple-50 text-purple-700 border-purple-200";

    case "week_off":
      return "bg-slate-100 text-slate-700 border-slate-200";

    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function getInitials(name) {
  if (!name) return "NA";

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getToday() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getApiErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

function convertLocalDateTimeToISO(value) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

export default function Attendance() {
  const [attendance, setAttendance] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [loading, setLoading] = useState(true);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    ...EMPTY_FORM,
    date: getToday(),
  });

  const [filters, setFilters] = useState({
    search: "",
    status: "",
    employeeId: "",
    date: "",
    fromDate: "",
    toDate: "",
    month: "",
  });

  const [appliedFilters, setAppliedFilters] = useState({
    search: "",
    status: "",
    employeeId: "",
    date: "",
    fromDate: "",
    toDate: "",
    month: "",
  });

  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const [showFilters, setShowFilters] = useState(false);

  const [openMenuId, setOpenMenuId] = useState(null);

  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    leave: 0,
  });

  const fetchEmployees = useCallback(async () => {
    try {
      setEmployeesLoading(true);

      const response = await api.get(
        "/employees?status=active&limit=100"
      );

      const list = normalizeListResponse(response.data);

      setEmployees(list);
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          "Unable to load employees"
        )
      );
    } finally {
      setEmployeesLoading(false);
    }
  }, []);

  const buildQuery = useCallback(
    (currentPage = page) => {
      const params = new URLSearchParams();

      params.set("page", String(currentPage));
      params.set("limit", String(limit));

      if (appliedFilters.search.trim()) {
        params.set(
          "search",
          appliedFilters.search.trim()
        );
      }

      if (appliedFilters.status) {
        params.set(
          "status",
          appliedFilters.status
        );
      }

      if (appliedFilters.employeeId) {
        params.set(
          "employeeId",
          appliedFilters.employeeId
        );
      }

      if (appliedFilters.date) {
        params.set(
          "date",
          appliedFilters.date
        );
      }

      if (appliedFilters.fromDate) {
        params.set(
          "fromDate",
          appliedFilters.fromDate
        );
      }

      if (appliedFilters.toDate) {
        params.set(
          "toDate",
          appliedFilters.toDate
        );
      }

      if (appliedFilters.month) {
        params.set(
          "month",
          appliedFilters.month
        );
      }

      return params.toString();
    },
    [appliedFilters, limit, page]
  );

  const fetchAttendance = useCallback(
    async (currentPage = page) => {
      try {
        setLoading(true);
        setError("");

        const query = buildQuery(currentPage);

        const response = await api.get(
          `/attendance?${query}`
        );

        const list = normalizeListResponse(
          response.data
        );

        const paginationData = getPagination(
          response.data
        );

        setAttendance(list);

        setPagination({
          page:
            Number(paginationData.page) ||
            currentPage,
          limit:
            Number(paginationData.limit) ||
            limit,
          total:
            Number(paginationData.total) ||
            list.length,
          totalPages:
            Number(paginationData.totalPages) ||
            1,
          hasNextPage:
            Boolean(paginationData.hasNextPage),
          hasPreviousPage:
            Boolean(
              paginationData.hasPreviousPage
            ),
        });

        const present = list.filter(
          (item) => item.status === "present"
        ).length;

        const absent = list.filter(
          (item) => item.status === "absent"
        ).length;

        const late = list.filter(
          (item) => item.status === "late"
        ).length;

        const leave = list.filter(
          (item) => item.status === "leave"
        ).length;

        setStats({
          total:
            Number(paginationData.total) ||
            list.length,
          present,
          absent,
          late,
          leave,
        });
      } catch (err) {
        setError(
          getApiErrorMessage(
            err,
            "Unable to load attendance"
          )
        );
      } finally {
        setLoading(false);
      }
    },
    [buildQuery, limit, page]
  );

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    fetchAttendance(page);
  }, [fetchAttendance, page]);

  useEffect(() => {
    if (!success) return;

    const timer = setTimeout(() => {
      setSuccess("");
    }, 3500);

    return () => clearTimeout(timer);
  }, [success]);

  useEffect(() => {
    if (!error) return;

    const timer = setTimeout(() => {
      setError("");
    }, 5000);

    return () => clearTimeout(timer);
  }, [error]);

  const selectedEmployee = useMemo(() => {
    return employees.find(
      (employee) =>
        String(employee._id) ===
        String(form.employeeId)
    );
  }, [employees, form.employeeId]);

  const resetForm = () => {
    setForm({
      ...EMPTY_FORM,
      date: getToday(),
    });

    setEditingId(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
    setOpenMenuId(null);
  };

  const openEditModal = (record) => {
    setEditingId(record._id);

    setForm({
      employeeId:
        record?.employeeId?._id ||
        record?.employeeId ||
        "",
      date: toDateInputValue(record.date),
      checkIn: toDateTimeLocalValue(
        record.checkIn
      ),
      checkOut: toDateTimeLocalValue(
        record.checkOut
      ),
      status: record.status || "present",
      notes: record.notes || "",
    });

    setShowModal(true);
    setOpenMenuId(null);
  };

  const closeModal = () => {
    if (submitting) return;

    setShowModal(false);
    resetForm();
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.employeeId) {
      setError("Please select an employee.");
      return;
    }

    if (!form.date) {
      setError("Please select an attendance date.");
      return;
    }

    if (!form.status) {
      setError("Please select attendance status.");
      return;
    }

    if (
      form.checkIn &&
      form.checkOut &&
      new Date(form.checkOut) <=
        new Date(form.checkIn)
    ) {
      setError(
        "Check-out time must be after check-in time."
      );
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const payload = {
        employeeId: form.employeeId,
        date: form.date,
        checkIn: form.checkIn
          ? convertLocalDateTimeToISO(
              form.checkIn
            )
          : null,
        checkOut: form.checkOut
          ? convertLocalDateTimeToISO(
              form.checkOut
            )
          : null,
        status: form.status,
        notes: form.notes.trim() || undefined,
      };

      if (editingId) {
        await api.put(
          `/attendance/${editingId}`,
          payload
        );

        setSuccess(
          "Attendance updated successfully."
        );
      } else {
        await api.post(
          "/attendance",
          payload
        );

        setSuccess(
          "Attendance created successfully."
        );
      }

      setShowModal(false);
      resetForm();

      await fetchAttendance(page);
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          editingId
            ? "Unable to update attendance"
            : "Unable to create attendance"
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (record) => {
    if (!record?._id) return;

    const employeeName = getEmployeeName(
      record.employeeId
    );

    const confirmed = window.confirm(
      `Delete attendance for ${employeeName} on ${formatDate(
        record.date
      )}?`
    );

    if (!confirmed) return;

    try {
      setDeletingId(record._id);
      setError("");

      await api.delete(
        `/attendance/${record._id}`
      );

      setSuccess(
        "Attendance deleted successfully."
      );

      setOpenMenuId(null);

      if (
        attendance.length === 1 &&
        page > 1
      ) {
        setPage((previous) =>
          Math.max(previous - 1, 1)
        );
      } else {
        await fetchAttendance(page);
      }
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          "Unable to delete attendance"
        )
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleApplyFilters = () => {
    setPage(1);

    setAppliedFilters({
      ...filters,
      search: filters.search.trim(),
    });
  };

  const handleClearFilters = () => {
    const empty = {
      search: "",
      status: "",
      employeeId: "",
      date: "",
      fromDate: "",
      toDate: "",
      month: "",
    };

    setFilters(empty);
    setAppliedFilters(empty);
    setPage(1);
  };

  const hasActiveFilters = Object.values(
    appliedFilters
  ).some(Boolean);

  const handleRefresh = async () => {
    await Promise.all([
      fetchEmployees(),
      fetchAttendance(page),
    ]);
  };

  const handlePreviousPage = () => {
    if (
      pagination.hasPreviousPage ||
      page > 1
    ) {
      setPage((previous) =>
        Math.max(previous - 1, 1)
      );
    }
  };

  const handleNextPage = () => {
    if (
      pagination.hasNextPage ||
      page < pagination.totalPages
    ) {
      setPage((previous) => previous + 1);
    }
  };

  const exportAttendance = () => {
    if (!attendance.length) {
      setError(
        "There is no attendance data to export."
      );
      return;
    }

    const headers = [
      "Date",
      "Employee Code",
      "Employee Name",
      "Email",
      "Status",
      "Check In",
      "Check Out",
      "Work Hours",
      "Overtime",
      "Late",
      "Notes",
    ];

    const rows = attendance.map((record) => {
      const employee = record.employeeId;

      return [
        formatDate(record.date),
        getEmployeeCode(employee),
        getEmployeeName(employee),
        getEmployeeEmail(employee),
        getStatusLabel(record.status),
        formatTime(record.checkIn),
        formatTime(record.checkOut),
        formatMinutes(record.workMinutes),
        formatMinutes(
          record.overtimeMinutes
        ),
        formatMinutes(record.lateMinutes),
        record.notes || "",
      ];
    });

    const csv = [
      headers,
      ...rows,
    ]
      .map((row) =>
        row
          .map((value) => {
            const stringValue = String(
              value ?? ""
            );

            return `"${stringValue.replace(
              /"/g,
              '""'
            )}"`;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;
    link.download = `attendance-${getToday()}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  };

  return (
  <div className="min-h-screen w-full bg-[#070b11] text-slate-200">
    <div className="mx-auto w-full max-w-[1920px] px-3 py-4 sm:px-5 lg:px-7 xl:px-8">
      {/* =========================================================
          PAGE HEADER
      ========================================================= */}
      <div className="relative mb-6 overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#0d131d] shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
  <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0d131d] to-[#111827]" />

  <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-500/[0.06] blur-3xl" />

  <div className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-violet-500/[0.05] blur-3xl" />

        <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between lg:p-7">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-950 to-slate-700 text-white shadow-lg shadow-slate-900/15 sm:h-14 sm:w-14">
              <CalendarDays size={23} strokeWidth={2.2} />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
               <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl lg:text-[26px]">
  Attendance
</h1>
                <span className="rounded-full border border-white/[0.08] bg-white/[0.05] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  HR Management
                </span>
              </div>

              <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400 sm:text-sm">
                Manage employee attendance, working hours, daily status and
                attendance records from one place.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={exportAttendance}
              disabled={!attendance.length}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Export</span>
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white shadow-lg shadow-slate-900/15 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-xl"
            >
              <Plus size={17} strokeWidth={2.5} />
              <span>Mark Attendance</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================
          ALERTS
      ========================================================= */}
      {error && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-700 shadow-sm">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-100">
            <AlertCircle size={17} />
          </div>

          <span className="flex-1 pt-1 leading-5">{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
            className="rounded-lg p-1.5 text-red-500 transition hover:bg-red-100 hover:text-red-700"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm text-emerald-700 shadow-sm">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
            <CheckCircle2 size={17} />
          </div>

          <span className="flex-1 pt-1 leading-5">{success}</span>

          <button
            type="button"
            onClick={() => setSuccess("")}
            className="rounded-lg p-1.5 text-emerald-500 transition hover:bg-emerald-100 hover:text-emerald-700"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* =========================================================
          STAT CARDS
      ========================================================= */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <StatCard
          icon={<Users size={18} />}
          label="Total Records"
          value={stats.total}
          accent="dark"
        />

        <StatCard
          icon={<UserCheck size={18} />}
          label="Present"
          value={stats.present}
          accent="green"
        />

        <StatCard
          icon={<XCircle size={18} />}
          label="Absent"
          value={stats.absent}
          accent="red"
        />

        <StatCard
          icon={<Clock3 size={18} />}
          label="Late"
          value={stats.late}
          accent="amber"
        />

        <StatCard
          icon={<CalendarDays size={18} />}
          label="Leave"
          value={stats.leave}
          accent="blue"
        />
      </div>

      {/* =========================================================
          FILTER SECTION
      ========================================================= */}
      <div className="mb-5 overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_6px_24px_rgba(15,23,42,0.045)]">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white px-4 py-3.5 sm:px-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 text-white">
              <Search size={15} />
            </div>

            <div>
              <p className="text-sm font-bold text-slate-900">
                Attendance Records
              </p>

              <p className="text-[11px] text-slate-500">
                Search and filter employee attendance
              </p>
            </div>
          </div>
        </div>

        <div className="p-3.5 sm:p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            {/* Search */}
            <div className="relative min-w-0 flex-1">
              <Search
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={filters.search}
                onChange={(event) =>
                  setFilters((previous) => ({
                    ...previous,
                    search: event.target.value,
                  }))
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleApplyFilters();
                  }
                }}
                placeholder="Search employee, code, email..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
              />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:flex xl:w-auto">
              <select
                value={filters.employeeId}
                onChange={(event) =>
                  setFilters((previous) => ({
                    ...previous,
                    employeeId: event.target.value,
                  }))
                }
                className="h-11 min-w-0 rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100 sm:min-w-[200px]"
              >
                <option value="">All Employees</option>

                {employees.map((employee) => (
                  <option key={employee._id} value={employee._id}>
                    {getEmployeeName(employee)}{" "}
                    {getEmployeeCode(employee)
                      ? `(${getEmployeeCode(employee)})`
                      : ""}
                  </option>
                ))}
              </select>

              <select
                value={filters.status}
                onChange={(event) =>
                  setFilters((previous) => ({
                    ...previous,
                    status: event.target.value,
                  }))
                }
                className="h-11 min-w-0 rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100 sm:min-w-[150px]"
              >
                <option value="">All Status</option>

                {ATTENDANCE_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() =>
                  setShowFilters((previous) => !previous)
                }
                className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-all duration-200 ${
                  showFilters || hasActiveFilters
                    ? "border-slate-950 bg-slate-950 text-white shadow-md hover:bg-slate-800"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <Filter size={16} />

                Filters

                {hasActiveFilters && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-slate-950">
                    !
                  </span>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={handleApplyFilters}
              className="h-11 rounded-xl bg-slate-950 px-6 text-sm font-bold text-white shadow-md shadow-slate-900/10 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-lg xl:shrink-0"
            >
              Apply Filters
            </button>
          </div>

          {/* Advanced filters */}
          {showFilters && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Advanced Filters
                  </p>

                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Select one date mode at a time
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                  <X size={13} />
                  Clear
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <FilterInput
                  label="Exact Date"
                  type="date"
                  value={filters.date}
                  onChange={(value) =>
                    setFilters((previous) => ({
                      ...previous,
                      date: value,
                      fromDate: "",
                      toDate: "",
                      month: "",
                    }))
                  }
                />

                <FilterInput
                  label="Month"
                  type="month"
                  value={filters.month}
                  onChange={(value) =>
                    setFilters((previous) => ({
                      ...previous,
                      month: value,
                      date: "",
                      fromDate: "",
                      toDate: "",
                    }))
                  }
                />

                <FilterInput
                  label="From Date"
                  type="date"
                  value={filters.fromDate}
                  onChange={(value) =>
                    setFilters((previous) => ({
                      ...previous,
                      fromDate: value,
                      date: "",
                      month: "",
                    }))
                  }
                />

                <FilterInput
                  label="To Date"
                  type="date"
                  value={filters.toDate}
                  onChange={(value) =>
                    setFilters((previous) => ({
                      ...previous,
                      toDate: value,
                      date: "",
                      month: "",
                    }))
                  }
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================
          DESKTOP TABLE
      ========================================================= */}
      <div className="hidden overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_6px_24px_rgba(15,23,42,0.045)] md:block">
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white px-5 py-4">
          <div>
            <p className="text-sm font-bold text-slate-900">
              Attendance Overview
            </p>

            <p className="mt-0.5 text-[11px] text-slate-500">
              Employee attendance and working time
            </p>
          </div>

          <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-500">
            {pagination.total || 0} records
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Employee
                </th>

                <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Date
                </th>

                <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Check In
                </th>

                <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Check Out
                </th>

                <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Work Hours
                </th>

                <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Status
                </th>

                <th className="px-5 py-3.5 text-right text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <TableLoading />
              ) : attendance.length === 0 ? (
                <EmptyTable />
              ) : (
                attendance.map((record) => {
                  const employee = record.employeeId;

                  return (
                    <tr
                      key={record._id}
                      className="group transition-colors duration-150 hover:bg-slate-50/80"
                    >
                      {/* Employee */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                            {getInitials(
                              getEmployeeName(employee)
                            )}

                            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-900">
                              {getEmployeeName(employee)}
                            </p>

                            <p className="mt-0.5 truncate text-[11px] font-medium text-slate-400">
                              {getEmployeeCode(employee) ||
                                getEmployeeEmail(employee)}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-4">
                        <span className="text-sm font-semibold text-slate-700">
                          {formatDate(record.date)}
                        </span>
                      </td>

                      {/* Check In */}
                      <td className="px-4 py-4">
                        <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-2.5 py-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

                          <span className="text-xs font-semibold text-emerald-700">
                            {formatTime(record.checkIn)}
                          </span>
                        </div>
                      </td>

                      {/* Check Out */}
                      <td className="px-4 py-4">
                        <div className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-2.5 py-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />

                          <span className="text-xs font-semibold text-slate-700">
                            {formatTime(record.checkOut)}
                          </span>
                        </div>
                      </td>

                      {/* Work */}
                      <td className="px-4 py-4">
                        <div>
                          <p className="text-sm font-bold text-slate-800">
                            {formatMinutes(record.workMinutes)}
                          </p>

                          {Number(record.overtimeMinutes) > 0 && (
                            <p className="mt-0.5 text-[10px] font-semibold text-emerald-600">
                              +{formatMinutes(record.overtimeMinutes)} overtime
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        <StatusBadge status={record.status} />
                      </td>

                      {/* Actions */}
                      <td className="relative px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenMenuId(
                              openMenuId === record._id
                                ? null
                                : record._id
                            )
                          }
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-slate-400 transition-all hover:border-slate-200 hover:bg-white hover:text-slate-900 hover:shadow-sm"
                        >
                          <MoreHorizontal size={18} />
                        </button>

                        {openMenuId === record._id && (
                          <ActionMenu
                            onEdit={() => openEditModal(record)}
                            onDelete={() => handleDelete(record)}
                            deleting={deletingId === record._id}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================
          MOBILE CARDS
      ========================================================= */}
      <div className="space-y-3 md:hidden">
        {loading ? (
          <MobileLoading />
        ) : attendance.length === 0 ? (
          <div className="rounded-[22px] border border-slate-200 bg-white px-5 py-14 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <CalendarDays size={28} className="text-slate-400" />
            </div>

            <p className="mt-4 text-sm font-bold text-slate-800">
              No attendance found
            </p>

            <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-slate-500">
              Try changing your filters or mark a new attendance record.
            </p>
          </div>
        ) : (
          attendance.map((record) => {
            const employee = record.employeeId;

            return (
              <div
                key={record._id}
                className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_5px_20px_rgba(15,23,42,0.04)]"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                      {getInitials(getEmployeeName(employee))}

                      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {getEmployeeName(employee)}
                      </p>

                      <p className="mt-0.5 truncate text-[11px] font-medium text-slate-400">
                        {getEmployeeCode(employee) ||
                          getEmployeeEmail(employee)}
                      </p>
                    </div>
                  </div>

                  <StatusBadge status={record.status} />
                </div>

                {/* Card Body */}
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-2.5">
                    <InfoItem
                      label="Date"
                      value={formatDate(record.date)}
                      icon={<CalendarDays size={13} />}
                    />

                    <InfoItem
                      label="Work Hours"
                      value={formatMinutes(record.workMinutes)}
                      icon={<Clock3 size={13} />}
                    />

                    <InfoItem
                      label="Check In"
                      value={formatTime(record.checkIn)}
                      icon={<LogIn size={13} />}
                    />

                    <InfoItem
                      label="Check Out"
                      value={formatTime(record.checkOut)}
                      icon={<LogOut size={13} />}
                    />
                  </div>

                  {Number(record.overtimeMinutes) > 0 && (
                    <div className="mt-3 flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5">
                      <span className="text-[11px] font-semibold text-emerald-700">
                        Overtime
                      </span>

                      <span className="text-xs font-bold text-emerald-700">
                        +{formatMinutes(record.overtimeMinutes)}
                      </span>
                    </div>
                  )}

                  {record.notes && (
                    <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Notes
                      </p>

                      <p className="text-xs leading-5 text-slate-600">
                        {record.notes}
                      </p>
                    </div>
                  )}

                  {/* Mobile Actions */}
                  <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => openEditModal(record)}
                      className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                    >
                      <Edit3 size={14} />
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(record)}
                      disabled={deletingId === record._id}
                      className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                    >
                      {deletingId === record._id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}

                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* =========================================================
          PAGINATION
      ========================================================= */}
      <div className="mt-4 flex flex-col gap-3 rounded-[20px] border border-slate-200 bg-white px-4 py-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <p className="text-xs font-medium text-slate-500 sm:text-sm">
          {pagination.total > 0
            ? `Showing ${(page - 1) * limit + 1}–${Math.min(
                page * limit,
                pagination.total
              )} of ${pagination.total} records`
            : "No records"}
        </p>

        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <button
            type="button"
            onClick={handlePreviousPage}
            disabled={page <= 1 || loading}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={15} />
            <span>Previous</span>
          </button>

          <div className="flex h-9 min-w-[82px] items-center justify-center rounded-xl bg-slate-950 px-3 text-xs font-bold text-white">
            {page} / {Math.max(pagination.totalPages, 1)}
          </div>

          <button
            type="button"
            onClick={handleNextPage}
            disabled={
              loading || page >= pagination.totalPages
            }
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span>Next</span>
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>

    {/* =========================================================
        CREATE / EDIT MODAL
    ========================================================= */}
    {showModal && (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
        <div className="flex max-h-[94vh] w-full flex-col overflow-hidden rounded-t-[28px] border border-slate-200 bg-white shadow-[0_25px_80px_rgba(15,23,42,0.28)] sm:max-w-2xl sm:rounded-[24px]">
          {/* Modal Header */}
          <div className="relative shrink-0 overflow-hidden border-b border-slate-100">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white" />

            <div className="relative flex items-center justify-between px-5 py-4 sm:px-6 sm:py-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white shadow-md">
                  {editingId ? (
                    <Edit3 size={17} />
                  ) : (
                    <CalendarDays size={17} />
                  )}
                </div>

                <div className="min-w-0">
                  <h2 className="truncate text-base font-bold text-slate-950 sm:text-lg">
                    {editingId
                      ? "Edit Attendance"
                      : "Mark Attendance"}
                  </h2>

                  <p className="mt-0.5 truncate text-[11px] text-slate-500 sm:text-xs">
                    {editingId
                      ? "Update the employee attendance record."
                      : "Create a daily attendance record for an employee."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Modal Form */}
          <form
            onSubmit={handleSubmit}
            className="overflow-y-auto"
          >
            <div className="space-y-5 p-5 sm:p-6">
              {/* Employee */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  Employee
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <select
                  name="employeeId"
                  value={form.employeeId}
                  onChange={handleFormChange}
                  disabled={employeesLoading || submitting}
                  className="form-input"
                >
                  <option value="">
                    {employeesLoading
                      ? "Loading employees..."
                      : "Select employee"}
                  </option>

                  {employees.map((employee) => (
                    <option
                      key={employee._id}
                      value={employee._id}
                    >
                      {getEmployeeName(employee)}
                      {getEmployeeCode(employee)
                        ? ` — ${getEmployeeCode(employee)}`
                        : ""}
                    </option>
                  ))}
                </select>

                {selectedEmployee && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                    {getEmployeeEmail(selectedEmployee) && (
                      <span>
                        {getEmployeeEmail(selectedEmployee)}
                      </span>
                    )}

                    {selectedEmployee?.branchId?.name && (
                      <>
                        <span className="text-slate-300">•</span>

                        <span>
                          {selectedEmployee.branchId.name}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Date + Status */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  label="Attendance Date"
                  required
                >
                  <input
                    type="date"
                    name="date"
                    value={form.date}
                    onChange={handleFormChange}
                    disabled={submitting}
                    className="form-input"
                  />
                </FormField>

                <FormField
                  label="Status"
                  required
                >
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleFormChange}
                    disabled={submitting}
                    className="form-input"
                  >
                    {ATTENDANCE_STATUSES.map((status) => (
                      <option
                        key={status.value}
                        value={status.value}
                      >
                        {status.label}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              {/* Working Time */}
              <div>
                <div className="mb-2.5 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <Clock3 size={14} />
                  </div>

                  <p className="text-xs font-bold text-slate-700">
                    Working Time
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField label="Check In">
                    <input
                      type="datetime-local"
                      name="checkIn"
                      value={form.checkIn}
                      onChange={handleFormChange}
                      disabled={submitting}
                      className="form-input"
                    />
                  </FormField>

                  <FormField label="Check Out">
                    <input
                      type="datetime-local"
                      name="checkOut"
                      value={form.checkOut}
                      onChange={handleFormChange}
                      disabled={submitting}
                      className="form-input"
                    />
                  </FormField>
                </div>
              </div>

              {/* Notes */}
              <FormField label="Notes">
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleFormChange}
                  disabled={submitting}
                  rows={4}
                  maxLength={1000}
                  placeholder="Optional attendance notes..."
                  className="form-input min-h-[110px] resize-y py-3"
                />

                <p className="mt-1 text-right text-[10px] font-medium text-slate-400">
                  {form.notes.length}/1000
                </p>
              </FormField>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting || employeesLoading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 text-sm font-bold text-white shadow-lg shadow-slate-900/15 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check size={16} />

                    {editingId
                      ? "Update Attendance"
                      : "Save Attendance"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* =========================================================
        LOCAL FORM STYLES
    ========================================================= */}
    <style>{`
      .form-input {
        height: 2.75rem;
        width: 100%;
        border-radius: 0.75rem;
        border: 1px solid rgb(226 232 240);
        background: rgb(255 255 255);
        padding-left: 0.75rem;
        padding-right: 0.75rem;
        font-size: 0.875rem;
        font-weight: 500;
        color: rgb(30 41 59);
        outline: none;
        transition:
          border-color 150ms ease,
          box-shadow 150ms ease,
          background-color 150ms ease;
      }

      .form-input::placeholder {
        color: rgb(148 163 184);
      }

      .form-input:focus {
        border-color: rgb(100 116 139);
        background: white;
        box-shadow: 0 0 0 4px rgb(241 245 249);
      }

      .form-input:disabled {
        background: rgb(248 250 252);
        cursor: not-allowed;
        color: rgb(148 163 184);
      }

      textarea.form-input {
        height: auto;
      }

      select.form-input {
        cursor: pointer;
      }

      @media (max-width: 639px) {
        .form-input {
          height: 2.75rem;
        }
      }
    `} </style>
  </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent = "dark",
}) {
  const accents = {
    dark: {
      wrapper:
        "bg-gradient-to-br from-[#111827] via-[#0d131d] to-[#090d14] border-white/[0.08]",
      icon:
        "bg-white/[0.07] text-white border-white/[0.08]",
      label: "text-slate-500",
      value: "text-white",
      glow: "bg-white/[0.04]",
    },

    green: {
      wrapper:
        "bg-gradient-to-br from-[#0d1715] via-[#0d131d] to-[#090d14] border-emerald-500/[0.10]",
      icon:
        "bg-emerald-500/10 text-emerald-400 border-emerald-500/10",
      label: "text-slate-500",
      value: "text-white",
      glow: "bg-emerald-500/[0.06]",
    },

    red: {
      wrapper:
        "bg-gradient-to-br from-[#171112] via-[#0d131d] to-[#090d14] border-red-500/[0.10]",
      icon:
        "bg-red-500/10 text-red-400 border-red-500/10",
      label: "text-slate-500",
      value: "text-white",
      glow: "bg-red-500/[0.06]",
    },

    amber: {
      wrapper:
        "bg-gradient-to-br from-[#17150d] via-[#0d131d] to-[#090d14] border-amber-500/[0.10]",
      icon:
        "bg-amber-500/10 text-amber-400 border-amber-500/10",
      label: "text-slate-500",
      value: "text-white",
      glow: "bg-amber-500/[0.06]",
    },

    blue: {
      wrapper:
        "bg-gradient-to-br from-[#0d141b] via-[#0d131d] to-[#090d14] border-blue-500/[0.10]",
      icon:
        "bg-blue-500/10 text-blue-400 border-blue-500/10",
      label: "text-slate-500",
      value: "text-white",
      glow: "bg-blue-500/[0.06]",
    },
  };

  const theme = accents[accent] || accents.dark;

  return (
    <div
      className={`group relative overflow-hidden rounded-[20px] border p-4 shadow-[0_10px_35px_rgba(0,0,0,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:border-white/[0.14] hover:shadow-[0_16px_45px_rgba(0,0,0,0.32)] sm:p-5 ${theme.wrapper}`}
    >
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${theme.icon}`}
        >
          {icon}
        </div>

        <span
          className={`text-2xl font-extrabold tracking-tight ${theme.value}`}
        >
          {value}
        </span>
      </div>

      <p
        className={`relative z-10 mt-3 text-[10px] font-bold uppercase tracking-[0.14em] ${theme.label}`}
      >
        {label}
      </p>

      <div
        className={`pointer-events-none absolute -bottom-10 -right-10 h-24 w-24 rounded-full blur-3xl ${theme.glow}`}
      />

      <div className="pointer-events-none absolute inset-x-5 bottom-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
    </div>
  );
}

function FormField({
  label,
  required = false,
  children,
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-slate-300">
        {label}

        {required && (
          <span className="ml-1 text-red-400">*</span>
        )}
      </label>

      {children}
    </div>
  );
}

function FilterInput({
  label,
  type,
  value,
  onChange,
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#080d14] px-3 text-sm font-medium text-slate-200 outline-none transition placeholder:text-slate-600 hover:border-white/[0.12] focus:border-slate-500 focus:ring-4 focus:ring-slate-700/30"
      />
    </div>
  );
}

function StatusBadge({ status }) {
  const statusStyles = {
    PRESENT:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
    ABSENT:
      "border-red-500/20 bg-red-500/10 text-red-400",
    LATE:
      "border-amber-500/20 bg-amber-500/10 text-amber-400",
    LEAVE:
      "border-blue-500/20 bg-blue-500/10 text-blue-400",
    HALF_DAY:
      "border-violet-500/20 bg-violet-500/10 text-violet-400",
    WORK_FROM_HOME:
      "border-cyan-500/20 bg-cyan-500/10 text-cyan-400",
  };

  const style =
    statusStyles[String(status).toUpperCase()] ||
    "border-white/[0.08] bg-white/[0.04] text-slate-400";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${style}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />

      {getStatusLabel(status)}
    </span>
  );
}

function InfoItem({
  label,
  value,
  icon,
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 transition-colors hover:bg-white/[0.04]">
      <div className="flex items-center gap-1.5 text-slate-500">
        {icon}

        <p className="text-[9px] font-bold uppercase tracking-[0.12em]">
          {label}
        </p>
      </div>

      <p className="mt-1.5 truncate text-xs font-bold text-slate-300">
        {value}
      </p>
    </div>
  );
}

function ActionMenu({
  onEdit,
  onDelete,
  deleting,
}) {
  return (
    <div className="absolute right-5 top-14 z-30 w-40 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111821] p-1.5 text-left shadow-[0_20px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl">
      <button
        type="button"
        onClick={onEdit}
        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.05]">
          <Edit3 size={14} />
        </span>

        Edit
      </button>

      <button
        type="button"
        onClick={onDelete}
        disabled={deleting}
        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold text-red-400 transition hover:bg-red-500/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-red-500/10 bg-red-500/[0.08]">
          {deleting ? (
            <Loader2
              size={14}
              className="animate-spin"
            />
          ) : (
            <Trash2 size={14} />
          )}
        </span>

        Delete
      </button>
    </div>
  );
}

function TableLoading() {
  return (
    <tr>
      <td
        colSpan={7}
        className="px-4 py-20 text-center"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
          <Loader2
            size={24}
            className="animate-spin text-slate-500"
          />
        </div>

        <p className="mt-3 text-sm font-semibold text-slate-500">
          Loading attendance...
        </p>
      </td>
    </tr>
  );
}

function EmptyTable() {
  return (
    <tr>
      <td
        colSpan={7}
        className="px-4 py-20 text-center"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
          <CalendarDays
            size={30}
            className="text-slate-600"
          />
        </div>

        <p className="mt-4 text-sm font-bold text-slate-300">
          No attendance records found
        </p>

        <p className="mt-1 text-xs text-slate-500">
          Change your filters or mark a new attendance record.
        </p>
      </td>
    </tr>
  );
}

function MobileLoading() {
  return (
    <div className="rounded-[22px] border border-white/[0.08] bg-[#0d131d] px-5 py-14 text-center shadow-[0_10px_35px_rgba(0,0,0,0.25)]">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
        <Loader2
          size={24}
          className="animate-spin text-slate-500"
        />
      </div>

      <p className="mt-3 text-sm font-semibold text-slate-500">
        Loading attendance...
      </p>
    </div>
  );
}