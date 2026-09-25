import api from "../../services/api";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CalendarDays,
  Plus,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  Eye,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Repeat2,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  Save,
  AlertTriangle,
  Building2,
  Globe2,
  Sparkles,
  LockKeyhole,
  CalendarCheck2,
  Clock3,
  SlidersHorizontal,
  RotateCcw,
  Loader2,
  FileText,
  CalendarRange,
  Power,
  ChevronDown,
  Info,
} from "lucide-react";

// ======================================================
// API CONFIG
// ======================================================

// Supports:
// VITE_API_URL=http://localhost:5000
// VITE_API_URL=http://localhost:5000/api
//
// Also works with production API URLs.
const RAW_API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

const API_BASE_URL = RAW_API_BASE_URL.replace(/\/+$/, "");

const HOLIDAYS_API_URL = API_BASE_URL.endsWith("/api")
  ? `${API_BASE_URL}/holidays`
  : `${API_BASE_URL}/api/holidays`;

// ======================================================
// CONSTANTS
// ======================================================

const HOLIDAY_TYPES = [
  {
    value: "PUBLIC",
    label: "Public",
    icon: Globe2,
  },
  {
    value: "COMPANY",
    label: "Company",
    icon: Building2,
  },
  {
    value: "OPTIONAL",
    label: "Optional",
    icon: Sparkles,
  },
  {
    value: "RESTRICTED",
    label: "Restricted",
    icon: LockKeyhole,
  },
];

const DEFAULT_FORM = {
  name: "",
  date: "",
  description: "",
  holidayType: "COMPANY",
  isRecurring: false,
  recurringMonth: "",
  recurringDay: "",
  isActive: true,
};

// ======================================================
// AUTH HELPERS
// ======================================================

const getToken = () => {
  const directToken =
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken");

  if (directToken) {
    return directToken;
  }

  try {
    const storedUser =
      localStorage.getItem("user");

    if (storedUser) {
      const parsedUser =
        JSON.parse(storedUser);

      return (
        parsedUser?.token ||
        parsedUser?.accessToken ||
        parsedUser?.authToken ||
        ""
      );
    }
  } catch (error) {
    console.warn(
      "Unable to parse stored user:",
      error
    );
  }

  return "";
};

const getAuthHeaders = () => {
  const token = getToken();

  return {
    "Content-Type": "application/json",
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };
};

// ======================================================
// HELPERS
// ======================================================

const getErrorMessage = async (response) => {
  try {
    const data = await response.json();

    return (
      data?.message ||
      "Something went wrong. Please try again."
    );
  } catch {
    return "Something went wrong. Please try again.";
  }
};

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const rawValue = String(value);

  // Prevent timezone shifting for YYYY-MM-DD values.
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
    const [year, month, day] =
      rawValue.split("-").map(Number);

    const localDate = new Date(
      year,
      month - 1,
      day
    );

    return new Intl.DateTimeFormat(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    ).format(localDate);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(date);
};

const formatDateInput = (value) => {
  if (!value) {
    return "";
  }

  const rawValue = String(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
    return rawValue;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getTypeMeta = (type) => {
  return (
    HOLIDAY_TYPES.find(
      (item) => item.value === type
    ) || HOLIDAY_TYPES[1]
  );
};

const getMonthName = (month) => {
  if (!month) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      month: "long",
    }
  ).format(
    new Date(
      2024,
      Number(month) - 1,
      1
    )
  );
};

