import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  Plus,
  Eye,
  Trash2,
  FileText,
  Download,
  Printer,
  X,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  UserRound,
  IndianRupee,
  WalletCards,
  CircleCheck,
  Clock3,
  AlertCircle,
  Building2,
  BriefcaseBusiness,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";
import api, { getToken } from "../../services/api";
const API_BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

const getEmployeeName = (employee) => {
  if (!employee) return "Unknown Employee";

  if (typeof employee === "string") return employee;

  const firstName =
    employee.firstName ||
    employee.user?.firstName ||
    "";

  const lastName =
    employee.lastName ||
    employee.user?.lastName ||
    "";

  const fullName =
    employee.name ||
    employee.fullName ||
    employee.employeeName ||
    employee.user?.name ||
    employee.user?.fullName ||
    `${firstName} ${lastName}`.trim();

  return fullName || employee.employeeCode || "Unknown Employee";
};

const getEmployeeCode = (employee) => {
  if (!employee) return "-";
  if (typeof employee === "string") return employee;

  return (
    employee.employeeCode ||
    employee.code ||
    employee.user?.employeeCode ||
    "-"
  );
};

const formatCurrency = (value) => {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getMonthName = (month) => {
  const value = Number(month);

  if (!value || value < 1 || value > 12) return "-";

  return new Date(2026, value - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
  });
};

const getStatusConfig = (status) => {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "paid") {
    return {
      label: "Paid",
      icon: CircleCheck,
      className:
        "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    };
  }

  if (normalized === "approved") {
    return {
      label: "Approved",
      icon: ShieldCheck,
      className: "border-blue-400/20 bg-blue-400/10 text-blue-300",
    };
  }

  if (normalized === "processed") {
    return {
      label: "Processed",
      icon: CircleCheck,
      className: "border-violet-400/20 bg-violet-400/10 text-violet-300",
    };
  }

  if (normalized === "cancelled") {
    return {
      label: "Cancelled",
      icon: AlertCircle,
      className: "border-red-400/20 bg-red-400/10 text-red-300",
    };
  }

  return {
    label: status || "Generated",
    icon: Clock3,
    className: "border-amber-400/20 bg-amber-400/10 text-amber-300",
  };
};

const extractList = (payload, keys = []) => {
  if (Array.isArray(payload)) return payload;

  if (Array.isArray(payload?.data)) return payload.data;

  if (Array.isArray(payload?.data?.items)) return payload.data.items;

  if (Array.isArray(payload?.data?.docs)) return payload.data.docs;

  if (Array.isArray(payload?.items)) return payload.items;

  if (Array.isArray(payload?.docs)) return payload.docs;

  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
    if (Array.isArray(payload?.data?.[key])) return payload.data[key];
  }

  return [];
};

const getPagination = (payload, fallbackPage, fallbackLimit, fallbackTotal) => {
  const pagination =
    payload?.pagination ||
    payload?.data?.pagination ||
    payload?.meta ||
    {};

  return {
    page: Number(pagination.page || payload?.page || fallbackPage),
    limit: Number(
      pagination.limit ||
        payload?.limit ||
        fallbackLimit
    ),
    total: Number(
      pagination.total ??
        payload?.total ??
        fallbackTotal
    ),
    pages: Number(
      pagination.pages ||
        Math.ceil(
          Number(
            pagination.total ??
              payload?.total ??
              fallbackTotal
          ) / fallbackLimit
        ) ||
        1
    ),
  };
};

const Modal = ({ open, onClose, children, size = "max-w-5xl" }) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-5"
      onMouseDown={onClose}
    >
      <div
        className={`relative max-h-[92vh] w-full ${size} overflow-hidden rounded-2xl border border-white/10 bg-[#0b0d12] shadow-2xl shadow-black/50`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, subtext }) => (
  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 transition hover:border-white/[0.12] hover:bg-white/[0.04] sm:p-5">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-xs font-medium uppercase tracking-wider text-slate-500">
          {label}
        </p>

        <p className="mt-2 truncate text-xl font-bold text-white sm:text-2xl">
          {value}
        </p>

        {subtext && (
          <p className="mt-1 truncate text-xs text-slate-500">
            {subtext}
          </p>
        )}
      </div>

      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04]">
        <Icon size={18} className="text-slate-300" />
      </div>
    </div>
  </div>
);

const DetailRow = ({ label, value, strong = false }) => (
  <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] py-3 last:border-b-0">
    <span className="text-sm text-slate-500">{label}</span>
    <span
      className={`text-right text-sm ${
        strong ? "font-semibold text-white" : "text-slate-300"
      }`}
    >
      {value}
    </span>
  </div>
);

