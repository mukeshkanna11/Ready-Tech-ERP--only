import { useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  FileText,
  GitBranch,
  History,
  LayoutDashboard,
  Lightbulb,
  Package,
  PlugZap,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Button,
  EmptyState,
  ErrorState,
  Loading,
  PageHeader,
  Panel,
  StatCard,
} from "./aiShared";
import {
  formatDate,
  formatNumber,
  readActivity,
  useApi,
} from "./aiUtils";

const FEATURES = [
  {
    to: "/ai/assistant",
    label: "AI Assistant",
    icon: Bot,
    description: "Chat-style assistant",
    connected: false,
  },
  {
    to: "/ai/summaries",
    label: "Document & Data Summaries",
    icon: FileText,
    description: "Summaries of ERP report data",
    connected: true,
  },
  {
    to: "/ai/insights",
    label: "Business Insights",
    icon: Lightbulb,
    description: "KPIs from existing ERP reports",
    connected: true,
  },
  {
    to: "/ai/forecasting",
    label: "Forecasting",
    icon: TrendingUp,
    description: "Demand and revenue forecasts",
    connected: false,
  },
  {
    to: "/ai/workflow",
    label: "Workflow Assistance",
    icon: GitBranch,
    description: "Pending approvals and next steps",
    connected: true,
  },
];

const AIDashboard = () => {
  const overview = useApi("/reports/overview");
  const workflow = useApi("/workflows/summary");
  const [activity] = useState(readActivity);

  const master = overview.data?.masterData || {};
  const pending = Number(workflow.data?.instances?.pending) || 0;
  const loading = overview.loading || workflow.loading;

  const alerts = [];
  if (pending > 0) {
    alerts.push({
      tone: "amber",
      text: `${formatNumber(pending)} workflow approval${pending === 1 ? "" : "s"} waiting`,
      to: "/ai/workflow",
    });
  }
  if (overview.data && !Number(master.products)) {
    alerts.push({ tone: "amber", text: "No products set up yet", to: "/products" });
  }
  if (overview.data && !Number(master.customers)) {
    alerts.push({ tone: "amber", text: "No customers recorded yet", to: "/customers" });
  }

  const refresh = () => {
    overview.reload();
    workflow.reload();
  };

  return (
    <div className="space-y-5">
      <PageHeader
        icon={LayoutDashboard}
        title="AI Dashboard"
        description="Overview of AI features and the ERP data they work with."
        actions={
          <Button onClick={refresh} disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={CheckCircle2}
          label="Features available"
          value={`${FEATURES.filter((f) => f.connected).length} / ${FEATURES.length}`}
          hint="Backed by existing ERP APIs"
        />
        <StatCard
          icon={GitBranch}
          label="Pending approvals"
          value={workflow.loading ? "…" : workflow.error ? "—" : formatNumber(pending)}
          hint="Workflow instances"
          tone="text-amber-300"
        />
        <StatCard
          icon={Package}
          label="Products"
          value={overview.loading ? "…" : overview.error ? "—" : formatNumber(master.products)}
          hint="Master data"
        />
        <StatCard
          icon={Users}
          label="Customers"
          value={overview.loading ? "…" : overview.error ? "—" : formatNumber(master.customers)}
          hint="Master data"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        {/* Quick actions / features */}
        <Panel title="AI features" icon={Bot} className="xl:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2">
            {FEATURES.map(({ to, label, icon: Icon, description, connected }) => (
              <Link
                key={to}
                to={to}
                className="group flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 transition hover:border-cyan-400/20 hover:bg-cyan-400/[0.04]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-gray-400 group-hover:text-cyan-300">
                  <Icon size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm font-medium text-gray-100">
                    {label}
                    <ArrowUpRight size={13} className="text-gray-600 group-hover:text-cyan-300" />
                  </span>
                  <span className="mt-0.5 block text-xs text-gray-500">{description}</span>
                  <span
                    className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      connected
                        ? "bg-emerald-500/10 text-emerald-300"
                        : "bg-amber-500/10 text-amber-300"
                    }`}
                  >
                    {connected ? <CheckCircle2 size={10} /> : <PlugZap size={10} />}
                    {connected ? "Uses ERP data" : "AI service not connected"}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </Panel>

        {/* Alerts */}
        <Panel title="Insights & alerts" icon={AlertTriangle}>
          {loading ? (
            <Loading />
          ) : overview.error && workflow.error ? (
            <ErrorState message={overview.error} onRetry={refresh} />
          ) : alerts.length ? (
            <ul className="space-y-2">
              {alerts.map((alert) => (
                <li key={alert.text}>
                  <Link
                    to={alert.to}
                    className="flex items-center justify-between gap-2 rounded-lg border border-amber-500/15 bg-amber-500/[0.05] px-3 py-2.5 text-sm text-amber-200 hover:bg-amber-500/[0.09]"
                  >
                    {alert.text}
                    <ArrowUpRight size={14} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={CheckCircle2}
              title="No alerts"
              description="Nothing in your ERP data needs attention right now."
            />
          )}
        </Panel>
      </div>

      {/* Recent activity */}
      <Panel title="Recent AI activity" icon={History}>
        {activity.length ? (
          <ul className="divide-y divide-white/[0.05]">
            {activity.map((item, index) => (
              <li key={`${item.at}-${index}`} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="text-gray-200">{item.type}</span>
                  <span className="ml-2 truncate text-gray-500">{item.detail}</span>
                </span>
                <span className="shrink-0 text-xs text-gray-600">{formatDate(item.at)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={History}
            title="No AI activity yet"
            description="Activity from this browser session (assistant prompts, summaries) appears here."
          />
        )}
      </Panel>
    </div>
  );
};

export default AIDashboard;
