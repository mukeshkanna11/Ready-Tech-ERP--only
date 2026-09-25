import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Eye,
  FileBarChart,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
  X,
  Building2,
  BriefcaseBusiness,
  IndianRupee,
} from "lucide-react";

const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const PAGE_SIZE = 10;

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("accessToken") ||
  localStorage.getItem("authToken") ||
  "";

const apiRequest = async (endpoint) => {
  const token = getToken();

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),
    },
  });

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(
      payload?.message ||
        payload?.error ||
        `Request failed with status ${response.status}`
    );
  }

  return payload;
};

const unwrap = (payload) => {
  if (!payload) return null;

  if (payload.data !== undefined) {
    return payload.data;
  }

  return payload;
};

const extractArray = (payload, keys = []) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  const data = unwrap(payload);

  if (Array.isArray(data)) {
    return data;
  }

  if (data && typeof data === "object") {
    for (const key of keys) {
      if (Array.isArray(data[key])) {
        return data[key];
      }
    }

    if (Array.isArray(data.items)) {
      return data.items;
    }

    if (Array.isArray(data.results)) {
      return data.results;
    }

    if (Array.isArray(data.rows)) {
      return data.rows;
    }
  }

  return [];
};

const formatCurrency = (value) => {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatNumber = (value) => {
  return new Intl.NumberFormat("en-IN").format(
    Number(value || 0)
  );
};

const formatDate = (value) => {
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
};

const getName = (employee) => {
  if (!employee) return "Unknown Employee";

  if (employee.name) return employee.name;

  if (employee.fullName) return employee.fullName;

  const first =
    employee.firstName ||
    employee.user?.firstName ||
    "";

  const last =
    employee.lastName ||
    employee.user?.lastName ||
    "";

  const combined = `${first} ${last}`.trim();

  return (
    combined ||
    employee.user?.name ||
    employee.employeeName ||
    "Unknown Employee"
  );
};

const getStatus = (item) => {
  return String(
    item?.status ||
      item?.attendanceStatus ||
      item?.leaveStatus ||
      item?.paymentStatus ||
      "unknown"
  ).toLowerCase();
};

const statusClass = (status) => {
  if (
    [
      "approved",
      "paid",
      "present",
      "active",
      "completed",
      "processed",
    ].includes(status)
  ) {
    return "border-emerald-400/15 bg-emerald-400/[0.07] text-emerald-300";
  }

  if (
    [
      "pending",
      "draft",
      "late",
      "half_day",
      "in_progress",
    ].includes(status)
  ) {
    return "border-amber-400/15 bg-amber-400/[0.07] text-amber-300";
  }

  if (
    [
      "rejected",
      "cancelled",
      "absent",
      "inactive",
      "failed",
    ].includes(status)
  ) {
    return "border-red-400/15 bg-red-400/[0.07] text-red-300";
  }

  return "border-zinc-500/15 bg-zinc-500/[0.07] text-zinc-400";
};

const StatusBadge = ({ status }) => {
  const normalized = String(status || "unknown")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium ${statusClass(
        String(status || "unknown").toLowerCase()
      )}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {normalized}
    </span>
  );
};

const GlassCard = ({
  children,
  className = "",
}) => (
  <div
    className={`rounded-2xl border border-white/[0.07] bg-[#101318]/90 shadow-[0_20px_70px_-35px_rgba(0,0,0,0.9)] ${className}`}
  >
    {children}
  </div>
);

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  loading,
}) => (
  <GlassCard className="relative overflow-hidden p-5">
    <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/[0.025] blur-2xl" />

    <div className="relative flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
          {title}
        </p>

        {loading ? (
          <div className="mt-3 h-7 w-20 animate-pulse rounded-md bg-white/[0.06]" />
        ) : (
          <p className="mt-2 truncate text-2xl font-semibold tracking-tight text-white">
            {value}
          </p>
        )}

        {subtitle && (
          <p className="mt-1 text-[11px] text-zinc-600">
            {subtitle}
          </p>
        )}

        {trend && !loading && (
          <div className="mt-3 inline-flex items-center gap-1 rounded-full border border-emerald-400/10 bg-emerald-400/[0.05] px-2 py-1 text-[10px] text-emerald-300">
            <TrendingUp size={11} />
            {trend}
          </div>
        )}
      </div>

      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.035]">
        <Icon size={19} className="text-zinc-300" />
      </div>
    </div>
  </GlassCard>
);

