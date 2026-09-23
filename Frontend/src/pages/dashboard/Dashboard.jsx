import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  FileText,
  Package,
  Plus,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

function Dashboard() {
  const kpis = [
    {
      title: "Total Revenue",
      value: "₹24.68L",
      change: "+18.4%",
      subtitle: "vs last month",
      icon: CircleDollarSign,
      type: "positive",
    },
    {
      title: "Sales Orders",
      value: "186",
      change: "+12.8%",
      subtitle: "this month",
      icon: ShoppingCart,
      type: "positive",
    },
    {
      title: "Outstanding",
      value: "₹6.42L",
      change: "14 invoices",
      subtitle: "pending payment",
      icon: Wallet,
      type: "warning",
    },
    {
      title: "Active Customers",
      value: "428",
      change: "+24",
      subtitle: "new this month",
      icon: Users,
      type: "positive",
    },
  ];

  const revenueData = [
    { month: "Apr", value: 48 },
    { month: "May", value: 62 },
    { month: "Jun", value: 55 },
    { month: "Jul", value: 72 },
    { month: "Aug", value: 68 },
    { month: "Sep", value: 86 },
  ];

  const orders = [
    {
      id: "#RT-1048",
      customer: "Apex Technologies",
      amount: "₹1,48,500",
      status: "Paid",
      date: "Today",
    },
    {
      id: "#RT-1047",
      customer: "Greenfield Industries",
      amount: "₹82,400",
      status: "Pending",
      date: "Today",
    },
    {
      id: "#RT-1046",
      customer: "Bharath Automation",
      amount: "₹2,16,800",
      status: "Processing",
      date: "Yesterday",
    },
    {
      id: "#RT-1045",
      customer: "Sri Engineering Works",
      amount: "₹64,200",
      status: "Paid",
      date: "Yesterday",
    },
  ];

  const activities = [
    {
      title: "Invoice #INV-2084 generated",
      description: "Apex Technologies",
      time: "12 min ago",
      icon: FileText,
    },
    {
      title: "Sales order confirmed",
      description: "#RT-1048 · ₹1,48,500",
      time: "34 min ago",
      icon: ShoppingCart,
    },
    {
      title: "Payment received",
      description: "₹82,400 from Greenfield Industries",
      time: "1 hr ago",
      icon: CircleDollarSign,
    },
    {
      title: "New customer added",
      description: "Bharath Automation",
      time: "2 hrs ago",
      icon: Users,
    },
  ];

  const quickActions = [
    {
      icon: Users,
      title: "New Customer",
      description: "Add customer",
    },
    {
      icon: ShoppingCart,
      title: "Sales Order",
      description: "Create order",
    },
    {
      icon: FileText,
      title: "Create Invoice",
      description: "Generate invoice",
    },
    {
      icon: Package,
      title: "Add Product",
      description: "New product",
    },
    {
      icon: ClipboardList,
      title: "Purchase Order",
      description: "Create purchase",
    },
    {
      icon: BarChart3,
      title: "Reports",
      description: "View analytics",
    },
  ];

  const businessHealth = [
    ["Sales Target", "82%", "₹30L target"],
    ["Collection", "74%", "₹8.7L collected"],
    ["Inventory", "68%", "Healthy stock"],
    ["Customer Growth", "91%", "Excellent"],
  ];

  return (
    <div className="w-full">
      {/* ========================================================= */}
      {/* FULL WIDTH MAIN */}
      {/* ========================================================= */}

      <main className="relative w-full px-3 py-4 sm:px-5 sm:py-6 md:px-7 lg:px-8 xl:px-10 2xl:px-14">
        {/* ======================================================= */}
        {/* HEADER */}
        {/* ======================================================= */}

        <header className="mb-6 flex flex-col gap-5 border-b border-white/[0.06] pb-6 sm:mb-7 sm:pb-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.08] text-sm font-bold text-cyan-300 shadow-lg shadow-cyan-500/5">
                RT
              </div>

              <div className="min-w-0">
                <p className="truncate text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-400 sm:text-[11px] sm:tracking-[0.25em]">
                  Ready Tech Solutions
                </p>

                <h1 className="mt-1 truncate text-xl font-semibold tracking-tight sm:text-2xl lg:text-3xl">
                  ERP Command Center
                </h1>
              </div>
            </div>

            <p className="mt-3 max-w-3xl text-xs leading-6 text-gray-500 sm:text-sm">
              Monitor sales, finance, inventory, customers and daily business
              operations from one intelligent workspace.
            </p>
          </div>

          <div className="flex w-full items-center gap-2 sm:w-auto sm:gap-3">
            <button
              onClick={() => window.location.reload()}
              className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs text-gray-300 transition hover:border-white/20 hover:bg-white/[0.06] sm:flex-none sm:px-4 sm:text-sm"
            >
              <RefreshCw size={14} />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        {/* ======================================================= */}
        {/* WELCOME BANNER */}
        {/* ======================================================= */}

        <section className="mb-5 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.055] to-white/[0.018] p-4 shadow-2xl shadow-black/20 backdrop-blur-xl sm:mb-6 sm:p-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] px-3 py-1.5 text-[10px] font-medium text-emerald-300 sm:text-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                All systems operational
              </div>

              <h2 className="text-lg font-semibold sm:text-2xl">
                Good morning, Ready Tech team 👋
              </h2>

              <p className="mt-1.5 text-xs text-gray-500 sm:text-sm">
                Here&apos;s your business overview for today.
              </p>
            </div>

            <div className="grid w-full grid-cols-3 gap-2 sm:max-w-md sm:gap-3 xl:w-auto xl:max-w-none">
              <MiniMetric value="24" label="Tasks" />
              <MiniMetric value="08" label="Meetings" />
              <MiniMetric value="14" label="Alerts" />
            </div>
          </div>
        </section>

        {/* ======================================================= */}
        {/* KPI CARDS */}
        {/* ======================================================= */}

        <section className="mb-5 grid grid-cols-1 gap-3 sm:mb-6 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;

            return (
              <div
                key={kpi.title}
                className="group rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.055] sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs text-gray-500 sm:text-sm">
                      {kpi.title}
                    </p>

                    <p className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                      {kpi.value}
                    </p>
                  </div>

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-cyan-300">
                    <Icon size={18} />
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-md px-2 py-1 text-[10px] font-medium sm:text-xs ${
                      kpi.type === "positive"
                        ? "bg-emerald-400/10 text-emerald-300"
                        : "bg-amber-400/10 text-amber-300"
                    }`}
                  >
                    {kpi.change}
                  </span>

                  <span className="text-[10px] text-gray-600 sm:text-xs">
                    {kpi.subtitle}
                  </span>
                </div>
              </div>
            );
          })}
        </section>

        {/* ======================================================= */}
        {/* REVENUE + BUSINESS HEALTH */}
        {/* ======================================================= */}

        <section className="mb-5 grid grid-cols-1 gap-5 sm:mb-6 sm:gap-6 xl:grid-cols-3">
          {/* Revenue */}
          <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 backdrop-blur-xl sm:p-6 xl:col-span-2">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold">Revenue Overview</h3>

                <p className="mt-1 text-xs text-gray-500">
                  Monthly revenue performance
                </p>
              </div>

              <div className="w-fit rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] text-gray-400 sm:text-xs">
                Last 6 months
              </div>
            </div>

            <div className="flex h-56 min-w-0 items-end gap-2 sm:h-64 sm:gap-4 md:gap-5">
              {revenueData.map((item) => (
                <div
                  key={item.month}
                  className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2 sm:gap-3"
                >
                  <div className="relative flex h-full w-full items-end">
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-cyan-500/20 via-cyan-400/50 to-cyan-300/90 transition-all duration-500 hover:from-cyan-500/40 hover:to-cyan-200 sm:rounded-t-xl"
                      style={{ height: `${item.value}%` }}
                    >
                      <div className="mx-auto mt-2 hidden w-fit rounded-md bg-black/30 px-1.5 py-0.5 text-[9px] text-white md:block">
                        ₹{Math.round(item.value / 10)}L
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] text-gray-600 sm:text-xs">
                    {item.month}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Business Health */}
          <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 backdrop-blur-xl sm:p-6">
            <div className="mb-6">
              <h3 className="font-semibold">Business Health</h3>

              <p className="mt-1 text-xs text-gray-500">
                Current operational snapshot
              </p>
            </div>

            <div className="space-y-5">
              {businessHealth.map(([label, value, description]) => (
                <div key={label}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="truncate text-xs text-gray-400 sm:text-sm">
                      {label}
                    </span>

                    <span className="shrink-0 text-xs font-medium sm:text-sm">
                      {value}
                    </span>
                  </div>

                  <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06] sm:h-2">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-400"
                      style={{ width: value }}
                    />
                  </div>

                  <p className="mt-1.5 text-[10px] text-gray-600 sm:text-[11px]">
                    {description}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-cyan-400/10 bg-cyan-400/[0.04] p-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-cyan-300" />

                <p className="text-xs font-medium text-cyan-300">
                  Performance Insight
                </p>
              </div>

              <p className="mt-1 text-xs leading-5 text-gray-500">
                Revenue and customer activity are trending positively this
                month.
              </p>
            </div>
          </div>
        </section>

        {/* ======================================================= */}
        {/* ORDERS + ACTIVITY */}
        {/* ======================================================= */}

        <section className="grid grid-cols-1 gap-5 sm:gap-6 xl:grid-cols-3">
          {/* Recent Orders */}
          <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 backdrop-blur-xl sm:p-6 xl:col-span-2">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold">Recent Sales Orders</h3>

                <p className="mt-1 truncate text-xs text-gray-500">
                  Latest transactions across Ready Tech
                </p>
              </div>

              <button className="flex shrink-0 items-center gap-1 text-xs font-medium text-cyan-400 transition hover:text-cyan-300">
                View all
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Desktop Table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[650px]">
                <thead>
                  <tr className="border-b border-white/10 text-left text-[10px] uppercase tracking-wider text-gray-600">
                    <th className="pb-3 font-medium">Order</th>
                    <th className="pb-3 font-medium">Customer</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 text-right font-medium">Date</th>
                  </tr>
                </thead>

                <tbody>
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-white/[0.06] last:border-0"
                    >
                      <td className="py-4 text-sm font-medium text-gray-300">
                        {order.id}
                      </td>

                      <td className="py-4 text-sm text-gray-400">
                        {order.customer}
                      </td>

                      <td className="py-4 text-sm font-medium text-gray-200">
                        {order.amount}
                      </td>

                      <td className="py-4">
                        <OrderStatus status={order.status} />
                      </td>

                      <td className="py-4 text-right text-xs text-gray-600">
                        {order.date}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="space-y-3 md:hidden">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-xl border border-white/[0.07] bg-black/20 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-200">
                        {order.id}
                      </p>

                      <p className="mt-1 truncate text-xs text-gray-500">
                        {order.customer}
                      </p>
                    </div>

                    <OrderStatus status={order.status} />
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
                    <span className="text-xs text-gray-600">
                      {order.date}
                    </span>

                    <span className="text-sm font-semibold text-gray-200">
                      {order.amount}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 backdrop-blur-xl sm:p-6">
            <div className="mb-5">
              <h3 className="font-semibold">Recent Activity</h3>

              <p className="mt-1 text-xs text-gray-500">
                Latest business events
              </p>
            </div>

            <div className="space-y-5">
              {activities.map((activity, index) => {
                const Icon = activity.icon;

                return (
                  <div key={activity.title} className="flex gap-3">
                    <div className="relative">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-cyan-300">
                        <Icon size={15} />
                      </div>

                      {index !== activities.length - 1 && (
                        <div className="absolute left-1/2 top-10 h-7 w-px -translate-x-1/2 bg-white/10" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-300">
                        {activity.title}
                      </p>

                      <p className="mt-1 truncate text-xs text-gray-600">
                        {activity.description}
                      </p>

                      <p className="mt-1 text-[10px] text-gray-700">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ======================================================= */}
        {/* QUICK ACTIONS */}
        {/* ======================================================= */}

        <section className="mt-5 sm:mt-6">
          <div className="mb-4">
            <h3 className="font-semibold">Quick Actions</h3>

            <p className="mt-1 text-xs text-gray-500">
              Frequently used ERP operations
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <button
                  key={action.title}
                  className="group min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition duration-300 hover:-translate-y-1 hover:border-cyan-400/20 hover:bg-cyan-400/[0.04]"
                >
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-gray-400 transition group-hover:border-cyan-400/20 group-hover:text-cyan-300">
                    <Icon size={16} />
                  </div>

                  <p className="truncate text-xs font-medium text-gray-400 transition group-hover:text-gray-200">
                    {action.title}
                  </p>

                  <p className="mt-1 truncate text-[10px] text-gray-700">
                    {action.description}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* ======================================================= */}
        {/* NOTES + COMPANY */}
        {/* ======================================================= */}

        <section className="mt-5 grid grid-cols-1 gap-5 sm:mt-6 sm:gap-6 lg:grid-cols-2">
          {/* Notes */}
          <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 backdrop-blur-xl sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold">Important Notes</h3>

                <p className="mt-1 truncate text-xs text-gray-500">
                  Business reminders and follow-ups
                </p>
              </div>

              <button className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] text-gray-400 transition hover:bg-white/[0.06] sm:text-xs">
                <Plus size={13} />
                Add Note
              </button>
            </div>

            <div className="space-y-3">
              <Note
                icon={<AlertTriangle size={15} />}
                title="Payment follow-up required"
                description="14 invoices are currently pending payment. Review outstanding receivables."
                color="amber"
              />

              <Note
                icon={<Activity size={15} />}
                title="Monthly sales review"
                description="September sales are currently at 82% of the monthly target."
                color="blue"
              />

              <Note
                icon={<CheckCircle2 size={15} />}
                title="Inventory status healthy"
                description="Current stock levels are within the expected operating range."
                color="emerald"
              />
            </div>
          </div>

          {/* Company Overview */}
          <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 backdrop-blur-xl sm:p-6">
            <div className="mb-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-400 sm:text-[11px]">
                Company Overview
              </p>

              <div className="mt-2 flex items-center gap-2">
                <Building2 size={18} className="text-gray-500" />

                <h3 className="text-xl font-semibold">
                  Ready Tech Solutions
                </h3>
              </div>

              <p className="mt-2 text-xs leading-6 text-gray-500 sm:text-sm">
                A unified workspace for managing business operations, customer
                relationships, sales, finance and enterprise processes.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
              <CompanyStat value="2019" label="Established" />
              <CompanyStat value="2" label="Locations" />
              <CompanyStat value="428" label="Customers" />
              <CompanyStat value="24/7" label="Digital Access" />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {[
                "Coimbatore",
                "Bangalore",
                "ERP",
                "Business Management",
              ].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] text-gray-500 sm:text-[11px]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ======================================================= */}
        {/* FOOTER */}
        {/* ======================================================= */}

        <footer className="mt-8 border-t border-white/[0.06] py-6 sm:mt-10">
          <div className="flex flex-col gap-2 text-[10px] text-gray-700 sm:flex-row sm:items-center sm:justify-between sm:text-xs">
            <p>© {new Date().getFullYear()} Ready Tech Solutions. All rights reserved.</p>

            <p>ERP Platform · Coimbatore · Bangalore</p>
          </div>
        </footer>
      </main>
    </div>
  );
}

/* ============================================================= */
/* MINI METRIC */
/* ============================================================= */

const MiniMetric = ({ value, label }) => {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-black/20 px-2 py-3 text-center sm:min-w-[85px] sm:px-4">
      <p className="text-base font-semibold sm:text-lg">{value}</p>

      <p className="mt-1 text-[9px] uppercase tracking-wider text-gray-500 sm:text-[10px]">
        {label}
      </p>
    </div>
  );
};

/* ============================================================= */
/* ORDER STATUS */
/* ============================================================= */

const OrderStatus = ({ status }) => {
  const styles = {
    Paid: "bg-emerald-400/10 text-emerald-300",
    Pending: "bg-amber-400/10 text-amber-300",
    Processing: "bg-blue-400/10 text-blue-300",
  };

  return (
    <span
      className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[9px] font-medium sm:text-[10px] ${
        styles[status] || "bg-white/10 text-gray-300"
      }`}
    >
      {status}
    </span>
  );
};