const Payslip = () => {
  const [payslips, setPayslips] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [payrolls, setPayrolls] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingPayrolls, setLoadingPayrolls] = useState(false);

  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [employeeId, setEmployeeId] = useState("");

  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  });

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [selectedPayrollId, setSelectedPayrollId] = useState("");

  const [detailsLoading, setDetailsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const showToast = useCallback((type, message) => {
    setToast({ type, message });

    window.setTimeout(() => {
      setToast(null);
    }, 3500);
  }, []);

  const apiFetch = useCallback(async (endpoint, options = {}) => {
    const token = getToken();

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
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
          "Something went wrong. Please try again."
      );
    }

    return payload;
  }, []);

  const loadPayslips = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (status) {
        params.set("status", status);
      }

      if (month) {
        params.set("month", month);
      }

      if (year) {
        params.set("year", year);
      }

      if (employeeId) {
        params.set("employeeId", employeeId);
      }

      params.set("page", String(page));
      params.set("limit", String(limit));

      const query = params.toString();

      const payload = await apiFetch(
        `/payslips${query ? `?${query}` : ""}`
      );

      const items = extractList(payload, ["payslips"]);

      setPayslips(items);

      setPagination(
        getPagination(
          payload,
          page,
          limit,
          items.length
        )
      );
    } catch (err) {
      setError(err.message || "Failed to load payslips.");
      setPayslips([]);
    } finally {
      setLoading(false);
    }
  }, [
    apiFetch,
    employeeId,
    limit,
    month,
    page,
    search,
    status,
    year,
  ]);

  const loadEmployees = useCallback(async () => {
    setLoadingEmployees(true);

    try {
      const payload = await apiFetch(
        "/employees?limit=1000"
      );

      const items = extractList(payload, ["employees"]);

      setEmployees(items);
    } catch {
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  }, [apiFetch]);

  const loadPayrolls = useCallback(async () => {
    setLoadingPayrolls(true);

    try {
      const payload = await apiFetch(
        "/payroll?limit=1000"
      );

      const items = extractList(payload, ["payrolls"]);

      setPayrolls(items);
    } catch {
      setPayrolls([]);
    } finally {
      setLoadingPayrolls(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    loadPayslips();
  }, [loadPayslips]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const openGenerateModal = async () => {
    setSelectedPayrollId("");
    setShowGenerateModal(true);

    if (!payrolls.length) {
      await loadPayrolls();
    }
  };

  const generatePayslip = async () => {
    if (!selectedPayrollId) {
      showToast("error", "Please select a payroll record.");
      return;
    }

    setActionLoading(true);

    try {
      await apiFetch("/payslips/generate", {
        method: "POST",
        body: JSON.stringify({
          payrollId: selectedPayrollId,
        }),
      });

      setShowGenerateModal(false);
      setSelectedPayrollId("");

      showToast(
        "success",
        "Payslip generated successfully."
      );

      setPage(1);
      await loadPayslips();
    } catch (err) {
      showToast(
        "error",
        err.message || "Failed to generate payslip."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const openDetails = async (id) => {
    if (!id) return;

    setShowDetailsModal(true);
    setDetailsLoading(true);
    setSelectedPayslip(null);

    try {
      const payload = await apiFetch(
        `/payslips/${id}`
      );

      const data =
        payload?.data?.payslip ||
        payload?.data ||
        payload?.payslip ||
        payload;

      setSelectedPayslip(data);
    } catch (err) {
      setShowDetailsModal(false);

      showToast(
        "error",
        err.message || "Failed to load payslip."
      );
    } finally {
      setDetailsLoading(false);
    }
  };

  const confirmDelete = (payslip) => {
    setSelectedPayslip(payslip);
    setShowDeleteModal(true);
  };

  const deletePayslip = async () => {
    if (!selectedPayslip?._id) return;

    setActionLoading(true);

    try {
      await apiFetch(
        `/payslips/${selectedPayslip._id}`,
        {
          method: "DELETE",
        }
      );

      setShowDeleteModal(false);
      setSelectedPayslip(null);

      showToast(
        "success",
        "Payslip deleted successfully."
      );

      await loadPayslips();
    } catch (err) {
      showToast(
        "error",
        err.message || "Failed to delete payslip."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("");
    setMonth("");
    setYear("");
    setEmployeeId("");
    setPage(1);
  };

  const filteredPayrolls = useMemo(() => {
    const generatedPayrollIds = new Set(
      payslips
        .map((item) => {
          const payroll =
            item?.payrollId || item?.payroll;

          return typeof payroll === "object"
            ? payroll?._id
            : payroll;
        })
        .filter(Boolean)
    );

    return payrolls
      .filter((payroll) => {
        const payrollStatus = String(
          payroll?.status || ""
        ).toLowerCase();

        return (
          ["processed", "approved", "paid"].includes(
            payrollStatus
          ) &&
          !generatedPayrollIds.has(payroll?._id)
        );
      })
      .sort((a, b) => {
        const yearDiff =
          Number(b?.year || 0) -
          Number(a?.year || 0);

        if (yearDiff !== 0) return yearDiff;

        return (
          Number(b?.month || 0) -
          Number(a?.month || 0)
        );
      });
  }, [payrolls, payslips]);

  const stats = useMemo(() => {
    const total = pagination.total || payslips.length;

    const paid = payslips.filter(
      (item) =>
        String(item?.status || "").toLowerCase() ===
        "paid"
    ).length;

    const totalNet = payslips.reduce(
      (sum, item) =>
        sum +
        Number(
          item?.netSalary ??
            item?.payroll?.netSalary ??
            0
        ),
      0
    );

    const totalGross = payslips.reduce(
      (sum, item) =>
        sum +
        Number(
          item?.grossSalary ??
            item?.payroll?.grossSalary ??
            0
        ),
      0
    );

    return {
      total,
      paid,
      totalNet,
      totalGross,
    };
  }, [pagination.total, payslips]);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();

    return Array.from(
      { length: 6 },
      (_, index) => currentYear - index
    );
  }, []);

  const getPayslipEmployee = (item) => {
    return (
      item?.employee ||
      item?.employeeId ||
      item?.payroll?.employee ||
      item?.payroll?.employeeId
    );
  };

  const getPayslipEmployeeName = (item) => {
    const employee = getPayslipEmployee(item);

    if (
      typeof employee === "object" &&
      employee !== null
    ) {
      return getEmployeeName(employee);
    }

    const matchedEmployee = employees.find(
      (emp) => emp?._id === employee
    );

    return getEmployeeName(matchedEmployee);
  };

  const getPayslipEmployeeCode = (item) => {
    const employee = getPayslipEmployee(item);

    if (
      typeof employee === "object" &&
      employee !== null
    ) {
      return getEmployeeCode(employee);
    }

    const matchedEmployee = employees.find(
      (emp) => emp?._id === employee
    );

    return getEmployeeCode(matchedEmployee);
  };

  const getPayslipMonth = (item) => {
    const payroll = item?.payroll;

    return (
      item?.month ??
      payroll?.month ??
      null
    );
  };

  const getPayslipYear = (item) => {
    const payroll = item?.payroll;

    return (
      item?.year ??
      payroll?.year ??
      null
    );
  };

  const getNetSalary = (item) =>
    Number(
      item?.netSalary ??
        item?.payroll?.netSalary ??
        0
    );

  const getGrossSalary = (item) =>
    Number(
      item?.grossSalary ??
        item?.payroll?.grossSalary ??
        0
    );

  const getPayslipNumber = (item) =>
    item?.payslipNumber ||
    item?.number ||
    item?.payslipNo ||
    "-";

  const printPayslip = (payslip) => {
    if (!payslip) return;

    const employeeName =
      getEmployeeName(
        payslip.employee ||
          payslip.employeeId ||
          payslip.payroll?.employee ||
          payslip.payroll?.employeeId
      );

    const employeeCode = getEmployeeCode(
      payslip.employee ||
        payslip.employeeId ||
        payslip.payroll?.employee ||
        payslip.payroll?.employeeId
    );

    const monthValue =
      payslip.month ??
      payslip.payroll?.month;

    const yearValue =
      payslip.year ??
      payslip.payroll?.year;

    const gross = getGrossSalary(payslip);
    const net = getNetSalary(payslip);

    const basic =
      payslip.basicSalary ??
      payslip.payroll?.basicSalary ??
      0;

    const allowances =
      payslip.allowances ??
      payslip.payroll?.allowances ??
      0;

    const overtime =
      payslip.overtimeAmount ??
      payslip.payroll?.overtimeAmount ??
      0;

    const bonus =
      payslip.bonus ??
      payslip.payroll?.bonus ??
      0;

    const deductions =
      payslip.deductions ??
      payslip.payroll?.deductions ??
      0;

    const tax =
      payslip.tax ??
      payslip.payroll?.tax ??
      0;

    const otherDeductions =
      payslip.otherDeductions ??
      payslip.payroll?.otherDeductions ??
      0;

    const printWindow = window.open(
      "",
      "_blank",
      "width=900,height=900"
    );

    if (!printWindow) {
      showToast(
        "error",
        "Please allow pop-ups to print the payslip."
      );
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${getPayslipNumber(payslip)}</title>
          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 32px;
              font-family: Arial, sans-serif;
              color: #111827;
              background: #ffffff;
            }

            .sheet {
              max-width: 850px;
              margin: 0 auto;
              border: 1px solid #e5e7eb;
              padding: 32px;
            }

            .header {
              display: flex;
              justify-content: space-between;
              gap: 24px;
              border-bottom: 2px solid #111827;
              padding-bottom: 20px;
            }

            .company {
              font-size: 24px;
              font-weight: 800;
            }

            .muted {
              color: #6b7280;
              font-size: 13px;
              margin-top: 5px;
            }

            .title {
              text-align: right;
            }

            .title h1 {
              margin: 0;
              font-size: 25px;
            }

            .info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin: 25px 0;
            }

            .box {
              border: 1px solid #e5e7eb;
              padding: 16px;
            }

            .label {
              color: #6b7280;
              font-size: 11px;
              text-transform: uppercase;
              margin-bottom: 5px;
            }

            .value {
              font-size: 15px;
              font-weight: 700;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }

            th, td {
              border: 1px solid #e5e7eb;
              padding: 11px;
              text-align: left;
            }

            th {
              background: #f3f4f6;
            }

            td:last-child,
            th:last-child {
              text-align: right;
            }

            .net {
              margin-top: 22px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 18px;
              background: #f3f4f6;
              font-size: 18px;
              font-weight: 800;
            }

            .footer {
              margin-top: 35px;
              color: #6b7280;
              font-size: 11px;
              text-align: center;
            }

            @media print {
              body {
                padding: 0;
              }

              .sheet {
                border: none;
              }
            }
          </style>
        </head>

        <body>
          <div class="sheet">

            <div class="header">
              <div>
                <div class="company">
                  Ready Tech Solutions
                </div>
                <div class="muted">
                  Employee Payroll & Payslip
                </div>
              </div>

              <div class="title">
                <h1>PAYSLIP</h1>
                <div class="muted">
                  ${getPayslipNumber(payslip)}
                </div>
              </div>
            </div>

            <div class="info">
              <div class="box">
                <div class="label">Employee</div>
                <div class="value">${employeeName}</div>
                <div class="muted">${employeeCode}</div>
              </div>

              <div class="box">
                <div class="label">Pay Period</div>
                <div class="value">
                  ${getMonthName(monthValue)} ${yearValue || ""}
                </div>
                <div class="muted">
                  Generated ${formatDate(
                    payslip.createdAt
                  )}
                </div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Earnings</th>
                  <th>Amount</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td>Basic Salary</td>
                  <td>${formatCurrency(basic)}</td>
                </tr>

                <tr>
                  <td>Allowances</td>
                  <td>${formatCurrency(allowances)}</td>
                </tr>

                <tr>
                  <td>Overtime</td>
                  <td>${formatCurrency(overtime)}</td>
                </tr>

                <tr>
                  <td>Bonus</td>
                  <td>${formatCurrency(bonus)}</td>
                </tr>

                <tr>
                  <th>Gross Salary</th>
                  <th>${formatCurrency(gross)}</th>
                </tr>
              </tbody>
            </table>

            <table>
              <thead>
                <tr>
                  <th>Deductions</th>
                  <th>Amount</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td>Deductions</td>
                  <td>${formatCurrency(deductions)}</td>
                </tr>

                <tr>
                  <td>Tax</td>
                  <td>${formatCurrency(tax)}</td>
                </tr>

                <tr>
                  <td>Other Deductions</td>
                  <td>${formatCurrency(otherDeductions)}</td>
                </tr>
              </tbody>
            </table>

            <div class="net">
              <span>NET SALARY</span>
              <span>${formatCurrency(net)}</span>
            </div>

            <div class="footer">
              This is a system-generated payslip.
            </div>

          </div>

          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  return (
    <div className="min-h-full w-full bg-[#07090d] text-white">
      <div className="mx-auto w-full max-w-[1800px] px-3 py-4 sm:px-5 lg:px-7 xl:px-8">
        {/* Header */}
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] shadow-lg">
                <ReceiptText
                  size={21}
                  className="text-slate-200"
                />
              </div>

              <div className="min-w-0">
                <h1 className="truncate text-xl font-bold tracking-tight text-white sm:text-2xl">
                  Payslips
                </h1>

                <p className="mt-0.5 truncate text-xs text-slate-500 sm:text-sm">
                  Manage employee payslips generated from finalized payroll
                </p>
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <button
              type="button"
              onClick={loadPayslips}
              disabled={loading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-4 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={openGenerateModal}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-black transition hover:bg-slate-200"
            >
              <Plus size={17} />
              Generate Payslip
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={FileText}
            label="Total Payslips"
            value={stats.total}
            subtext="Generated records"
          />

          <StatCard
            icon={WalletCards}
            label="Gross Payroll"
            value={formatCurrency(stats.totalGross)}
            subtext="Current page total"
          />

          <StatCard
            icon={IndianRupee}
            label="Net Payroll"
            value={formatCurrency(stats.totalNet)}
            subtext="Current page total"
          />

          <StatCard
            icon={CircleCheck}
            label="Paid"
            value={stats.paid}
            subtext="Payment completed"
          />
        </div>

        {/* Filters */}
        <div className="mb-5 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3 sm:p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
            <div className="relative xl:col-span-2">
              <Search
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
              />

              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search payslip / employee..."
                className="h-10 w-full rounded-xl border border-white/[0.08] bg-black/20 pl-10 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-white/20"
              />
            </div>

            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className="h-10 rounded-xl border border-white/[0.08] bg-[#0d1016] px-3 text-sm text-slate-300 outline-none focus:border-white/20"
            >
              <option value="">All Status</option>
              <option value="processed">Processed</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={month}
              onChange={(event) => {
                setMonth(event.target.value);
                setPage(1);
              }}
              className="h-10 rounded-xl border border-white/[0.08] bg-[#0d1016] px-3 text-sm text-slate-300 outline-none focus:border-white/20"
            >
              <option value="">All Months</option>

              {Array.from({ length: 12 }, (_, index) => (
                <option
                  key={index + 1}
                  value={index + 1}
                >
                  {getMonthName(index + 1)}
                </option>
              ))}
            </select>

            <select
              value={year}
              onChange={(event) => {
                setYear(event.target.value);
                setPage(1);
              }}
              className="h-10 rounded-xl border border-white/[0.08] bg-[#0d1016] px-3 text-sm text-slate-300 outline-none focus:border-white/20"
            >
              <option value="">All Years</option>

              {years.map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={clearFilters}
              className="h-10 rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 text-sm font-medium text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
            >
              Clear Filters
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => {
                setEmployeeId("");
                setPage(1);
              }}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                !employeeId
                  ? "bg-white text-black"
                  : "bg-white/[0.04] text-slate-500 hover:text-white"
              }`}
            >
              All Employees
            </button>

            {employees.slice(0, 8).map((employee) => (
              <button
                key={employee?._id}
                type="button"
                onClick={() => {
                  setEmployeeId(employee?._id || "");
                  setPage(1);
                }}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  employeeId === employee?._id
                    ? "bg-white text-black"
                    : "bg-white/[0.04] text-slate-500 hover:text-white"
                }`}
              >
                {getEmployeeName(employee)}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-400/15 bg-red-400/[0.06] p-4 text-sm text-red-300">
            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0"
            />

            <div className="min-w-0 flex-1">
              <p className="font-medium">
                Unable to load payslips
              </p>

              <p className="mt-1 text-xs text-red-300/70">
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={loadPayslips}
              className="shrink-0 rounded-lg border border-red-400/20 px-3 py-1.5 text-xs hover:bg-red-400/10"
            >
              Retry
            </button>
          </div>
        )}

        {/* Desktop table */}
        <div className="hidden overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] xl:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead>
                <tr className="border-b border-white/[0.07] bg-white/[0.025]">
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Payslip
                  </th>

                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Employee
                  </th>

                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Pay Period
                  </th>

                  <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Gross
                  </th>

                  <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Net Salary
                  </th>

                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>

                  <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  Array.from({ length: 7 }).map(
                    (_, index) => (
                      <tr
                        key={index}
                        className="border-b border-white/[0.05]"
                      >
                        {Array.from({
                          length: 7,
                        }).map(
                          (_, cellIndex) => (
                            <td
                              key={cellIndex}
                              className="px-5 py-5"
                            >
                              <div className="h-4 animate-pulse rounded-lg bg-white/[0.06]" />
                            </td>
                          )
                        )}
                      </tr>
                    )
                  )
                ) : payslips.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-20 text-center"
                    >
                      <div className="mx-auto flex max-w-sm flex-col items-center">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.035]">
                          <FileText
                            size={24}
                            className="text-slate-600"
                          />
                        </div>

                        <h3 className="text-sm font-semibold text-white">
                          No payslips found
                        </h3>

                        <p className="mt-1 text-xs leading-5 text-slate-600">
                          Generate a payslip from a processed,
                          approved, or paid payroll record.
                        </p>

                        <button
                          type="button"
                          onClick={openGenerateModal}
                          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-slate-200"
                        >
                          <Plus size={15} />
                          Generate Payslip
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  payslips.map((item) => {
                    const statusConfig =
                      getStatusConfig(item?.status);

                    const StatusIcon =
                      statusConfig.icon;

                    return (
                      <tr
                        key={item?._id}
                        className="border-b border-white/[0.05] transition hover:bg-white/[0.025]"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04]">
                              <ReceiptText
                                size={16}
                                className="text-slate-300"
                              />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-white">
                                {getPayslipNumber(item)}
                              </p>

                              <p className="mt-0.5 text-[11px] text-slate-600">
                                {formatDate(
                                  item?.createdAt
                                )}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-medium text-slate-200">
                            {getPayslipEmployeeName(
                              item
                            )}
                          </p>

                          <p className="mt-0.5 text-[11px] text-slate-600">
                            {getPayslipEmployeeCode(
                              item
                            )}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 text-sm text-slate-300">
                            <CalendarDays
                              size={14}
                              className="text-slate-600"
                            />

                            {getMonthName(
                              getPayslipMonth(item)
                            )}{" "}
                            {getPayslipYear(item)}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <span className="text-sm text-slate-300">
                            {formatCurrency(
                              getGrossSalary(item)
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <span className="text-sm font-semibold text-white">
                            {formatCurrency(
                              getNetSalary(item)
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusConfig.className}`}
                          >
                            <StatusIcon size={12} />
                            {statusConfig.label}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              title="View"
                              onClick={() =>
                                openDetails(item?._id)
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.025] text-slate-500 transition hover:bg-white/[0.07] hover:text-white"
                            >
                              <Eye size={15} />
                            </button>

                            <button
                              type="button"
                              title="Print"
                              onClick={() =>
                                printPayslip(item)
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.025] text-slate-500 transition hover:bg-white/[0.07] hover:text-white"
                            >
                              <Printer size={15} />
                            </button>

                            <button
                              type="button"
                              title="Delete"
                              onClick={() =>
                                confirmDelete(item)
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-400/10 bg-red-400/[0.03] text-red-400/70 transition hover:bg-red-400/10 hover:text-red-300"
                            >
                              <Trash2 size={15} />
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

        {/* Mobile / Tablet cards */}
        <div className="grid grid-cols-1 gap-3 xl:hidden">
          {loading ? (
            Array.from({ length: 5 }).map(
              (_, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4"
                >
                  <div className="h-5 w-40 animate-pulse rounded bg-white/[0.06]" />
                  <div className="mt-4 h-4 w-full animate-pulse rounded bg-white/[0.05]" />
                  <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-white/[0.05]" />
                  <div className="mt-5 h-9 w-full animate-pulse rounded bg-white/[0.05]" />
                </div>
              )
            )
          ) : payslips.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-5 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.035]">
                <FileText
                  size={24}
                  className="text-slate-600"
                />
              </div>

              <h3 className="mt-4 text-sm font-semibold text-white">
                No payslips found
              </h3>

              <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-600">
                Generate a payslip from a finalized payroll record.
              </p>
            </div>
          ) : (
            payslips.map((item) => {
              const statusConfig =
                getStatusConfig(item?.status);

              const StatusIcon =
                statusConfig.icon;

              return (
                <div
                  key={item?._id}
                  className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 transition hover:border-white/[0.12]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04]">
                        <ReceiptText
                          size={17}
                          className="text-slate-300"
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">
                          {getPayslipNumber(item)}
                        </p>

                        <p className="mt-0.5 truncate text-xs text-slate-600">
                          {getPayslipEmployeeName(item)}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium ${statusConfig.className}`}
                    >
                      <StatusIcon size={11} />
                      {statusConfig.label}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-white/[0.06] bg-black/10 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-slate-600">
                        Pay Period
                      </p>

                      <p className="mt-1 text-xs font-medium text-slate-300">
                        {getMonthName(
                          getPayslipMonth(item)
                        )}{" "}
                        {getPayslipYear(item)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/[0.06] bg-black/10 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-slate-600">
                        Employee Code
                      </p>

                      <p className="mt-1 truncate text-xs font-medium text-slate-300">
                        {getPayslipEmployeeCode(item)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/[0.06] bg-black/10 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-slate-600">
                        Gross
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-200">
                        {formatCurrency(
                          getGrossSalary(item)
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/[0.06] bg-black/10 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-slate-600">
                        Net Salary
                      </p>

                      <p className="mt-1 text-sm font-bold text-white">
                        {formatCurrency(
                          getNetSalary(item)
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        openDetails(item?._id)
                      }
                      className="flex h-9 flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] text-xs font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white"
                    >
                      <Eye size={14} />
                      View
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        printPayslip(item)
                      }
                      className="flex h-9 flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] text-xs font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white"
                    >
                      <Printer size={14} />
                      Print
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        confirmDelete(item)
                      }
                      className="flex h-9 w-10 items-center justify-center rounded-xl border border-red-400/10 bg-red-400/[0.03] text-red-400/70 transition hover:bg-red-400/10 hover:text-red-300"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {!loading &&
          payslips.length > 0 && (
            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-600">
                Page{" "}
                <span className="text-slate-400">
                  {pagination.page}
                </span>{" "}
                of{" "}
                <span className="text-slate-400">
                  {Math.max(
                    pagination.pages,
                    1
                  )}
                </span>
                {pagination.total
                  ? ` • ${pagination.total} total`
                  : ""}
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() =>
                    setPage((value) =>
                      Math.max(value - 1, 1)
                    )
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-slate-400 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronLeft size={16} />
                </button>

                <button
                  type="button"
                  disabled={
                    page >=
                    Math.max(
                      pagination.pages,
                      1
                    )
                  }
                  onClick={() =>
                    setPage((value) =>
                      value + 1
                    )
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-slate-400 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
      </div>

      {/* Generate Modal */}
      <Modal
        open={showGenerateModal}
        onClose={() =>
          !actionLoading &&
          setShowGenerateModal(false)
        }
        size="max-w-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-white">
              Generate Payslip
            </h2>

            <p className="mt-1 text-xs text-slate-600">
              Select a finalized payroll record.
            </p>
          </div>

          <button
            type="button"
            disabled={actionLoading}
            onClick={() =>
              setShowGenerateModal(false)
            }
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-white/[0.06] hover:text-white"
          >
            <X size={17} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-5">
          <div className="mb-4 rounded-2xl border border-blue-400/10 bg-blue-400/[0.04] p-4">
            <div className="flex gap-3">
              <ShieldCheck
                size={18}
                className="mt-0.5 shrink-0 text-blue-300"
              />

              <div>
                <p className="text-sm font-medium text-blue-200">
                  Payroll is the source of truth
                </p>

                <p className="mt-1 text-xs leading-5 text-blue-200/60">
                  Payslip values are generated from processed,
                  approved, or paid payroll records. Salary is not
                  recalculated here.
                </p>
              </div>
            </div>
          </div>

          {loadingPayrolls ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map(
                (_, index) => (
                  <div
                    key={index}
                    className="h-16 animate-pulse rounded-xl bg-white/[0.05]"
                  />
                )
              )}
            </div>
          ) : filteredPayrolls.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-5 py-12 text-center">
              <WalletCards
                size={26}
                className="mx-auto text-slate-600"
              />

              <p className="mt-3 text-sm font-medium text-white">
                No eligible payroll records
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-600">
                Payroll must be processed, approved, or paid
                before generating a payslip.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPayrolls.map((payroll) => {
                const selected =
                  selectedPayrollId ===
                  payroll?._id;

                const employee =
                  payroll?.employee ||
                  payroll?.employeeId;

                const payrollStatus =
                  getStatusConfig(
                    payroll?.status
                  );

                return (
                  <button
                    key={payroll?._id}
                    type="button"
                    onClick={() =>
                      setSelectedPayrollId(
                        payroll?._id || ""
                      )
                    }
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      selected
                        ? "border-white/20 bg-white/[0.07]"
                        : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.13] hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04]">
                          <UserRound
                            size={16}
                            className="text-slate-400"
                          />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">
                            {getEmployeeName(
                              employee
                            )}
                          </p>

                          <p className="mt-1 text-xs text-slate-600">
                            {getEmployeeCode(
                              employee
                            )}{" "}
                            •{" "}
                            {getMonthName(
                              payroll?.month
                            )}{" "}
                            {payroll?.year}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-bold text-white">
                          {formatCurrency(
                            payroll?.netSalary
                          )}
                        </p>

                        <span
                          className={`mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] ${payrollStatus.className}`}
                        >
                          {payrollStatus.label}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-white/[0.07] bg-white/[0.015] px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={actionLoading}
            onClick={() =>
              setShowGenerateModal(false)
            }
            className="h-10 rounded-xl border border-white/[0.08] px-4 text-sm font-medium text-slate-400 hover:bg-white/[0.05] hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={
              actionLoading ||
              !selectedPayrollId
            }
            onClick={generatePayslip}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-black hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {actionLoading ? (
              <RefreshCw
                size={16}
                className="animate-spin"
              />
            ) : (
              <FileText size={16} />
            )}
            Generate
          </button>
        </div>
      </Modal>

      {/* Details Modal */}
      <Modal
        open={showDetailsModal}
        onClose={() =>
          !detailsLoading &&
          setShowDetailsModal(false)
        }
        size="max-w-5xl"
      >
        <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-white">
              Payslip Details
            </h2>

            {selectedPayslip && (
              <p className="mt-1 truncate text-xs text-slate-600">
                {getPayslipNumber(
                  selectedPayslip
                )}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              setShowDetailsModal(false)
            }
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-white/[0.06] hover:text-white"
          >
            <X size={17} />
          </button>
        </div>

        {detailsLoading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <RefreshCw
              size={24}
              className="animate-spin text-slate-500"
            />
          </div>
        ) : selectedPayslip ? (
          <div className="max-h-[78vh] overflow-y-auto p-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <UserRound size={14} />
                  Employee
                </div>

                <p className="mt-2 text-sm font-semibold text-white">
                  {getPayslipEmployeeName(
                    selectedPayslip
                  )}
                </p>

                <p className="mt-1 text-xs text-slate-600">
                  {getPayslipEmployeeCode(
                    selectedPayslip
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <CalendarDays size={14} />
                  Pay Period
                </div>

                <p className="mt-2 text-sm font-semibold text-white">
                  {getMonthName(
                    getPayslipMonth(
                      selectedPayslip
                    )
                  )}{" "}
                  {getPayslipYear(
                    selectedPayslip
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <CircleCheck size={14} />
                  Status
                </div>

                <div className="mt-2">
                  {(() => {
                    const config =
                      getStatusConfig(
                        selectedPayslip?.status
                      );

                    const Icon =
                      config.icon;

                    return (
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${config.className}`}
                      >
                        <Icon size={12} />
                        {config.label}
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Earnings */}
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
                <div className="mb-2 flex items-center gap-2">
                  <WalletCards
                    size={17}
                    className="text-slate-400"
                  />

                  <h3 className="text-sm font-semibold text-white">
                    Earnings
                  </h3>
                </div>

                <DetailRow
                  label="Basic Salary"
                  value={formatCurrency(
                    selectedPayslip?.basicSalary ??
                      selectedPayslip?.payroll
                        ?.basicSalary
                  )}
                />

                <DetailRow
                  label="Allowances"
                  value={formatCurrency(
                    selectedPayslip?.allowances ??
                      selectedPayslip?.payroll
                        ?.allowances
                  )}
                />

                <DetailRow
                  label="Overtime"
                  value={formatCurrency(
                    selectedPayslip?.overtimeAmount ??
                      selectedPayslip?.payroll
                        ?.overtimeAmount
                  )}
                />

                <DetailRow
                  label="Bonus"
                  value={formatCurrency(
                    selectedPayslip?.bonus ??
                      selectedPayslip?.payroll
                        ?.bonus
                  )}
                />

                <DetailRow
                  label="Gross Salary"
                  strong
                  value={formatCurrency(
                    getGrossSalary(
                      selectedPayslip
                    )
                  )}
                />
              </div>

              {/* Deductions */}
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
                <div className="mb-2 flex items-center gap-2">
                  <IndianRupee
                    size={17}
                    className="text-slate-400"
                  />

                  <h3 className="text-sm font-semibold text-white">
                    Deductions
                  </h3>
                </div>

                <DetailRow
                  label="Deductions"
                  value={formatCurrency(
                    selectedPayslip?.deductions ??
                      selectedPayslip?.payroll
                        ?.deductions
                  )}
                />

                <DetailRow
                  label="Tax"
                  value={formatCurrency(
                    selectedPayslip?.tax ??
                      selectedPayslip?.payroll?.tax
                  )}
                />

                <DetailRow
                  label="Other Deductions"
                  value={formatCurrency(
                    selectedPayslip?.otherDeductions ??
                      selectedPayslip?.payroll
                        ?.otherDeductions
                  )}
                />

                <DetailRow
                  label="Net Salary"
                  strong
                  value={formatCurrency(
                    getNetSalary(
                      selectedPayslip
                    )
                  )}
                />
              </div>
            </div>

            {/* Attendance */}
            <div className="mt-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
              <div className="mb-4 flex items-center gap-2">
                <CalendarDays
                  size={17}
                  className="text-slate-400"
                />

                <h3 className="text-sm font-semibold text-white">
                  Attendance Summary
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {[
                  [
                    "Working Days",
                    selectedPayslip?.workingDays ??
                      selectedPayslip?.payroll
                        ?.workingDays ??
                      0,
                  ],
                  [
                    "Paid Days",
                    selectedPayslip?.paidDays ??
                      selectedPayslip?.payroll
                        ?.paidDays ??
                      0,
                  ],
                  [
                    "Present",
                    selectedPayslip?.presentDays ??
                      selectedPayslip?.payroll
                        ?.presentDays ??
                      0,
                  ],
                  [
                    "Absent",
                    selectedPayslip?.absentDays ??
                      selectedPayslip?.payroll
                        ?.absentDays ??
                      0,
                  ],
                  [
                    "Leave",
                    selectedPayslip?.leaveDays ??
                      selectedPayslip?.payroll
                        ?.leaveDays ??
                      0,
                  ],
                  [
                    "Overtime",
                    `${selectedPayslip?.overtimeMinutes ??
                      selectedPayslip?.payroll
                        ?.overtimeMinutes ??
                      0} min`,
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-white/[0.06] bg-black/10 p-3"
                  >
                    <p className="text-[10px] uppercase tracking-wider text-slate-600">
                      {label}
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-200">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Meta */}
            <div className="mt-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-600">
                    Payslip Number
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-300">
                    {getPayslipNumber(
                      selectedPayslip
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-600">
                    Generated
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-300">
                    {formatDate(
                      selectedPayslip?.createdAt
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-600">
                    Pay Period Start
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-300">
                    {formatDate(
                      selectedPayslip?.payPeriodStart ??
                        selectedPayslip?.payroll
                          ?.payPeriodStart
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-600">
                    Pay Period End
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-300">
                    {formatDate(
                      selectedPayslip?.payPeriodEnd ??
                        selectedPayslip?.payroll
                          ?.payPeriodEnd
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex min-h-[350px] items-center justify-center text-sm text-slate-600">
            Payslip details unavailable.
          </div>
        )}

        {selectedPayslip && (
          <div className="flex flex-col-reverse gap-2 border-t border-white/[0.07] bg-white/[0.015] px-5 py-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() =>
                setShowDetailsModal(false)
              }
              className="h-10 rounded-xl border border-white/[0.08] px-4 text-sm font-medium text-slate-400 hover:bg-white/[0.05] hover:text-white"
            >
              Close
            </button>

            <button
              type="button"
              onClick={() =>
                printPayslip(selectedPayslip)
              }
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-black hover:bg-slate-200"
            >
              <Printer size={16} />
              Print Payslip
            </button>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        open={showDeleteModal}
        onClose={() =>
          !actionLoading &&
          setShowDeleteModal(false)
        }
        size="max-w-md"
      >
        <div className="p-5 sm:p-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-red-400/15 bg-red-400/[0.07]">
            <Trash2
              size={19}
              className="text-red-300"
            />
          </div>

          <h2 className="mt-4 text-base font-semibold text-white">
            Delete Payslip?
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            This will permanently remove the selected payslip
            record. Make sure this action is allowed for your
            payroll workflow.
          </p>

          {selectedPayslip && (
            <div className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
              <p className="text-xs text-slate-600">
                Payslip
              </p>

              <p className="mt-1 text-sm font-semibold text-white">
                {getPayslipNumber(
                  selectedPayslip
                )}
              </p>

              <p className="mt-1 text-xs text-slate-600">
                {getPayslipEmployeeName(
                  selectedPayslip
                )}
              </p>
            </div>
          )}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={actionLoading}
              onClick={() =>
                setShowDeleteModal(false)
              }
              className="h-10 rounded-xl border border-white/[0.08] px-4 text-sm font-medium text-slate-400 hover:bg-white/[0.05] hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={actionLoading}
              onClick={deletePayslip}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-red-500 px-4 text-sm font-semibold text-white hover:bg-red-400 disabled:opacity-50"
            >
              {actionLoading && (
                <RefreshCw
                  size={15}
                  className="animate-spin"
                />
              )}
              Delete Payslip
            </button>
          </div>
        </div>
      </Modal>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-3 z-[200] w-[calc(100%-24px)] max-w-sm sm:right-5 sm:w-auto">
          <div
            className={`flex items-start gap-3 rounded-2xl border p-4 shadow-2xl backdrop-blur-xl ${
              toast.type === "success"
                ? "border-emerald-400/15 bg-[#0b1712]/95"
                : "border-red-400/15 bg-[#190d0d]/95"
            }`}
          >
            {toast.type === "success" ? (
              <CircleCheck
                size={18}
                className="mt-0.5 shrink-0 text-emerald-300"
              />
            ) : (
              <AlertCircle
                size={18}
                className="mt-0.5 shrink-0 text-red-300"
              />
            )}

            <p
              className={`text-sm ${
                toast.type === "success"
                  ? "text-emerald-200"
                  : "text-red-200"
              }`}
            >
              {toast.message}
            </p>

            <button
              type="button"
              onClick={() => setToast(null)}
              className="ml-auto text-slate-600 hover:text-white"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payslip;