const SectionHeader = ({
  icon: Icon,
  title,
  subtitle,
  onRefresh,
  loading,
}) => (
  <div className="flex flex-col gap-3 border-b border-white/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.035]">
        <Icon size={16} className="text-zinc-300" />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-white">
          {title}
        </h2>

        {subtitle && (
          <p className="mt-1 text-xs text-zinc-600">
            {subtitle}
          </p>
        )}
      </div>
    </div>

    {onRefresh && (
      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        className="inline-flex h-9 items-center justify-center gap-2 self-start rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 text-[11px] text-zinc-400 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-40 sm:self-auto"
      >
        <RefreshCw
          size={13}
          className={
            loading ? "animate-spin" : ""
          }
        />
        Refresh
      </button>
    )}
  </div>
);

const EmptyState = ({
  icon: Icon = FileBarChart,
  title = "No data available",
  description = "There is no report data to display.",
}) => (
  <div className="flex min-h-[220px] flex-col items-center justify-center px-5 text-center">
    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025]">
      <Icon size={19} className="text-zinc-600" />
    </div>

    <h3 className="mt-4 text-sm font-medium text-zinc-300">
      {title}
    </h3>

    <p className="mt-1 max-w-sm text-xs leading-5 text-zinc-600">
      {description}
    </p>
  </div>
);

const TableShell = ({
  children,
  minWidth = "900px",
}) => (
  <div className="overflow-x-auto">
    <div style={{ minWidth }}>{children}</div>
  </div>
);

const Pagination = ({
  page,
  totalPages,
  onPrevious,
  onNext,
}) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-3">
      <p className="text-[11px] text-zinc-600">
        Page {page} of {totalPages}
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={onPrevious}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/[0.07] bg-white/[0.025] px-2.5 text-[11px] text-zinc-400 hover:bg-white/[0.06] hover:text-white disabled:opacity-30"
        >
          <ChevronLeft size={13} />
          Previous
        </button>

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={onNext}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/[0.07] bg-white/[0.025] px-2.5 text-[11px] text-zinc-400 hover:bg-white/[0.06] hover:text-white disabled:opacity-30"
        >
          Next
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
};

