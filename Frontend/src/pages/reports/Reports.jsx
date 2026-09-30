import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  BarChart3,
  Boxes,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Download,
  FileBarChart,
  FileCheck2,
  FileText,
  Layers3,
  Package,
  Percent,
  PieChart,
  RefreshCw,
  Search,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Users,
  UserRound,
  Wallet,
  Workflow as WorkflowIcon,
  XCircle,
} from "lucide-react";
import api from "../../services/api";

const REPORTS = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "sales", label: "Sales", icon: TrendingUp },
  { key: "purchases", label: "Purchases", icon: ShoppingCart },
  { key: "invoices", label: "Invoices", icon: FileText },
  { key: "payments", label: "Payments", icon: CircleDollarSign },
  { key: "expenses", label: "Expenses", icon: Wallet },
  { key: "inventory", label: "Inventory", icon: Boxes },
  { key: "customers", label: "Customers", icon: Users },
  { key: "vendors", label: "Vendors", icon: UserRound },
  { key: "projects", label: "Projects", icon: Layers3 },
  { key: "tasks", label: "Tasks", icon: Activity },
  { key: "workflows", label: "Workflows", icon: WorkflowIcon },
];

const REPORT_ENDPOINTS = {
  overview: "/reports/overview",
  sales: "/reports/sales",
  purchases: "/reports/purchases",
  invoices: "/reports/invoices",
  payments: "/reports/payments",
  expenses: "/reports/expenses",
  inventory: "/reports/inventory",
  customers: "/reports/customers",
  vendors: "/reports/vendors",
  projects: "/reports/projects",
  tasks: "/reports/tasks",
  workflows: "/reports/workflows",
};

const getDefaultFrom = () => {
  const date = new Date();
  date.setDate(1);
  return date.toISOString().slice(0, 10);
};

const getDefaultTo = () => new Date().toISOString().slice(0, 10);

const number = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const currency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(number(value));

const integer = (value) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(number(value));

const percentage = (value, total) => {
  if (!number(total)) return 0;
  return Math.min(100, Math.max(0, (number(value) / number(total)) * 100));
};