const getInitials = (name = "") => {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) {
    return "HR";
  }

  if (words.length === 1) {
    return words[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return `${words[0][0]}${words[1][0]}`.toUpperCase();
};

const getHolidayTimestamp = (holiday) => {
  if (!holiday?.date) {
    return 0;
  }

  const input = formatDateInput(
    holiday.date
  );

  if (!input) {
    return 0;
  }

  const [year, month, day] =
    input.split("-").map(Number);

  return new Date(
    year,
    month - 1,
    day
  ).getTime();
};

// ======================================================
// COMPONENT
// ======================================================

const Holidays = () => {
  // ====================================================
  // DATA
  // ====================================================

  const [holidays, setHolidays] = useState([]);

  // ====================================================
  // UI STATE
  // ====================================================

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [actionId, setActionId] =
    useState(null);

  const [error, setError] =
    useState("");

  const [toast, setToast] = useState({
    visible: false,
    type: "success",
    message: "",
  });

  // ====================================================
  // FILTERS
  // ====================================================

  const currentYear =
    new Date().getFullYear();

  const [search, setSearch] =
    useState("");

  const [year, setYear] =
    useState(String(currentYear));

  const [holidayType, setHolidayType] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [showFilters, setShowFilters] =
    useState(false);

  // ====================================================
  // PAGINATION
  // ====================================================

  const limit = 10;

  const [page, setPage] =
    useState(1);

  const [pagination, setPagination] =
    useState({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    });

  // ====================================================
  // MODALS
  // ====================================================

  const [showForm, setShowForm] =
    useState(false);

  const [showDetails, setShowDetails] =
    useState(false);

  const [showDelete, setShowDelete] =
    useState(false);

  const [editingHoliday, setEditingHoliday] =
    useState(null);

  const [selectedHoliday, setSelectedHoliday] =
    useState(null);

  const [form, setForm] =
    useState(DEFAULT_FORM);

  // ====================================================
  // TOAST
  // ====================================================

  const showToast = useCallback(
    (message, type = "success") => {
      setToast({
        visible: true,
        type,
        message,
      });

      window.setTimeout(() => {
        setToast((current) => ({
          ...current,
          visible: false,
        }));
      }, 3200);
    },
    []
  );

  // ====================================================
  // FETCH HOLIDAYS
  // ====================================================

  const fetchHolidays = useCallback(
    async ({
      silent = false,
      requestedPage = 1,
    } = {}) => {
      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const params =
          new URLSearchParams();

        if (year) {
          params.set("year", year);
        }

        if (holidayType) {
          params.set(
            "holidayType",
            holidayType
          );
        }

        if (statusFilter !== "all") {
          params.set(
            "isActive",
            statusFilter === "active"
              ? "true"
              : "false"
          );
        }

        if (search.trim()) {
          params.set(
            "search",
            search.trim()
          );
        }

        params.set(
          "page",
          String(requestedPage)
        );

        params.set(
          "limit",
          String(limit)
        );

        const response = await api.get(
          "/holidays",
          { params }
        );

        const result = response.data;

        const list = Array.isArray(
          result?.data
        )
          ? result.data
          : [];

        setHolidays(list);

        setPagination(
          result?.pagination || {
            page: requestedPage,
            limit,
            total: list.length,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage:
              requestedPage > 1,
          }
        );

        setPage(requestedPage);
      } catch (err) {
        console.error(
          "Fetch holidays error:",
          err
        );

        setError(
          err.response?.data?.message ||
            err?.message ||
            "Failed to load holidays."
        );

        if (!silent) {
          setHolidays([]);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      year,
      holidayType,
      statusFilter,
      search,
    ]
  );

  // ====================================================
  // FILTER EFFECT
  // ====================================================

  useEffect(() => {
    const timer =
      window.setTimeout(() => {
        fetchHolidays({
          requestedPage: 1,
        });
      }, 350);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    year,
    holidayType,
    statusFilter,
    search,
    fetchHolidays,
  ]);

  // ====================================================
  // STATS
  // ====================================================

  const stats = useMemo(() => {
    const total =
      pagination?.total ??
      holidays.length;

    const active =
      holidays.filter(
        (holiday) =>
          holiday.isActive !== false
      ).length;

    const inactive =
      holidays.filter(
        (holiday) =>
          holiday.isActive === false
      ).length;

    const recurring =
      holidays.filter(
        (holiday) =>
          Boolean(
            holiday.isRecurring
          )
      ).length;

    return {
      total,
      active,
      inactive,
      recurring,
    };
  }, [
    holidays,
    pagination,
  ]);

  // ====================================================
  // UPCOMING HOLIDAY
  // ====================================================

  const upcomingHoliday = useMemo(() => {
    const now = new Date();

    const upcoming = holidays
      .filter(
        (holiday) =>
          holiday.isActive !== false
      )
      .map((holiday) => ({
        holiday,
        timestamp:
          getHolidayTimestamp(
            holiday
          ),
      }))
      .filter(
        ({ timestamp }) =>
          timestamp >=
          new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          ).getTime()
      )
      .sort(
        (a, b) =>
          a.timestamp - b.timestamp
      );

    return upcoming[0]?.holiday || null;
  }, [holidays]);

  // ====================================================
  // FORM
  // ====================================================

  const resetForm = () => {
    setForm({
      ...DEFAULT_FORM,
    });

    setEditingHoliday(null);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (holiday) => {
    setEditingHoliday(holiday);

    setForm({
      name: holiday.name || "",

      date: formatDateInput(
        holiday.date
      ),

      description:
        holiday.description || "",

      holidayType:
        holiday.holidayType ||
        "COMPANY",

      isRecurring:
        Boolean(
          holiday.isRecurring
        ),

      recurringMonth:
        holiday.recurringMonth
          ? String(
              holiday.recurringMonth
            )
          : "",

      recurringDay:
        holiday.recurringDay
          ? String(
              holiday.recurringDay
            )
          : "",

      isActive:
        holiday.isActive !== false,
    });

    setShowForm(true);
  };

  const openDetails = (holiday) => {
    setSelectedHoliday(holiday);
    setShowDetails(true);
  };

  const openDelete = (holiday) => {
    setSelectedHoliday(holiday);
    setShowDelete(true);
  };

  const handleFormChange = (
    field,
    value
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  // ====================================================
  // VALIDATE
  // ====================================================

  const validateForm = () => {
    if (!form.name.trim()) {
      showToast(
        "Holiday name is required.",
        "error"
      );

      return false;
    }

    if (!form.date) {
      showToast(
        "Holiday date is required.",
        "error"
      );

      return false;
    }

    if (
      form.isRecurring &&
      form.recurringMonth
    ) {
      const month = Number(
        form.recurringMonth
      );

      if (
        !Number.isInteger(month) ||
        month < 1 ||
        month > 12
      ) {
        showToast(
          "Recurring month must be between 1 and 12.",
          "error"
        );

        return false;
      }
    }

    if (
      form.isRecurring &&
      form.recurringDay
    ) {
      const day = Number(
        form.recurringDay
      );

      if (
        !Number.isInteger(day) ||
        day < 1 ||
        day > 31
      ) {
        showToast(
          "Recurring day must be between 1 and 31.",
          "error"
        );

        return false;
      }
    }

    return true;
  };

  // ====================================================
  // CREATE / UPDATE
  // ====================================================

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);

      const token = getToken();

      if (!token) {
        throw new Error(
          "Authentication token is missing. Please login again."
        );
      }

      const payload = {
        name: form.name.trim(),

        date: form.date,

        description:
          form.description.trim(),

        holidayType:
          form.holidayType,

        isRecurring:
          Boolean(form.isRecurring),

        recurringMonth:
          form.isRecurring &&
          form.recurringMonth
            ? Number(
                form.recurringMonth
              )
            : null,

        recurringDay:
          form.isRecurring &&
          form.recurringDay
            ? Number(
                form.recurringDay
              )
            : null,

        isActive:
          Boolean(form.isActive),
      };

      const isEditing =
        Boolean(editingHoliday);

      const response = isEditing
        ? await api.put(
            `/holidays/${editingHoliday._id}`,
            payload
          )
        : await api.post(
            "/holidays",
            payload
          );

      const result = response.data;

      showToast(
        result?.message ||
          (isEditing
            ? "Holiday updated successfully."
            : "Holiday created successfully.")
      );

      setShowForm(false);

      resetForm();

      await fetchHolidays({
        silent: true,
        requestedPage: page,
      });
    } catch (err) {
      console.error(
        "Save holiday error:",
        err
      );

      showToast(
        err.response?.data?.message ||
          err?.message ||
          "Failed to save holiday.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  // ====================================================
  // TOGGLE STATUS
  // ====================================================

  const handleToggleStatus = async (
    holiday
  ) => {
    try {
      setActionId(holiday._id);

      const response =
        await api.patch(
          `/holidays/${holiday._id}/status`
        );

      const result = response.data;

      showToast(
        result?.message ||
          "Holiday status updated."
      );

      await fetchHolidays({
        silent: true,
        requestedPage: page,
      });
    } catch (err) {
      console.error(
        "Toggle holiday status error:",
        err
      );

      showToast(
        err.response?.data?.message ||
          err?.message ||
          "Failed to update holiday status.",
        "error"
      );
    } finally {
      setActionId(null);
    }
  };

  // ====================================================
  // DELETE
  // ====================================================

  const handleDelete = async () => {
    if (!selectedHoliday?._id) {
      return;
    }

    try {
      setActionId(
        selectedHoliday._id
      );

      const response =
        await api.delete(
          `/holidays/${selectedHoliday._id}`
        );

      const result = response.data;

      showToast(
        result?.message ||
          "Holiday deleted successfully."
      );

      setShowDelete(false);

      setSelectedHoliday(null);

      const nextPage =
        holidays.length === 1 &&
        page > 1
          ? page - 1
          : page;

      await fetchHolidays({
        silent: true,
        requestedPage: nextPage,
      });
    } catch (err) {
      console.error(
        "Delete holiday error:",
        err
      );

      showToast(
        err.response?.data?.message ||
          err?.message ||
          "Failed to delete holiday.",
        "error"
      );
    } finally {
      setActionId(null);
    }
  };

  // ====================================================
  // FILTER RESET
  // ====================================================

  const resetFilters = () => {
    setSearch("");
    setYear(String(currentYear));
    setHolidayType("");
    setStatusFilter("all");
    setPage(1);
  };

  const hasActiveFilters =
    Boolean(search.trim()) ||
    Boolean(holidayType) ||
    statusFilter !== "all" ||
    year !== String(currentYear);

  // ====================================================
  // PAGINATION
  // ====================================================

  const goPrevious = () => {
    if (
      pagination.hasPreviousPage
    ) {
      fetchHolidays({
        requestedPage: page - 1,
      });
    }
  };

  const goNext = () => {
    if (pagination.hasNextPage) {
      fetchHolidays({
        requestedPage: page + 1,
      });
    }
  };

  // ====================================================
  // YEAR OPTIONS
  // ====================================================

  const yearOptions = useMemo(() => {
    const years = [];

    for (
      let index = currentYear - 2;
      index <= currentYear + 3;
      index += 1
    ) {
      years.push(index);
    }

    return years;
  }, [currentYear]);

  // ====================================================
  // KEYBOARD
  // ====================================================

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key !== "Escape") {
        return;
      }

      setShowForm(false);
      setShowDetails(false);
      setShowDelete(false);
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, []);

  // ====================================================
  // STYLES
  // ====================================================

  const inputClass =
    "w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-cyan-400/10";

  const selectClass =
    "w-full appearance-none rounded-xl border border-white/[0.08] bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10";

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#06080d] text-white">
      {/* ==================================================
          BACKGROUND
      ================================================== */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-cyan-500/[0.06] blur-3xl" />

        <div className="absolute -right-32 top-1/4 h-96 w-96 rounded-full bg-violet-500/[0.05] blur-3xl" />

        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-blue-500/[0.04] blur-3xl" />

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize:
              "42px 42px",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1800px] px-3 py-4 sm:px-5 md:px-6 lg:px-8 lg:py-6">
        {/* ==================================================
            HEADER
        ================================================== */}

        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.08] shadow-lg shadow-cyan-950/20">
              <CalendarDays
                size={23}
                className="text-cyan-300"
              />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-xl font-bold tracking-tight text-white sm:text-2xl">
                  Holidays
                </h1>

                <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  HR
                </span>
              </div>

              <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                Manage company holidays,
                public holidays and
                recurring schedules.
              </p>
            </div>
          </div>

          <div className="flex w-full gap-2 sm:w-auto">
            <button
              type="button"
              onClick={() =>
                fetchHolidays({
                  silent: true,
                  requestedPage: page,
                })
              }
              disabled={refreshing}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 text-sm font-medium text-slate-300 transition hover:border-white/[0.14] hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
            >
              <RefreshCw
                size={16}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              <span className="hidden sm:inline">
                Refresh
              </span>
            </button>

            <button
              type="button"
              onClick={openCreate}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-950/30 transition hover:bg-cyan-300 sm:flex-none"
            >
              <Plus size={17} />
              Add Holiday
            </button>
          </div>
        </div>

        {/* ==================================================
            STATS
        ================================================== */}

        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={CalendarDays}
            label="Total Holidays"
            value={stats.total}
            accent="cyan"
          />

          <StatCard
            icon={CheckCircle2}
            label="Active"
            value={stats.active}
            accent="emerald"
          />

          <StatCard
            icon={XCircle}
            label="Inactive"
            value={stats.inactive}
            accent="rose"
          />

          <StatCard
            icon={Repeat2}
            label="Recurring"
            value={stats.recurring}
            accent="violet"
          />
        </div>

        {/* ==================================================
            UPCOMING
        ================================================== */}

        {upcomingHoliday && (
          <div className="mb-5 overflow-hidden rounded-2xl border border-cyan-400/10 bg-gradient-to-r from-cyan-400/[0.07] via-white/[0.025] to-violet-400/[0.05]">
            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10">
                  <CalendarCheck2
                    size={20}
                    className="text-cyan-300"
                  />
                </div>

                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300/70">
                    Upcoming Holiday
                  </p>

                  <p className="mt-1 truncate text-sm font-bold text-white sm:text-base">
                    {upcomingHoliday.name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pl-14 sm:pl-0">
                <Clock3
                  size={15}
                  className="text-slate-500"
                />

                <span className="text-xs font-medium text-slate-400">
                  {formatDate(
                    upcomingHoliday.date
                  )}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================
            MAIN PANEL
        ================================================== */}

        <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] shadow-2xl shadow-black/20 backdrop-blur-xl">
          {/* ==================================================
              FILTER BAR
          ================================================== */}

          <div className="border-b border-white/[0.06] p-3 sm:p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              {/* SEARCH */}

              <div className="relative min-w-0 flex-1">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(event) => {
                    setSearch(
                      event.target.value
                    );
                    setPage(1);
                  }}
                  placeholder="Search holidays..."
                  className={`${inputClass} pl-10`}
                />

                {search && (
                  <button
                    type="button"
                    onClick={() =>
                      setSearch("")
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-white"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* DESKTOP FILTERS */}

              <div className="hidden gap-2 md:flex">
                <div className="relative">
                  <select
                    value={year}
                    onChange={(event) => {
                      setYear(
                        event.target.value
                      );
                      setPage(1);
                    }}
                    className="h-11 min-w-[120px] rounded-xl border border-white/[0.08] bg-slate-950 px-3 pr-8 text-sm text-slate-300 outline-none focus:border-cyan-400/50"
                  >
                    <option value="">
                      All Years
                    </option>

                    {yearOptions.map(
                      (item) => (
                        <option
                          key={item}
                          value={item}
                        >
                          {item}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="relative">
                  <select
                    value={holidayType}
                    onChange={(event) => {
                      setHolidayType(
                        event.target.value
                      );
                      setPage(1);
                    }}
                    className="h-11 min-w-[140px] rounded-xl border border-white/[0.08] bg-slate-950 px-3 pr-8 text-sm text-slate-300 outline-none focus:border-cyan-400/50"
                  >
                    <option value="">
                      All Types
                    </option>

                    {HOLIDAY_TYPES.map(
                      (item) => (
                        <option
                          key={item.value}
                          value={item.value}
                        >
                          {item.label}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(event) => {
                      setStatusFilter(
                        event.target.value
                      );
                      setPage(1);
                    }}
                    className="h-11 min-w-[130px] rounded-xl border border-white/[0.08] bg-slate-950 px-3 pr-8 text-sm text-slate-300 outline-none focus:border-cyan-400/50"
                  >
                    <option value="all">
                      All Status
                    </option>

                    <option value="active">
                      Active
                    </option>

                    <option value="inactive">
                      Inactive
                    </option>
                  </select>
                </div>
              </div>

              {/* MOBILE FILTER BUTTON */}

              <button
                type="button"
                onClick={() =>
                  setShowFilters(
                    (current) => !current
                  )
                }
                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 text-sm font-medium text-slate-300 md:hidden"
              >
                <SlidersHorizontal
                  size={16}
                />

                Filters

                {hasActiveFilters && (
                  <span className="h-2 w-2 rounded-full bg-cyan-400" />
                )}
              </button>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="hidden h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-xs font-medium text-slate-400 transition hover:bg-white/[0.06] hover:text-white sm:flex"
                >
                  <RotateCcw size={14} />
                  Reset
                </button>
              )}
            </div>

            {/* MOBILE FILTER PANEL */}

            {showFilters && (
              <div className="mt-3 grid grid-cols-1 gap-3 border-t border-white/[0.06] pt-3 sm:grid-cols-3 md:hidden">
                <select
                  value={year}
                  onChange={(event) => {
                    setYear(
                      event.target.value
                    );
                    setPage(1);
                  }}
                  className={selectClass}
                >
                  <option value="">
                    All Years
                  </option>

                  {yearOptions.map(
                    (item) => (
                      <option
                        key={item}
                        value={item}
                      >
                        {item}
                      </option>
                    )
                  )}
                </select>

                <select
                  value={holidayType}
                  onChange={(event) => {
                    setHolidayType(
                      event.target.value
                    );
                    setPage(1);
                  }}
                  className={selectClass}
                >
                  <option value="">
                    All Types
                  </option>

                  {HOLIDAY_TYPES.map(
                    (item) => (
                      <option
                        key={item.value}
                        value={item.value}
                      >
                        {item.label}
                      </option>
                    )
                  )}
                </select>

                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(
                      event.target.value
                    );
                    setPage(1);
                  }}
                  className={selectClass}
                >
                  <option value="all">
                    All Status
                  </option>

                  <option value="active">
                    Active
                  </option>

                  <option value="inactive">
                    Inactive
                  </option>
                </select>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-slate-300"
                  >
                    <RotateCcw
                      size={14}
                    />
                    Reset Filters
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ==================================================
              ERROR
          ================================================== */}

          {error && (
            <div className="m-3 flex flex-col gap-3 rounded-xl border border-rose-400/15 bg-rose-400/[0.05] p-4 sm:m-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <AlertTriangle
                  size={18}
                  className="mt-0.5 shrink-0 text-rose-300"
                />

                <div>
                  <p className="text-sm font-semibold text-rose-200">
                    Unable to load holidays
                  </p>

                  <p className="mt-1 text-xs leading-5 text-rose-200/60">
                    {error}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  fetchHolidays({
                    requestedPage: page,
                  })
                }
                className="flex shrink-0 items-center justify-center gap-2 rounded-lg border border-rose-300/10 bg-rose-300/[0.06] px-3 py-2 text-xs font-semibold text-rose-200"
              >
                <RefreshCw size={14} />
                Retry
              </button>
            </div>
          )}

          {/* ==================================================
              DESKTOP TABLE
          ================================================== */}

          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[1050px]">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.015]">
                  <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    Holiday
                  </th>

                  <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    Date
                  </th>

                  <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    Type
                  </th>

                  <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    Recurring
                  </th>

                  <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    Status
                  </th>

                  <th className="px-5 py-4 text-right text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <TableSkeleton />
                ) : holidays.length ? (
                  holidays.map(
                    (holiday) => (
                      <HolidayTableRow
                        key={holiday._id}
                        holiday={holiday}
                        actionId={actionId}
                        onView={
                          openDetails
                        }
                        onEdit={
                          openEdit
                        }
                        onDelete={
                          openDelete
                        }
                        onToggle={
                          handleToggleStatus
                        }
                      />
                    )
                  )
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-20 text-center"
                    >
                      <EmptyState
                        hasFilters={
                          hasActiveFilters
                        }
                        onCreate={
                          openCreate
                        }
                        onReset={
                          resetFilters
                        }
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ==================================================
              MOBILE / TABLET CARDS
          ================================================== */}

          <div className="p-3 lg:hidden">
            {loading ? (
              <MobileSkeleton />
            ) : holidays.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {holidays.map(
                  (holiday) => (
                    <HolidayMobileCard
                      key={holiday._id}
                      holiday={holiday}
                      actionId={actionId}
                      onView={
                        openDetails
                      }
                      onEdit={
                        openEdit
                      }
                      onDelete={
                        openDelete
                      }
                      onToggle={
                        handleToggleStatus
                      }
                    />
                  )
                )}
              </div>
            ) : (
              <div className="px-4 py-16 text-center">
                <EmptyState
                  hasFilters={
                    hasActiveFilters
                  }
                  onCreate={
                    openCreate
                  }
                  onReset={
                    resetFilters
                  }
                />
              </div>
            )}
          </div>

          {/* ==================================================
              PAGINATION
          ================================================== */}

          {!loading &&
            holidays.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-white/[0.06] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">
                  Showing{" "}
                  <span className="font-semibold text-slate-300">
                    {holidays.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-300">
                    {pagination.total ||
                      holidays.length}
                  </span>{" "}
                  holidays
                </p>

                <div className="flex items-center justify-between gap-2 sm:justify-end">
                  <span className="text-xs text-slate-500">
                    Page{" "}
                    <span className="font-semibold text-slate-300">
                      {page}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-slate-300">
                      {pagination.totalPages ||
                        1}
                    </span>
                  </span>

                  <button
                    type="button"
                    onClick={
                      goPrevious
                    }
                    disabled={
                      !pagination.hasPreviousPage
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-slate-400 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronLeft
                      size={16}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={
                      goNext
                    }
                    disabled={
                      !pagination.hasNextPage
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-slate-400 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronRight
                      size={16}
                    />
                  </button>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* ====================================================
          CREATE / EDIT MODAL
      ==================================================== */}

      {showForm && (
        <ModalOverlay>
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0b0f17] shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10">
                  {editingHoliday ? (
                    <Pencil
                      size={18}
                      className="text-cyan-300"
                    />
                  ) : (
                    <CalendarDays
                      size={18}
                      className="text-cyan-300"
                    />
                  )}
                </div>

                <div>
                  <h2 className="text-base font-bold text-white">
                    {editingHoliday
                      ? "Edit Holiday"
                      : "Add Holiday"}
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-500">
                    {editingHoliday
                      ? "Update holiday details and schedule."
                      : "Create a new holiday for this workspace."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowForm(false)
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/[0.06] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="max-h-[80vh] overflow-y-auto p-5 sm:p-6"
            >
              <div className="grid gap-5 sm:grid-cols-2">
                {/* NAME */}

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-semibold text-slate-300">
                    Holiday Name
                    <span className="ml-1 text-rose-400">
                      *
                    </span>
                  </label>

                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) =>
                      handleFormChange(
                        "name",
                        event.target.value
                      )
                    }
                    placeholder="e.g. Independence Day"
                    maxLength={150}
                    className={inputClass}
                  />
                </div>

                {/* DATE */}

                <div>
                  <label className="mb-2 block text-xs font-semibold text-slate-300">
                    Holiday Date
                    <span className="ml-1 text-rose-400">
                      *
                    </span>
                  </label>

                  <input
                    type="date"
                    value={form.date}
                    onChange={(event) =>
                      handleFormChange(
                        "date",
                        event.target.value
                      )
                    }
                    className={inputClass}
                  />
                </div>

                {/* TYPE */}

                <div>
                  <label className="mb-2 block text-xs font-semibold text-slate-300">
                    Holiday Type
                  </label>

                  <select
                    value={
                      form.holidayType
                    }
                    onChange={(event) =>
                      handleFormChange(
                        "holidayType",
                        event.target.value
                      )
                    }
                    className={selectClass}
                  >
                    {HOLIDAY_TYPES.map(
                      (item) => (
                        <option
                          key={
                            item.value
                          }
                          value={
                            item.value
                          }
                        >
                          {item.label}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* DESCRIPTION */}

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-semibold text-slate-300">
                    Description
                  </label>

                  <textarea
                    value={
                      form.description
                    }
                    onChange={(event) =>
                      handleFormChange(
                        "description",
                        event.target.value
                      )
                    }
                    rows={4}
                    maxLength={500}
                    placeholder="Add additional holiday information..."
                    className={`${inputClass} resize-none`}
                  />

                  <div className="mt-1 text-right text-[10px] text-slate-600">
                    {
                      form.description
                        .length
                    }
                    /500
                  </div>
                </div>

                {/* RECURRING */}

                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-400/10">
                        <Repeat2
                          size={18}
                          className="text-violet-300"
                        />
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-white">
                          Recurring Holiday
                        </p>

                        <p className="mt-0.5 text-xs text-slate-500">
                          Repeat this holiday every year.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={
                        form.isRecurring
                      }
                      onClick={() =>
                        handleFormChange(
                          "isRecurring",
                          !form.isRecurring
                        )
                      }
                      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                        form.isRecurring
                          ? "bg-cyan-400"
                          : "bg-white/[0.12]"
                      }`}
                    >
                      <span
                        className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${
                          form.isRecurring
                            ? "left-6"
                            : "left-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* RECURRING MONTH */}

                {form.isRecurring && (
                  <>
                    <div>
                      <label className="mb-2 block text-xs font-semibold text-slate-300">
                        Recurring Month
                      </label>

                      <select
                        value={
                          form.recurringMonth
                        }
                        onChange={(
                          event
                        ) =>
                          handleFormChange(
                            "recurringMonth",
                            event.target
                              .value
                          )
                        }
                        className={
                          selectClass
                        }
                      >
                        <option value="">
                          Select month
                        </option>

                        {Array.from(
                          {
                            length: 12,
                          },
                          (
                            _,
                            index
                          ) => {
                            const month =
                              index + 1;

                            return (
                              <option
                                key={
                                  month
                                }
                                value={
                                  month
                                }
                              >
                                {getMonthName(
                                  month
                                )}
                              </option>
                            );
                          }
                        )}
                      </select>
                    </div>

                    {/* RECURRING DAY */}

                    <div>
                      <label className="mb-2 block text-xs font-semibold text-slate-300">
                        Recurring Day
                      </label>

                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={
                          form.recurringDay
                        }
                        onChange={(
                          event
                        ) =>
                          handleFormChange(
                            "recurringDay",
                            event.target
                              .value
                          )
                        }
                        placeholder="e.g. 15"
                        className={
                          inputClass
                        }
                      />
                    </div>
                  </>
                )}

                {/* STATUS */}

                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                          form.isActive
                            ? "bg-emerald-400/10"
                            : "bg-slate-400/10"
                        }`}
                      >
                        <Power
                          size={18}
                          className={
                            form.isActive
                              ? "text-emerald-300"
                              : "text-slate-400"
                          }
                        />
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-white">
                          Active Holiday
                        </p>

                        <p className="mt-0.5 text-xs text-slate-500">
                          Inactive holidays won't be treated as active.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={
                        form.isActive
                      }
                      onClick={() =>
                        handleFormChange(
                          "isActive",
                          !form.isActive
                        )
                      }
                      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                        form.isActive
                          ? "bg-emerald-400"
                          : "bg-white/[0.12]"
                      }`}
                    >
                      <span
                        className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${
                          form.isActive
                            ? "left-6"
                            : "left-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* FORM FOOTER */}

              <div className="mt-6 flex flex-col-reverse gap-2 border-t border-white/[0.07] pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setShowForm(false)
                  }
                  className="h-11 rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <Save size={16} />
                  )}

                  {saving
                    ? "Saving..."
                    : editingHoliday
                    ? "Update Holiday"
                    : "Create Holiday"}
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}

      {/* ====================================================
          DETAILS MODAL
      ==================================================== */}

      {showDetails &&
        selectedHoliday && (
          <ModalOverlay>
            <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0b0f17] shadow-2xl shadow-black/50">
              <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4 sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10">
                    <Info
                      size={18}
                      className="text-cyan-300"
                    />
                  </div>

                  <div>
                    <h2 className="text-base font-bold text-white">
                      Holiday Details
                    </h2>

                    <p className="text-xs text-slate-500">
                      Complete holiday information
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowDetails(
                      false
                    )
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-white/[0.06] hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 sm:p-6">
                <div className="mb-5 flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/10 text-lg font-bold text-cyan-300">
                    {getInitials(
                      selectedHoliday.name
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="break-words text-lg font-bold text-white">
                      {selectedHoliday.name}
                    </h3>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <TypeBadge
                        type={
                          selectedHoliday.holidayType
                        }
                      />

                      <StatusBadge
                        active={
                          selectedHoliday.isActive !==
                          false
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailItem
                    icon={CalendarDays}
                    label="Date"
                    value={formatDate(
                      selectedHoliday.date
                    )}
                  />

                  <DetailItem
                    icon={Repeat2}
                    label="Recurring"
                    value={
                      selectedHoliday.isRecurring
                        ? selectedHoliday.recurringMonth &&
                          selectedHoliday.recurringDay
                          ? `${getMonthName(
                              selectedHoliday.recurringMonth
                            )} ${selectedHoliday.recurringDay}`
                          : "Every year"
                        : "No"
                    }
                  />

                  <DetailItem
                    icon={CalendarRange}
                    label="Holiday Type"
                    value={
                      getTypeMeta(
                        selectedHoliday.holidayType
                      ).label
                    }
                  />

                  <DetailItem
                    icon={Power}
                    label="Status"
                    value={
                      selectedHoliday.isActive !==
                      false
                        ? "Active"
                        : "Inactive"
                    }
                  />
                </div>

                {selectedHoliday.description && (
                  <div className="mt-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <FileText
                        size={14}
                        className="text-slate-500"
                      />

                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                        Description
                      </p>
                    </div>

                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">
                      {
                        selectedHoliday.description
                      }
                    </p>
                  </div>
                )}

                <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDetails(
                        false
                      );
                      openEdit(
                        selectedHoliday
                      );
                    }}
                    className="flex h-10 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-sm font-semibold text-slate-300 hover:bg-white/[0.06] hover:text-white"
                  >
                    <Pencil size={15} />
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowDetails(
                        false
                      );
                      openDelete(
                        selectedHoliday
                      );
                    }}
                    className="flex h-10 items-center justify-center gap-2 rounded-xl border border-rose-400/10 bg-rose-400/[0.05] px-4 text-sm font-semibold text-rose-300 hover:bg-rose-400/[0.1]"
                  >
                    <Trash2 size={15} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </ModalOverlay>
        )}

      {/* ====================================================
          DELETE MODAL
      ==================================================== */}

      {showDelete &&
        selectedHoliday && (
          <ModalOverlay>
            <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0b0f17] shadow-2xl shadow-black/50">
              <div className="p-5 sm:p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-400/10">
                    <AlertTriangle
                      size={20}
                      className="text-rose-300"
                    />
                  </div>

                  <div>
                    <h2 className="text-base font-bold text-white">
                      Delete Holiday?
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      This action cannot be
                      undone. The holiday
                      <span className="font-semibold text-slate-300">
                        {" "}
                        "
                        {
                          selectedHoliday.name
                        }
                        "
                      </span>{" "}
                      will be permanently
                      removed.
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      setShowDelete(
                        false
                      )
                    }
                    className="h-10 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-sm font-semibold text-slate-300 hover:bg-white/[0.06]"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={
                      handleDelete
                    }
                    disabled={
                      actionId ===
                      selectedHoliday._id
                    }
                    className="flex h-10 items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 text-sm font-bold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionId ===
                    selectedHoliday._id ? (
                      <Loader2
                        size={15}
                        className="animate-spin"
                      />
                    ) : (
                      <Trash2 size={15} />
                    )}

                    Delete Holiday
                  </button>
                </div>
              </div>
            </div>
          </ModalOverlay>
        )}

      {/* ====================================================
          TOAST
      ==================================================== */}

      {toast.visible && (
        <div className="fixed bottom-4 left-3 right-3 z-[100] flex justify-center sm:left-auto sm:right-5 sm:justify-end">
          <div
            className={`flex max-w-md items-start gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl ${
              toast.type === "error"
                ? "border-rose-400/20 bg-[#160b10]/95"
                : "border-emerald-400/20 bg-[#071510]/95"
            }`}
          >
            {toast.type ===
            "error" ? (
              <AlertTriangle
                size={17}
                className="mt-0.5 shrink-0 text-rose-300"
              />
            ) : (
              <CheckCircle2
                size={17}
                className="mt-0.5 shrink-0 text-emerald-300"
              />
            )}

            <p className="text-sm font-medium text-slate-200">
              {toast.message}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ======================================================
// STAT CARD
// ======================================================

const StatCard = ({
  icon: Icon,
  label,
  value,
  accent,
}) => {
  const accentClasses = {
    cyan: {
      icon: "bg-cyan-400/10 text-cyan-300",
      glow: "bg-cyan-400/[0.04]",
    },

    emerald: {
      icon: "bg-emerald-400/10 text-emerald-300",
      glow: "bg-emerald-400/[0.04]",
    },

    rose: {
      icon: "bg-rose-400/10 text-rose-300",
      glow: "bg-rose-400/[0.04]",
    },

    violet: {
      icon: "bg-violet-400/10 text-violet-300",
      glow: "bg-violet-400/[0.04]",
    },
  };

  const classes =
    accentClasses[accent] ||
    accentClasses.cyan;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 shadow-xl shadow-black/10">
      <div
        className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl ${classes.glow}`}
      />

      <div className="relative flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-white">
            {value}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${classes.icon}`}
        >
          <Icon size={19} />
        </div>
      </div>
    </div>
  );
};

// ======================================================
// TYPE BADGE
// ======================================================

const TypeBadge = ({
  type,
}) => {
  const meta =
    getTypeMeta(type);

  const Icon = meta.icon;

  const classes = {
    PUBLIC:
      "border-blue-400/15 bg-blue-400/[0.07] text-blue-300",

    COMPANY:
      "border-cyan-400/15 bg-cyan-400/[0.07] text-cyan-300",

    OPTIONAL:
      "border-violet-400/15 bg-violet-400/[0.07] text-violet-300",

    RESTRICTED:
      "border-amber-400/15 bg-amber-400/[0.07] text-amber-300",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${classes[type] || classes.COMPANY}`}
    >
      <Icon size={11} />
      {meta.label}
    </span>
  );
};