const ReportModal = ({
  open,
  onClose,
  title,
  item,
}) => {
  if (!open || !item) return null;

  const entries = Object.entries(item).filter(
    ([key, value]) =>
      ![
        "_id",
        "id",
        "__v",
        "createdAt",
        "updatedAt",
      ].includes(key) &&
      typeof value !== "object"
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3 backdrop-blur-md sm:p-5">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b0d10] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-white">
              {title}
            </h2>
            <p className="mt-1 text-xs text-zinc-600">
              Report record details
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-500 hover:bg-white/[0.05] hover:text-white"
          >
            <X size={17} />
          </button>
        </div>

        <div className="overflow-y-auto p-5 sm:p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {entries.map(([key, value]) => (
              <div
                key={key}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
                  {key.replaceAll("_", " ")}
                </p>

                <p className="mt-2 break-words text-sm text-zinc-300">
                  {String(value)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-xl border border-white/[0.08] bg-white/[0.025] px-5 text-xs text-zinc-300 hover:bg-white/[0.06]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function HRReports() {
  const [dashboard, setDashboard] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [branches, setBranches] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [performance, setPerformance] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [activeReport, setActiveReport] =
    useState("overview");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("all");

  const [page, setPage] = useState(1);

  const [selectedItem, setSelectedItem] =
    useState(null);

  const [toast, setToast] = useState(null);

  const [errors, setErrors] = useState({});

  const showToast = (type, message) => {
    setToast({
      type,
      message,
    });

    window.clearTimeout(
      window.__hrReportToastTimer
    );

    window.__hrReportToastTimer =
      window.setTimeout(() => {
        setToast(null);
      }, 3500);
  };

  const fetchReport = async (
    endpoint,
    setter,
    errorKey,
    arrayKeys = []
  ) => {
    try {
      const response = await apiRequest(
        `/hr-reports${endpoint}`
      );

      if (setter === setDashboard) {
        setter(unwrap(response) || {});
      } else {
        setter(
          extractArray(response, arrayKeys)
        );
      }

      setErrors((current) => ({
        ...current,
        [errorKey]: null,
      }));
    } catch (error) {
      console.error(
        `HR report ${endpoint} error:`,
        error
      );

      setErrors((current) => ({
        ...current,
        [errorKey]:
          error?.message ||
          "Unable to load report",
      }));
    }
  };

  const loadAllReports = async (
    silent = false
  ) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      await Promise.all([
        fetchReport(
          "/dashboard",
          setDashboard,
          "dashboard"
        ),

        fetchReport(
          "/employees",
          setEmployees,
          "employees",
          ["employees"]
        ),

        fetchReport(
          "/employees/branches",
          setBranches,
          "branches",
          ["branches", "data"]
        ),

        fetchReport(
          "/attendance",
          setAttendance,
          "attendance",
          ["attendance", "records"]
        ),

        fetchReport(
          "/leaves",
          setLeaves,
          "leaves",
          ["leaves", "records"]
        ),

        fetchReport(
          "/payroll",
          setPayroll,
          "payroll",
          ["payroll", "records"]
        ),

        fetchReport(
          "/payslips",
          setPayslips,
          "payslips",
          ["payslips", "records"]
        ),

        fetchReport(
          "/performance",
          setPerformance,
          "performance",
          ["performance", "records"]
        ),
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllReports();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [activeReport, search, statusFilter]);

  const activeData = useMemo(() => {
    switch (activeReport) {
      case "employees":
        return employees;

      case "branches":
        return branches;

      case "attendance":
        return attendance;

      case "leaves":
        return leaves;

      case "payroll":
        return payroll;

      case "payslips":
        return payslips;

      case "performance":
        return performance;

      default:
        return [];
    }
  }, [
    activeReport,
    employees,
    branches,
    attendance,
    leaves,
    payroll,
    payslips,
    performance,
  ]);

  const filteredData = useMemo(() => {
    const query = search.trim().toLowerCase();

    return activeData.filter((item) => {
      const matchesSearch =
        !query ||
        Object.values(item || {}).some(
          (value) =>
            typeof value !== "object" &&
            String(value ?? "")
              .toLowerCase()
              .includes(query)
        );

      const status = getStatus(item);

      const matchesStatus =
        statusFilter === "all" ||
        status === statusFilter;

      return (
        matchesSearch &&
        matchesStatus
      );
    });
  }, [
    activeData,
    search,
    statusFilter,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredData.length / PAGE_SIZE
    )
  );

  const paginatedData = filteredData.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const dashboardStats = useMemo(() => {
    const raw = dashboard || {};

    const employeeCount =
      raw.totalEmployees ??
      raw.employeeCount ??
      raw.employeesCount ??
      employees.length;

    const activeEmployees =
      raw.activeEmployees ??
      raw.activeEmployeeCount ??
      employees.filter(
        (item) =>
          getStatus(item) === "active"
      ).length;

    const payrollTotal =
      raw.totalPayroll ??
      raw.payrollTotal ??
      raw.totalPayrollAmount ??
      payroll.reduce(
        (sum, item) =>
          sum +
          Number(
            item.netSalary ??
              item.totalNetSalary ??
              item.amount ??
              0
          ),
        0
      );

    const leaveCount =
      raw.totalLeaves ??
      raw.leaveCount ??
      leaves.length;

    return {
      employeeCount,
      activeEmployees,
      payrollTotal,
      leaveCount,
    };
  }, [
    dashboard,
    employees,
    payroll,
    leaves,
  ]);

  const reportTabs = [
    {
      id: "overview",
      label: "Overview",
      icon: BarChart3,
    },
    {
      id: "employees",
      label: "Employees",
      icon: Users,
      count: employees.length,
    },
    {
      id: "branches",
      label: "Branches",
      icon: Building2,
      count: branches.length,
    },
    {
      id: "attendance",
      label: "Attendance",
      icon: Clock3,
      count: attendance.length,
    },
    {
      id: "leaves",
      label: "Leaves",
      icon: CalendarDays,
      count: leaves.length,
    },
    {
      id: "payroll",
      label: "Payroll",
      icon: Wallet,
      count: payroll.length,
    },
    {
      id: "payslips",
      label: "Payslips",
      icon: FileText,
      count: payslips.length,
    },
    {
      id: "performance",
      label: "Performance",
      icon: TrendingUp,
      count: performance.length,
    },
  ];

  const reportTitles = {
    employees: "Employee Overview",
    branches: "Branch Employee Report",
    attendance: "Attendance Report",
    leaves: "Leave Report",
    payroll: "Payroll Report",
    payslips: "Payslip Report",
    performance: "Performance Report",
  };

  const exportCSV = () => {
    if (!filteredData.length) {
      showToast(
        "error",
        "No report data available to export"
      );
      return;
    }

    const keys = Array.from(
      new Set(
        filteredData.flatMap((item) =>
          Object.keys(item || {}).filter(
            (key) =>
              ![
                "_id",
                "__v",
                "createdAt",
                "updatedAt",
              ].includes(key)
          )
        )
      )
    );

    const escapeCSV = (value) => {
      const text = String(value ?? "")
        .replaceAll('"', '""');

      return `"${text}"`;
    };

    const rows = [
      keys.map(escapeCSV).join(","),
      ...filteredData.map((item) =>
        keys
          .map((key) => {
            const value = item?.[key];

            if (
              value &&
              typeof value === "object"
            ) {
              return escapeCSV(
                JSON.stringify(value)
              );
            }

            return escapeCSV(value);
          })
          .join(",")
      ),
    ];

    const blob = new Blob(
      [rows.join("\n")],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const anchor =
      document.createElement("a");

    anchor.href = url;

    anchor.download = `${activeReport}-report-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(anchor);

    anchor.click();

    document.body.removeChild(anchor);

    URL.revokeObjectURL(url);

    showToast(
      "success",
      "Report exported successfully"
    );
  };

  const renderEmployeeReport = () => (
    <GlassCard className="overflow-hidden">
      <SectionHeader
        icon={Users}
        title="Employee Overview"
        subtitle="Employee workforce information"
        loading={refreshing}
        onRefresh={() =>
          fetchReport(
            "/employees",
            setEmployees,
            "employees",
            ["employees"]
          )
        }
      />

      {errors.employees ? (
        <div className="p-5">
          <div className="rounded-xl border border-red-400/10 bg-red-400/[0.04] p-4 text-xs text-red-300">
            {errors.employees}
          </div>
        </div>
      ) : !paginatedData.length ? (
        <EmptyState
          icon={Users}
          title="No employees found"
          description="Employee report data is currently empty."
        />
      ) : (
        <>
          <div className="hidden lg:block">
            <TableShell>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06] text-left">
                    <th className="px-5 py-3 text-[10px] uppercase tracking-wider text-zinc-600">
                      Employee
                    </th>
                    <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-zinc-600">
                      Code
                    </th>
                    <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-zinc-600">
                      Department
                    </th>
                    <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-zinc-600">
                      Designation
                    </th>
                    <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-zinc-600">
                      Status
                    </th>
                    <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-zinc-600">
                      View
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedData.map(
                    (employee, index) => (
                      <tr
                        key={
                          employee?._id ||
                          employee?.id ||
                          index
                        }
                        className="border-b border-white/[0.045] hover:bg-white/[0.018]"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.035] text-xs font-medium text-zinc-400">
                              {getName(
                                employee
                              )
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div>
                              <p className="text-xs font-medium text-white">
                                {getName(
                                  employee
                                )}
                              </p>

                              <p className="mt-1 text-[10px] text-zinc-600">
                                {employee.email ||
                                  employee.user?.email ||
                                  "No email"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-xs text-zinc-400">
                          {employee.employeeCode ||
                            employee.code ||
                            "—"}
                        </td>

                        <td className="px-4 py-4 text-xs text-zinc-400">
                          {employee.department?.name ||
                            employee.departmentName ||
                            employee.department ||
                            "—"}
                        </td>

                        <td className="px-4 py-4 text-xs text-zinc-400">
                          {employee.designation?.name ||
                            employee.designationName ||
                            employee.designation ||
                            "—"}
                        </td>

                        <td className="px-4 py-4">
                          <StatusBadge
                            status={
                              employee.status ||
                              "active"
                            }
                          />
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedItem(
                                employee
                              )
                            }
                            className="rounded-lg p-2 text-zinc-500 hover:bg-white/[0.05] hover:text-white"
                          >
                            <Eye size={15} />
                          </button>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </TableShell>
          </div>

          <div className="grid gap-3 p-4 lg:hidden">
            {paginatedData.map(
              (employee, index) => (
                <div
                  key={
                    employee?._id ||
                    employee?.id ||
                    index
                  }
                  className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-sm text-zinc-300">
                        {getName(
                          employee
                        )
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">
                          {getName(employee)}
                        </p>

                        <p className="mt-1 truncate text-[10px] text-zinc-600">
                          {employee.employeeCode ||
                            employee.code ||
                            "No code"}
                        </p>
                      </div>
                    </div>

                    <StatusBadge
                      status={
                        employee.status ||
                        "active"
                      }
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-white/[0.025] p-3">
                      <p className="text-[9px] uppercase text-zinc-600">
                        Department
                      </p>
                      <p className="mt-1 truncate text-xs text-zinc-300">
                        {employee.department?.name ||
                          employee.departmentName ||
                          employee.department ||
                          "—"}
                      </p>
                    </div>

                    <div className="rounded-lg bg-white/[0.025] p-3">
                      <p className="text-[9px] uppercase text-zinc-600">
                        Designation
                      </p>
                      <p className="mt-1 truncate text-xs text-zinc-300">
                        {employee.designation?.name ||
                          employee.designationName ||
                          employee.designation ||
                          "—"}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedItem(
                        employee
                      )
                    }
                    className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 text-xs text-zinc-300"
                  >
                    <Eye size={14} />
                    View Details
                  </button>
                </div>
              )
            )}
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            onPrevious={() =>
              setPage((value) =>
                Math.max(value - 1, 1)
              )
            }
            onNext={() =>
              setPage((value) =>
                Math.min(
                  value + 1,
                  totalPages
                )
              )
            }
          />
        </>
      )}
    </GlassCard>
  );

  const renderGenericReport = () => {
    const title =
      reportTitles[activeReport] ||
      "HR Report";

    const iconMap = {
      branches: Building2,
      attendance: Clock3,
      leaves: CalendarDays,
      payroll: Wallet,
      payslips: FileText,
      performance: TrendingUp,
    };

    const Icon =
      iconMap[activeReport] ||
      FileBarChart;

    const error =
      errors[activeReport];

    return (
      <GlassCard className="overflow-hidden">
        <SectionHeader
          icon={Icon}
          title={title}
          subtitle={`Detailed ${activeReport} reporting data`}
          loading={refreshing}
          onRefresh={() => {
            const setters = {
              branches: setBranches,
              attendance: setAttendance,
              leaves: setLeaves,
              payroll: setPayroll,
              payslips: setPayslips,
              performance: setPerformance,
            };

            const keys = {
              branches: [
                "branches",
                "data",
              ],
              attendance: [
                "attendance",
                "records",
              ],
              leaves: [
                "leaves",
                "records",
              ],
              payroll: [
                "payroll",
                "records",
              ],
              payslips: [
                "payslips",
                "records",
              ],
              performance: [
                "performance",
                "records",
              ],
            };

            const endpoints = {
              branches:
                "/employees/branches",
              attendance:
                "/attendance",
              leaves: "/leaves",
              payroll: "/payroll",
              payslips: "/payslips",
              performance:
                "/performance",
            };

            fetchReport(
              endpoints[activeReport],
              setters[activeReport],
              activeReport,
              keys[activeReport]
            );
          }}
        />

        {error ? (
          <div className="p-5">
            <div className="flex gap-3 rounded-xl border border-red-400/10 bg-red-400/[0.04] p-4">
              <AlertCircle
                size={17}
                className="shrink-0 text-red-400"
              />
              <p className="text-xs leading-5 text-red-300">
                {error}
              </p>
            </div>
          </div>
        ) : !paginatedData.length ? (
          <EmptyState
            icon={Icon}
            title={`No ${activeReport} data`}
            description="The report endpoint returned no records."
          />
        ) : (
          <>
            <div className="hidden lg:block">
              <TableShell minWidth="1000px">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-left">
                      <th className="px-5 py-3 text-[10px] uppercase tracking-wider text-zinc-600">
                        Record
                      </th>

                      <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-zinc-600">
                        Employee
                      </th>

                      <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-zinc-600">
                        Date / Period
                      </th>

                      <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-zinc-600">
                        Status
                      </th>

                      <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-zinc-600">
                        Amount
                      </th>

                      <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-zinc-600">
                        Details
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedData.map(
                      (item, index) => {
                        const amount =
                          item.netSalary ??
                          item.netAmount ??
                          item.amount ??
                          item.grossSalary ??
                          item.totalAmount;

                        const date =
                          item.date ||
                          item.createdAt ||
                          item.startDate ||
                          item.payPeriodStart ||
                          item.reviewPeriodStart;

                        return (
                          <tr
                            key={
                              item?._id ||
                              item?.id ||
                              index
                            }
                            className="border-b border-white/[0.045] hover:bg-white/[0.018]"
                          >
                            <td className="px-5 py-4">
                              <p className="max-w-[220px] truncate text-xs font-medium text-zinc-300">
                                {item.name ||
                                  item.title ||
                                  item.code ||
                                  item._id ||
                                  `Record ${index + 1}`}
                              </p>

                              <p className="mt-1 max-w-[220px] truncate text-[10px] text-zinc-600">
                                {item.type ||
                                  item.category ||
                                  activeReport}
                              </p>
                            </td>

                            <td className="px-4 py-4 text-xs text-zinc-400">
                              {getName(
                                item.employee ||
                                  item
                              )}
                            </td>

                            <td className="px-4 py-4 text-xs text-zinc-400">
                              {formatDate(date)}
                            </td>

                            <td className="px-4 py-4">
                              <StatusBadge
                                status={getStatus(
                                  item
                                )}
                              />
                            </td>

                            <td className="px-4 py-4">
                              {amount !==
                              undefined ? (
                                <span className="text-xs font-medium text-zinc-200">
                                  {formatCurrency(
                                    amount
                                  )}
                                </span>
                              ) : (
                                <span className="text-xs text-zinc-600">
                                  —
                                </span>
                              )}
                            </td>

                            <td className="px-5 py-4 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedItem(
                                    item
                                  )
                                }
                                className="rounded-lg p-2 text-zinc-500 hover:bg-white/[0.05] hover:text-white"
                              >
                                <Eye size={15} />
                              </button>
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </TableShell>
            </div>

            <div className="grid gap-3 p-4 lg:hidden">
              {paginatedData.map(
                (item, index) => {
                  const amount =
                    item.netSalary ??
                    item.netAmount ??
                    item.amount ??
                    item.grossSalary ??
                    item.totalAmount;

                  const date =
                    item.date ||
                    item.createdAt ||
                    item.startDate ||
                    item.payPeriodStart ||
                    item.reviewPeriodStart;

                  return (
                    <div
                      key={
                        item?._id ||
                        item?.id ||
                        index
                      }
                      className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">
                            {item.name ||
                              item.title ||
                              item.code ||
                              `Record ${index + 1}`}
                          </p>

                          <p className="mt-1 text-[10px] text-zinc-600">
                            {formatDate(date)}
                          </p>
                        </div>

                        <StatusBadge
                          status={getStatus(
                            item
                          )}
                        />
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <div className="rounded-lg bg-white/[0.025] p-3">
                          <p className="text-[9px] uppercase text-zinc-600">
                            Employee
                          </p>

                          <p className="mt-1 truncate text-xs text-zinc-300">
                            {getName(
                              item.employee ||
                                item
                            )}
                          </p>
                        </div>

                        <div className="rounded-lg bg-white/[0.025] p-3">
                          <p className="text-[9px] uppercase text-zinc-600">
                            Amount
                          </p>

                          <p className="mt-1 text-xs font-medium text-zinc-200">
                            {amount !==
                            undefined
                              ? formatCurrency(
                                  amount
                                )
                              : "—"}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setSelectedItem(
                            item
                          )
                        }
                        className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 text-xs text-zinc-300"
                      >
                        <Eye size={14} />
                        View Details
                      </button>
                    </div>
                  );
                }
              )}
            </div>

            <Pagination
              page={page}
              totalPages={totalPages}
              onPrevious={() =>
                setPage((value) =>
                  Math.max(value - 1, 1)
                )
              }
              onNext={() =>
                setPage((value) =>
                  Math.min(
                    value + 1,
                    totalPages
                  )
                )
              }
            />
          </>
        )}
      </GlassCard>
    );
  };

  const renderOverview = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Employees"
          value={formatNumber(
            dashboardStats.employeeCount
          )}
          subtitle="Current workforce"
          icon={Users}
          loading={loading}
        />

        <StatCard
          title="Active Employees"
          value={formatNumber(
            dashboardStats.activeEmployees
          )}
          subtitle="Currently active"
          icon={UserCheck}
          loading={loading}
        />

        <StatCard
          title="Payroll"
          value={formatCurrency(
            dashboardStats.payrollTotal
          )}
          subtitle="Reported payroll amount"
          icon={IndianRupee}
          loading={loading}
        />

        <StatCard
          title="Leave Records"
          value={formatNumber(
            dashboardStats.leaveCount
          )}
          subtitle="Leave activity"
          icon={CalendarDays}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <GlassCard className="overflow-hidden">
          <SectionHeader
            icon={Users}
            title="Workforce Snapshot"
            subtitle="Employee and branch reporting"
          />

          <div className="grid grid-cols-2 gap-3 p-4 sm:p-5">
            <button
              type="button"
              onClick={() =>
                setActiveReport(
                  "employees"
                )
              }
              className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-left transition hover:border-white/[0.12] hover:bg-white/[0.04]"
            >
              <Users
                size={17}
                className="text-zinc-500 transition group-hover:text-white"
              />

              <p className="mt-4 text-xl font-semibold text-white">
                {formatNumber(
                  employees.length
                )}
              </p>

              <p className="mt-1 text-xs text-zinc-600">
                Employee records
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveReport(
                  "branches"
                )
              }
              className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-left transition hover:border-white/[0.12] hover:bg-white/[0.04]"
            >
              <Building2
                size={17}
                className="text-zinc-500 transition group-hover:text-white"
              />

              <p className="mt-4 text-xl font-semibold text-white">
                {formatNumber(
                  branches.length
                )}
              </p>

              <p className="mt-1 text-xs text-zinc-600">
                Branch records
              </p>
            </button>
          </div>
        </GlassCard>

        <GlassCard className="overflow-hidden">
          <SectionHeader
            icon={Activity}
            title="HR Activity"
            subtitle="Attendance, leave and performance records"
          />

          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 sm:p-5">
            <button
              type="button"
              onClick={() =>
                setActiveReport(
                  "attendance"
                )
              }
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-left hover:bg-white/[0.04]"
            >
              <Clock3
                size={16}
                className="text-zinc-500"
              />

              <p className="mt-3 text-lg font-semibold text-white">
                {formatNumber(
                  attendance.length
                )}
              </p>

              <p className="mt-1 text-[10px] text-zinc-600">
                Attendance
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveReport("leaves")
              }
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-left hover:bg-white/[0.04]"
            >
              <CalendarDays
                size={16}
                className="text-zinc-500"
              />

              <p className="mt-3 text-lg font-semibold text-white">
                {formatNumber(
                  leaves.length
                )}
              </p>

              <p className="mt-1 text-[10px] text-zinc-600">
                Leaves
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveReport(
                  "performance"
                )
              }
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-left hover:bg-white/[0.04]"
            >
              <TrendingUp
                size={16}
                className="text-zinc-500"
              />

              <p className="mt-3 text-lg font-semibold text-white">
                {formatNumber(
                  performance.length
                )}
              </p>

              <p className="mt-1 text-[10px] text-zinc-600">
                Performance
              </p>
            </button>
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <GlassCard className="overflow-hidden">
          <SectionHeader
            icon={Wallet}
            title="Payroll & Payslips"
            subtitle="Compensation reporting"
          />

          <div className="space-y-3 p-4 sm:p-5">
            <button
              type="button"
              onClick={() =>
                setActiveReport(
                  "payroll"
                )
              }
              className="flex w-full items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-left hover:bg-white/[0.04]"
            >
              <div className="flex items-center gap-3">
                <Wallet
                  size={17}
                  className="text-zinc-500"
                />

                <div>
                  <p className="text-xs font-medium text-zinc-200">
                    Payroll Reports
                  </p>

                  <p className="mt-1 text-[10px] text-zinc-600">
                    {formatNumber(
                      payroll.length
                    )}{" "}
                    records
                  </p>
                </div>
              </div>

              <ChevronRight
                size={16}
                className="text-zinc-600"
              />
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveReport(
                  "payslips"
                )
              }
              className="flex w-full items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-left hover:bg-white/[0.04]"
            >
              <div className="flex items-center gap-3">
                <FileText
                  size={17}
                  className="text-zinc-500"
                />

                <div>
                  <p className="text-xs font-medium text-zinc-200">
                    Payslip Reports
                  </p>

                  <p className="mt-1 text-[10px] text-zinc-600">
                    {formatNumber(
                      payslips.length
                    )}{" "}
                    records
                  </p>
                </div>
              </div>

              <ChevronRight
                size={16}
                className="text-zinc-600"
              />
            </button>
          </div>
        </GlassCard>

        <GlassCard className="overflow-hidden">
          <SectionHeader
            icon={FileBarChart}
            title="Report Coverage"
            subtitle="Available HR reporting modules"
          />

          <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3 sm:p-5">
            {reportTabs
              .filter(
                (tab) =>
                  tab.id !== "overview"
              )
              .map((tab) => {
                const Icon = tab.icon;

                return (
                  <button
                    type="button"
                    key={tab.id}
                    onClick={() =>
                      setActiveReport(
                        tab.id
                      )
                    }
                    className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-left transition hover:bg-white/[0.04]"
                  >
                    <Icon
                      size={15}
                      className="text-zinc-500"
                    />

                    <p className="mt-3 truncate text-xs text-zinc-300">
                      {tab.label}
                    </p>

                    <p className="mt-1 text-[10px] text-zinc-600">
                      {tab.count ?? 0} records
                    </p>
                  </button>
                );
              })}
          </div>
        </GlassCard>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-[#080a0d] text-white">
      <div className="w-full px-3 py-4 sm:px-5 lg:px-7 xl:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
              <FileBarChart size={13} />
              HR / Analytics
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              HR Reports
            </h1>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
              Centralized workforce, attendance, leave,
              payroll, payslip and performance reporting.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                loadAllReports(true)
              }
              disabled={refreshing}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 text-xs font-medium text-zinc-300 hover:bg-white/[0.07] hover:text-white disabled:opacity-40"
            >
              <RefreshCw
                size={15}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />
              Refresh
            </button>

            {activeReport !== "overview" && (
              <button
                type="button"
                onClick={exportCSV}
                disabled={!filteredData.length}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-xs font-semibold text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Download size={15} />
                Export CSV
              </button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <GlassCard className="mb-5 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="flex min-w-max items-center gap-1 p-2">
              {reportTabs.map((tab) => {
                const Icon = tab.icon;
                const active =
                  activeReport ===
                  tab.id;

                return (
                  <button
                    type="button"
                    key={tab.id}
                    onClick={() => {
                      setActiveReport(
                        tab.id
                      );
                      setSearch("");
                      setStatusFilter(
                        "all"
                      );
                    }}
                    className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-[11px] font-medium transition ${
                      active
                        ? "bg-white text-black"
                        : "text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-200"
                    }`}
                  >
                    <Icon size={14} />

                    {tab.label}

                    {tab.count !==
                      undefined && (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[9px] ${
                          active
                            ? "bg-black/10 text-black"
                            : "bg-white/[0.06] text-zinc-600"
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </GlassCard>

        {/* Overview */}
        {activeReport ===
          "overview" && renderOverview()}

        {/* Report toolbar */}
        {activeReport !==
          "overview" && (
          <>
            <GlassCard className="mb-5 overflow-hidden">
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div className="relative w-full sm:max-w-md">
                  <Search
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600"
                  />

                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target.value
                      )
                    }
                    placeholder={`Search ${activeReport} report...`}
                    className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#0d1014] pl-10 pr-4 text-xs text-white outline-none placeholder:text-zinc-600 focus:border-white/20"
                  />
                </div>

                <div className="flex gap-2">
                  <div className="relative">
                    <select
                      value={
                        statusFilter
                      }
                      onChange={(event) =>
                        setStatusFilter(
                          event.target.value
                        )
                      }
                      className="h-10 appearance-none rounded-xl border border-white/[0.08] bg-[#0d1014] py-0 pl-3 pr-9 text-xs text-zinc-300 outline-none focus:border-white/20"
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
                      <option value="present">
                        Present
                      </option>
                      <option value="absent">
                        Absent
                      </option>
                      <option value="late">
                        Late
                      </option>
                      <option value="pending">
                        Pending
                      </option>
                      <option value="approved">
                        Approved
                      </option>
                      <option value="rejected">
                        Rejected
                      </option>
                      <option value="processed">
                        Processed
                      </option>
                      <option value="paid">
                        Paid
                      </option>
                    </select>

                    <ChevronDown
                      size={13}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600"
                    />
                  </div>

                  {(search ||
                    statusFilter !==
                      "all") && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch("");
                        setStatusFilter(
                          "all"
                        );
                      }}
                      className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-white/[0.08] px-3 text-xs text-zinc-500 hover:text-white"
                    >
                      <X size={13} />
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className="border-t border-white/[0.06] px-4 py-2.5 text-[10px] text-zinc-600 sm:px-5">
                Showing{" "}
                {filteredData.length}{" "}
                {activeReport} records
              </div>
            </GlassCard>

            {activeReport ===
            "employees"
              ? renderEmployeeReport()
              : renderGenericReport()}
          </>
        )}
      </div>

      {/* Detail modal */}
      <ReportModal
        open={Boolean(selectedItem)}
        onClose={() =>
          setSelectedItem(null)
        }
        title={
          activeReport === "employees"
            ? "Employee Details"
            : `${
                reportTitles[
                  activeReport
                ] || "Report"
              } Details`
        }
        item={selectedItem}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 z-[200] w-[calc(100%-24px)] max-w-md -translate-x-1/2 sm:left-auto sm:right-5 sm:translate-x-0">
          <div
            className={`flex items-start gap-3 rounded-xl border p-4 shadow-2xl backdrop-blur-xl ${
              toast.type === "success"
                ? "border-emerald-400/15 bg-[#0e1713]/95"
                : "border-red-400/15 bg-[#170e0e]/95"
            }`}
          >
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                toast.type === "success"
                  ? "bg-emerald-400/10"
                  : "bg-red-400/10"
              }`}
            >
              {toast.type ===
              "success" ? (
                <CheckCircle2
                  size={15}
                  className="text-emerald-400"
                />
              ) : (
                <AlertCircle
                  size={15}
                  className="text-red-400"
                />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white">
                {toast.type ===
                "success"
                  ? "Success"
                  : "Error"}
              </p>

              <p className="mt-1 text-xs leading-5 text-zinc-500">
                {toast.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setToast(null)
              }
              className="text-zinc-600 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}