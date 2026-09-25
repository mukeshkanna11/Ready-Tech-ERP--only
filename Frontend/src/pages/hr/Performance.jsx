import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  Award,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Edit3,
  Eye,
  Filter,
  Loader2,
  MessageSquareText,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Star,
  Target,
  Trash2,
  TrendingUp,
  User,
  Users,
  X,
} from "lucide-react";

import api from "../../services/api";

/* ============================================================
   CONSTANTS
============================================================ */

const REVIEW_TYPES = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "half_yearly", label: "Half Yearly" },
  { value: "yearly", label: "Yearly" },
  { value: "probation", label: "Probation" },
  { value: "project", label: "Project" },
  { value: "other", label: "Other" },
];

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "completed", label: "Completed" },
];

const EMPTY_FORM = {
  employeeId: "",
  reviewPeriodStart: "",
  reviewPeriodEnd: "",
  reviewType: "monthly",
  overallRating: "",
  status: "draft",
  goals: [
    {
      title: "",
      description: "",
      weight: 100,
      rating: "",
      comments: "",
    },
  ],
  strengths: [""],
  improvementAreas: [""],
  managerComments: "",
  employeeComments: "",
};

/* ============================================================
   HELPERS
============================================================ */

function normalizeListResponse(data) {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  if (Array.isArray(data?.data?.data)) {
    return data.data.data;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  return [];
}

function getPagination(data) {
  return (
    data?.pagination ||
    data?.data?.pagination ||
    data?.meta?.pagination ||
    data?.meta ||
    {}
  );
}

function getApiErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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

function getEmployeeName(employee) {
  if (!employee) return "Unknown Employee";

  return (
    employee?.userId?.name ||
    employee?.user?.name ||
    employee?.name ||
    employee?.fullName ||
    employee?.employeeCode ||
    "Unknown Employee"
  );
}

function getEmployeeEmail(employee) {
  if (!employee) return "";

  return (
    employee?.userId?.email ||
    employee?.user?.email ||
    employee?.email ||
    ""
  );
}

function getEmployeeCode(employee) {
  if (!employee) return "";

  return (
    employee?.employeeCode ||
    employee?.code ||
    employee?.employeeNumber ||
    ""
  );
}

function getInitials(name) {
  if (!name) return "NA";

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0])
    .join("")
    .toUpperCase();
}

function getReviewTypeLabel(type) {
  const item = REVIEW_TYPES.find(
    (review) => review.value === type
  );

  return item?.label || type || "Review";
}

function getStatusLabel(status) {
  return status
    ? String(status)
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase())
    : "Unknown";
}

function getStatusClasses(status) {
  switch (String(status).toLowerCase()) {
    case "completed":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";

    case "draft":
      return "border-amber-400/20 bg-amber-400/10 text-amber-300";

    default:
      return "border-slate-700 bg-slate-800/80 text-slate-300";
  }
}

function getRatingClasses(rating) {
  const value = Number(rating || 0);

  if (value >= 4) {
    return "text-emerald-300";
  }

  if (value >= 3) {
    return "text-amber-300";
  }

  if (value > 0) {
    return "text-rose-300";
  }

  return "text-slate-500";
}

/* ============================================================
   SMALL COMPONENTS
============================================================ */

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconClass,
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#10141c] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:border-white/[0.12]">
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/[0.025] blur-2xl transition-transform duration-500 group-hover:scale-150" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
            {value}
          </p>

          {subtitle && (
            <p className="mt-1 text-xs text-slate-500">
              {subtitle}
            </p>
          )}
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${iconClass}`}
        >
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function RatingStars({ value = 0, size = 15 }) {
  const rating = Number(value || 0);

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          fill={star <= Math.round(rating) ? "currentColor" : "none"}
          className={
            star <= Math.round(rating)
              ? "text-amber-400"
              : "text-slate-700"
          }
        />
      ))}
    </div>
  );
}

function ModalShell({
  title,
  subtitle,
  icon: Icon,
  onClose,
  children,
  wide = false,
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3 backdrop-blur-md sm:p-5">
      <div
        className={`relative flex max-h-[94vh] w-full flex-col overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0b0f16] shadow-[0_30px_100px_rgba(0,0,0,0.65)] ${
          wide ? "max-w-5xl" : "max-w-3xl"
        }`}
      >
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="relative flex items-start justify-between border-b border-white/[0.07] px-5 py-5 sm:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-500/10 text-indigo-300">
              <Icon size={20} />
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-white sm:text-xl">
                {title}
              </h2>

              {subtitle && (
                <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-400 transition hover:bg-white/[0.08] hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="relative flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          {children}
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ children, required }) {
  return (
    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
      {children}
      {required && (
        <span className="ml-1 text-rose-400">*</span>
      )}
    </label>
  );
}

function Input({
  className = "",
  ...props
}) {
  return (
    <input
      {...props}
      className={`h-11 w-full rounded-xl border border-white/[0.08] bg-[#111722] px-3.5 text-sm text-white outline-none placeholder:text-slate-600 transition focus:border-indigo-400/50 focus:bg-[#141a26] focus:ring-2 focus:ring-indigo-500/10 ${className}`}
    />
  );
}

function Select({
  className = "",
  children,
  ...props
}) {
  return (
    <select
      {...props}
      className={`h-11 w-full rounded-xl border border-white/[0.08] bg-[#111722] px-3.5 text-sm text-white outline-none transition focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-500/10 ${className}`}
    >
      {children}
    </select>
  );
}