// ======================================================
// STATUS BADGE
// ======================================================

const StatusBadge = ({
  active,
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${
        active
          ? "border-emerald-400/15 bg-emerald-400/[0.07] text-emerald-300"
          : "border-slate-400/10 bg-slate-400/[0.06] text-slate-400"
      }`}
    >
      {active ? (
        <CheckCircle2 size={11} />
      ) : (
        <XCircle size={11} />
      )}

      {active
        ? "Active"
        : "Inactive"}
    </span>
  );
};

// ======================================================
// TABLE ROW
// ======================================================

const HolidayTableRow = ({
  holiday,
  actionId,
  onView,
  onEdit,
  onDelete,
  onToggle,
}) => {
  const [menuOpen, setMenuOpen] =
    useState(false);

  return (
    <tr className="group border-b border-white/[0.05] transition hover:bg-white/[0.025]">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.035] text-xs font-bold text-cyan-300">
            {getInitials(
              holiday.name
            )}
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {holiday.name}
            </p>

            {holiday.description && (
              <p className="mt-0.5 max-w-[260px] truncate text-xs text-slate-500">
                {holiday.description}
              </p>
            )}
          </div>
        </div>
      </td>

      <td className="px-5 py-4">
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <CalendarDays
            size={14}
            className="text-slate-500"
          />

          {formatDate(
            holiday.date
          )}
        </div>
      </td>

      <td className="px-5 py-4">
        <TypeBadge
          type={
            holiday.holidayType
          }
        />
      </td>

      <td className="px-5 py-4">
        {holiday.isRecurring ? (
          <div className="flex items-center gap-2 text-xs text-violet-300">
            <Repeat2 size={14} />

            <span>
              {holiday.recurringMonth &&
              holiday.recurringDay
                ? `${getMonthName(
                    holiday.recurringMonth
                  )} ${holiday.recurringDay}`
                : "Every year"}
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-600">
            One time
          </span>
        )}
      </td>

      <td className="px-5 py-4">
        <StatusBadge
          active={
            holiday.isActive !==
            false
          }
        />
      </td>

      <td className="px-5 py-4">
        <div className="relative flex justify-end">
          <button
            type="button"
            onClick={() =>
              setMenuOpen(
                (current) =>
                  !current
              )
            }
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/[0.07] hover:text-white"
          >
            <MoreHorizontal
              size={17}
            />
          </button>

          {menuOpen && (
            <>
              <button
                type="button"
                aria-label="Close action menu"
                onClick={() =>
                  setMenuOpen(false)
                }
                className="fixed inset-0 z-20 cursor-default"
              />

              <div className="absolute right-0 top-10 z-30 w-44 overflow-hidden rounded-xl border border-white/[0.09] bg-[#10151f] p-1.5 shadow-2xl shadow-black/50">
                <ActionButton
                  icon={Eye}
                  label="View Details"
                  onClick={() => {
                    setMenuOpen(
                      false
                    );
                    onView(
                      holiday
                    );
                  }}
                />

                <ActionButton
                  icon={Pencil}
                  label="Edit Holiday"
                  onClick={() => {
                    setMenuOpen(
                      false
                    );
                    onEdit(
                      holiday
                    );
                  }}
                />

                <ActionButton
                  icon={Power}
                  label={
                    holiday.isActive
                      ? "Deactivate"
                      : "Activate"
                  }
                  loading={
                    actionId ===
                    holiday._id
                  }
                  onClick={() => {
                    setMenuOpen(
                      false
                    );
                    onToggle(
                      holiday
                    );
                  }}
                />

                <div className="my-1 border-t border-white/[0.06]" />

                <ActionButton
                  icon={Trash2}
                  label="Delete"
                  danger
                  onClick={() => {
                    setMenuOpen(
                      false
                    );
                    onDelete(
                      holiday
                    );
                  }}
                />
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  );
};

// ======================================================
// MOBILE CARD
// ======================================================

const HolidayMobileCard = ({
  holiday,
  actionId,
  onView,
  onEdit,
  onDelete,
  onToggle,
}) => {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 transition hover:border-white/[0.11]">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-400/[0.07] text-xs font-bold text-cyan-300">
          {getInitials(
            holiday.name
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">
                {holiday.name}
              </p>

              <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                <CalendarDays
                  size={12}
                />

                {formatDate(
                  holiday.date
                )}
              </p>
            </div>

            <StatusBadge
              active={
                holiday.isActive !==
                false
              }
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <TypeBadge
              type={
                holiday.holidayType
              }
            />

            {holiday.isRecurring && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/15 bg-violet-400/[0.07] px-2.5 py-1 text-[10px] font-bold text-violet-300">
                <Repeat2 size={11} />

                Recurring
              </span>
            )}
          </div>
        </div>
      </div>

      {holiday.description && (
        <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-500">
          {holiday.description}
        </p>
      )}

      <div className="mt-4 grid grid-cols-4 gap-2 border-t border-white/[0.06] pt-3">
        <MobileAction
          icon={Eye}
          label="View"
          onClick={() =>
            onView(holiday)
          }
        />

        <MobileAction
          icon={Pencil}
          label="Edit"
          onClick={() =>
            onEdit(holiday)
          }
        />

        <MobileAction
          icon={Power}
          label={
            holiday.isActive
              ? "Off"
              : "On"
          }
          loading={
            actionId ===
            holiday._id
          }
          onClick={() =>
            onToggle(holiday)
          }
        />

        <MobileAction
          icon={Trash2}
          label="Delete"
          danger
          onClick={() =>
            onDelete(holiday)
          }
        />
      </div>
    </div>
  );
};

// ======================================================
// ACTION BUTTON
// ======================================================

const ActionButton = ({
  icon: Icon,
  label,
  onClick,
  danger = false,
  loading = false,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition ${
        danger
          ? "text-rose-300 hover:bg-rose-400/[0.08]"
          : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
      }`}
    >
      {loading ? (
        <Loader2
          size={14}
          className="animate-spin"
        />
      ) : (
        <Icon size={14} />
      )}

      {label}
    </button>
  );
};