const formatStatus = (value) => {
  if (!value) return "Unknown";

  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const statusClass = (status) => {
  const value = String(status || "").toLowerCase();

  if (
    ["completed", "approved", "paid", "active", "won"].includes(value)
  ) {
    return "report-status-success";
  }

  if (
    ["pending", "partial", "partially_paid", "in_progress", "review"].includes(
      value
    )
  ) {
    return "report-status-warning";
  }

  if (
    ["cancelled", "rejected", "inactive", "lost", "overdue"].includes(value)
  ) {
    return "report-status-danger";
  }

  return "report-status-neutral";
};

const downloadCSV = (filename, rows) => {
  if (!rows || !rows.length) return;

  const headers = Object.keys(rows[0]);

  const escapeCSV = (value) => {
    const stringValue =
      value === null || value === undefined ? "" : String(value);

    return `"${stringValue.replace(/"/g, '""')}"`;
  };

  const csv = [
    headers.map(escapeCSV).join(","),
    ...rows.map((row) =>
      headers.map((header) => escapeCSV(row[header])).join(",")
    ),
  ].join("\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
};

function KPI({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  danger = false,
}) {
  return (
    <div className="report-kpi-card">
      <div className="report-kpi-top">
        <div className="report-kpi-icon">
          <Icon size={19} strokeWidth={1.8} />
        </div>

        {trend !== undefined && (
          <span className={danger ? "report-trend danger" : "report-trend"}>
            {trend}
          </span>
        )}
      </div>

      <div className="report-kpi-title">{title}</div>

      <div className="report-kpi-value">{value}</div>

      {subtitle && <div className="report-kpi-subtitle">{subtitle}</div>}
    </div>
  );
}

function SectionCard({ title, subtitle, children, action }) {
  return (
    <section className="report-section-card">
      <div className="report-section-header">
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>

        {action}
      </div>

      {children}
    </section>
  );
}

function EmptyState({ message = "No report data available" }) {
  return (
    <div className="report-empty">
      <FileBarChart size={30} />
      <span>{message}</span>
    </div>
  );
}

function BreakdownList({ items, currencyValue = false }) {
  if (!items?.length) {
    return <EmptyState />;
  }

  const max = Math.max(...items.map((item) => number(item.count)), 1);

  return (
    <div className="report-breakdown-list">
      {items.map((item, index) => {
        const label =
          item._id === null || item._id === undefined
            ? "Unknown"
            : formatStatus(item._id);

        return (
          <div className="report-breakdown-item" key={`${label}-${index}`}>
            <div className="report-breakdown-row">
              <div className="report-breakdown-label">
                <span className={`report-dot ${statusClass(item._id)}`} />
                {label}
              </div>

              <div className="report-breakdown-value">
                {integer(item.count)}

                {currencyValue && (
                  <span>{currency(item.total)}</span>
                )}
              </div>
            </div>

            <div className="report-progress">
              <div
                className="report-progress-fill"
                style={{
                  width: `${percentage(item.count, max)}%`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MonthlyChart({ items }) {
  if (!items?.length) {
    return <EmptyState />;
  }

  const max = Math.max(...items.map((item) => number(item.total)), 1);

  return (
    <div className="report-monthly-chart">
      {items.map((item, index) => {
        const year = item?._id?.year;
        const month = item?._id?.month;

        const label =
          year && month
            ? new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
                month: "short",
                year: "2-digit",
              })
            : `#${index + 1}`;

        const height = Math.max(
          8,
          (number(item.total) / max) * 100
        );

        return (
          <div className="report-bar-column" key={`${year}-${month}-${index}`}>
            <div className="report-bar-value">
              {currency(item.total)}
            </div>

            <div className="report-bar-track">
              <div
                className="report-bar"
                style={{ height: `${height}%` }}
              />
            </div>

            <div className="report-bar-label">{label}</div>

            <div className="report-bar-count">
              {integer(item.count)} records
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OverviewReport({ data }) {
  const master = data?.masterData || {};
  const purchase = data?.purchases || {};
  const projects = data?.projects || {};
  const tasks = data?.tasks || {};
  const workflows = data?.workflows || {};

  const projectRows = Object.entries(projects).map(([status, value]) => ({
    _id: status,
    ...value,
  }));

  const taskRows = Object.entries(tasks).map(([status, count]) => ({
    _id: status,
    count,
  }));

  const workflowRows = Object.entries(workflows).map(([status, count]) => ({
    _id: status,
    count,
  }));

  return (
    <>
      <div className="report-kpi-grid">
        <KPI
          title="Customers"
          value={integer(master.customers)}
          subtitle="Active workspace records"
          icon={Users}
        />

        <KPI
          title="Vendors"
          value={integer(master.vendors)}
          subtitle="Supplier records"
          icon={UserRound}
        />

        <KPI
          title="Products"
          value={integer(master.products)}
          subtitle="Product & service catalog"
          icon={Package}
        />

        <KPI
          title="Inventory"
          value={integer(master.inventory)}
          subtitle="Inventory records"
          icon={Boxes}
        />

        <KPI
          title="Purchases"
          value={integer(purchase.count)}
          subtitle={currency(purchase.total)}
          icon={ShoppingCart}
        />

        <KPI
          title="Projects"
          value={integer(master.projects)}
          subtitle="Project portfolio"
          icon={Layers3}
        />

        <KPI
          title="Tasks"
          value={integer(master.tasks)}
          subtitle="Tracked tasks"
          icon={Activity}
        />

        <KPI
          title="Workflows"
          value={integer(master.workflows)}
          subtitle={`${integer(data?.workflowInstances)} instances`}
          icon={WorkflowIcon}
        />
      </div>

      <div className="report-two-column">
        <SectionCard
          title="Project Status"
          subtitle="Current project distribution"
        >
          <BreakdownList items={projectRows} currencyValue />
        </SectionCard>

        <SectionCard
          title="Task Status"
          subtitle="Current task distribution"
        >
          <BreakdownList items={taskRows} />
        </SectionCard>
      </div>

      <SectionCard
        title="Workflow Status"
        subtitle="Workflow instances within selected period"
      >
        <BreakdownList items={workflowRows} />
      </SectionCard>
    </>
  );
}

function SalesReport({ data }) {
  return (
    <>
      <div className="report-kpi-grid report-kpi-grid-3">
        <KPI
          title="Sales Records"
          value={integer(data?.count)}
          subtitle="Selected period"
          icon={TrendingUp}
        />

        <KPI
          title="Sales Value"
          value={currency(data?.total)}
          subtitle="Total sales value"
          icon={CircleDollarSign}
        />

        <KPI
          title="Average Sale"
          value={currency(
            number(data?.count)
              ? number(data?.total) / number(data?.count)
              : 0
          )}
          subtitle="Average per record"
          icon={BarChart3}
        />
      </div>

      <div className="report-two-column">
        <SectionCard
          title="Sales by Status"
          subtitle="Status-wise sales performance"
        >
          <BreakdownList
            items={data?.statusBreakdown}
            currencyValue
          />
        </SectionCard>

        <SectionCard
          title="Monthly Sales"
          subtitle="Sales movement over the selected period"
        >
          <MonthlyChart items={data?.monthly} />
        </SectionCard>
      </div>
    </>
  );
}

function PurchaseReport({ data }) {
  return (
    <>
      <div className="report-kpi-grid report-kpi-grid-3">
        <KPI
          title="Purchase Records"
          value={integer(data?.count)}
          subtitle="Selected period"
          icon={ShoppingCart}
        />

        <KPI
          title="Purchase Value"
          value={currency(data?.total)}
          subtitle="Total purchase value"
          icon={CircleDollarSign}
        />

        <KPI
          title="Average Purchase"
          value={currency(
            number(data?.count)
              ? number(data?.total) / number(data?.count)
              : 0
          )}
          subtitle="Average per record"
          icon={BarChart3}
        />
      </div>

      <div className="report-two-column">
        <SectionCard
          title="Purchase Status"
          subtitle="Status-wise purchase distribution"
        >
          <BreakdownList
            items={data?.statusBreakdown}
            currencyValue
          />
        </SectionCard>

        <SectionCard
          title="Monthly Purchases"
          subtitle="Purchase movement over the selected period"
        >
          <MonthlyChart items={data?.monthly} />
        </SectionCard>
      </div>
    </>
  );
}

function InvoiceReport({ data }) {
  const total = number(data?.total);
  const paid = number(data?.paid);
  const outstanding = number(data?.outstanding);

  return (
    <>
      <div className="report-kpi-grid report-kpi-grid-4">
        <KPI
          title="Invoices"
          value={integer(data?.count)}
          subtitle="Selected period"
          icon={FileText}
        />

        <KPI
          title="Invoice Value"
          value={currency(total)}
          subtitle="Gross invoice value"
          icon={CircleDollarSign}
        />

        <KPI
          title="Paid"
          value={currency(paid)}
          subtitle={`${percentage(paid, total).toFixed(1)}% collected`}
          icon={CheckCircle2}
        />

        <KPI
          title="Outstanding"
          value={currency(outstanding)}
          subtitle={`${percentage(outstanding, total).toFixed(1)}% pending`}
          icon={Clock3}
          danger={outstanding > 0}
        />
      </div>

      <SectionCard
        title="Invoice Status"
        subtitle="Invoice status distribution"
      >
        <BreakdownList
          items={data?.statusBreakdown}
          currencyValue
        />
      </SectionCard>
    </>
  );
}

function PaymentReport({ data }) {
  return (
    <>
      <div className="report-kpi-grid report-kpi-grid-3">
        <KPI
          title="Payments"
          value={integer(data?.count)}
          subtitle="Selected period"
          icon={CreditCardIcon}
        />

        <KPI
          title="Collected"
          value={currency(data?.total)}
          subtitle="Total payment value"
          icon={CircleDollarSign}
        />

        <KPI
          title="Average Payment"
          value={currency(
            number(data?.count)
              ? number(data?.total) / number(data?.count)
              : 0
          )}
          subtitle="Average per transaction"
          icon={BarChart3}
        />
      </div>

      <SectionCard
        title="Payment Methods"
        subtitle="Collection by payment method"
      >
        <BreakdownList
          items={data?.methodBreakdown}
          currencyValue
        />
      </SectionCard>
    </>
  );
}

function ExpenseReport({ data }) {
  return (
    <>
      <div className="report-kpi-grid report-kpi-grid-3">
        <KPI
          title="Expenses"
          value={integer(data?.count)}
          subtitle="Selected period"
          icon={Wallet}
        />

        <KPI
          title="Total Expenses"
          value={currency(data?.total)}
          subtitle="Total expense value"
          icon={TrendingDown}
          danger
        />

        <KPI
          title="Average Expense"
          value={currency(
            number(data?.count)
              ? number(data?.total) / number(data?.count)
              : 0
          )}
          subtitle="Average per record"
          icon={BarChart3}
        />
      </div>

      <SectionCard
        title="Expense Categories"
        subtitle="Category-wise expense distribution"
      >
        <BreakdownList
          items={data?.categoryBreakdown}
          currencyValue
        />
      </SectionCard>
    </>
  );
}

function InventoryReport({ data }) {
  return (
    <>
      <div className="report-kpi-grid report-kpi-grid-3">
        <KPI
          title="Inventory Records"
          value={integer(data?.count)}
          subtitle="Current inventory"
          icon={Boxes}
        />

        <KPI
          title="Total Quantity"
          value={integer(data?.quantity)}
          subtitle="Units currently tracked"
          icon={Package}
        />

        <KPI
          title="Inventory Value"
          value={currency(data?.value)}
          subtitle="Estimated stock value"
          icon={CircleDollarSign}
        />
      </div>

      <SectionCard
        title="Inventory Status"
        subtitle="Inventory records grouped by status"
      >
        <BreakdownList items={data?.statusBreakdown} />
      </SectionCard>
    </>
  );
}

function CustomerReport({ data }) {
  return (
    <>
      <div className="report-kpi-grid report-kpi-grid-3">
        <KPI
          title="Total Customers"
          value={integer(data?.total)}
          subtitle="All active workspace records"
          icon={Users}
        />

        <KPI
          title="Active"
          value={integer(data?.active)}
          subtitle={`${percentage(
            data?.active,
            data?.total
          ).toFixed(1)}% of customers`}
          icon={CheckCircle2}
        />

        <KPI
          title="Inactive"
          value={integer(data?.inactive)}
          subtitle={`${percentage(
            data?.inactive,
            data?.total
          ).toFixed(1)}% of customers`}
          icon={XCircle}
        />
      </div>

      <SectionCard title="Customer Health" subtitle="Customer status overview">
        <div className="report-health">
          <div className="report-health-row">
            <span>Active Customers</span>
            <strong>{integer(data?.active)}</strong>
          </div>

          <div className="report-progress large">
            <div
              className="report-progress-fill"
              style={{
                width: `${percentage(data?.active, data?.total)}%`,
              }}
            />
          </div>

          <div className="report-health-row muted">
            <span>Inactive Customers</span>
            <strong>{integer(data?.inactive)}</strong>
          </div>
        </div>
      </SectionCard>
    </>
  );
}

function VendorReport({ data }) {
  return (
    <>
      <div className="report-kpi-grid report-kpi-grid-3">
        <KPI
          title="Total Vendors"
          value={integer(data?.total)}
          subtitle="All active workspace records"
          icon={UserRound}
        />

        <KPI
          title="Active"
          value={integer(data?.active)}
          subtitle={`${percentage(
            data?.active,
            data?.total
          ).toFixed(1)}% of vendors`}
          icon={CheckCircle2}
        />

        <KPI
          title="Inactive"
          value={integer(data?.inactive)}
          subtitle={`${percentage(
            data?.inactive,
            data?.total
          ).toFixed(1)}% of vendors`}
          icon={XCircle}
        />
      </div>

      <SectionCard title="Vendor Health" subtitle="Vendor status overview">
        <div className="report-health">
          <div className="report-health-row">
            <span>Active Vendors</span>
            <strong>{integer(data?.active)}</strong>
          </div>

          <div className="report-progress large">
            <div
              className="report-progress-fill"
              style={{
                width: `${percentage(data?.active, data?.total)}%`,
              }}
            />
          </div>

          <div className="report-health-row muted">
            <span>Inactive Vendors</span>
            <strong>{integer(data?.inactive)}</strong>
          </div>
        </div>
      </SectionCard>
    </>
  );
}

function ProjectReport({ data }) {
  const rows = data?.statuses || [];

  const totalBudget = rows.reduce(
    (sum, item) => sum + number(item.budget),
    0
  );

  const totalActual = rows.reduce(
    (sum, item) => sum + number(item.actualCost),
    0
  );

  const totalRevenue = rows.reduce(
    (sum, item) => sum + number(item.revenue),
    0
  );

  const totalProjects = rows.reduce(
    (sum, item) => sum + number(item.count),
    0
  );

  return (
    <>
      <div className="report-kpi-grid report-kpi-grid-4">
        <KPI
          title="Projects"
          value={integer(totalProjects)}
          subtitle="Current portfolio"
          icon={Layers3}
        />

        <KPI
          title="Budget"
          value={currency(totalBudget)}
          subtitle="Total allocated"
          icon={CircleDollarSign}
        />

        <KPI
          title="Actual Cost"
          value={currency(totalActual)}
          subtitle="Total project cost"
          icon={TrendingDown}
          danger
        />

        <KPI
          title="Revenue"
          value={currency(totalRevenue)}
          subtitle="Total project revenue"
          icon={TrendingUp}
        />
      </div>

      <SectionCard
        title="Projects by Status"
        subtitle="Portfolio status and financial summary"
      >
        {rows.length ? (
          <div className="report-table-wrap">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Projects</th>
                  <th>Budget</th>
                  <th>Actual Cost</th>
                  <th>Revenue</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row, index) => (
                  <tr key={`${row._id}-${index}`}>
                    <td>
                      <span
                        className={`report-badge ${statusClass(
                          row._id
                        )}`}
                      >
                        {formatStatus(row._id)}
                      </span>
                    </td>
                    <td>{integer(row.count)}</td>
                    <td>{currency(row.budget)}</td>
                    <td>{currency(row.actualCost)}</td>
                    <td>{currency(row.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState />
        )}
      </SectionCard>
    </>
  );
}

function TaskReport({ data }) {
  const rows = data?.statuses || [];

  const totalTasks = rows.reduce(
    (sum, item) => sum + number(item.count),
    0
  );

  const estimated = rows.reduce(
    (sum, item) => sum + number(item.estimatedHours),
    0
  );

  const actual = rows.reduce(
    (sum, item) => sum + number(item.actualHours),
    0
  );

  return (
    <>
      <div className="report-kpi-grid report-kpi-grid-3">
        <KPI
          title="Tasks"
          value={integer(totalTasks)}
          subtitle="Current task portfolio"
          icon={Activity}
        />

        <KPI
          title="Estimated Hours"
          value={`${number(estimated).toFixed(1)}h`}
          subtitle="Total estimated effort"
          icon={Clock3}
        />

        <KPI
          title="Actual Hours"
          value={`${number(actual).toFixed(1)}h`}
          subtitle="Recorded effort"
          icon={BarChart3}
        />
      </div>

      <SectionCard
        title="Task Status"
        subtitle="Task workload and effort"
      >
        {rows.length ? (
          <div className="report-table-wrap">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Tasks</th>
                  <th>Estimated Hours</th>
                  <th>Actual Hours</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row, index) => (
                  <tr key={`${row._id}-${index}`}>
                    <td>
                      <span
                        className={`report-badge ${statusClass(
                          row._id
                        )}`}
                      >
                        {formatStatus(row._id)}
                      </span>
                    </td>
                    <td>{integer(row.count)}</td>
                    <td>{number(row.estimatedHours).toFixed(1)}h</td>
                    <td>{number(row.actualHours).toFixed(1)}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState />
        )}
      </SectionCard>
    </>
  );
}

function WorkflowReport({ data }) {
  return (
    <>
      <div className="report-two-column">
        <SectionCard
          title="Workflow Definitions"
          subtitle="Configured workflows by status"
        >
          <BreakdownList items={data?.workflows} />
        </SectionCard>

        <SectionCard
          title="Workflow Instances"
          subtitle="Instances within selected period"
        >
          <BreakdownList items={data?.instances} />
        </SectionCard>
      </div>

      <SectionCard
        title="Entity Types"
        subtitle="Workflow instances grouped by ERP entity"
      >
        <BreakdownList items={data?.entityTypes} />
      </SectionCard>
    </>
  );
}

function CreditCardIcon(props) {
  return <CreditCardFallback {...props} />;
}

function CreditCardFallback({ size = 20, ...props }) {
  return <CircleDollarSign size={size} {...props} />;
}

export default function Reports() {
  const [activeReport, setActiveReport] = useState("overview");

  const [from, setFrom] = useState(getDefaultFrom);
  const [to, setTo] = useState(getDefaultTo);

  const [data, setData] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [mobileReportOpen, setMobileReportOpen] = useState(false);

  const activeMeta = useMemo(
    () =>
      REPORTS.find((report) => report.key === activeReport) ||
      REPORTS[0],
    [activeReport]
  );

  const fetchReport = useCallback(async () => {
    if (from && to && from > to) {
      setError("From date cannot be after To date.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const endpoint = REPORT_ENDPOINTS[activeReport];

      const response = await api.get(endpoint, {
        params: {
          from,
          to,
        },
      });

      setData(response?.data?.data ?? null);
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Unable to load report.";

      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [activeReport, from, to]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const selectReport = (key) => {
    setActiveReport(key);
    setMobileReportOpen(false);
  };

  const resetDates = () => {
    setFrom(getDefaultFrom());
    setTo(getDefaultTo());
  };

  const exportReport = () => {
    if (!data) return;

    const filename = `ready-tech-${activeReport}-report-${from}-to-${to}.csv`;

    if (activeReport === "overview") {
      const master = data.masterData || {};

      downloadCSV(filename, [
        {
          metric: "Customers",
          value: master.customers || 0,
        },
        {
          metric: "Vendors",
          value: master.vendors || 0,
        },
        {
          metric: "Products",
          value: master.products || 0,
        },
        {
          metric: "Inventory",
          value: master.inventory || 0,
        },
        {
          metric: "Projects",
          value: master.projects || 0,
        },
        {
          metric: "Tasks",
          value: master.tasks || 0,
        },
        {
          metric: "Workflows",
          value: master.workflows || 0,
        },
        {
          metric: "Purchase Count",
          value: data.purchases?.count || 0,
        },
        {
          metric: "Purchase Total",
          value: data.purchases?.total || 0,
        },
      ]);

      return;
    }

    if (activeReport === "sales") {
      downloadCSV(
        filename,
        (data.statusBreakdown || []).map((item) => ({
          status: formatStatus(item._id),
          count: item.count || 0,
          total: item.total || 0,
        }))
      );

      return;
    }

    if (activeReport === "purchases") {
      downloadCSV(
        filename,
        (data.statusBreakdown || []).map((item) => ({
          status: formatStatus(item._id),
          count: item.count || 0,
          total: item.total || 0,
        }))
      );

      return;
    }

    if (activeReport === "invoices") {
      downloadCSV(
        filename,
        (data.statusBreakdown || []).map((item) => ({
          status: formatStatus(item._id),
          count: item.count || 0,
          total: item.total || 0,
        }))
      );

      return;
    }

    if (activeReport === "payments") {
      downloadCSV(
        filename,
        (data.methodBreakdown || []).map((item) => ({
          method: formatStatus(item._id),
          count: item.count || 0,
          total: item.total || 0,
        }))
      );

      return;
    }

    if (activeReport === "expenses") {
      downloadCSV(
        filename,
        (data.categoryBreakdown || []).map((item) => ({
          category: formatStatus(item._id),
          count: item.count || 0,
          total: item.total || 0,
        }))
      );

      return;
    }

    if (activeReport === "inventory") {
      downloadCSV(
        filename,
        (data.statusBreakdown || []).map((item) => ({
          status: formatStatus(item._id),
          count: item.count || 0,
          quantity: item.quantity || 0,
        }))
      );

      return;
    }

    if (activeReport === "projects") {
      downloadCSV(
        filename,
        (data.statuses || []).map((item) => ({
          status: formatStatus(item._id),
          count: item.count || 0,
          budget: item.budget || 0,
          actualCost: item.actualCost || 0,
          revenue: item.revenue || 0,
        }))
      );

      return;
    }

    if (activeReport === "tasks") {
      downloadCSV(
        filename,
        (data.statuses || []).map((item) => ({
          status: formatStatus(item._id),
          count: item.count || 0,
          estimatedHours: item.estimatedHours || 0,
          actualHours: item.actualHours || 0,
        }))
      );

      return;
    }

    if (activeReport === "workflows") {
      downloadCSV(
        filename,
        (data.entityTypes || []).map((item) => ({
          entityType: formatStatus(item._id),
          count: item.count || 0,
        }))
      );
    }
  };

  const renderReport = () => {
    if (!data) {
      return <EmptyState message="No data returned from the server." />;
    }

    switch (activeReport) {
      case "overview":
        return <OverviewReport data={data} />;

      case "sales":
        return <SalesReport data={data} />;

      case "purchases":
        return <PurchaseReport data={data} />;

      case "invoices":
        return <InvoiceReport data={data} />;

      case "payments":
        return <PaymentReport data={data} />;

      case "expenses":
        return <ExpenseReport data={data} />;

      case "inventory":
        return <InventoryReport data={data} />;

      case "customers":
        return <CustomerReport data={data} />;

      case "vendors":
        return <VendorReport data={data} />;

      case "projects":
        return <ProjectReport data={data} />;

      case "tasks":
        return <TaskReport data={data} />;

      case "workflows":
        return <WorkflowReport data={data} />;

      default:
        return <EmptyState />;
    }
  };

  return (
    <div className="reports-page">
      <style>{`
        .reports-page {
          min-height: 100%;
          padding: 24px;
          color: #f5f7fa;
          background:
            radial-gradient(circle at 10% 0%, rgba(59,130,246,.08), transparent 30%),
            radial-gradient(circle at 90% 10%, rgba(168,85,247,.07), transparent 30%),
            #080b10;
        }

        .reports-shell {
          max-width: 1700px;
          margin: 0 auto;
        }

        .reports-hero {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 22px;
        }

        .reports-title-wrap {
          display: flex;
          align-items: flex-start;
          gap: 14px;
        }

        .reports-title-icon {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 14px;
          background: rgba(255,255,255,.045);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.04);
        }

        .reports-title-icon svg {
          color: #9ca3af;
        }

        .reports-eyebrow {
          margin: 0 0 4px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .14em;
          text-transform: uppercase;
          color: #737b88;
        }

        .reports-title {
          margin: 0;
          font-size: clamp(24px, 3vw, 32px);
          line-height: 1.1;
          font-weight: 750;
          letter-spacing: -.03em;
        }

        .reports-description {
          margin: 8px 0 0;
          max-width: 720px;
          color: #8d96a5;
          font-size: 14px;
          line-height: 1.6;
        }

        .reports-actions {
          display: flex;
          align-items: center;
          gap: 9px;
          flex-wrap: wrap;
        }

        .report-btn {
          height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 14px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 10px;
          background: rgba(255,255,255,.045);
          color: #d9dee7;
          font-size: 13px;
          font-weight: 650;
          cursor: pointer;
          transition: .18s ease;
        }

        .report-btn:hover {
          background: rgba(255,255,255,.08);
          border-color: rgba(255,255,255,.14);
          transform: translateY(-1px);
        }

        .report-btn.primary {
          background: #f1f3f5;
          color: #0b0e13;
          border-color: #f1f3f5;
        }

        .report-btn.primary:hover {
          background: #fff;
        }

        .report-btn:disabled {
          opacity: .5;
          cursor: not-allowed;
          transform: none;
        }

        .report-filter {
          display: flex;
          align-items: flex-end;
          gap: 12px;
          padding: 15px;
          margin-bottom: 20px;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 16px;
          background: rgba(255,255,255,.025);
          box-shadow:
            0 18px 50px rgba(0,0,0,.18),
            inset 0 1px 0 rgba(255,255,255,.025);
        }

        .report-field {
          min-width: 165px;
        }

        .report-field label {
          display: block;
          margin-bottom: 7px;
          color: #7e8794;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .08em;
        }

        .report-input {
          width: 100%;
          height: 40px;
          padding: 0 11px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 10px;
          outline: none;
          background: #0d1117;
          color: #e7eaf0;
          font-size: 13px;
          color-scheme: dark;
        }

        .report-input:focus {
          border-color: rgba(255,255,255,.2);
          box-shadow: 0 0 0 3px rgba(255,255,255,.03);
        }

        .report-filter-spacer {
          flex: 1;
        }

        .report-mobile-selector {
          display: none;
          position: relative;
          margin-bottom: 16px;
        }

        .report-mobile-trigger {
          width: 100%;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 13px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 11px;
          background: #0d1117;
          color: #e7eaf0;
          cursor: pointer;
        }

        .report-mobile-trigger span {
          display: flex;
          align-items: center;
          gap: 9px;
          font-size: 13px;
          font-weight: 650;
        }

        .report-mobile-menu {
          position: absolute;
          z-index: 20;
          left: 0;
          right: 0;
          top: 49px;
          padding: 6px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 12px;
          background: #10141b;
          box-shadow: 0 20px 50px rgba(0,0,0,.45);
        }

        .report-mobile-menu button {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: #aeb5c0;
          cursor: pointer;
          text-align: left;
          font-size: 13px;
        }

        .report-mobile-menu button:hover,
        .report-mobile-menu button.active {
          background: rgba(255,255,255,.06);
          color: #fff;
        }

        .report-layout {
          display: grid;
          grid-template-columns: 218px minmax(0, 1fr);
          gap: 20px;
          align-items: start;
        }

        .report-sidebar {
          position: sticky;
          top: 18px;
          padding: 8px;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 16px;
          background: rgba(255,255,255,.025);
        }

        .report-sidebar-title {
          padding: 9px 10px 8px;
          color: #626b78;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .13em;
          text-transform: uppercase;
        }

        .report-nav-btn {
          width: 100%;
          height: 40px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 10px;
          margin-bottom: 3px;
          border: 0;
          border-radius: 9px;
          background: transparent;
          color: #89919e;
          cursor: pointer;
          text-align: left;
          font-size: 12.5px;
          font-weight: 600;
          transition: .16s ease;
        }

        .report-nav-btn:hover {
          color: #dce1e8;
          background: rgba(255,255,255,.035);
        }

        .report-nav-btn.active {
          color: #f5f6f8;
          background: rgba(255,255,255,.075);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,.05);
        }

        .report-nav-btn.active svg {
          color: #fff;
        }

        .report-content {
          min-width: 0;
        }

        .report-content-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 16px;
        }

        .report-content-title {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .report-content-title h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 720;
          letter-spacing: -.015em;
        }

        .report-content-title p {
          margin: 3px 0 0;
          color: #707987;
          font-size: 11px;
        }

        .report-period {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 7px 10px;
          border: 1px solid rgba(255,255,255,.06);
          border-radius: 8px;
          color: #7f8794;
          background: rgba(255,255,255,.025);
          font-size: 11px;
        }

        .report-loading {
          min-height: 420px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 16px;
          background: rgba(255,255,255,.025);
        }

        .report-loading-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          color: #78818e;
          font-size: 13px;
        }

        .report-spinner {
          animation: report-spin 1s linear infinite;
        }

        @keyframes report-spin {
          to {
            transform: rotate(360deg);
          }
        }

        .report-error {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 15px;
          margin-bottom: 16px;
          border: 1px solid rgba(239,68,68,.18);
          border-radius: 12px;
          background: rgba(239,68,68,.06);
          color: #fca5a5;
          font-size: 13px;
        }

        .report-error button {
          margin-left: auto;
          border: 0;
          background: transparent;
          color: inherit;
          cursor: pointer;
        }

        .report-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 14px;
        }

        .report-kpi-grid-3 {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .report-kpi-grid-4 {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .report-kpi-card {
          min-width: 0;
          padding: 15px;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 14px;
          background:
            linear-gradient(
              145deg,
              rgba(255,255,255,.045),
              rgba(255,255,255,.018)
            );
          box-shadow:
            0 15px 40px rgba(0,0,0,.13),
            inset 0 1px 0 rgba(255,255,255,.025);
        }

        .report-kpi-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 15px;
        }

        .report-kpi-icon {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 9px;
          background: rgba(255,255,255,.035);
          color: #b7bec9;
        }

        .report-kpi-title {
          color: #777f8d;
          font-size: 11px;
          font-weight: 650;
          text-transform: uppercase;
          letter-spacing: .06em;
        }

        .report-kpi-value {
          overflow: hidden;
          margin-top: 5px;
          color: #f3f5f7;
          font-size: clamp(20px, 2vw, 25px);
          line-height: 1.2;
          font-weight: 750;
          letter-spacing: -.03em;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .report-kpi-subtitle {
          overflow: hidden;
          margin-top: 5px;
          color: #646d7a;
          font-size: 11px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .report-trend {
          padding: 4px 7px;
          border: 1px solid rgba(255,255,255,.06);
          border-radius: 6px;
          color: #929aa6;
          background: rgba(255,255,255,.03);
          font-size: 10px;
          font-weight: 700;
        }

        .report-trend.danger {
          color: #fca5a5;
          border-color: rgba(239,68,68,.12);
          background: rgba(239,68,68,.05);
        }

        .report-two-column {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 14px;
        }

        .report-section-card {
          min-width: 0;
          padding: 17px;
          margin-bottom: 14px;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 15px;
          background: rgba(255,255,255,.025);
          box-shadow:
            0 15px 45px rgba(0,0,0,.12),
            inset 0 1px 0 rgba(255,255,255,.02);
        }

        .report-two-column > .report-section-card {
          margin-bottom: 0;
        }

        .report-section-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 17px;
        }

        .report-section-header h3 {
          margin: 0;
          color: #e8ebef;
          font-size: 14px;
          font-weight: 700;
        }

        .report-section-header p {
          margin: 5px 0 0;
          color: #68717e;
          font-size: 11px;
        }

        .report-breakdown-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .report-breakdown-item {
          min-width: 0;
        }

        .report-breakdown-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 7px;
        }

        .report-breakdown-label {
          display: flex;
          align-items: center;
          min-width: 0;
          gap: 8px;
          color: #adb4bf;
          font-size: 12px;
          font-weight: 600;
        }

        .report-breakdown-value {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #e0e4e9;
          font-size: 12px;
          font-weight: 700;
        }

        .report-breakdown-value span {
          color: #6e7784;
          font-weight: 500;
        }

        .report-dot {
          width: 7px;
          height: 7px;
          flex: 0 0 7px;
          border-radius: 50%;
          background: #737b87;
        }

        .report-dot.report-status-success {
          background: #8a929d;
        }

        .report-dot.report-status-warning {
          background: #b0a58b;
        }

        .report-dot.report-status-danger {
          background: #a77f7f;
        }

        .report-progress {
          width: 100%;
          height: 5px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255,255,255,.055);
        }

        .report-progress.large {
          height: 8px;
          margin: 10px 0 15px;
        }

        .report-progress-fill {
          height: 100%;
          border-radius: inherit;
          background: #929aa5;
          transition: width .4s ease;
        }

        .report-monthly-chart {
          min-height: 270px;
          display: flex;
          align-items: flex-end;
          gap: 12px;
          overflow-x: auto;
          padding: 20px 6px 0;
        }

        .report-bar-column {
          min-width: 60px;
          flex: 1;
          height: 240px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          align-items: center;
        }

        .report-bar-value {
          width: 100%;
          overflow: hidden;
          margin-bottom: 7px;
          color: #858e9a;
          font-size: 9px;
          text-align: center;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .report-bar-track {
          width: 28px;
          height: 170px;
          display: flex;
          align-items: flex-end;
          border-radius: 7px;
          background: rgba(255,255,255,.035);
        }

        .report-bar {
          width: 100%;
          min-height: 5px;
          border-radius: 7px;
          background: #8b929c;
          box-shadow: 0 5px 18px rgba(255,255,255,.04);
        }

        .report-bar-label {
          margin-top: 9px;
          color: #b1b8c2;
          font-size: 10px;
          font-weight: 650;
        }

        .report-bar-count {
          margin-top: 3px;
          color: #5f6875;
          font-size: 9px;
        }

        .report-empty {
          min-height: 170px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          color: #626b77;
          font-size: 12px;
        }

        .report-table-wrap {
          width: 100%;
          overflow-x: auto;
        }

        .report-table {
          width: 100%;
          min-width: 620px;
          border-collapse: collapse;
        }

        .report-table th {
          padding: 10px 12px;
          border-bottom: 1px solid rgba(255,255,255,.07);
          color: #656e7b;
          font-size: 10px;
          font-weight: 750;
          letter-spacing: .08em;
          text-align: left;
          text-transform: uppercase;
        }

        .report-table td {
          padding: 13px 12px;
          border-bottom: 1px solid rgba(255,255,255,.045);
          color: #adb4be;
          font-size: 12px;
        }

        .report-table tbody tr:last-child td {
          border-bottom: 0;
        }

        .report-table tbody tr:hover td {
          background: rgba(255,255,255,.018);
        }

        .report-badge {
          display: inline-flex;
          align-items: center;
          padding: 5px 8px;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 6px;
          font-size: 10px;
          font-weight: 700;
        }

        .report-status-success {
          color: #b9c0c9;
          background: rgba(255,255,255,.045);
        }

        .report-status-warning {
          color: #c2bba9;
          background: rgba(255,255,255,.035);
        }

        .report-status-danger {
          color: #c5a7a7;
          background: rgba(255,255,255,.035);
        }

        .report-status-neutral {
          color: #9da5b0;
          background: rgba(255,255,255,.025);
        }

        .report-health {
          padding: 4px 0;
        }

        .report-health-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: #aeb5bf;
          font-size: 12px;
        }

        .report-health-row strong {
          color: #e7eaee;
          font-size: 13px;
        }

        .report-health-row.muted {
          color: #646d79;
        }

        @media (max-width: 1200px) {
          .report-layout {
            grid-template-columns: 190px minmax(0, 1fr);
          }

          .report-kpi-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .report-kpi-grid-3,
          .report-kpi-grid-4 {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 900px) {
          .reports-page {
            padding: 16px;
          }

          .reports-hero {
            flex-direction: column;
          }

          .reports-actions {
            width: 100%;
          }

          .report-layout {
            display: block;
          }

          .report-sidebar {
            display: none;
          }

          .report-mobile-selector {
            display: block;
          }

          .report-filter {
            flex-wrap: wrap;
          }

          .report-filter-spacer {
            display: none;
          }

          .report-field {
            flex: 1;
            min-width: 140px;
          }
        }

        @media (max-width: 700px) {
          .reports-page {
            padding: 12px;
          }

          .reports-description {
            font-size: 12px;
          }

          .report-filter {
            display: grid;
            grid-template-columns: 1fr 1fr;
            align-items: end;
          }

          .report-field {
            min-width: 0;
          }

          .report-filter .report-btn {
            width: 100%;
          }

          .report-two-column {
            grid-template-columns: 1fr;
          }

          .report-kpi-grid,
          .report-kpi-grid-3,
          .report-kpi-grid-4 {
            grid-template-columns: 1fr 1fr;
          }

          .report-content-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .report-period {
            width: 100%;
          }
        }

        @media (max-width: 480px) {
          .reports-title-wrap {
            gap: 10px;
          }

          .reports-title-icon {
            width: 42px;
            height: 42px;
          }

          .reports-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .reports-actions .report-btn {
            width: 100%;
          }

          .report-filter {
            grid-template-columns: 1fr;
          }

          .report-filter .report-btn {
            width: 100%;
          }

          .report-kpi-grid,
          .report-kpi-grid-3,
          .report-kpi-grid-4 {
            grid-template-columns: 1fr;
          }

          .report-kpi-value {
            font-size: 23px;
          }

          .report-section-card {
            padding: 14px;
          }
        }

        @media print {
          .reports-page {
            background: white !important;
            color: black !important;
          }

          .report-sidebar,
          .report-mobile-selector,
          .reports-actions,
          .report-filter {
            display: none !important;
          }

          .report-layout {
            display: block !important;
          }

          .report-section-card,
          .report-kpi-card {
            break-inside: avoid;
            background: white !important;
            border: 1px solid #ddd !important;
            color: black !important;
            box-shadow: none !important;
          }

          .report-kpi-value,
          .report-section-header h3,
          .report-table td {
            color: black !important;
          }
        }
      `}</style>

      <div className="reports-shell">
        <div className="reports-hero">
          <div className="reports-title-wrap">
            <div className="reports-title-icon">
              <BarChart3 size={24} />
            </div>

            <div>
              <div className="reports-eyebrow">
                Analytics & Intelligence
              </div>

              <h1 className="reports-title">Reports</h1>

              <p className="reports-description">
                Monitor sales, purchases, finance, inventory, projects,
                tasks and workflow performance from one consolidated
                reporting workspace.
              </p>
            </div>
          </div>

          <div className="reports-actions">
            <button
              type="button"
              className="report-btn"
              onClick={fetchReport}
              disabled={loading}
            >
              <RefreshCw
                size={15}
                className={loading ? "report-spinner" : ""}
              />
              Refresh
            </button>

            <button
              type="button"
              className="report-btn"
              onClick={() => window.print()}
            >
              <FileText size={15} />
              Print
            </button>

            <button
              type="button"
              className="report-btn primary"
              onClick={exportReport}
              disabled={!data || loading}
            >
              <Download size={15} />
              Export CSV
            </button>
          </div>
        </div>

        <div className="report-filter">
          <div className="report-field">
            <label>From</label>
            <input
              className="report-input"
              type="date"
              value={from}
              max={to || undefined}
              onChange={(event) => setFrom(event.target.value)}
            />
          </div>

          <div className="report-field">
            <label>To</label>
            <input
              className="report-input"
              type="date"
              value={to}
              min={from || undefined}
              onChange={(event) => setTo(event.target.value)}
            />
          </div>

          <div className="report-filter-spacer" />

          <button
            type="button"
            className="report-btn"
            onClick={resetDates}
          >
            Reset
          </button>

          <button
            type="button"
            className="report-btn primary"
            onClick={fetchReport}
            disabled={loading}
          >
            <Search size={15} />
            Apply
          </button>
        </div>

        <div className="report-mobile-selector">
          <button
            type="button"
            className="report-mobile-trigger"
            onClick={() =>
              setMobileReportOpen((current) => !current)
            }
          >
            <span>
              <activeMeta.icon size={16} />
              {activeMeta.label}
            </span>

            <ChevronDown size={16} />
          </button>

          {mobileReportOpen && (
            <div className="report-mobile-menu">
              {REPORTS.map((report) => {
                const Icon = report.icon;

                return (
                  <button
                    type="button"
                    key={report.key}
                    className={
                      activeReport === report.key ? "active" : ""
                    }
                    onClick={() => selectReport(report.key)}
                  >
                    <Icon size={15} />
                    {report.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="report-layout">
          <aside className="report-sidebar">
            <div className="report-sidebar-title">
              Report Center
            </div>

            {REPORTS.map((report) => {
              const Icon = report.icon;

              return (
                <button
                  type="button"
                  key={report.key}
                  className={`report-nav-btn ${
                    activeReport === report.key ? "active" : ""
                  }`}
                  onClick={() => selectReport(report.key)}
                >
                  <Icon size={16} />
                  <span>{report.label}</span>
                </button>
              );
            })}
          </aside>

          <main className="report-content">
            <div className="report-content-header">
              <div className="report-content-title">
                <div>
                  <h2>{activeMeta.label} Report</h2>
                  <p>
                    Live data from your Ready Tech ERP workspace
                  </p>
                </div>
              </div>

              <div className="report-period">
                <Clock3 size={13} />
                {from} → {to}
              </div>
            </div>

            {error && (
              <div className="report-error">
                <AlertCircle size={18} />
                <span>{error}</span>

                <button
                  type="button"
                  onClick={() => setError("")}
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {loading ? (
              <div className="report-loading">
                <div className="report-loading-inner">
                  <RefreshCw
                    size={28}
                    className="report-spinner"
                  />
                  Loading {activeMeta.label.toLowerCase()} report...
                </div>
              </div>
            ) : (
              renderReport()
            )}
          </main>
        </div>
      </div>
    </div>
  );
}