/* ============================================================= */
/* NOTE */
/* ============================================================= */

const Note = ({ icon, title, description, color }) => {
  const colors = {
    amber: {
      wrapper: "border-amber-400/10 bg-amber-400/[0.04]",
      icon: "text-amber-300",
    },
    blue: {
      wrapper: "border-blue-400/10 bg-blue-400/[0.04]",
      icon: "text-blue-300",
    },
    emerald: {
      wrapper: "border-emerald-400/10 bg-emerald-400/[0.04]",
      icon: "text-emerald-300",
    },
  };

  const style = colors[color] || colors.blue;

  return (
    <div className={`rounded-xl border p-4 ${style.wrapper}`}>
      <div className="flex gap-3">
        <div className={`mt-0.5 shrink-0 ${style.icon}`}>
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-300">
            {title}
          </p>

          <p className="mt-1 text-xs leading-5 text-gray-600">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
};

/* ============================================================= */
/* COMPANY STAT */
/* ============================================================= */

const CompanyStat = ({ value, label }) => {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3 sm:p-4">
      <p className="text-lg font-semibold sm:text-xl">{value}</p>

      <p className="mt-1 text-[10px] text-gray-600 sm:text-[11px]">
        {label}
      </p>
    </div>
  );
};

export default Dashboard;