// ======================================================
// MOBILE ACTION
// ======================================================

const MobileAction = ({
  icon: Icon,
  label,
  onClick,
  danger = false,
  loading = false,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] py-2 text-[10px] font-semibold transition ${
        danger
          ? "text-rose-300 hover:bg-rose-400/[0.07]"
          : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
      }`}
    >
      {loading ? (
        <Loader2
          size={14}
          className="animate-spin"
        />
      ) : (
        <Icon size={14} />
      )}

      {label}
    </button>
  );
};

// ======================================================
// DETAIL ITEM
// ======================================================

const DetailItem = ({
  icon: Icon,
  label,
  value,
}) => {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
      <div className="flex items-center gap-2">
        <Icon
          size={14}
          className="text-slate-500"
        />

        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
          {label}
        </p>
      </div>

      <p className="mt-2 text-sm font-semibold text-slate-200">
        {value}
      </p>
    </div>
  );
};

// ======================================================
// EMPTY STATE
// ======================================================

const EmptyState = ({
  hasFilters,
  onCreate,
  onReset,
}) => {
  return (
    <div className="mx-auto max-w-md">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.03]">
        <CalendarDays
          size={27}
          className="text-slate-600"
        />
      </div>

      <h3 className="mt-5 text-sm font-bold text-white">
        {hasFilters
          ? "No matching holidays"
          : "No holidays yet"}
      </h3>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        {hasFilters
          ? "Try changing your search or filters."
          : "Create your first holiday to start managing the holiday calendar."}
      </p>

      <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
        {hasFilters && (
          <button
            type="button"
            onClick={onReset}
            className="flex h-10 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-xs font-semibold text-slate-300"
          >
            <RotateCcw size={14} />
            Reset Filters
          </button>
        )}

        {!hasFilters && (
          <button
            type="button"
            onClick={onCreate}
            className="flex h-10 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 text-xs font-bold text-slate-950"
          >
            <Plus size={14} />
            Add Holiday
          </button>
        )}
      </div>
    </div>
  );
};

// ======================================================
// TABLE SKELETON
// ======================================================

const TableSkeleton = () => {
  return (
    <>
      {Array.from(
        { length: 7 },
        (_, index) => (
          <tr
            key={index}
            className="border-b border-white/[0.05]"
          >
            <td className="px-5 py-5">
              <SkeletonRow wide />
            </td>

            <td className="px-5 py-5">
              <SkeletonRow />
            </td>

            <td className="px-5 py-5">
              <SkeletonRow />
            </td>

            <td className="px-5 py-5">
              <SkeletonRow />
            </td>

            <td className="px-5 py-5">
              <SkeletonRow />
            </td>

            <td className="px-5 py-5">
              <SkeletonRow />
            </td>
          </tr>
        )
      )}
    </>
  );
};

// ======================================================
// MOBILE SKELETON
// ======================================================

const MobileSkeleton = () => {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {Array.from(
        { length: 6 },
        (_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
          >
            <div className="flex gap-3">
              <div className="h-11 w-11 animate-pulse rounded-xl bg-white/[0.06]" />

              <div className="flex-1">
                <div className="h-4 w-2/3 animate-pulse rounded bg-white/[0.06]" />

                <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-white/[0.05]" />
              </div>
            </div>

            <div className="mt-4 h-3 w-full animate-pulse rounded bg-white/[0.04]" />

            <div className="mt-3 h-3 w-3/4 animate-pulse rounded bg-white/[0.04]" />
          </div>
        )
      )}
    </div>
  );
};

// ======================================================
// SKELETON ROW
// ======================================================

const SkeletonRow = ({
  wide = false,
}) => {
  return (
    <div className="flex items-center gap-3">
      {wide && (
        <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-white/[0.05]" />
      )}

      <div
        className={`h-3 animate-pulse rounded bg-white/[0.05] ${
          wide
            ? "w-40"
            : "w-20"
        }`}
      />
    </div>
  );
};

// ======================================================
// MODAL OVERLAY
// ======================================================

const ModalOverlay = ({
  children,
}) => {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-black/75 p-3 backdrop-blur-sm sm:p-5">
      <div className="my-auto flex w-full justify-center">
        {children}
      </div>
    </div>
  );
};

export default Holidays;