function Textarea({
  className = "",
  ...props
}) {
  return (
    <textarea
      {...props}
      className={`min-h-[100px] w-full resize-y rounded-xl border border-white/[0.08] bg-[#111722] px-3.5 py-3 text-sm text-white outline-none placeholder:text-slate-600 transition focus:border-indigo-400/50 focus:bg-[#141a26] focus:ring-2 focus:ring-indigo-500/10 ${className}`}
    />
  );
}

function EmptyState({ onCreate }) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center px-5 py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] text-slate-500">
        <ClipboardCheck size={28} />
      </div>

      <h3 className="mt-5 text-lg font-bold text-white">
        No performance reviews found
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        Create a performance review to start tracking employee
        goals, ratings and development feedback.
      </p>

      {onCreate && (
        <button
          type="button"
          onClick={onCreate}
          className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-500 px-4 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400"
        >
          <Plus size={17} />
          Create Review
        </button>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[360px] items-center justify-center">
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <Loader2
          size={20}
          className="animate-spin text-indigo-400"
        />
        Loading performance reviews...
      </div>
    </div>
  );
}

/* ============================================================
   MAIN COMPONENT
============================================================ */

export default function Performance() {
  const [performance, setPerformance] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [loading, setLoading] = useState(true);
  const [employeesLoading, setEmployeesLoading] =
    useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [reviewTypeFilter, setReviewTypeFilter] =
    useState("all");
  const [employeeFilter, setEmployeeFilter] =
    useState("all");

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

  const [modal, setModal] = useState(null);

  const [selectedReview, setSelectedReview] =
    useState(null);

  const [form, setForm] = useState(EMPTY_FORM);

  /* ==========================================================
     FETCH EMPLOYEES
  ========================================================== */

  const fetchEmployees = useCallback(async () => {
    try {
      setEmployeesLoading(true);

      const response = await api.get(
        "/employees?status=active"
      );

      setEmployees(
        normalizeListResponse(response.data)
      );
    } catch (err) {
      console.error(
        "Performance employee load error:",
        err
      );

      try {
        const response = await api.get("/employees");

        setEmployees(
          normalizeListResponse(response.data)
        );
      } catch (fallbackError) {
        console.error(
          "Performance employee fallback error:",
          fallbackError
        );

        setEmployees([]);
      }
    } finally {
      setEmployeesLoading(false);
    }
  }, []);

  /* ==========================================================
     FETCH PERFORMANCE
  ========================================================== */

  const fetchPerformance = useCallback(
    async (currentPage = page) => {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams();

        params.set("page", String(currentPage));
        params.set("limit", String(limit));

        if (search.trim()) {
          params.set("search", search.trim());
        }

        if (statusFilter !== "all") {
          params.set("status", statusFilter);
        }

        if (reviewTypeFilter !== "all") {
          params.set("reviewType", reviewTypeFilter);
        }

        if (employeeFilter !== "all") {
          params.set("employeeId", employeeFilter);
        }

        const query = params.toString();

        const response = await api.get(
          `/performance${query ? `?${query}` : ""}`
        );

        const list = normalizeListResponse(
          response.data
        );

        const paginationData = getPagination(
          response.data
        );

        const total =
          Number(paginationData.total) ||
          Number(response.data?.total) ||
          list.length;

        const totalPages =
          Number(paginationData.totalPages) ||
          Math.max(Math.ceil(total / limit), 1);

        setPerformance(list);

        setPagination({
          page:
            Number(paginationData.page) ||
            currentPage,
          limit:
            Number(paginationData.limit) ||
            limit,
          total,
          totalPages,
          hasNextPage:
            paginationData.hasNextPage ??
            currentPage < totalPages,
          hasPreviousPage:
            paginationData.hasPreviousPage ??
            currentPage > 1,
        });
      } catch (err) {
        console.error(
          "Performance fetch error:",
          err
        );

        setPerformance([]);

        setError(
          getApiErrorMessage(
            err,
            "Unable to load performance reviews"
          )
        );
      } finally {
        setLoading(false);
      }
    },
    [
      employeeFilter,
      limit,
      page,
      reviewTypeFilter,
      search,
      statusFilter,
    ]
  );

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    fetchPerformance(page);
  }, [fetchPerformance, page]);

  /* ==========================================================
     STATS
  ========================================================== */

  const stats = useMemo(() => {
    const total =
      Number(pagination.total) ||
      performance.length;

    const completed = performance.filter(
      (item) =>
        String(item.status).toLowerCase() ===
        "completed"
    ).length;

    const draft = performance.filter(
      (item) =>
        String(item.status).toLowerCase() ===
        "draft"
    ).length;

    const ratings = performance
      .map((item) => Number(item.overallRating))
      .filter((value) => Number.isFinite(value) && value > 0);

    const averageRating = ratings.length
      ? (
          ratings.reduce(
            (sum, value) => sum + value,
            0
          ) / ratings.length
        ).toFixed(1)
      : "0.0";

    return {
      total,
      completed,
      draft,
      averageRating,
    };
  }, [pagination.total, performance]);

  /* ==========================================================
     FORM HELPERS
  ========================================================== */

  const resetForm = () => {
    setForm({
      ...EMPTY_FORM,
      goals: [
        {
          title: "",
          description: "",
          weight: 100,
          rating: "",
          comments: "",
        },
      ],
      strengths: [""],
      improvementAreas: [""],
    });
  };

  const openCreate = () => {
    resetForm();
    setSelectedReview(null);
    setModal("create");
  };

  const openEdit = (review) => {
    setSelectedReview(review);

    setForm({
      employeeId:
        typeof review.employeeId === "object"
          ? review.employeeId?._id || ""
          : review.employeeId || "",

      reviewPeriodStart: toDateInputValue(
        review.reviewPeriodStart
      ),

      reviewPeriodEnd: toDateInputValue(
        review.reviewPeriodEnd
      ),

      reviewType:
        review.reviewType || "monthly",

      overallRating:
        review.overallRating ?? "",

      status:
        review.status || "draft",

      goals:
        Array.isArray(review.goals) &&
        review.goals.length
          ? review.goals.map((goal) => ({
              title: goal.title || "",
              description:
                goal.description || "",
              weight:
                goal.weight ?? "",
              rating:
                goal.rating ?? "",
              comments:
                goal.comments || "",
            }))
          : [
              {
                title: "",
                description: "",
                weight: 100,
                rating: "",
                comments: "",
              },
            ],

      strengths:
        Array.isArray(review.strengths) &&
        review.strengths.length
          ? review.strengths
          : [""],

      improvementAreas:
        Array.isArray(review.improvementAreas) &&
        review.improvementAreas.length
          ? review.improvementAreas
          : [""],

      managerComments:
        review.managerComments || "",

      employeeComments:
        review.employeeComments || "",
    });

    setModal("edit");
  };

  const openView = async (review) => {
    setSelectedReview(review);
    setModal("view");

    try {
      if (review?._id) {
        const response = await api.get(
          `/performance/${review._id}`
        );

        const data =
          response.data?.data ||
          response.data;

        setSelectedReview(data);
      }
    } catch (err) {
      console.error(
        "Performance details error:",
        err
      );
    }
  };

  /* ==========================================================
     FORM FIELD UPDATE
  ========================================================== */

  const updateForm = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const updateGoal = (index, field, value) => {
    setForm((previous) => ({
      ...previous,
      goals: previous.goals.map((goal, goalIndex) =>
        goalIndex === index
          ? {
              ...goal,
              [field]: value,
            }
          : goal
      ),
    }));
  };

  const addGoal = () => {
    setForm((previous) => ({
      ...previous,
      goals: [
        ...previous.goals,
        {
          title: "",
          description: "",
          weight: "",
          rating: "",
          comments: "",
        },
      ],
    }));
  };

  const removeGoal = (index) => {
    setForm((previous) => ({
      ...previous,
      goals:
        previous.goals.length > 1
          ? previous.goals.filter(
              (_, goalIndex) =>
                goalIndex !== index
            )
          : previous.goals,
    }));
  };

  const updateArrayItem = (
    field,
    index,
    value
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: previous[field].map(
        (item, itemIndex) =>
          itemIndex === index ? value : item
      ),
    }));
  };

  const addArrayItem = (field) => {
    setForm((previous) => ({
      ...previous,
      [field]: [
        ...previous[field],
        "",
      ],
    }));
  };

  const removeArrayItem = (field, index) => {
    setForm((previous) => ({
      ...previous,
      [field]:
        previous[field].length > 1
          ? previous[field].filter(
              (_, itemIndex) =>
                itemIndex !== index
            )
          : previous[field],
    }));
  };

  /* ==========================================================
     SAVE
  ========================================================== */

  const savePerformance = async (event) => {
    event.preventDefault();

    if (!form.employeeId) {
      setError("Employee is required.");
      return;
    }

    if (!form.reviewPeriodStart) {
      setError("Review start date is required.");
      return;
    }

    if (!form.reviewPeriodEnd) {
      setError("Review end date is required.");
      return;
    }

    if (
      new Date(form.reviewPeriodEnd) <
      new Date(form.reviewPeriodStart)
    ) {
      setError(
        "Review end date cannot be before start date."
      );
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const payload = {
        employeeId: form.employeeId,
        reviewPeriodStart:
          form.reviewPeriodStart,
        reviewPeriodEnd:
          form.reviewPeriodEnd,
        reviewType: form.reviewType,
        overallRating:
          form.overallRating === ""
            ? undefined
            : Number(form.overallRating),
        status: form.status,

        goals: form.goals
          .filter(
            (goal) =>
              goal.title?.trim() ||
              goal.description?.trim()
          )
          .map((goal) => ({
            title: goal.title.trim(),
            description:
              goal.description?.trim() || "",
            weight:
              goal.weight === ""
                ? 0
                : Number(goal.weight),
            rating:
              goal.rating === ""
                ? undefined
                : Number(goal.rating),
            comments:
              goal.comments?.trim() || "",
          })),

        strengths: form.strengths
          .map((item) => item.trim())
          .filter(Boolean),

        improvementAreas:
          form.improvementAreas
            .map((item) => item.trim())
            .filter(Boolean),

        managerComments:
          form.managerComments.trim(),

        employeeComments:
          form.employeeComments.trim(),
      };

      Object.keys(payload).forEach((key) => {
        if (payload[key] === undefined) {
          delete payload[key];
        }
      });

      if (selectedReview?._id) {
        await api.put(
          `/performance/${selectedReview._id}`,
          payload
        );
      } else {
        await api.post(
          "/performance",
          payload
        );
      }

      setModal(null);
      setSelectedReview(null);
      resetForm();

      await fetchPerformance(page);
    } catch (err) {
      console.error(
        "Performance save error:",
        err
      );

      setError(
        getApiErrorMessage(
          err,
          "Unable to save performance review"
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* ==========================================================
     DELETE
  ========================================================== */

  const removePerformance = async (review) => {
    if (!review?._id) return;

    const employeeName = getEmployeeName(
      review.employeeId
    );

    const confirmed = window.confirm(
      `Delete performance review for ${employeeName}?`
    );

    if (!confirmed) return;

    try {
      setDeletingId(review._id);
      setError("");

      await api.delete(
        `/performance/${review._id}`
      );

      if (
        performance.length === 1 &&
        page > 1
      ) {
        setPage((previous) =>
          Math.max(previous - 1, 1)
        );
      } else {
        await fetchPerformance(page);
      }
    } catch (err) {
      console.error(
        "Performance delete error:",
        err
      );

      setError(
        getApiErrorMessage(
          err,
          "Unable to delete performance review"
        )
      );
    } finally {
      setDeletingId(null);
    }
  };

  /* ==========================================================
     FILTER ACTIONS
  ========================================================== */

  const applySearch = () => {
    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setReviewTypeFilter("all");
    setEmployeeFilter("all");
    setPage(1);
  };

  const hasFilters =
    search.trim() ||
    statusFilter !== "all" ||
    reviewTypeFilter !== "all" ||
    employeeFilter !== "all";

  /* ==========================================================
     PAGINATION
  ========================================================== */

  const previousPage = () => {
    if (page > 1) {
      setPage((previous) =>
        Math.max(previous - 1, 1)
      );
    }
  };

  const nextPage = () => {
    if (
      page < pagination.totalPages
    ) {
      setPage((previous) =>
        previous + 1
      );
    }
  };

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#070a0f] text-slate-200">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-indigo-600/[0.05] blur-3xl" />
        <div className="absolute -right-40 top-40 h-96 w-96 rounded-full bg-violet-600/[0.04] blur-3xl" />
      </div>

      <main className="relative w-full px-3 py-4 sm:px-5 sm:py-6 lg:px-7 xl:px-9">
        {/* ====================================================
            HEADER
        ==================================================== */}

        <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#111722] via-[#0d121b] to-[#090d14] shadow-[0_25px_80px_rgba(0,0,0,0.28)]">
          <div className="absolute -right-24 -top-28 h-80 w-80 rounded-full bg-indigo-500/[0.08] blur-3xl" />
          <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-violet-500/[0.05] blur-3xl" />

          <div className="relative p-5 sm:p-7 lg:p-8">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-indigo-400/20 bg-indigo-500/10 text-indigo-300 shadow-lg shadow-indigo-500/10 sm:h-16 sm:w-16">
                  <Award size={28} />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-indigo-400/20 bg-indigo-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-indigo-300">
                      HR Management
                    </span>

                    <span className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-[10px] font-semibold text-slate-500">
                      Performance
                    </span>
                  </div>

                  <h1 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl">
                    Employee Performance
                  </h1>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-[15px]">
                    Manage employee reviews, goals,
                    ratings and development feedback
                    from one centralized workspace.
                  </p>
                </div>
              </div>

              <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto">
                <button
                  type="button"
                  onClick={() =>
                    fetchPerformance(page)
                  }
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                >
                  <RefreshCw size={17} />
                  Refresh
                </button>

                <button
                  type="button"
                  onClick={openCreate}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-500 px-5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400"
                >
                  <Plus size={18} />
                  New Review
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================
            ERROR
        ==================================================== */}

        {error && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-400/20 bg-rose-500/[0.07] px-4 py-3 text-sm text-rose-300">
            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0"
            />

            <div className="min-w-0 flex-1">
              {error}
            </div>

            <button
              type="button"
              onClick={() => setError("")}
              className="text-rose-400 transition hover:text-white"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {/* ====================================================
            STATS
        ==================================================== */}

        <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            title="Total Reviews"
            value={stats.total}
            subtitle="All performance records"
            icon={ClipboardCheck}
            iconClass="border-indigo-400/20 bg-indigo-500/10 text-indigo-300"
          />

          <StatCard
            title="Completed"
            value={stats.completed}
            subtitle="Completed reviews"
            icon={CheckCircle2}
            iconClass="border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
          />

          <StatCard
            title="Draft Reviews"
            value={stats.draft}
            subtitle="Pending completion"
            icon={Target}
            iconClass="border-amber-400/20 bg-amber-500/10 text-amber-300"
          />

          <StatCard
            title="Average Rating"
            value={`${stats.averageRating}/5`}
            subtitle="Visible page average"
            icon={TrendingUp}
            iconClass="border-violet-400/20 bg-violet-500/10 text-violet-300"
          />
        </section>

        {/* ====================================================
            FILTERS
        ==================================================== */}

        <section className="mt-5 rounded-2xl border border-white/[0.07] bg-[#0d121a] p-3 sm:p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative min-w-0 flex-1">
              <Search
                size={17}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    applySearch();
                  }
                }}
                placeholder="Search employee, review..."
                className="h-11 w-full rounded-xl border border-white/[0.07] bg-[#111722] pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-400/40"
              />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:flex xl:shrink-0">
              <Select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
                className="sm:min-w-[145px]"
              >
                <option value="all">
                  All Status
                </option>

                {STATUS_OPTIONS.map((item) => (
                  <option
                    key={item.value}
                    value={item.value}
                  >
                    {item.label}
                  </option>
                ))}
              </Select>

              <Select
                value={reviewTypeFilter}
                onChange={(event) => {
                  setReviewTypeFilter(
                    event.target.value
                  );
                  setPage(1);
                }}
                className="sm:min-w-[155px]"
              >
                <option value="all">
                  All Reviews
                </option>

                {REVIEW_TYPES.map((item) => (
                  <option
                    key={item.value}
                    value={item.value}
                  >
                    {item.label}
                  </option>
                ))}
              </Select>

              <Select
                value={employeeFilter}
                onChange={(event) => {
                  setEmployeeFilter(
                    event.target.value
                  );
                  setPage(1);
                }}
                className="sm:min-w-[180px]"
              >
                <option value="all">
                  All Employees
                </option>

                {employees.map((employee) => (
                  <option
                    key={employee._id}
                    value={employee._id}
                  >
                    {getEmployeeName(employee)}
                  </option>
                ))}
              </Select>
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 text-sm font-semibold text-slate-400 transition hover:bg-white/[0.08] hover:text-white"
              >
                <Filter size={16} />
                Clear
              </button>
            )}
          </div>
        </section>

        {/* ====================================================
            TABLE
        ==================================================== */}

        <section className="mt-5 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0d121a] shadow-[0_20px_70px_rgba(0,0,0,0.18)]">
          {loading ? (
            <LoadingState />
          ) : performance.length === 0 ? (
            <EmptyState onCreate={openCreate} />
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[950px]">
                  <thead>
                    <tr className="border-b border-white/[0.07] bg-white/[0.015]">
                      <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">
                        Employee
                      </th>

                      <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">
                        Review Period
                      </th>

                      <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">
                        Type
                      </th>

                      <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">
                        Rating
                      </th>

                      <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">
                        Status
                      </th>

                      <th className="px-5 py-4 text-right text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/[0.05]">
                    {performance.map((review) => {
                      const employee =
                        review.employeeId;

                      return (
                        <tr
                          key={review._id}
                          className="group transition hover:bg-white/[0.025]"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-400/15 bg-indigo-500/10 text-xs font-bold text-indigo-300">
                                {getInitials(
                                  getEmployeeName(
                                    employee
                                  )
                                )}
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-white">
                                  {getEmployeeName(
                                    employee
                                  )}
                                </p>

                                <p className="mt-0.5 truncate text-xs text-slate-600">
                                  {getEmployeeCode(
                                    employee
                                  ) ||
                                    getEmployeeEmail(
                                      employee
                                    ) ||
                                    "Employee"}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2 text-sm text-slate-300">
                              <CalendarDays
                                size={15}
                                className="text-slate-600"
                              />

                              <span>
                                {formatDate(
                                  review.reviewPeriodStart
                                )}
                              </span>

                              <span className="text-slate-700">
                                →
                              </span>

                              <span>
                                {formatDate(
                                  review.reviewPeriodEnd
                                )}
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-2.5 py-1.5 text-xs font-semibold text-slate-400">
                              {getReviewTypeLabel(
                                review.reviewType
                              )}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <RatingStars
                                value={
                                  review.overallRating
                                }
                              />

                              <span
                                className={`text-sm font-bold ${getRatingClasses(
                                  review.overallRating
                                )}`}
                              >
                                {review.overallRating ??
                                  "—"}
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${getStatusClasses(
                                review.status
                              )}`}
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-current" />
                              {getStatusLabel(
                                review.status
                              )}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  openView(review)
                                }
                                title="View"
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-indigo-500/10 hover:text-indigo-300"
                              >
                                <Eye size={17} />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  openEdit(review)
                                }
                                title="Edit"
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-amber-500/10 hover:text-amber-300"
                              >
                                <Edit3 size={16} />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  removePerformance(
                                    review
                                  )
                                }
                                disabled={
                                  deletingId ===
                                  review._id
                                }
                                title="Delete"
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50"
                              >
                                {deletingId ===
                                review._id ? (
                                  <Loader2
                                    size={16}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <Trash2
                                    size={16}
                                  />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile / Tablet cards */}
              <div className="divide-y divide-white/[0.05] lg:hidden">
                {performance.map((review) => {
                  const employee =
                    review.employeeId;

                  return (
                    <div
                      key={review._id}
                      className="p-4 sm:p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-indigo-400/15 bg-indigo-500/10 text-xs font-bold text-indigo-300">
                            {getInitials(
                              getEmployeeName(
                                employee
                              )
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-white">
                              {getEmployeeName(
                                employee
                              )}
                            </p>

                            <p className="mt-0.5 truncate text-xs text-slate-600">
                              {getEmployeeCode(
                                employee
                              ) ||
                                getEmployeeEmail(
                                  employee
                                ) ||
                                "Employee"}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${getStatusClasses(
                            review.status
                          )}`}
                        >
                          {getStatusLabel(
                            review.status
                          )}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                            Review
                          </p>

                          <p className="mt-1 text-xs font-semibold text-slate-300">
                            {getReviewTypeLabel(
                              review.reviewType
                            )}
                          </p>
                        </div>

                        <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                            Rating
                          </p>

                          <div className="mt-1 flex items-center gap-2">
                            <RatingStars
                              value={
                                review.overallRating
                              }
                              size={12}
                            />

                            <span
                              className={`text-xs font-bold ${getRatingClasses(
                                review.overallRating
                              )}`}
                            >
                              {review.overallRating ??
                                "—"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2.5 text-xs text-slate-500">
                        <CalendarDays
                          size={14}
                          className="text-slate-600"
                        />

                        {formatDate(
                          review.reviewPeriodStart
                        )}

                        <span>→</span>

                        {formatDate(
                          review.reviewPeriodEnd
                        )}
                      </div>

                      <div className="mt-3 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openView(review)
                          }
                          className="flex h-9 items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 text-xs font-semibold text-slate-400 transition hover:bg-white/[0.08] hover:text-white"
                        >
                          <Eye size={14} />
                          View
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openEdit(review)
                          }
                          className="flex h-9 items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 text-xs font-semibold text-slate-400 transition hover:bg-amber-500/10 hover:text-amber-300"
                        >
                          <Edit3 size={14} />
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            removePerformance(
                              review
                            )
                          }
                          disabled={
                            deletingId ===
                            review._id
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.03] text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50"
                        >
                          {deletingId ===
                          review._id ? (
                            <Loader2
                              size={14}
                              className="animate-spin"
                            />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              <div className="flex flex-col gap-3 border-t border-white/[0.06] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <p className="text-xs text-slate-600">
                  Showing{" "}
                  <span className="font-semibold text-slate-400">
                    {performance.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-400">
                    {pagination.total}
                  </span>{" "}
                  reviews
                </p>

                <div className="flex items-center justify-between gap-2 sm:justify-end">
                  <button
                    type="button"
                    onClick={previousPage}
                    disabled={page <= 1}
                    className="flex h-9 items-center gap-1 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 text-xs font-semibold text-slate-400 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronLeft size={15} />
                    Previous
                  </button>

                  <span className="px-2 text-xs font-semibold text-slate-500">
                    {page} /{" "}
                    {pagination.totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={nextPage}
                    disabled={
                      page >=
                      pagination.totalPages
                    }
                    className="flex h-9 items-center gap-1 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 text-xs font-semibold text-slate-400 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    Next
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </main>

      {/* ======================================================
          CREATE / EDIT MODAL
      ====================================================== */}

      {(modal === "create" ||
        modal === "edit") && (
        <ModalShell
          title={
            modal === "edit"
              ? "Edit Performance Review"
              : "Create Performance Review"
          }
          subtitle="Record goals, ratings and employee development feedback"
          icon={
            modal === "edit"
              ? Edit3
              : ClipboardCheck
          }
          onClose={() => {
            setModal(null);
            setSelectedReview(null);
            setError("");
          }}
          wide
        >
          <form
            onSubmit={savePerformance}
            className="space-y-6"
          >
            {/* Basic */}
            <div>
              <div className="mb-4 flex items-center gap-2">
                <User
                  size={17}
                  className="text-indigo-300"
                />

                <h3 className="text-sm font-bold text-white">
                  Review Information
                </h3>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="lg:col-span-2">
                  <FieldLabel required>
                    Employee
                  </FieldLabel>

                  <Select
                    value={form.employeeId}
                    onChange={(event) =>
                      updateForm(
                        "employeeId",
                        event.target.value
                      )
                    }
                    required
                  >
                    <option value="">
                      {employeesLoading
                        ? "Loading employees..."
                        : "Select employee"}
                    </option>

                    {employees.map(
                      (employee) => (
                        <option
                          key={employee._id}
                          value={employee._id}
                        >
                          {getEmployeeName(
                            employee
                          )}
                          {getEmployeeCode(
                            employee
                          )
                            ? ` • ${getEmployeeCode(
                                employee
                              )}`
                            : ""}
                        </option>
                      )
                    )}
                  </Select>
                </div>

                <div>
                  <FieldLabel required>
                    Review Type
                  </FieldLabel>

                  <Select
                    value={form.reviewType}
                    onChange={(event) =>
                      updateForm(
                        "reviewType",
                        event.target.value
                      )
                    }
                  >
                    {REVIEW_TYPES.map(
                      (item) => (
                        <option
                          key={item.value}
                          value={item.value}
                        >
                          {item.label}
                        </option>
                      )
                    )}
                  </Select>
                </div>

                <div>
                  <FieldLabel>
                    Status
                  </FieldLabel>

                  <Select
                    value={form.status}
                    onChange={(event) =>
                      updateForm(
                        "status",
                        event.target.value
                      )
                    }
                  >
                    {STATUS_OPTIONS.map(
                      (item) => (
                        <option
                          key={item.value}
                          value={item.value}
                        >
                          {item.label}
                        </option>
                      )
                    )}
                  </Select>
                </div>

                <div>
                  <FieldLabel required>
                    Period Start
                  </FieldLabel>

                  <Input
                    type="date"
                    value={
                      form.reviewPeriodStart
                    }
                    onChange={(event) =>
                      updateForm(
                        "reviewPeriodStart",
                        event.target.value
                      )
                    }
                    required
                  />
                </div>

                <div>
                  <FieldLabel required>
                    Period End
                  </FieldLabel>

                  <Input
                    type="date"
                    value={
                      form.reviewPeriodEnd
                    }
                    onChange={(event) =>
                      updateForm(
                        "reviewPeriodEnd",
                        event.target.value
                      )
                    }
                    required
                  />
                </div>

                <div>
                  <FieldLabel>
                    Overall Rating
                  </FieldLabel>

                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      placeholder="0 - 5"
                      value={
                        form.overallRating
                      }
                      onChange={(event) =>
                        updateForm(
                          "overallRating",
                          event.target.value
                        )
                      }
                    />

                    <Star
                      size={16}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-amber-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Goals */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-4 sm:p-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Target
                    size={17}
                    className="text-violet-300"
                  />

                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Goals & Objectives
                    </h3>

                    <p className="mt-0.5 text-xs text-slate-600">
                      Track measurable performance goals.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={addGoal}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-indigo-400/20 bg-indigo-500/10 px-3 text-xs font-bold text-indigo-300 transition hover:bg-indigo-500/20"
                >
                  <Plus size={15} />
                  Add Goal
                </button>
              </div>

              <div className="space-y-4">
                {form.goals.map(
                  (goal, index) => (
                    <div
                      key={index}
                      className="relative rounded-2xl border border-white/[0.06] bg-[#0b1018] p-4"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <span className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Goal {index + 1}
                        </span>

                        {form.goals.length >
                          1 && (
                          <button
                            type="button"
                            onClick={() =>
                              removeGoal(
                                index
                              )
                            }
                            className="text-slate-600 transition hover:text-rose-300"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>

                      <div className="grid gap-3 lg:grid-cols-12">
                        <div className="lg:col-span-4">
                          <FieldLabel>
                            Goal Title
                          </FieldLabel>

                          <Input
                            value={
                              goal.title
                            }
                            onChange={(event) =>
                              updateGoal(
                                index,
                                "title",
                                event.target
                                  .value
                              )
                            }
                            placeholder="e.g. Complete ERP modules"
                          />
                        </div>

                        <div className="lg:col-span-5">
                          <FieldLabel>
                            Description
                          </FieldLabel>

                          <Input
                            value={
                              goal.description
                            }
                            onChange={(event) =>
                              updateGoal(
                                index,
                                "description",
                                event.target
                                  .value
                              )
                            }
                            placeholder="Describe expected outcome"
                          />
                        </div>

                        <div className="lg:col-span-1">
                          <FieldLabel>
                            Weight %
                          </FieldLabel>

                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={
                              goal.weight
                            }
                            onChange={(event) =>
                              updateGoal(
                                index,
                                "weight",
                                event.target
                                  .value
                              )
                            }
                          />
                        </div>

                        <div className="lg:col-span-2">
                          <FieldLabel>
                            Rating
                          </FieldLabel>

                          <Input
                            type="number"
                            min="0"
                            max="5"
                            step="0.1"
                            value={
                              goal.rating
                            }
                            onChange={(event) =>
                              updateGoal(
                                index,
                                "rating",
                                event.target
                                  .value
                              )
                            }
                            placeholder="0 - 5"
                          />
                        </div>

                        <div className="lg:col-span-12">
                          <FieldLabel>
                            Goal Comments
                          </FieldLabel>

                          <Input
                            value={
                              goal.comments
                            }
                            onChange={(event) =>
                              updateGoal(
                                index,
                                "comments",
                                event.target
                                  .value
                              )
                            }
                            placeholder="Add comments about this goal"
                          />
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Feedback */}
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Strengths
                    </h3>

                    <p className="mt-1 text-xs text-slate-600">
                      Key strengths demonstrated.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      addArrayItem(
                        "strengths"
                      )
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.03] text-slate-400 transition hover:text-white"
                  >
                    <Plus size={15} />
                  </button>
                </div>

                <div className="space-y-2">
                  {form.strengths.map(
                    (item, index) => (
                      <div
                        key={index}
                        className="flex gap-2"
                      >
                        <Input
                          value={item}
                          onChange={(event) =>
                            updateArrayItem(
                              "strengths",
                              index,
                              event.target
                                .value
                            )
                          }
                          placeholder="e.g. Problem solving"
                        />

                        {form.strengths.length >
                          1 && (
                          <button
                            type="button"
                            onClick={() =>
                              removeArrayItem(
                                "strengths",
                                index
                              )
                            }
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] text-slate-600 transition hover:border-rose-400/20 hover:text-rose-300"
                          >
                            <X size={15} />
                          </button>
                        )}
                      </div>
                    )
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Improvement Areas
                    </h3>

                    <p className="mt-1 text-xs text-slate-600">
                      Areas for future development.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      addArrayItem(
                        "improvementAreas"
                      )
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.03] text-slate-400 transition hover:text-white"
                  >
                    <Plus size={15} />
                  </button>
                </div>

                <div className="space-y-2">
                  {form.improvementAreas.map(
                    (item, index) => (
                      <div
                        key={index}
                        className="flex gap-2"
                      >
                        <Input
                          value={item}
                          onChange={(event) =>
                            updateArrayItem(
                              "improvementAreas",
                              index,
                              event.target
                                .value
                            )
                          }
                          placeholder="e.g. Documentation"
                        />

                        {form
                          .improvementAreas
                          .length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              removeArrayItem(
                                "improvementAreas",
                                index
                              )
                            }
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] text-slate-600 transition hover:border-rose-400/20 hover:text-rose-300"
                          >
                            <X size={15} />
                          </button>
                        )}
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Comments */}
            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <FieldLabel>
                  Manager Comments
                </FieldLabel>

                <Textarea
                  value={
                    form.managerComments
                  }
                  onChange={(event) =>
                    updateForm(
                      "managerComments",
                      event.target.value
                    )
                  }
                  placeholder="Add manager feedback..."
                />
              </div>

              <div>
                <FieldLabel>
                  Employee Comments
                </FieldLabel>

                <Textarea
                  value={
                    form.employeeComments
                  }
                  onChange={(event) =>
                    updateForm(
                      "employeeComments",
                      event.target.value
                    )
                  }
                  placeholder="Add employee feedback..."
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse gap-2 border-t border-white/[0.06] pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setModal(null);
                  setSelectedReview(null);
                }}
                className="h-11 rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 text-sm font-semibold text-slate-400 transition hover:bg-white/[0.08] hover:text-white"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-500 px-6 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={17} />
                    {modal === "edit"
                      ? "Update Review"
                      : "Create Review"}
                  </>
                )}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* ======================================================
          VIEW MODAL
      ====================================================== */}

      {modal === "view" &&
        selectedReview && (
          <ModalShell
            title="Performance Review"
            subtitle="Detailed employee performance record"
            icon={Eye}
            onClose={() => {
              setModal(null);
              setSelectedReview(null);
            }}
            wide
          >
            <div className="space-y-5">
              {/* Employee Header */}
              <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-br from-indigo-500/[0.08] to-transparent p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-400/20 bg-indigo-500/10 text-sm font-black text-indigo-300">
                      {getInitials(
                        getEmployeeName(
                          selectedReview.employeeId
                        )
                      )}
                    </div>

                    <div>
                      <h3 className="text-lg font-black text-white">
                        {getEmployeeName(
                          selectedReview.employeeId
                        )}
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        {getEmployeeCode(
                          selectedReview.employeeId
                        ) ||
                          getEmployeeEmail(
                            selectedReview.employeeId
                          ) ||
                          "Employee"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-3 py-1.5 text-xs font-bold ${getStatusClasses(
                        selectedReview.status
                      )}`}
                    >
                      {getStatusLabel(
                        selectedReview.status
                      )}
                    </span>

                    <span className="rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-slate-400">
                      {getReviewTypeLabel(
                        selectedReview.reviewType
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    Start Date
                  </p>

                  <p className="mt-2 text-sm font-bold text-white">
                    {formatDate(
                      selectedReview.reviewPeriodStart
                    )}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    End Date
                  </p>

                  <p className="mt-2 text-sm font-bold text-white">
                    {formatDate(
                      selectedReview.reviewPeriodEnd
                    )}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    Overall Rating
                  </p>

                  <div className="mt-2 flex items-center gap-2">
                    <RatingStars
                      value={
                        selectedReview.overallRating
                      }
                    />

                    <span className="text-sm font-black text-amber-300">
                      {selectedReview.overallRating ??
                        "—"}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    Goals
                  </p>

                  <p className="mt-2 text-sm font-black text-white">
                    {Array.isArray(
                      selectedReview.goals
                    )
                      ? selectedReview.goals.length
                      : 0}
                  </p>
                </div>
              </div>

              {/* Goals */}
              {Array.isArray(
                selectedReview.goals
              ) &&
                selectedReview.goals.length >
                  0 && (
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <Target
                        size={17}
                        className="text-violet-300"
                      />

                      <h3 className="text-sm font-bold text-white">
                        Goals & Objectives
                      </h3>
                    </div>

                    <div className="space-y-3">
                      {selectedReview.goals.map(
                        (goal, index) => (
                          <div
                            key={
                              goal._id ||
                              index
                            }
                            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-white">
                                  {goal.title ||
                                    `Goal ${
                                      index +
                                      1
                                    }`}
                                </p>

                                {goal.description && (
                                  <p className="mt-1 text-xs leading-5 text-slate-500">
                                    {
                                      goal.description
                                    }
                                  </p>
                                )}
                              </div>

                              <div className="flex shrink-0 items-center gap-3">
                                {goal.weight !==
                                  undefined && (
                                  <span className="text-xs font-semibold text-slate-600">
                                    {
                                      goal.weight
                                    }
                                    %
                                  </span>
                                )}

                                <RatingStars
                                  value={
                                    goal.rating
                                  }
                                  size={13}
                                />

                                <span className="text-xs font-bold text-amber-300">
                                  {goal.rating ??
                                    "—"}
                                </span>
                              </div>
                            </div>

                            {goal.comments && (
                              <div className="mt-3 rounded-xl border border-white/[0.05] bg-black/10 px-3 py-2.5 text-xs leading-5 text-slate-500">
                                {
                                  goal.comments
                                }
                              </div>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

              {/* Strengths / Improvement */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-emerald-400/10 bg-emerald-500/[0.03] p-4">
                  <h3 className="text-sm font-bold text-emerald-300">
                    Strengths
                  </h3>

                  <div className="mt-3 space-y-2">
                    {Array.isArray(
                      selectedReview.strengths
                    ) &&
                    selectedReview.strengths
                      .length ? (
                      selectedReview.strengths.map(
                        (item, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-2 text-xs text-slate-400"
                          >
                            <CheckCircle2
                              size={14}
                              className="mt-0.5 shrink-0 text-emerald-400"
                            />

                            {item}
                          </div>
                        )
                      )
                    ) : (
                      <p className="text-xs text-slate-600">
                        No strengths recorded.
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-400/10 bg-amber-500/[0.03] p-4">
                  <h3 className="text-sm font-bold text-amber-300">
                    Improvement Areas
                  </h3>

                  <div className="mt-3 space-y-2">
                    {Array.isArray(
                      selectedReview.improvementAreas
                    ) &&
                    selectedReview
                      .improvementAreas
                      .length ? (
                      selectedReview.improvementAreas.map(
                        (item, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-2 text-xs text-slate-400"
                          >
                            <TrendingUp
                              size={14}
                              className="mt-0.5 shrink-0 text-amber-400"
                            />

                            {item}
                          </div>
                        )
                      )
                    ) : (
                      <p className="text-xs text-slate-600">
                        No improvement areas recorded.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Comments */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="flex items-center gap-2">
                    <MessageSquareText
                      size={16}
                      className="text-indigo-300"
                    />

                    <h3 className="text-sm font-bold text-white">
                      Manager Comments
                    </h3>
                  </div>

                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-500">
                    {selectedReview.managerComments ||
                      "No manager comments."}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="flex items-center gap-2">
                    <Users
                      size={16}
                      className="text-violet-300"
                    />

                    <h3 className="text-sm font-bold text-white">
                      Employee Comments
                    </h3>
                  </div>

                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-500">
                    {selectedReview.employeeComments ||
                      "No employee comments."}
                  </p>
                </div>
              </div>

              {/* View actions */}
              <div className="flex flex-col-reverse gap-2 border-t border-white/[0.06] pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setModal(null);
                    setSelectedReview(
                      null
                    );
                  }}
                  className="h-11 rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 text-sm font-semibold text-slate-400 transition hover:bg-white/[0.08] hover:text-white"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={() =>
                    openEdit(
                      selectedReview
                    )
                  }
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-500 px-5 text-sm font-bold text-white transition hover:bg-indigo-400"
                >
                  <Edit3 size={16} />
                  Edit Review
                </button>
              </div>
            </div>
          </ModalShell>
        )}
    </div>
  );
}